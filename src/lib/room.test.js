/**
 * Routing and pairing links.
 *
 * The hash-parsing tests exist because the router originally compared the whole
 * hash, so `#/overlay?r=…` failed to match `#/overlay` and fell through to the
 * default route — putting the operator's dashboard on stream instead of the
 * scorebug.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseHash, getRoomFromUrl, getTokenFromUrl,
  buildOverlayUrl, buildRemoteUrl, buildJoinUrl,
  getRemoteToken, rotateRemoteToken,
} from './room.js';

function setHash(hash) {
  window.location.hash = hash;
}

describe('parseHash', () => {
  it('splits the query out of the hash so route matching sees only the path', () => {
    const { path, params } = parseHash('#/overlay?r=abc123');
    expect(path).toBe('#/overlay');
    expect(params.get('r')).toBe('abc123');
  });

  it('leaves a plain hash alone', () => {
    const { path, params } = parseHash('#/terms');
    expect(path).toBe('#/terms');
    expect([...params.keys()]).toEqual([]);
  });

  it('defaults an empty hash to the root route', () => {
    expect(parseHash('').path).toBe('#/');
    expect(parseHash(undefined).path).toBe('#/');
  });

  it('handles several params', () => {
    const { path, params } = parseHash('#/join?t=tok&x=1');
    expect(path).toBe('#/join');
    expect(params.get('t')).toBe('tok');
    expect(params.get('x')).toBe('1');
  });

  it('does not mistake an OAuth token hash for a route with a query', () => {
    // Supabase returns #access_token=…&expires_in=… after sign-in.
    const { path } = parseHash('#access_token=abc&expires_in=3600');
    expect(path).toBe('#access_token=abc&expires_in=3600');
  });
});

describe('reading identifiers from the URL', () => {
  it('reads the overlay room', () => {
    setHash('#/overlay?r=room-1');
    expect(getRoomFromUrl()).toBe('room-1');
  });

  it('reads the pairing token', () => {
    setHash('#/join?t=tok-1');
    expect(getTokenFromUrl()).toBe('tok-1');
  });

  it('returns null when absent rather than an empty string', () => {
    setHash('#/overlay');
    expect(getRoomFromUrl()).toBeNull();
    expect(getTokenFromUrl()).toBeNull();
  });
});

describe('link building', () => {
  it('builds an overlay URL carrying the room', () => {
    expect(buildOverlayUrl('abc')).toContain('#/overlay?r=abc');
  });

  it('encodes ids that need it', () => {
    expect(buildOverlayUrl('a b/c')).toContain(encodeURIComponent('a b/c'));
  });

  it('returns empty for a missing id rather than a broken link', () => {
    expect(buildOverlayUrl('')).toBe('');
    expect(buildRemoteUrl(null)).toBe('');
    expect(buildJoinUrl(undefined)).toBe('');
  });

  it('sends the remote and co-controller to different routes', () => {
    expect(buildRemoteUrl('t')).toContain('#/remote?t=t');
    expect(buildJoinUrl('t')).toContain('#/join?t=t');
  });
});

describe('pairing token', () => {
  beforeEach(() => localStorage.clear());

  it('is 128 bits of hex', () => {
    expect(getRemoteToken()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is stable across reads, so a paired phone stays paired', () => {
    expect(getRemoteToken()).toBe(getRemoteToken());
  });

  it('changes on rotation, which is what unpairs a leaked link', () => {
    const before = getRemoteToken();
    const after = rotateRemoteToken();
    expect(after).not.toBe(before);
    expect(getRemoteToken()).toBe(after);
  });

  it('is never derived from the account id — that is public in the overlay URL', () => {
    // The whole point of a separate secret: holding the overlay link must not
    // confer control of the scoreboard.
    const accountId = 'decfcca3-d11d-4695-b4e9-8b33f50dc8a6';
    const token = getRemoteToken();
    expect(token).not.toContain(accountId);
    expect(buildOverlayUrl(accountId)).not.toContain(token);
  });
});
