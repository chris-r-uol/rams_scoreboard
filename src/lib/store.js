/**
 * Scoreboard state store — multi-sport, tri-sync.
 *
 * SYNC STRATEGY (all three run simultaneously; each covers a different gap):
 *
 *   BroadcastChannel  — always active; syncs between any tabs/windows sharing
 *                       the same browser process.  Covers the common case of
 *                       Controller and Overlay both open in Chrome/Safari.
 *
 *   Supabase Realtime — the transport that works for the hosted build.  An OBS
 *                       Browser Source is a separate Chromium process on a
 *                       possibly different machine, so this is the only channel
 *                       that reaches it over the network.  Requires a room id;
 *                       see room.js and realtime.js.
 *
 *   WebSocket relay   — local only; connects to ws://localhost:5199 when the
 *                       page is itself served from localhost (Tauri desktop app
 *                       or `npm run dev`).  Deliberately NOT attempted on the
 *                       hosted build: an insecure ws:// socket from an HTTPS
 *                       page is blocked as mixed content in Safari and Firefox,
 *                       and would otherwise retry forever in the background.
 *
 * Every outgoing state change is sent on all available channels.
 * Incoming messages are applied silently (no re-broadcast) to avoid loops.
 *
 * CLOCK ARCHITECTURE:
 *   Only the Controller tab runs clock intervals.  Every tick is broadcast
 *   so the Overlay never needs its own timers.
 */

import { writable, get } from 'svelte/store';
import { joinRoom, sendState, sendStateNow } from './realtime.js';

const WS_URL = 'ws://localhost:5199';
const BC_CHANNEL = 'scoreboard-sync';

// The localhost relay only exists when the app is served locally.
const IS_LOCAL_HOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// How often the Controller re-sends full state as a late-join safety net.
const HEARTBEAT_MS = 5000;

// ── Default state ────────────────────────────────────────
const DEFAULT_STATE = {
  // Sport selection
  sport: null, // null = not yet chosen

  // ── Shared team fields ──────────────────────────────
  homeName: 'HOME',
  awayName: 'AWAY',
  homeScore: 0,
  awayScore: 0,
  homePrimary: '#002244',
  homeSecondary: '#869397',
  homeText: '#FFFFFF',
  awayPrimary: '#AA0000',
  awaySecondary: '#FFB612',
  awayText: '#FFFFFF',

  // ── Clock infrastructure ────────────────────────────
  gameClockSeconds: 900,
  gameClockRunning: false,
  gameClockDirection: 'down', // 'down' or 'up'
  playClockSeconds: 40,
  playClockRunning: false,

  // ── American Football ───────────────────────────────
  possession: 'home',
  homeTimeouts: 3,
  awayTimeouts: 3,
  quarter: 1,
  down: 1,
  distance: 10,
  ballOn: '50',
  flagThrown: false,

  // ── Soccer ──────────────────────────────────────────
  half: 1,              // 1, 2, 3=ET1, 4=ET2
  addedTimeMinutes: 0,
  homeYellowCards: 0,
  homeRedCards: 0,
  awayYellowCards: 0,
  awayRedCards: 0,

  // ── Ice Hockey ──────────────────────────────────────
  period: 1,            // 1-3, 4=OT, 5=SO
  homePenaltySeconds: 0,
  awayPenaltySeconds: 0,
  homePenaltyRunning: false,
  awayPenaltyRunning: false,

  // ── Basketball ──────────────────────────────────────
  shotClockSeconds: 24,
  shotClockRunning: false,
  homeFouls: 0,
  awayFouls: 0,

  // ── Baseball ────────────────────────────────────────
  inning: 1,
  halfInning: 'top',
  outs: 0,
  balls: 0,
  strikes: 0,
  runnerFirst: false,
  runnerSecond: false,
  runnerThird: false,
  homeHits: 0,
  awayHits: 0,
  homeErrors: 0,
  awayErrors: 0,

  // ── Cricket ─────────────────────────────────────────
  battingTeam: 'home',
  innings: 1,
  wickets: 0,
  overs: 0,
  ballsInOver: 0,
  target: 0,
  homeWickets: 0,
  awayWickets: 0,
  homeOvers: 0,
  awayOvers: 0,
  homeBalls: 0,
  awayBalls: 0,

  // ── Magic: The Gathering ─────────────────────────────
  homeLife: 20,
  awayLife: 20,
  homePoison: 0,
  awayPoison: 0,
  homeCommanderDamage: 0,
  awayCommanderDamage: 0,
  homeCards: 7,
  awayCards: 7,
  // Commander extra players
  player3Name: 'Player 3',
  player3Primary: '#7c3aed',
  player3Secondary: '#5b21b6',
  player3Text: '#ffffff',
  player3Life: 40,
  player3Poison: 0,
  player3CommanderDamage: 0,
  player3Cards: 7,
  player4Name: 'Player 4',
  player4Primary: '#065f46',
  player4Secondary: '#064e3b',
  player4Text: '#ffffff',
  player4Life: 40,
  player4Poison: 0,
  player4CommanderDamage: 0,
  player4Cards: 7,
  turnNumber: 1,
  activePlayer: 'home',
  stormCount: 0,
  dayNight: 'neither', // 'neither' | 'day' | 'night'
  monarch: null,    // null | 'home' | 'away' | 'player3' | 'player4'
  initiative: null, // null | 'home' | 'away' | 'player3' | 'player4'
  mtgFormat: 'standard', // 'standard' (20 life, 2 players) | 'commander' (40 life, 4 players)
};

// Sport-specific field resets (applied on top of preserved team colours/names)
const SPORT_DEFAULTS = {
  'american-football': {
    gameClockSeconds: 900, gameClockDirection: 'down',
    playClockSeconds: 40,  playClockRunning: false,
    homeScore: 0, awayScore: 0,
    possession: 'home', homeTimeouts: 3, awayTimeouts: 3,
    quarter: 1, down: 1, distance: 10, ballOn: '50', flagThrown: false,
  },
  'soccer': {
    gameClockSeconds: 0, gameClockDirection: 'up',
    homeScore: 0, awayScore: 0,
    half: 1, addedTimeMinutes: 0,
    homeYellowCards: 0, homeRedCards: 0,
    awayYellowCards: 0, awayRedCards: 0,
  },
  'ice-hockey': {
    gameClockSeconds: 1200, gameClockDirection: 'down',
    homeScore: 0, awayScore: 0,
    period: 1, homeTimeouts: 1, awayTimeouts: 1,
    homePenaltySeconds: 0, awayPenaltySeconds: 0,
    homePenaltyRunning: false, awayPenaltyRunning: false,
  },
  'basketball': {
    gameClockSeconds: 600, gameClockDirection: 'down',
    homeScore: 0, awayScore: 0,
    quarter: 1, shotClockSeconds: 24, shotClockRunning: false,
    homeTimeouts: 5, awayTimeouts: 5,
    homeFouls: 0, awayFouls: 0, possession: 'home',
  },
  'baseball': {
    homeScore: 0, awayScore: 0,
    inning: 1, halfInning: 'top', outs: 0, balls: 0, strikes: 0,
    runnerFirst: false, runnerSecond: false, runnerThird: false,
    homeHits: 0, awayHits: 0, homeErrors: 0, awayErrors: 0,
  },
  'cricket': {
    homeScore: 0, awayScore: 0,
    battingTeam: 'home', innings: 1, wickets: 0, overs: 0, ballsInOver: 0,
    target: 0, homeWickets: 0, awayWickets: 0,
    homeOvers: 0, awayOvers: 0, homeBalls: 0, awayBalls: 0,
  },
  'mtg': {
    homeLife: 20, awayLife: 20,
    homePoison: 0, awayPoison: 0,
    homeCommanderDamage: 0, awayCommanderDamage: 0,
    homeCards: 7, awayCards: 7,
    player3Life: 40, player3Poison: 0, player3CommanderDamage: 0, player3Cards: 7,
    player4Life: 40, player4Poison: 0, player4CommanderDamage: 0, player4Cards: 7,
    turnNumber: 1, activePlayer: 'home', stormCount: 0,
    dayNight: 'neither',
    monarch: null, initiative: null,
    mtgFormat: 'standard',
  },
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
  // Skipped entirely on the hosted build, where the relay cannot exist.
  if (IS_LOCAL_HOST) connect();

  // ── Supabase Realtime ───────────────────────────────────
  let heartbeatTimer = null;

  /**
   * Join the Realtime room for this scoreboard.
   *
   * @param {string} roomId  account id — see room.js
   * @param {'host'|'viewer'} role  Controller hosts, Overlay views
   */
  function connectRealtime(roomId, role) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;

    joinRoom(roomId, {
      role,
      // Viewer: apply incoming state silently, then mirror it onto the
      // BroadcastChannel so any same-browser overlay tabs stay in sync too.
      onState: (incoming) => {
        set(incoming);
        bc?.postMessage({ type: 'state-update', state: incoming });
      },
      // Host: a viewer just joined and needs a snapshot immediately.
      onStateRequest: () => sendStateNow(get({ subscribe })),
    });

    // Host: re-send full state periodically so an overlay that missed the
    // handshake (or a controller that reloaded) converges within a few seconds.
    if (role === 'host') {
      heartbeatTimer = setInterval(() => sendState(get({ subscribe })), HEARTBEAT_MS);
    }
  }

  function broadcast(state) {
    // Always send on BroadcastChannel
    bc?.postMessage({ type: 'state-update', state });
    // Also send on WebSocket if relay is connected
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'state-update', state }));
    }
    // Also send over Supabase Realtime (coalesced; no-op unless hosting a room)
    sendState(state);
  }

  // ── Public API ────────────────────────────────────────
  return {
    subscribe,
    connectRealtime,
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
    // Reset to sport-specific defaults, preserving team names/colours
    resetSport(sport) {
      update((current) => {
        const defaults = SPORT_DEFAULTS[sport] ?? {};
        const next = {
          ...current,
          ...defaults,
          sport,
        };
        broadcast(next);
        return next;
      });
    },
    setSport(sport) {
      update((current) => {
        const defaults = SPORT_DEFAULTS[sport] ?? {};
        const next = {
          ...current,
          ...defaults,
          sport,
          // MTG commander: bump life to 40 for all 4 players
          ...(sport === 'mtg' && current.mtgFormat === 'commander'
            ? { homeLife: 40, awayLife: 40, player3Life: 40, player4Life: 40 }
            : {}),
        };
        broadcast(next);
        return next;
      });
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
let shotClockInterval = null;
let homePenaltyInterval = null;
let awayPenaltyInterval = null;

function tickGameClock() {
  const s = scoreboard.get();
  if (!s.gameClockRunning) return;
  if (s.gameClockDirection === 'up') {
    scoreboard.patch({ gameClockSeconds: s.gameClockSeconds + 1 });
  } else {
    if (s.gameClockSeconds <= 0) {
      scoreboard.patch({ gameClockRunning: false, gameClockSeconds: 0 });
      stopGameClockInterval();
      return;
    }
    scoreboard.patch({ gameClockSeconds: s.gameClockSeconds - 1 });
  }
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

function tickShotClock() {
  const s = scoreboard.get();
  if (!s.shotClockRunning) return;
  if (s.shotClockSeconds <= 0) {
    scoreboard.patch({ shotClockRunning: false, shotClockSeconds: 0 });
    stopShotClockInterval();
    return;
  }
  scoreboard.patch({ shotClockSeconds: s.shotClockSeconds - 1 });
}

function tickHomePenalty() {
  const s = scoreboard.get();
  if (!s.homePenaltyRunning) return;
  if (s.homePenaltySeconds <= 0) {
    scoreboard.patch({ homePenaltyRunning: false, homePenaltySeconds: 0 });
    stopHomePenaltyInterval();
    return;
  }
  scoreboard.patch({ homePenaltySeconds: s.homePenaltySeconds - 1 });
}

function tickAwayPenalty() {
  const s = scoreboard.get();
  if (!s.awayPenaltyRunning) return;
  if (s.awayPenaltySeconds <= 0) {
    scoreboard.patch({ awayPenaltyRunning: false, awayPenaltySeconds: 0 });
    stopAwayPenaltyInterval();
    return;
  }
  scoreboard.patch({ awayPenaltySeconds: s.awayPenaltySeconds - 1 });
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

export function startShotClockInterval() {
  if (shotClockInterval) return;
  shotClockInterval = setInterval(tickShotClock, 1000);
}

export function stopShotClockInterval() {
  if (shotClockInterval) {
    clearInterval(shotClockInterval);
    shotClockInterval = null;
  }
}

export function startHomePenaltyInterval() {
  if (homePenaltyInterval) return;
  homePenaltyInterval = setInterval(tickHomePenalty, 1000);
}

export function stopHomePenaltyInterval() {
  if (homePenaltyInterval) {
    clearInterval(homePenaltyInterval);
    homePenaltyInterval = null;
  }
}

export function startAwayPenaltyInterval() {
  if (awayPenaltyInterval) return;
  awayPenaltyInterval = setInterval(tickAwayPenalty, 1000);
}

export function stopAwayPenaltyInterval() {
  if (awayPenaltyInterval) {
    clearInterval(awayPenaltyInterval);
    awayPenaltyInterval = null;
  }
}

export function stopAllIntervals() {
  stopGameClockInterval();
  stopPlayClockInterval();
  stopShotClockInterval();
  stopHomePenaltyInterval();
  stopAwayPenaltyInterval();
}

// ── Helpers ──────────────────────────────────────────────
export function formatGameClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatSoccerClock(totalSeconds) {
  // Soccer displays minutes, rounding up after each full minute
  const m = Math.floor(totalSeconds / 60);
  return `${m}'`;
}

export function quarterLabel(q) {
  if (q <= 4) return `Q${q}`;
  return 'OT';
}

export function periodLabel(p) {
  if (p === 1) return '1st';
  if (p === 2) return '2nd';
  if (p === 3) return '3rd';
  if (p === 4) return 'OT';
  return 'SO';
}

export function halfLabel(h) {
  if (h === 1) return '1st Half';
  if (h === 2) return '2nd Half';
  if (h === 3) return 'ET 1st';
  return 'ET 2nd';
}

export function downLabel(down, distance) {
  const ordinal = ['1st', '2nd', '3rd', '4th'][down - 1] || `${down}th`;
  return `${ordinal} & ${distance}`;
}

export function inningLabel(inning, half) {
  const suffix = inning === 1 ? 'st' : inning === 2 ? 'nd' : inning === 3 ? 'rd' : 'th';
  return `${half === 'top' ? '▲' : '▼'} ${inning}${suffix}`;
}

export function formatOvers(overs, balls) {
  return `${overs}.${balls}`;
}

export function calcRunRate(runs, overs, balls) {
  const totalOvers = overs + balls / 6;
  if (totalOvers === 0) return '0.00';
  return (runs / totalOvers).toFixed(2);
}

export function calcRequiredRate(target, runs, overs, balls, totalOvers) {
  const ballsLeft = (totalOvers * 6) - (overs * 6 + balls);
  if (ballsLeft <= 0) return '—';
  const runsNeeded = target - runs;
  if (runsNeeded <= 0) return '—';
  return ((runsNeeded / (ballsLeft / 6))).toFixed(2);
}
