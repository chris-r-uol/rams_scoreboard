/**
 * Scoreboard state store with BroadcastChannel sync.
 *
 * CLOCK ARCHITECTURE: Only the tab that initiates a clock start/stop
 * actually runs the interval. The "role" field tracks whether this tab
 * is the clock leader. Clock ticks are broadcast as state updates so
 * all other tabs (Overlay, etc.) stay perfectly in sync without running
 * their own intervals.
 */

import { writable, get } from 'svelte/store';

// ── Default state ────────────────────────────────────────
const DEFAULT_STATE = {
  // Teams
  homeName: 'HOME',
  awayName: 'AWAY',
  homeScore: 0,
  awayScore: 0,
  possession: 'home', // 'home' | 'away'
  homeTimeouts: 3,
  awayTimeouts: 3,

  // Branding
  homePrimary: '#002244',
  homeSecondary: '#869397',
  homeText: '#FFFFFF',
  awayPrimary: '#AA0000',
  awaySecondary: '#FFB612',
  awayText: '#FFFFFF',

  // Clocks
  gameClockSeconds: 900, // 15:00
  gameClockRunning: false,
  playClockSeconds: 40,
  playClockRunning: false,

  // Game state
  quarter: 1,
  down: 1,
  distance: 10,
  ballOn: '50',

  // Flag state
  flagThrown: false,
};

// ── Create writable store ────────────────────────────────
function createScoreboardStore() {
  const { subscribe, set, update } = writable({ ...DEFAULT_STATE });

  const channel = new BroadcastChannel('scoreboard-sync');

  // When we receive state from another tab, apply it directly
  // (no re-broadcast to avoid loops)
  channel.onmessage = (event) => {
    if (event.data?.type === 'state-update') {
      set(event.data.state);
    }
  };

  function broadcast(state) {
    channel.postMessage({ type: 'state-update', state });
  }

  return {
    subscribe,
    /** Full replace — broadcasts */
    set(newState) {
      set(newState);
      broadcast(newState);
    },
    /** Functional update — broadcasts */
    update(fn) {
      update((current) => {
        const next = fn(current);
        broadcast(next);
        return next;
      });
    },
    /** Merge partial fields — broadcasts */
    patch(partial) {
      update((current) => {
        const next = { ...current, ...partial };
        broadcast(next);
        return next;
      });
    },
    /** Silent update — does NOT broadcast (for clock ticks from leader) */
    _tickUpdate(fn) {
      update(fn);
    },
    /** Silent set — does NOT broadcast (for receiving from channel) */
    _silentSet(state) {
      set(state);
    },
    reset() {
      const fresh = { ...DEFAULT_STATE };
      set(fresh);
      broadcast(fresh);
    },
    get() {
      return get({ subscribe });
    },
  };
}

export const scoreboard = createScoreboardStore();

// ── Clock Leader Logic ───────────────────────────────────
// Only the Controller tab should call startClockLeader().
// The Overlay never starts intervals — it just receives state.

let gameClockInterval = null;
let playClockInterval = null;

function tickGameClock() {
  const s = scoreboard.get();
  if (!s.gameClockRunning) return;

  if (s.gameClockSeconds <= 0) {
    scoreboard.patch({ gameClockRunning: false, gameClockSeconds: 0 });
    stopGameClockInterval();
    return;
  }
  // Use patch (which broadcasts) so overlay stays in sync
  scoreboard.patch({ gameClockSeconds: s.gameClockSeconds - 1 });
}

function tickPlayClock() {
  const s = scoreboard.get();
  if (!s.playClockRunning) return;

  if (s.playClockSeconds <= 0) {
    scoreboard.patch({ playClockRunning: false, playClockSeconds: 0 });
    stopPlayClockInterval();
    return;
  }
  scoreboard.patch({ playClockSeconds: s.playClockSeconds - 1 });
}

export function startGameClockInterval() {
  if (gameClockInterval) return;
  gameClockInterval = setInterval(tickGameClock, 1000);
}

export function stopGameClockInterval() {
  if (gameClockInterval) {
    clearInterval(gameClockInterval);
    gameClockInterval = null;
  }
}

export function startPlayClockInterval() {
  if (playClockInterval) return;
  playClockInterval = setInterval(tickPlayClock, 1000);
}

export function stopPlayClockInterval() {
  if (playClockInterval) {
    clearInterval(playClockInterval);
    playClockInterval = null;
  }
}

// ── Helpers ──────────────────────────────────────────────
export function formatGameClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function quarterLabel(q) {
  if (q <= 4) return `Q${q}`;
  return 'OT';
}

export function downLabel(down, distance) {
  const ordinal = ['1st', '2nd', '3rd', '4th'][down - 1] || `${down}th`;
  return `${ordinal} & ${distance}`;
}
