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
