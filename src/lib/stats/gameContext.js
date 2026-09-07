/**
 * The seam between the scoreboard and the stats engine.
 *
 * The two halves of this product own different things and neither duplicates
 * the other: the scoreboard owns live game state — score, clock, period, down —
 * while the stats engine owns the event log and everything derived from it.
 *
 * Where they meet is `StatEvent.quarter` and `StatEvent.gameClock`. In the
 * standalone stats project both were optional strings, because nothing there
 * knew the clock; an operator had to type them or leave them blank. Here the
 * scoreboard knows both exactly, so every recorded event can be stamped with
 * the real game situation without anyone entering anything.
 *
 * That is the whole argument for merging rather than integrating: stats stop
 * being a parallel record of the game and become part of the same one.
 */

import { formatGameClock, quarterLabel, periodLabel, halfLabel } from '../store.js';

/**
 * Period label appropriate to the sport being scored.
 *
 * The stats engine is American football only, but the scoreboard is not, and a
 * stat recorded while hockey is selected should not be labelled "Q2".
 */
function periodFor(state) {
  switch (state?.sport) {
    case 'american-football':
    case 'basketball':
      return quarterLabel(state.quarter ?? 1);
    case 'ice-hockey':
      return periodLabel(state.period ?? 1);
    case 'soccer':
      return halfLabel(state.half ?? 1);
    default:
      return undefined;
  }
}

/**
 * Build the game context to stamp onto a stat event.
 *
 * Returns only the fields it can actually fill: an event recorded before a
 * sport is chosen carries no false precision, and `StatEvent` treats both as
 * optional precisely so that is representable.
 *
 * @param {object} state scoreboard state
 * @returns {{ quarter?: string, gameClock?: string }}
 */
export function gameContextFrom(state) {
  if (!state?.sport) return {};

  const context = {};

  const period = periodFor(state);
  if (period) context.quarter = period;

  if (typeof state.gameClockSeconds === 'number') {
    context.gameClock = formatGameClock(state.gameClockSeconds);
  }

  return context;
}

/**
 * Stamp an event with the situation it happened in.
 *
 * Any context already on the event wins — a correction entered after the fact
 * should not be silently relabelled with the clock as it reads now.
 *
 * @param {object} event partial stat event
 * @param {object} state scoreboard state
 */
export function withGameContext(event, state) {
  return { ...gameContextFrom(state), ...event };
}
