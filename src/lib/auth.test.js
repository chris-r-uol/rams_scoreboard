/**
 * Plan resolution.
 *
 * These exist because of a bug found on production, not locally: the
 * subscription lookup is deliberately non-blocking, `subscriptionStatus` starts
 * null, and `plan` reported 'free' for the length of one network round trip on
 * every load. A paying account therefore looked unsubscribed just long enough
 * for the controller to reset its sport and the overlay to flash a watermark.
 *
 * The distinction under test is "not known yet" versus "no subscription".
 * The local dev bypass resolves synchronously, which is exactly why no local
 * test caught the original — so these drive the real path with a controllable
 * lookup.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

/** A promise whose resolution the test controls. */
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

let subscriptionQuery;
let sessionResult;

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve(sessionResult),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => subscriptionQuery.promise,
              }),
            }),
          }),
        }),
      }),
    }),
  },
}));

async function loadAuth() {
  vi.resetModules();
  subscriptionQuery = deferred();
  return import('./auth.js');
}

/** Let pending microtasks settle. */
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  sessionResult = { data: { session: { user: { id: 'user-1' } } } };
});

describe('plan while the subscription is still loading', () => {
  it('reports null — not free — before the lookup returns', async () => {
    const auth = await loadAuth();
    await settle();

    expect(get(auth.plan)).toBeNull();
    expect(get(auth.subscriptionResolved)).toBe(false);
  });

  it('becomes pro once an active subscription lands', async () => {
    const auth = await loadAuth();
    await settle();

    subscriptionQuery.resolve({ data: { status: 'active' }, error: null });
    await settle();

    expect(get(auth.plan)).toBe('pro');
    expect(get(auth.isSubscribed)).toBe(true);
  });

  it('becomes free once the lookup finds nothing', async () => {
    const auth = await loadAuth();
    await settle();

    subscriptionQuery.resolve({ data: null, error: null });
    await settle();

    expect(get(auth.plan)).toBe('free');
  });

  it('treats trialing as subscribed', async () => {
    const auth = await loadAuth();
    subscriptionQuery.resolve({ data: { status: 'trialing' }, error: null });
    await settle();

    expect(get(auth.plan)).toBe('pro');
  });

  it('treats past_due as not subscribed', async () => {
    const auth = await loadAuth();
    subscriptionQuery.resolve({ data: { status: 'past_due' }, error: null });
    await settle();

    expect(get(auth.plan)).toBe('free');
  });

  it('resolves rather than waiting forever when the lookup fails', async () => {
    const auth = await loadAuth();
    subscriptionQuery.resolve({ data: null, error: { message: 'boom' } });
    await settle();

    expect(get(auth.subscriptionResolved)).toBe(true);
    expect(get(auth.plan)).toBe('free');
  });

  it('resolves immediately when there is no session to look up', async () => {
    sessionResult = { data: { session: null } };
    const auth = await loadAuth();
    await settle();

    expect(get(auth.subscriptionResolved)).toBe(true);
    expect(get(auth.plan)).toBe('free');
  });
});

describe('sport access', () => {
  it('gives a free account exactly one sport', async () => {
    const { sportAllowedOn, FREE_SPORT } = await loadAuth();
    expect(sportAllowedOn('free', FREE_SPORT)).toBe(true);
    expect(sportAllowedOn('free', 'soccer')).toBe(false);
    expect(sportAllowedOn('free', 'mtg')).toBe(false);
  });

  it('gives a subscriber everything', async () => {
    const { sportAllowedOn } = await loadAuth();
    for (const sport of ['soccer', 'mtg', 'cricket', 'ice-hockey']) {
      expect(sportAllowedOn('pro', sport)).toBe(true);
    }
  });

  it('an unknown plan is not treated as pro', async () => {
    // Callers must wait on null rather than assuming either way, but if one
    // slips through it must fail closed.
    const { sportAllowedOn } = await loadAuth();
    expect(sportAllowedOn(null, 'soccer')).toBe(false);
  });
});
