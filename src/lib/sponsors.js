/**
 * Sponsor panels.
 *
 * Two independent controls, which can be combined:
 *
 *   WHEN it shows   always · only while the clock is stopped · manually
 *   WHICH one shows a single logo, or several rotating on a timer
 *
 * "While the clock is stopped" is the useful event trigger because it is a
 * state the scoreboard already knows exactly, and it maps to how sponsors
 * actually appear in sport — during breaks in play, not over live action.
 * Inferring richer events (half-time, timeouts) from state changes would be
 * guesswork by comparison.
 *
 * BOTH visibility and rotation are derived locally on each client from the
 * broadcast state, the same way clocks are. Nothing is broadcast per rotation,
 * so a sponsor cycling every 10 seconds costs no messages at all.
 */

export const SPONSOR_PLACEMENTS = ['below', 'above', 'left', 'right'];

export const SPONSOR_VISIBILITY = [
  { id: 'always', label: 'Always on screen' },
  { id: 'clock-stopped', label: 'Only while the clock is stopped' },
  { id: 'manual', label: 'Only when I turn it on' },
];

/** Sensible cycle lengths; 0 means show the first sponsor and stay there. */
export const ROTATION_CHOICES = [0, 10, 15, 30, 60];

/** Keeps the broadcast payload sane — every sponsor rides on every heartbeat. */
export const MAX_SPONSORS = 6;

export const DEFAULTS = {
  sponsors: [],
  sponsorPlacement: 'below',
  sponsorVisibility: 'always',
  sponsorManualOn: false,
  sponsorRotateSeconds: 0,
  sponsorRotateAnchorMs: null,
};

/**
 * Should a sponsor be on screen right now?
 *
 * @param {object} state broadcast scoreboard state
 */
export function sponsorVisible(state) {
  const list = state?.sponsors;
  if (!Array.isArray(list) || list.length === 0) return false;

  switch (state.sponsorVisibility) {
    case 'manual':
      return !!state.sponsorManualOn;
    case 'clock-stopped':
      // Sponsors belong in the breaks, not over live play.
      return !state.gameClockRunning;
    default:
      return true;
  }
}

/**
 * Which sponsor is showing, derived from elapsed time rather than a broadcast
 * index — so rotation costs nothing and every client agrees without syncing.
 *
 * @param {object} state
 * @param {number} now wall clock, already corrected for host skew by the caller
 */
export function currentSponsor(state, now = Date.now()) {
  const list = state?.sponsors ?? [];
  if (list.length === 0) return null;

  const seconds = Number(state.sponsorRotateSeconds) || 0;
  const anchor = state.sponsorRotateAnchorMs;

  if (seconds <= 0 || list.length === 1 || anchor == null) return list[0];

  const elapsed = Math.max(0, now - anchor);
  const step = Math.floor(elapsed / (seconds * 1000));
  return list[step % list.length];
}

/** A sponsor entry from an image, ready to put in state. */
export function makeSponsor(name, image) {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: (name || '').trim() || 'Sponsor',
    image,
  };
}
