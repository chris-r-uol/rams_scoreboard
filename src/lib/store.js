/**
 * Scoreboard state store with BroadcastChannel sync.
 * Any tab (Controller or Overlay) that imports this module
 * shares the same reactive state via the channel.
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

  // BroadcastChannel for cross-tab sync
  const channel = new BroadcastChannel('scoreboard-sync');

  // Listen for incoming state from other tabs
  channel.onmessage = (event) => {
    if (event.data?.type === 'state-update') {
      set(event.data.state);
    }
  };

  // Broadcast current state to other tabs
  function broadcast(state) {
    channel.postMessage({ type: 'state-update', state });
  }

  return {
    subscribe,
    set(newState) {
      set(newState);
      broadcast(newState);
    },
    update(fn) {
      update((current) => {
        const next = fn(current);
        broadcast(next);
        return next;
      });
    },
    /** Patch one or more fields */
    patch(partial) {
      update((current) => {
        const next = { ...current, ...partial };
        broadcast(next);
        return next;
      });
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

// ── Game Clock tick logic ────────────────────────────────
let gameClockInterval = null;

scoreboard.subscribe((state) => {
  if (state.gameClockRunning && !gameClockInterval) {
    gameClockInterval = setInterval(() => {
      scoreboard.update((s) => {
        if (s.gameClockSeconds <= 0) {
          return { ...s, gameClockRunning: false, gameClockSeconds: 0 };
        }
        return { ...s, gameClockSeconds: s.gameClockSeconds - 1 };
      });
    }, 1000);
  } else if (!state.gameClockRunning && gameClockInterval) {
    clearInterval(gameClockInterval);
    gameClockInterval = null;
  }
});

// ── Play Clock tick logic ────────────────────────────────
let playClockInterval = null;

scoreboard.subscribe((state) => {
  if (state.playClockRunning && !playClockInterval) {
    playClockInterval = setInterval(() => {
      scoreboard.update((s) => {
        if (s.playClockSeconds <= 0) {
          return { ...s, playClockRunning: false, playClockSeconds: 0 };
        }
        return { ...s, playClockSeconds: s.playClockSeconds - 1 };
      });
    }, 1000);
  } else if (!state.playClockRunning && playClockInterval) {
    clearInterval(playClockInterval);
    playClockInterval = null;
  }
});

// ── Helpers ──────────────────────────────────────────────
export function formatGameClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function quarterLabel(q) {
  if (q <= 4) return `${q}`;
  return 'OT';
}

export function downLabel(down, distance) {
  const ordinal = ['1st', '2nd', '3rd', '4th'][down - 1] || `${down}th`;
  return `${ordinal} & ${distance}`;
}
