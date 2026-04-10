/**
 * Scoreboard state store with WebSocket relay sync.
 *
 * ARCHITECTURE:
 *   Controller (Chrome/Safari)  ──┐
 *                                  ├── ws://localhost:5199 (relay) ──► OBS Overlay
 *   Any other client               ┘
 *
 * The relay server (started by the Vite plugin) holds the latest state and
 * broadcasts every update to all connected clients. When OBS first loads the
 * overlay it immediately receives the current state so the scorebug is never
 * empty.
 *
 * CLOCK ARCHITECTURE:
 *   Only the Controller tab runs clock intervals. Every tick is broadcast via
 *   WebSocket so the Overlay never needs its own timers.
 */

import { writable, get } from 'svelte/store';

const WS_URL = 'ws://localhost:5199';

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

  // ── WebSocket relay connection ──────────────────────────
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    if (ws && ws.readyState < 2) return; // Already open or connecting

    try {
      ws = new WebSocket(WS_URL);
    } catch (_) {
      scheduleReconnect();
      return;
    }

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Silently apply incoming state — never re-broadcast to avoid loops
        if (msg.type === 'state-update') {
          set(msg.state);
        }
      } catch (_) {}
    });

    ws.addEventListener('close', scheduleReconnect);
    ws.addEventListener('error', () => ws.close());
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 2000);
  }

  function broadcast(state) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'state-update', state }));
    }
  }

  connect();

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
