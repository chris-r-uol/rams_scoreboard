/**
 * Auth + subscription store.
 *
 * Exposes reactive state for the current user session and subscription status.
 * All auth flows go through Supabase Auth (Google OAuth provider).
 * Subscription status is read from the `subscriptions` table in Supabase,
 * which is kept up-to-date by the Stripe webhook Edge Function.
 */

import { writable, derived } from 'svelte/store';
import { supabase } from './supabase.js';

const AUTH_TIMEOUT_MS = 8000;
const SUBSCRIPTION_TIMEOUT_MS = 8000;
const LOCAL_AUTH_BYPASS =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const LOCAL_DEV_SESSION = {
  user: {
    id: 'local-dev-user',
    email: 'local@dev.local',
  },
};

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

// ── Session store ────────────────────────────────────────
export const session = writable(null);
export const loading = writable(true);
export const subscriptionStatus = writable(null); // 'active' | 'trialing' | 'past_due' | null

export const isAuthenticated = derived(session, ($s) => !!$s);
export const isSubscribed = derived(
  subscriptionStatus,
  ($status) => $status === 'active' || $status === 'trialing',
);
export const user = derived(session, ($s) => $s?.user ?? null);

// ── Plan ─────────────────────────────────────────────────
/**
 * The one sport available without a subscription.
 *
 * Ice hockey earns this slot: it exercises nearly every clock the product has
 * — period clock, two independent penalty timers — so the free tier
 * demonstrates the hard part of the product rather than a cut-down version of it.
 */
export const FREE_SPORT = 'ice-hockey';

/** 'pro' unlocks every sport and removes the overlay watermark. */
/**
 * True once we actually know the answer, as opposed to not having asked yet.
 *
 * The subscription lookup is deliberately non-blocking so startup cannot hang
 * on it, which means there is a window on every load where the status is simply
 * unknown. Without this flag that window is indistinguishable from "no
 * subscription", and a paying account is briefly treated as free.
 */
export const subscriptionResolved = writable(false);

/**
 * 'pro' | 'free' | null, where null means "not known yet".
 *
 * Callers must treat null as "wait" rather than "free". Getting this wrong is
 * not cosmetic: the Controller resets any sport the plan does not allow, so
 * assuming free before the answer arrives wipes a Pro user's sport on every
 * reload, mid-match included.
 */
export const plan = derived(
  [isSubscribed, subscriptionResolved],
  ([$subscribed, $resolved]) => ($resolved ? ($subscribed ? 'pro' : 'free') : null),
);

/** Whether a given sport is playable on the current plan. */
export function sportAllowedOn(planName, sportId) {
  return planName === 'pro' || sportId === FREE_SPORT;
}

/**
 * Which account state the local dev bypass should simulate.
 *
 * The product now behaves differently for signed-out visitors, free accounts
 * and subscribers, so a bypass pinned to one of them leaves the other two
 * untestable locally. Switch with, in the console:
 *
 *   localStorage.setItem('dev-plan', 'free');  // or 'pro', or 'signed-out'
 *
 * Dev-only: the whole bypass is already gated on import.meta.env.DEV plus a
 * localhost hostname, and is tree-shaken out of production builds.
 */
function devPlan() {
  try {
    return localStorage.getItem('dev-plan') || 'pro';
  } catch (_) {
    return 'pro';
  }
}

function applyLocalAuthBypass() {
  const mode = devPlan();

  if (mode === 'signed-out') {
    session.set(null);
    subscriptionStatus.set(null);
    subscriptionResolved.set(true);
    loading.set(false);
    return;
  }

  session.set(LOCAL_DEV_SESSION);
  subscriptionStatus.set(mode === 'free' ? null : 'active');
  subscriptionResolved.set(true);
  loading.set(false);
}

// ── Initialise session on load ───────────────────────────
async function init() {
  if (LOCAL_AUTH_BYPASS) {
    applyLocalAuthBypass();
    return;
  }

  if (!supabase) {
    subscriptionResolved.set(true);
    loading.set(false);
    return;
  }
  let currentSession = null;
  try {
    const { data: { session: initialSession } } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS,
      'Auth session fetch',
    );
    currentSession = initialSession;
    session.set(currentSession);
  } catch (err) {
    console.error('[auth] Failed to get session:', err);
  } finally {
    // Never block UI gating on network-heavy calls.
    loading.set(false);
  }

  // Fetch subscription status in the background so startup cannot hang.
  // Until it lands, `plan` reports null — "not known yet" — which callers must
  // treat as "wait", never as "free".
  if (currentSession?.user) {
    fetchSubscription(currentSession.user.id);
  } else {
    // No session, so there is nothing to look up: the answer is known.
    subscriptionResolved.set(true);
  }

  // Listen for auth state changes (login, logout, token refresh)
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    session.set(newSession);

    if (newSession?.user) {
      await fetchSubscription(newSession.user.id);

      // After OAuth sign-in, redirect away from the token-laden hash
      if (event === 'SIGNED_IN' && !window.location.hash.startsWith('#/')) {
        window.location.hash = '#/';
      }
    } else {
      subscriptionStatus.set(null);
      subscriptionResolved.set(true);
    }
  });
}

// ── Subscription lookup ──────────────────────────────────
async function fetchSubscription(userId) {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      SUBSCRIPTION_TIMEOUT_MS,
      'Subscription fetch',
    );

    if (error) {
      console.error('[auth] Subscription query failed:', error.message);
      subscriptionStatus.set(null);
      return;
    }

    subscriptionStatus.set(data?.status ?? null);
  } catch (err) {
    console.error('[auth] Subscription fetch error:', err);
    subscriptionStatus.set(null);
  } finally {
    // Resolved either way. A failed lookup means we genuinely do not know of a
    // subscription, which is the same outcome as not having one — but it must
    // still unblock, or the controller would wait forever.
    subscriptionResolved.set(true);
  }
}

// ── Public API ───────────────────────────────────────────

/** Sign in with Google via Supabase OAuth */
export async function signInWithGoogle() {
  if (LOCAL_AUTH_BYPASS) return;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });
  if (error) {
    console.error('[auth] Google sign-in failed:', error.message);
    throw error;
  }
}

/** Sign out */
export async function signOut() {
  if (LOCAL_AUTH_BYPASS) {
    applyLocalAuthBypass();
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[auth] Sign-out failed:', error.message);
  }
  session.set(null);
  subscriptionStatus.set(null);
}

/** Redirect user to Stripe Checkout via Edge Function */
export async function startCheckout(priceId) {
  if (LOCAL_AUTH_BYPASS) {
    return;
  }

  const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
  if (userError || !currentUser) {
    throw new Error('Session invalid. Please sign out and sign in again.');
  }

  const { data: { session: currentSession } } = await supabase.auth.getSession();
  if (!currentSession?.access_token) {
    throw new Error('Missing access token. Please sign out and sign in again.');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response;
  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSession.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        priceId,
        successUrl: `${window.location.origin}${window.location.pathname}#/subscribe/success`,
        cancelUrl: `${window.location.origin}${window.location.pathname}#/subscribe`,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Checkout request timed out. Check Edge Function logs and Stripe secret configuration.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Checkout creation failed (${response.status})`;
    console.error('[auth] Checkout creation failed:', message);
    throw new Error(message);
  }

  const { url } = payload || {};
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL returned');
  }
}

/** Refresh subscription status from database */
export async function refreshSubscription() {
  if (LOCAL_AUTH_BYPASS) {
    subscriptionStatus.set('active');
    return;
  }

  const { data: { session: currentSession } } = await supabase.auth.getSession();
  if (currentSession?.user) {
    await fetchSubscription(currentSession.user.id);
  }
}

// Kick off on import
init();
