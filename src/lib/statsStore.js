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
import { recalculateDrives, isOffensiveAction } from './stats/drives.ts';
import { reconcileMilestones, detectAlerts } from './stats/alertDetection.ts';
import { emptyTeamStats } from './stats/emptyStats.ts';

const PERSIST_KEY = 'scoreboard-stats-v1';
const PERSIST_MAX_AGE_MS = 6 * 60 * 60 * 1000; // matches the scoreboard's game

/**
 * Fields recomputed from `events`; never sent, never persisted.
 *
 * Drives are deliberately NOT in here. A drive's plays and yards are derived —
 * `derive` recomputes both on every change — but the drive itself is not: its
 * start yard line, how it ended, and which plays belong to it exist nowhere in
 * the event log. Stripping them left the overlay's drive panel permanently
 * empty and would have lost every completed drive on a controller reload.
 */
const DERIVED_FIELDS = ['playerStats', 'teamStats'];

export function createEmptyStats() {
  return {
    gameId: '',
    gameDate: new Date().toISOString().slice(0, 10),
    venue: '',
    team: {
      name: 'HOME',
      abbreviation: 'HOME',
      primaryColor: '#002244',
      secondaryColor: '#869397',
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
  // Set by the scoreboard store: BroadcastChannel and the local dev relay, so
  // an overlay on the same machine gets stats without an account.
  let localSend = null;

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

    const wire = toWire(derived);
    set(derived);
    persist(derived);
    localSend?.(wire);
    sendStats(wire);
  }

  return {
    subscribe,

    /** Mark this client as owning the stats: persists and answers requests. */
    becomeController() {
      isController = true;
    },

    /**
     * Mark this client as a viewer: it owns nothing and takes what it is sent.
     *
     * The store is module scope, so ownership outlives the component that
     * claimed it. Hash-routing from the controller to the overlay does not
     * reload the page, which left an overlay still claiming to own the stats
     * and therefore refusing every update it was sent — the panel froze on
     * whatever was on air when the route changed.
     */
    becomeViewer() {
      isController = false;
    },

    /** Route changes to the host instead of owning them. */
    setFollowerTransport(send) {
      forwardToHost = send;
    },

    /** Also publish on the same-machine transports. See store.js. */
    setLocalTransport(send) {
      localSend = send;
    },

    /** Apply state from the host or another device. Never echoed back. */
    applyRemote(wire) {
      if (!wire) return;
      set(fromWire(wire));
    },

    /**
     * Whether this client owns the stats.
     *
     * Asked by the local transports before applying anything: the relay caches
     * the last stats it saw and replays them to whoever connects next, so an
     * overlay reloading mid-game can put an old copy back on the wire. The
     * owner adopting that would roll its own game backwards. Same rule as the
     * clock: the controller is the source, and never takes correction from a
     * client that is only repeating what it was told.
     */
    isOwner() {
      return isController;
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
      const wire = toWire(get({ subscribe }));
      localSend?.(wire);
      sendStats(wire);
    },

    // ── Mutations ─────────────────────────────────────────
    /**
     * Record a play, and raise any alert it earns.
     *
     * Alerts are detected here rather than in `derive` because they are events,
     * not a function of the log: a 40-yard run is a big play the moment it is
     * entered, and re-deriving the whole log must not put that card back on air
     * an hour later. The queue itself travels on the wire, so the overlay shows
     * exactly what the operator's device decided to show.
     */
    addEvent(event) {
      const current = get({ subscribe });
      const events = [...current.events, event];
      const { playerStats } = calculateStats(current.roster ?? [], events);

      // Queue behind anything still on air, so two big plays in a row are shown
      // in turn instead of the second replacing the first mid-display.
      const liveQueue = (current.alertQueue ?? []).filter((a) => a.expiresAt > Date.now());
      const queueTailExpiry = liveQueue.reduce((max, a) => Math.max(max, a.expiresAt), 0);

      const { alerts, newMilestoneKeys } = detectAlerts(
        event,
        playerStats,
        current.playerStats ?? {},
        current.firedMilestones ?? [],
        current.roster ?? [],
        queueTailExpiry,
      );

      // Attach the play to the open drive. Only offensive actions count, so a
      // drive's play total matches the offence's snap count rather than every
      // tackle and flag that happened while it was running.
      //
      // Only the id is stored: plays and yards are recomputed from the events
      // it still points at, which is what makes deleting a play mid-drive come
      // out right instead of leaving the totals a play ahead.
      let currentDrive = current.currentDrive;
      if (currentDrive && isOffensiveAction(event.action)) {
        currentDrive = { ...currentDrive, eventIds: [...currentDrive.eventIds, event.id] };
      }

      commit({
        ...current,
        events,
        currentDrive,
        alertQueue: [...liveQueue, ...alerts],
        firedMilestones: [...(current.firedMilestones ?? []), ...newMilestoneKeys],
      });
    },

    /**
     * Remove an event and retract what it caused.
     *
     * The alert goes with it: a mis-keyed touchdown that is deleted two seconds
     * later should not keep celebrating on air. Milestones need no special
     * handling — `derive` re-reconciles them against the recomputed stats.
     */
    removeEvent(eventId) {
      const current = get({ subscribe });
      commit({
        ...current,
        events: current.events.filter((e) => e.id !== eventId),
        alertQueue: (current.alertQueue ?? []).filter((a) => a.sourceEventId !== eventId),
      });
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

    /** Take back the most recent entry, and any alert it raised. */
    undoLastEvent() {
      const current = get({ subscribe });
      if (current.events.length === 0) return false;
      const last = current.events[current.events.length - 1];
      commit({
        ...current,
        events: current.events.slice(0, -1),
        alertQueue: (current.alertQueue ?? []).filter((a) => a.sourceEventId !== last.id),
      });
      return true;
    },

    /** Pull whatever is on air now, without touching the log behind it. */
    clearActiveAlert() {
      const current = get({ subscribe });
      commit({ ...current, alertQueue: [] });
    },

    setOverlayMode(mode) {
      commit({ ...get({ subscribe }), overlayMode: mode });
    },

    // ── Drives ────────────────────────────────────────────
    /** Open a drive. Plays entered from now on are attached to it. */
    startDrive(startYardLine) {
      const current = get({ subscribe });
      commit({
        ...current,
        currentDrive: {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          startTime: Date.now(),
          startYardLine: Number.isFinite(startYardLine) ? startYardLine : undefined,
          eventIds: [],
          yardsGained: 0,
          plays: 0,
          result: 'ongoing',
        },
      });
    },

    /** Close the open drive with how it finished. */
    endDrive(result) {
      const current = get({ subscribe });
      if (!current.currentDrive) return;
      commit({
        ...current,
        completedDrives: [
          ...current.completedDrives,
          { ...current.currentDrive, result, endTime: Date.now() },
        ],
        currentDrive: null,
      });
    },

    /**
     * Abandon the open drive.
     *
     * The plays stay in the log — they happened. Only the grouping is dropped,
     * which is what you want when a drive was started by mistake.
     */
    cancelDrive() {
      commit({ ...get({ subscribe }), currentDrive: null });
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
        const wire = toWire(restored);
        set(restored);
        localSend?.(wire);
        sendStats(wire);
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
