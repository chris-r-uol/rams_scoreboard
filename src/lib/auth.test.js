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

/** Swapped per test so each can decide what Supabase returns. */
let authCalls;

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve(sessionResult),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      signUp: (...args) => authCalls.signUp(...args),
      signInWithPassword: (...args) => authCalls.signInWithPassword(...args),
      resetPasswordForEmail: (...args) => authCalls.resetPasswordForEmail(...args),
      updateUser: (...args) => authCalls.updateUser(...args),
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
  authCalls = {
    signUp: vi.fn(async () => ({ data: { session: { user: {} } }, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    updateUser: vi.fn(async () => ({ data: {}, error: null })),
  };
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


describe('email sign-up and sign-in', () => {
  it('reports being signed in when confirmation is off', async () => {
    const auth = await loadAuth();
    const result = await auth.signUpWithEmail('  a@b.com  ', 'secret123');

    expect(result.needsConfirmation).toBe(false);
    // Trimmed, because a trailing space pasted from an email is not a new address.
    expect(authCalls.signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' });
  });

  it('reports needing confirmation when no session comes back', async () => {
    const auth = await loadAuth();
    authCalls.signUp = vi.fn(async () => ({ data: { session: null }, error: null }));

    const result = await auth.signUpWithEmail('a@b.com', 'secret123');
    expect(result.needsConfirmation).toBe(true);
  });

  it('rewrites a duplicate address into something actionable', async () => {
    const auth = await loadAuth();
    authCalls.signUp = vi.fn(async () => ({ data: {}, error: { message: 'User already registered' } }));

    await expect(auth.signUpWithEmail('a@b.com', 'secret123')).rejects.toThrow(/already an account/i);
  });

  it('rewrites a short password, keeping the required length', async () => {
    const auth = await loadAuth();
    authCalls.signUp = vi.fn(async () => ({
      data: {}, error: { message: 'Password should be at least 8 characters' },
    }));

    await expect(auth.signUpWithEmail('a@b.com', 'xy')).rejects.toThrow(/at least 8 characters/);
  });

  it('rewrites bad credentials without hinting which half was wrong', async () => {
    const auth = await loadAuth();
    authCalls.signInWithPassword = vi.fn(async () => ({
      data: {}, error: { message: 'Invalid login credentials' },
    }));

    await expect(auth.signInWithEmail('a@b.com', 'nope')).rejects.toThrow(/not recognised/i);
  });

  it('passes an unfamiliar error through rather than swallowing it', async () => {
    const auth = await loadAuth();
    authCalls.signInWithPassword = vi.fn(async () => ({
      data: {}, error: { message: 'Service temporarily unavailable' },
    }));

    await expect(auth.signInWithEmail('a@b.com', 'x')).rejects.toThrow('Service temporarily unavailable');
  });
});

describe('password reset', () => {
  it('sends the user back to this site', async () => {
    const auth = await loadAuth();
    await auth.requestPasswordReset('a@b.com');

    const [address, options] = authCalls.resetPasswordForEmail.mock.calls[0];
    expect(address).toBe('a@b.com');
    expect(options.redirectTo).toContain(window.location.origin);
  });

  it('succeeds regardless, so it cannot be used to discover registered addresses', async () => {
    const auth = await loadAuth();
    await expect(auth.requestPasswordReset('nobody@nowhere.com')).resolves.toBeUndefined();
  });

  it('clears the recovery flag once a new password is set', async () => {
    const auth = await loadAuth();
    auth.passwordRecovery.set(true);

    await auth.updatePassword('brand-new-password');

    expect(get(auth.passwordRecovery)).toBe(false);
    expect(authCalls.updateUser).toHaveBeenCalledWith({ password: 'brand-new-password' });
  });

  it('explains an expired link rather than showing the raw error', async () => {
    const auth = await loadAuth();
    authCalls.updateUser = vi.fn(async () => ({
      data: {}, error: { message: 'Invalid token: token has expired' },
    }));

    await expect(auth.updatePassword('whatever123')).rejects.toThrow(/expired/i);
  });

  it('leaves the flag set when the update fails, so the form stays up', async () => {
    const auth = await loadAuth();
    auth.passwordRecovery.set(true);
    authCalls.updateUser = vi.fn(async () => ({ data: {}, error: { message: 'nope' } }));

    await expect(auth.updatePassword('whatever123')).rejects.toThrow();
    expect(get(auth.passwordRecovery)).toBe(true);
  });

  it('can be abandoned without changing anything', async () => {
    const auth = await loadAuth();
    auth.passwordRecovery.set(true);
    auth.cancelPasswordRecovery();

    expect(get(auth.passwordRecovery)).toBe(false);
    expect(authCalls.updateUser).not.toHaveBeenCalled();
  });

  it('starts with no recovery in progress', async () => {
    const auth = await loadAuth();
    expect(get(auth.passwordRecovery)).toBe(false);
  });
});
