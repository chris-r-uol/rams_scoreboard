/**
 * Sponsor visibility and rotation.
 *
 * Both are derived on each client from broadcast state rather than pushed, the
 * same way clocks are — so a sponsor rotating every ten seconds costs no
 * messages. These tests pin that derivation down, since a mistake here shows up
 * on air rather than in a log.
 */
import { describe, it, expect } from 'vitest';
import {
  sponsorVisible, currentSponsor, makeSponsor,
  SPONSOR_PLACEMENTS, SPONSOR_VISIBILITY, ROTATION_CHOICES, MAX_SPONSORS,
} from './sponsors.js';

const a = { id: 'a', name: 'A', image: 'data:image/webp;base64,AAAA' };
const b = { id: 'b', name: 'B', image: 'https://example.com/b.png' };
const c = { id: 'c', name: 'C', image: 'data:image/webp;base64,CCCC' };

describe('sponsorVisible', () => {
  it('shows nothing when no sponsors are configured', () => {
    expect(sponsorVisible({ sponsors: [], sponsorVisibility: 'always' })).toBe(false);
    expect(sponsorVisible({ sponsorVisibility: 'always' })).toBe(false);
  });

  it('always means always', () => {
    expect(sponsorVisible({ sponsors: [a], sponsorVisibility: 'always', gameClockRunning: true }))
      .toBe(true);
  });

  it('holds a sponsor back while the clock is running', () => {
    // Sponsors belong in the breaks, not over live play.
    const state = { sponsors: [a], sponsorVisibility: 'clock-stopped' };
    expect(sponsorVisible({ ...state, gameClockRunning: true })).toBe(false);
    expect(sponsorVisible({ ...state, gameClockRunning: false })).toBe(true);
  });

  it('obeys the manual switch', () => {
    const state = { sponsors: [a], sponsorVisibility: 'manual', gameClockRunning: false };
    expect(sponsorVisible({ ...state, sponsorManualOn: false })).toBe(false);
    expect(sponsorVisible({ ...state, sponsorManualOn: true })).toBe(true);
  });

  it('manual ignores the clock, so it can be held up during play', () => {
    expect(sponsorVisible({
      sponsors: [a], sponsorVisibility: 'manual', sponsorManualOn: true, gameClockRunning: true,
    })).toBe(true);
  });

  it('defaults to visible for an unrecognised mode rather than vanishing', () => {
    expect(sponsorVisible({ sponsors: [a], sponsorVisibility: 'nonsense' })).toBe(true);
  });
});

describe('currentSponsor', () => {
  const anchor = 1_000_000;

  it('returns nothing when the list is empty', () => {
    expect(currentSponsor({ sponsors: [] })).toBeNull();
  });

  it('holds on the first when rotation is off', () => {
    const state = { sponsors: [a, b, c], sponsorRotateSeconds: 0, sponsorRotateAnchorMs: anchor };
    expect(currentSponsor(state, anchor + 999_999).id).toBe('a');
  });

  it('advances one step per interval', () => {
    const state = { sponsors: [a, b, c], sponsorRotateSeconds: 10, sponsorRotateAnchorMs: anchor };
    expect(currentSponsor(state, anchor).id).toBe('a');
    expect(currentSponsor(state, anchor + 9_999).id).toBe('a');
    expect(currentSponsor(state, anchor + 10_000).id).toBe('b');
    expect(currentSponsor(state, anchor + 20_000).id).toBe('c');
  });

  it('wraps back to the start', () => {
    const state = { sponsors: [a, b], sponsorRotateSeconds: 10, sponsorRotateAnchorMs: anchor };
    expect(currentSponsor(state, anchor + 20_000).id).toBe('a');
    expect(currentSponsor(state, anchor + 30_000).id).toBe('b');
  });

  it('is a pure function of elapsed time, so every client agrees without syncing', () => {
    const state = { sponsors: [a, b, c], sponsorRotateSeconds: 15, sponsorRotateAnchorMs: anchor };
    const at = anchor + 47_000;
    // floor(47000 / 15000) = 3 steps; 3 % 3 sponsors = index 0.
    expect(currentSponsor(state, at).id).toBe('a');
    expect(currentSponsor(state, at).id).toBe(currentSponsor(state, at).id);
  });

  it('does not rotate a single sponsor', () => {
    const state = { sponsors: [a], sponsorRotateSeconds: 5, sponsorRotateAnchorMs: anchor };
    expect(currentSponsor(state, anchor + 60_000).id).toBe('a');
  });

  it('falls back to the first when no anchor has been set', () => {
    const state = { sponsors: [a, b], sponsorRotateSeconds: 10, sponsorRotateAnchorMs: null };
    expect(currentSponsor(state, Date.now()).id).toBe('a');
  });

  it('does not go backwards if a clock skew estimate overshoots', () => {
    const state = { sponsors: [a, b], sponsorRotateSeconds: 10, sponsorRotateAnchorMs: anchor };
    expect(currentSponsor(state, anchor - 5_000).id).toBe('a');
  });
});

describe('makeSponsor', () => {
  it('gives each entry a distinct id', () => {
    expect(makeSponsor('X', 'data:…').id).not.toBe(makeSponsor('X', 'data:…').id);
  });

  it('falls back to a usable name', () => {
    expect(makeSponsor('', 'data:…').name).toBe('Sponsor');
    expect(makeSponsor('  ', 'data:…').name).toBe('Sponsor');
    expect(makeSponsor('  Acme  ', 'data:…').name).toBe('Acme');
  });
});

describe('configuration options', () => {
  it('offers the four placements the overlay lays out', () => {
    expect(SPONSOR_PLACEMENTS).toEqual(['below', 'above', 'left', 'right']);
  });

  it('offers a visibility mode for each supported trigger', () => {
    expect(SPONSOR_VISIBILITY.map((v) => v.id)).toEqual(['always', 'clock-stopped', 'manual']);
  });

  it('includes an explicit no-rotation choice', () => {
    expect(ROTATION_CHOICES[0]).toBe(0);
  });

  it('caps the list, since every sponsor rides on every heartbeat', () => {
    expect(MAX_SPONSORS).toBeLessThanOrEqual(6);
  });
});
