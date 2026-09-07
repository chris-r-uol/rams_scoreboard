/**
 * Stat tracking state.
 *
 * Ported from the standalone stats project and rebuilt on this app's own
 * patterns: a Svelte store rather than runes, Supabase Realtime rather than a
 * local HTTP endpoint, and the account's room rather than a shared LAN secret.
 *
 * DERIVED, NEVER ACCUMULATED
 *   Player stats, team stats, drives and fired milestones are recomputed from
 *   `events` on every change. Nothing is incremented in place. That is what
 *   makes undo, delete and edit correct without per-action reversal logic:
 *   change the events, re-derive everything.
 *
 * WHAT TRAVELS
 *   Only the source of truth — the event log, roster, team and overlay
 *   selection. Everything derived is left behind and recomputed by whoever
 *   receives it. A late-game log is a few dozen kilobytes; the player and team
 *   stats derived from it would roughly double that for no added information.
 *   Same discipline as the scoreboard's clock anchors: send the source, derive
 *   the display.
 *
 * SEPARATE FROM THE SCOREBOARD
 *   Kept as its own store rather than folded into scoreboard state. The two
 *   change on completely different rhythms — a clock ticks continuously, a stat
 *   is entered every few plays — and the scoreboard re-broadcasts itself every
 *   five seconds as a late-join safety net. Putting an ever-growing event log
 *   on that heartbeat would re-send the whole match every five seconds.
 */

import { writable, get } from 'svelte/store';
import { sendStats } from './realtime.js';
import { calculateStats } from './stats/calculateStats.ts';
import { recalculateDrives } from './stats/drives.ts';
import { reconcileMilestones } from './stats/alertDetection.ts';
import { emptyTeamStats } from './stats/emptyStats.ts';

const PERSIST_KEY = 'scoreboard-stats-v1';
const PERSIST_MAX_AGE_MS = 6 * 60 * 60 * 1000; // matches the scoreboard's game

/** Fields recomputed from `events`; never sent, never persisted. */
const DERIVED_FIELDS = ['playerStats', 'teamStats', 'currentDrive', 'completedDrives'];

export function createEmptyStats() {
  return {
    gameId: '',
    gameDate: new Date().toISOString().slice(0, 10),
    venue: '',
    team: {
      name: 'HOME',
      abbreviation: 'HOME',
      primaryColour: '#002244',
      secondaryColour: '#869397',
      textColor: '#FFFFFF',
    },
    roster: [],
    events: [],
    playerStats: {},
    teamStats: emptyTeamStats(),
    overlayMode: 'hidden',
    leaderboardCategory: 'rushing',
    selectedOverlayPlayers: [],
    alertQueue: [],
    firedMilestones: [],
    currentDrive: null,
    completedDrives: [],
    lastUpdated: Date.now(),
  };
}

/**
 * Recompute everything that follows from `events`.
 *
 * Anything that mutates the log must go through here.
 */
function derive(next) {
  const { playerStats, teamStats } = calculateStats(next.roster ?? [], next.events ?? []);
  const { currentDrive, completedDrives } = recalculateDrives(
    next.currentDrive ?? null,
    next.completedDrives ?? [],
    next.events ?? [],
  );
  return {
    ...next,
    playerStats,
    teamStats,
    currentDrive,
    completedDrives,
    firedMilestones: reconcileMilestones(next.firedMilestones ?? [], playerStats),
  };
}

/** Strip derived fields before sending or saving. */
function toWire(state) {
  const wire = { ...state };
  for (const field of DERIVED_FIELDS) delete wire[field];
  return wire;
}

/**
 * Rebuild a full state from a wire payload.
 *
 * Merged onto a fresh empty state so a sender on an older build — or anything
 * else that can reach the channel — cannot crash the derive step with a payload
 * missing a field.
 */
function fromWire(wire) {
  return derive({ ...createEmptyStats(), ...wire });
}

function createStatsStore() {
  const { subscribe, set } = writable(derive(createEmptyStats()));

  let isController = false;
  let forwardToHost = null;

  function persist(state) {
    if (!isController) return;
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({ savedAt: Date.now(), stats: toWire(state) }));
    } catch (_) {
      // Storage full or blocked — persistence is a safety net, not a dependency.
    }
  }

  /** Apply locally, then fan out. */
  function commit(next) {
    const derived = derive({ ...next, lastUpdated: Date.now() });

    if (forwardToHost) {
      // A co-controller owns nothing. Apply locally so the operator sees the
      // entry immediately, and let the host's echo be authoritative.
      set(derived);
      forwardToHost({ kind: 'stats', stats: toWire(derived) });
      return;
    }

    set(derived);
    persist(derived);
    sendStats(toWire(derived));
  }

  return {
    subscribe,

    /** Mark this client as owning the stats: persists and answers requests. */
    becomeController() {
      isController = true;
    },

    /** Route changes to the host instead of owning them. */
    setFollowerTransport(send) {
      forwardToHost = send;
    },

    /** Apply state from the host or another device. Never echoed back. */
    applyRemote(wire) {
      if (!wire) return;
      set(fromWire(wire));
    },

    /** The wire form, for answering a request for a snapshot. */
    wire() {
      return toWire(get({ subscribe }));
    },

    /**
     * Re-send the current stats without changing them.
     *
     * Used after adopting a co-controller's entry, so every other device and
     * the overlay converge on the host's copy rather than only the sender's.
     */
    republish() {
      if (forwardToHost) return;
      sendStats(toWire(get({ subscribe })));
    },

    // ── Mutations ─────────────────────────────────────────
    addEvent(event) {
      const current = get({ subscribe });
      commit({ ...current, events: [...current.events, event] });
    },

    removeEvent(eventId) {
      const current = get({ subscribe });
      commit({ ...current, events: current.events.filter((e) => e.id !== eventId) });
    },

    updateEvent(eventId, changes) {
      const current = get({ subscribe });
      commit({
        ...current,
        events: current.events.map((e) => (e.id === eventId ? { ...e, ...changes } : e)),
      });
    },

    /**
     * Put a deleted event back where it was.
     *
     * Restores by index rather than appending, because the log is read in
     * order — an entry reinstated at the end would appear to have happened
     * after plays that actually followed it.
     */
    restoreEvent(event, index) {
      const current = get({ subscribe });
      const events = [...current.events];
      events.splice(Math.max(0, Math.min(index, events.length)), 0, event);
      commit({ ...current, events });
    },

    /** Take back the most recent entry. */
    undoLastEvent() {
      const current = get({ subscribe });
      if (current.events.length === 0) return false;
      commit({ ...current, events: current.events.slice(0, -1) });
      return true;
    },

    setRoster(roster) {
      commit({ ...get({ subscribe }), roster });
    },

    setTeam(team) {
      const current = get({ subscribe });
      commit({ ...current, team: { ...current.team, ...team } });
    },

    patch(partial) {
      commit({ ...get({ subscribe }), ...partial });
    },

    /** Clear the game, keeping the roster and team branding. */
    resetGame() {
      const current = get({ subscribe });
      commit({
        ...createEmptyStats(),
        team: current.team,
        roster: current.roster,
      });
    },

    // ── Persistence ───────────────────────────────────────
    restorePersisted() {
      try {
        const raw = localStorage.getItem(PERSIST_KEY);
        if (!raw) return false;

        const { savedAt, stats } = JSON.parse(raw);
        if (!stats || !savedAt) return false;
        if (Date.now() - savedAt > PERSIST_MAX_AGE_MS) return false;
        if (!Array.isArray(stats.events) || stats.events.length === 0) return false;

        const restored = fromWire(stats);
        set(restored);
        sendStats(toWire(restored));
        return true;
      } catch (_) {
        return false;
      }
    },

    get() {
      return get({ subscribe });
    },
  };
}

export const stats = createStatsStore();
