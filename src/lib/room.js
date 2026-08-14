/**
 * Overlay room addressing.
 *
 * The Overlay runs unauthenticated inside an OBS Browser Source, so it cannot
 * derive the account it belongs to — the room id travels in the URL instead:
 *
 *   https://your-app.vercel.app/#/overlay?r=<account-id>
 *
 * Because the app uses hash routing, the query string lives *inside* the hash.
 * `parseHash` splits it so route matching still works on the path alone.
 */

export const ROOM_PARAM = 'r';
export const TOKEN_PARAM = 't';

// ── Phone remote pairing ─────────────────────────────────
//
// The pairing token is a capability: holding it means being able to change the
// scoreboard. It is therefore deliberately NOT derived from the account id,
// which is public in the OBS overlay URL — otherwise sharing an overlay link
// would hand over control of the game.
//
// Kept on the device rather than the account so it can be rotated instantly
// without a round trip, which is what an operator wants if a link leaks
// mid-tournament.
const TOKEN_KEY = 'scoreboard-remote-token-v1';

function randomToken() {
  // 128 bits, hex-encoded. Guessing one is not a realistic attack on a channel
  // name, and it never appears in the overlay URL.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The current pairing token, creating one on first use. */
export function getRemoteToken() {
  try {
    let t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = randomToken();
      localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch (_) {
    // Storage blocked — pair for this session only.
    return randomToken();
  }
}

/** Invalidate every paired phone by issuing a new token. */
export function rotateRemoteToken() {
  const t = randomToken();
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch (_) {}
  return t;
}

/** Read the pairing token from the current URL, or null. */
export function getTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  return parseHash(window.location.hash).params.get(TOKEN_PARAM) || null;
}

/** Build the pairing URL to open on a phone — the compact remote. */
export function buildRemoteUrl(token) {
  if (typeof window === 'undefined' || !token) return '';
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/remote?${TOKEN_PARAM}=${encodeURIComponent(token)}`;
}

/**
 * Build the pairing URL for a full co-controller on another computer.
 *
 * Same token as the phone remote: both are write access to the same game, so
 * splitting them into separate secrets would imply a distinction that does not
 * exist while doubling what has to be rotated when one leaks.
 */
export function buildJoinUrl(token) {
  if (typeof window === 'undefined' || !token) return '';
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/join?${TOKEN_PARAM}=${encodeURIComponent(token)}`;
}

/**
 * Split a hash into its path and query parts.
 * `#/overlay?r=abc` → { path: '#/overlay', params: URLSearchParams }
 *
 * @param {string} hash
 * @returns {{ path: string, params: URLSearchParams }}
 */
export function parseHash(hash) {
  const raw = hash || '#/';
  const qIndex = raw.indexOf('?');
  if (qIndex === -1) {
    return { path: raw, params: new URLSearchParams() };
  }
  return {
    path: raw.slice(0, qIndex),
    params: new URLSearchParams(raw.slice(qIndex + 1)),
  };
}

/** Read the room id from the current URL, or null if absent. */
export function getRoomFromUrl() {
  if (typeof window === 'undefined') return null;
  return parseHash(window.location.hash).params.get(ROOM_PARAM) || null;
}

/**
 * Build the full overlay URL to paste into an OBS Browser Source.
 * @param {string} roomId
 * @returns {string}
 */
export function buildOverlayUrl(roomId) {
  if (typeof window === 'undefined' || !roomId) return '';
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/overlay?${ROOM_PARAM}=${encodeURIComponent(roomId)}`;
}
