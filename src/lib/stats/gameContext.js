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
 * Down and distance come too, but only in American football — the concept does
 * not exist in the other sports, and stamping a hockey stat with "1st & 10"
 * would be worse than leaving it blank. They are what makes first downs and
 * third-down conversions derivable without asking the operator to record the
 * same play twice.
 *
 * @param {object} state scoreboard state
 * @returns {{ quarter?: string, gameClock?: string, down?: number, distance?: number }}
 */
export function gameContextFrom(state) {
  if (!state?.sport) return {};

  const context = {};

  const period = periodFor(state);
  if (period) context.quarter = period;

  if (typeof state.gameClockSeconds === 'number') {
    context.gameClock = formatGameClock(state.gameClockSeconds);
  }

  if (state.sport === 'american-football') {
    if (typeof state.down === 'number') context.down = state.down;
    if (typeof state.distance === 'number') context.distance = state.distance;
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

/**
 * The stats team config, taken from the scoreboard's home team.
 *
 * Standalone, the stats project had its own team setup screen — name, colours,
 * logo — because nothing else knew them. The scoreboard already owns all of it,
 * so deriving here removes a whole duplicate settings screen and, more
 * importantly, removes the chance of the scorebug and the stats overlay
 * disagreeing about what the home side is called or what colour it is.
 *
 * `abbreviation` has no scoreboard equivalent, so it falls back to the name,
 * which is already short: the scorebug caps it at 12 characters.
 *
 * @param {object} state scoreboard state
 * @param {object} [existing] current stats team, for fields the scoreboard lacks
 */
export function teamConfigFrom(state, existing = {}) {
  return {
    ...existing,
    name: state?.homeName ?? existing.name ?? 'HOME',
    abbreviation: existing.abbreviation || state?.homeName || 'HOME',
    primaryColor: state?.homePrimary ?? existing.primaryColor ?? '#002244',
    secondaryColor: state?.homeSecondary ?? existing.secondaryColor ?? '#869397',
    textColor: state?.homeText ?? existing.textColor ?? '#FFFFFF',
    logoDataUrl: state?.homeLogo || existing.logoDataUrl || undefined,
  };
}
