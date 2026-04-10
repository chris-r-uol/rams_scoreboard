/**
 * Scoreboard state store — dual-sync: BroadcastChannel + optional WebSocket.
 *
 * SYNC STRATEGY:
 *
 *   BroadcastChannel  — always active; syncs between any tabs/windows sharing
 *                       the same browser process.  Covers the common case of
 *                       Controller and Overlay both open in Chrome/Safari.
 *
 *   WebSocket relay   — optional; connects to ws://localhost:5199 when a relay
 *                       is running.  Required for OBS Browser Source (OBS runs
 *                       a separate Chromium process that cannot receive
 *                       BroadcastChannel messages).
 *                       Start the relay with:  node relay.js
 *
 * Every outgoing state change is sent on both channels simultaneously.
 * Incoming messages are applied silently (no re-broadcast) to avoid loops.
 *
 * CLOCK ARCHITECTURE:
 *   Only the Controller tab runs clock intervals.  Every tick is broadcast
 *   so the Overlay never needs its own timers.
 */

import { writable, get } from 'svelte/store';

const WS_URL = 'ws://localhost:5199';
const BC_CHANNEL = 'scoreboard-sync';

// ── Default state ────────────────────────────────────────
const DEFAULT_STATE = {
  // Teams
  homeName: 'HOME',
  awayName: 'AWAY',
  homeScore: 0,
  awayScore: 0,
  possession: 'home',
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
  gameClockSeconds: 900,
  gameClockRunning: false,
  playClockSeconds: 40,
  playClockRunning: false,

  // Game state
  quarter: 1,
  down: 1,
  distance: 10,
  ballOn: '50',

  // Flags
  flagThrown: false,
};

// ── Store ────────────────────────────────────────────────
function createScoreboardStore() {
  const { subscribe, set, update } = writable({ ...DEFAULT_STATE });

  // ── BroadcastChannel ────────────────────────────────────
  let bc = null;
  try {
    bc = new BroadcastChannel(BC_CHANNEL);
    bc.addEventListener('message', (event) => {
      try {
        const msg = event.data;
        if (msg?.type === 'state-update') set(msg.state);
      } catch (_) {}
    });
  } catch (_) {
    // BroadcastChannel not supported (e.g. very old browser)
  }

  // ── WebSocket relay connection ──────────────────────────
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    if (ws && ws.readyState < 2) return; // already open or connecting

    try {
      ws = new WebSocket(WS_URL);
    } catch (_) {
      scheduleReconnect();
      return;
    }

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Apply incoming state — never re-broadcast on WS to avoid loops.
        // The BroadcastChannel is also notified so same-browser tabs stay in sync.
        if (msg.type === 'state-update') {
          set(msg.state);
          bc?.postMessage({ type: 'state-update', state: msg.state });
        }
      } catch (_) {}
    });

    ws.addEventListener('close', scheduleReconnect);
    ws.addEventListener('error', () => ws?.close());
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 2000);
  }

  // Start trying the WebSocket — silently retries in the background.
  // If no relay is running this is harmless; BroadcastChannel still works.
  connect();

  function broadcast(state) {
    // Always send on BroadcastChannel
    bc?.postMessage({ type: 'state-update', state });
    // Also send on WebSocket if relay is connected
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'state-update', state }));
    }
  }

  // ── Public API ────────────────────────────────────────
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

// ── Clock leader logic ───────────────────────────────────
// Intervals are started/stopped explicitly by the Controller only.
// Every tick calls scoreboard.patch() which broadcasts over WebSocket,
// so the Overlay receives each second without running its own timer.

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
