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

// How often every client recomputes running clocks from their anchors.
const PROJECT_MS = 250;

// Persisted game state is only restored if it is fresher than this — resuming
// last week's match on a cold open would be worse than starting clean.
const PERSIST_KEY = 'scoreboard-state-v1';
const PERSIST_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Every clock in the app, described uniformly.
 *
 * `seconds` is what the UI renders and what every sport component already
 * reads. It is now a *derived* value: the source of truth is the anchor pair
 * (wall-clock ms + seconds remaining at that instant), from which the displayed
 * value is recomputed continuously.
 *
 * Counting interval fires instead — the previous approach — loses time whenever
 * a timer is delayed, and Chrome throttles timers on a hidden tab to roughly
 * once per minute after five minutes. A backgrounded controller (an operator
 * switching to OBS) would leave the clock minutes behind with nothing to
 * indicate it. Deriving from wall time makes that self-correcting.
 */
const CLOCKS = [
  {
    seconds: 'gameClockSeconds',
    running: 'gameClockRunning',
    anchorMs: 'gameClockAnchorMs',
    anchorSeconds: 'gameClockAnchorSeconds',
    direction: 'gameClockDirection',
    max: 5999,
  },
  { seconds: 'playClockSeconds', running: 'playClockRunning', anchorMs: 'playClockAnchorMs', anchorSeconds: 'playClockAnchorSeconds' },
  { seconds: 'shotClockSeconds', running: 'shotClockRunning', anchorMs: 'shotClockAnchorMs', anchorSeconds: 'shotClockAnchorSeconds' },
  { seconds: 'homePenaltySeconds', running: 'homePenaltyRunning', anchorMs: 'homePenaltyAnchorMs', anchorSeconds: 'homePenaltyAnchorSeconds' },
  { seconds: 'awayPenaltySeconds', running: 'awayPenaltyRunning', anchorMs: 'awayPenaltyAnchorMs', anchorSeconds: 'awayPenaltyAnchorSeconds' },
];

/**
 * Offset between this client's clock and the controller's, measured from the
 * timestamp carried on each broadcast. Without it, an overlay on a second
 * machine would project every clock off by that machine's clock skew.
 */
let hostClockSkewMs = 0;

/** True when the Controller recovered an in-progress game on load. */
export const gameResumed = writable(false);

/** True when a reset just happened, so the UI can offer to take it back. */
export const undoableReset = writable(false);

/** How many operator actions can be taken back. */
const UNDO_LIMIT = 40;

/** Number of undoable steps available, for enabling UI. */
export const undoDepth = writable(0);

/**
 * True on a co-controller: a second device running the full controller against
 * someone else's game. It shows the same controls but owns none of the state.
 */
export const followerMode = writable(false);

/** Re-anchor any clock whose seconds or running flag this patch touches. */
function withClockAnchors(current, partial) {
  const next = { ...partial };
  const now = Date.now();

  for (const c of CLOCKS) {
    const touchesSeconds = c.seconds in partial;
    const touchesRunning = c.running in partial;
    if (!touchesSeconds && !touchesRunning) continue;

    next[c.anchorMs] = now;
    next[c.anchorSeconds] = touchesSeconds ? partial[c.seconds] : current[c.seconds];
  }

  return next;
}

/**
 * Displayed seconds for a clock at a given instant, or null if it is not
 * running or has no anchor yet.
 */
function projectClock(c, state, hostNow) {
  if (!state[c.running] || state[c.anchorMs] == null) return null;

  const elapsed = Math.floor((hostNow - state[c.anchorMs]) / 1000);
  if (!Number.isFinite(elapsed) || elapsed < 0) return null;

  const countingUp = c.direction && state[c.direction] === 'up';
  const raw = countingUp
    ? state[c.anchorSeconds] + elapsed
    : state[c.anchorSeconds] - elapsed;

  return countingUp ? Math.min(raw, c.max ?? 359999) : Math.max(0, raw);
}

// ── Default state ────────────────────────────────────────
const DEFAULT_STATE = {
  // Sport selection
  sport: null, // null = not yet chosen

  // Plan of the account hosting this scoreboard. Broadcast so the Overlay —
  // which runs unauthenticated inside OBS and cannot look this up itself —
  // knows whether to render the free-tier watermark.
  //
  // null means "not established yet". Defaulting to 'free' put a watermark on a
  // paying subscriber's stream for the moment before their subscription
  // resolved, which is precisely when the source is being set up and looked at.
  plan: null,

  // Where the scorebug sits on the OBS canvas, and how large. Broadcast for
  // the same reason as `plan`. See overlayLayout.js.
  overlayPosition: 'bottom-center',
  overlayScale: 1,

  // ── Shared team fields ──────────────────────────────
  homeName: 'HOME',
  awayName: 'AWAY',
  homeScore: 0,
  awayScore: 0,
  // Team badges. Either an inline data URL (downscaled in the browser, no
  // storage backend involved) or an https link to an externally hosted image.
  // Empty means no badge. See logo.js.
  homeLogo: '',
  awayLogo: '',
  homePrimary: '#002244',
  homeSecondary: '#869397',
  homeText: '#FFFFFF',
  awayPrimary: '#AA0000',
  awaySecondary: '#FFB612',
  awayText: '#FFFFFF',

  // ── Clock infrastructure ────────────────────────────
  // *Seconds fields are derived for display; *AnchorMs / *AnchorSeconds are
  // the source of truth. See CLOCKS above.
  gameClockSeconds: 900,
  gameClockRunning: false,
  gameClockDirection: 'down', // 'down' or 'up'
  gameClockAnchorMs: null,
  gameClockAnchorSeconds: 900,
  playClockSeconds: 40,
  playClockRunning: false,
  playClockAnchorMs: null,
  playClockAnchorSeconds: 40,

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
  homePenaltyAnchorMs: null,
  homePenaltyAnchorSeconds: 0,
  awayPenaltyAnchorMs: null,
  awayPenaltyAnchorSeconds: 0,

  // ── Basketball ──────────────────────────────────────
  shotClockSeconds: 24,
  shotClockRunning: false,
  shotClockAnchorMs: null,
  shotClockAnchorSeconds: 24,
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

  // True on the Controller: this client drives the clocks, owns the saved copy
  // of the game, and acts as the reference clock for skew.
  let isController = false;

  // Rolling window of observed send→receive offsets, used to estimate how far
  // this machine's clock runs ahead of the controller's.
  let skewSamples = [];

  /**
   * Record a clock-skew sample from an incoming message.
   *
   * Takes the *minimum* recent offset rather than the latest. Some messages are
   * replays rather than live sends — the dev relay caches the last state and
   * replays it to every new connection, and the heartbeat re-sends state that
   * may be seconds old. Those carry an inflated offset that would otherwise be
   * mistaken for skew and shift every clock by that amount. A replay can only
   * ever be later than a live send, never earlier, so the minimum converges on
   * true skew plus one network hop.
   */
  function noteSkew(sentAt) {
    // The Controller is the reference clock; it never adjusts to anyone.
    if (isController || typeof sentAt !== 'number') return;

    skewSamples.push(Date.now() - sentAt);
    if (skewSamples.length > 12) skewSamples.shift();
    hostClockSkewMs = Math.min(...skewSamples);
  }

  /** Apply state received from another client. */
  function applyIncoming(state, sentAt) {
    noteSkew(sentAt);
    set(state);
  }

  // ── BroadcastChannel ────────────────────────────────────
  let bc = null;
  try {
    bc = new BroadcastChannel(BC_CHANNEL);
    bc.addEventListener('message', (event) => {
      try {
        const msg = event.data;
        if (msg?.type === 'state-update') applyIncoming(msg.state, msg.sentAt);
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
          applyIncoming(msg.state, msg.sentAt);
          bc?.postMessage(msg);
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
      onState: (incoming, sentAt) => {
        applyIncoming(incoming, sentAt);
        bc?.postMessage({ type: 'state-update', state: incoming, sentAt });
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
    const msg = { type: 'state-update', state, sentAt: Date.now() };
    // Always send on BroadcastChannel
    bc?.postMessage(msg);
    // Also send on WebSocket if relay is connected
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
    // Also send over Supabase Realtime (coalesced; no-op unless hosting a room)
    sendState(state);
    persist(state);
  }

  // ── Persistence ─────────────────────────────────────────
  // Only the Controller persists. An overlay writing its own copy would let a
  // stale snapshot outlive the game it belongs to.
  let persistEnabled = false;

  function persist(state) {
    if (!persistEnabled) return;
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({ savedAt: Date.now(), state }));
    } catch (_) {
      // Storage full or blocked — persistence is a safety net, never a hard dependency.
    }
  }

  /**
   * Restore a recent in-progress game, if one exists.
   * @returns {boolean} whether anything was restored
   */
  function restorePersisted() {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return false;

      const { savedAt, state } = JSON.parse(raw);
      if (!state?.sport) return false;
      if (!savedAt || Date.now() - savedAt > PERSIST_MAX_AGE_MS) return false;

      // Clocks never resume running on their own — a clock that restarted
      // itself during a reload would silently run on while nobody was watching.
      const revived = { ...DEFAULT_STATE, ...state };

      // The saved plan is a stale claim about the account, not part of the
      // game. Restoring it would rebroadcast a possibly-wrong value before the
      // real one is known; the Controller republishes it once it resolves.
      revived.plan = null;

      for (const c of CLOCKS) {
        revived[c.running] = false;
        revived[c.anchorMs] = null;
        revived[c.anchorSeconds] = revived[c.seconds];
      }

      set(revived);
      broadcast(revived);
      gameResumed.set(true);
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearPersisted() {
    try {
      localStorage.removeItem(PERSIST_KEY);
    } catch (_) {}
  }

  // ── Clock projection ────────────────────────────────────
  // Runs on every client. The Controller additionally owns stopping a clock
  // when it reaches zero, so an overlay never fights it for authority.
  let projectorTimer = null;

  function projectTick() {
    const current = get({ subscribe });
    const hostNow = Date.now() - hostClockSkewMs;

    let displayPatch = null;
    let expiredPatch = null;

    for (const c of CLOCKS) {
      const projected = projectClock(c, current, hostNow);
      if (projected === null || projected === current[c.seconds]) continue;

      const countingUp = c.direction && current[c.direction] === 'up';
      if (!countingUp && projected <= 0 && isController) {
        // Reaching zero is a real state change: broadcast it.
        expiredPatch = { ...(expiredPatch ?? {}), [c.seconds]: 0, [c.running]: false };
      } else {
        displayPatch = { ...(displayPatch ?? {}), [c.seconds]: projected };
      }
    }

    // Display-only movement is applied silently — every client derives the same
    // value from the same anchor, so re-broadcasting each second would be pure
    // traffic for no additional information.
    if (displayPatch) set({ ...get({ subscribe }), ...displayPatch });
    if (expiredPatch) publicPatch(expiredPatch);
  }

  function startProjector() {
    if (projectorTimer) return;
    projectorTimer = setInterval(projectTick, PROJECT_MS);
  }
  startProjector();

  // A tab returning to the foreground has potentially missed many projections.
  // Recompute immediately rather than waiting for the next interval.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') projectTick();
    });
  }

  // ── Undo ────────────────────────────────────────────────
  // Only the Controller records history; an overlay applying remote state is
  // not performing operator actions and has nothing to take back.
  //
  // Only deliberate mutations land here. Clock movement is applied silently by
  // the projector, so a running clock does not bury a mis-click under hundreds
  // of one-second entries.
  let undoStack = [];
  let recordingSuspended = false;

  function recordUndo(previous) {
    if (!isController || recordingSuspended) return;
    undoStack.push(previous);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    undoDepth.set(undoStack.length);
  }

  /** Take back the last operator action. Returns whether anything changed. */
  function undo() {
    const previous = undoStack.pop();
    undoDepth.set(undoStack.length);
    if (!previous) return false;

    // Restoring is itself a state change; suspend recording so undo does not
    // push the state it is undoing back onto the stack.
    recordingSuspended = true;
    try {
      // Re-anchor so a clock that was running resumes from the restored value
      // rather than jumping by however long the operator took to hit undo.
      const restored = anchorAll(previous);
      set(restored);
      broadcast(restored);
    } finally {
      recordingSuspended = false;
    }

    undoableReset.set(false);
    return true;
  }

  // ── Follower mode ───────────────────────────────────────
  //
  // A second device running the full controller. It does not own the game: it
  // mirrors the host's state and forwards every change upstream, so there is
  // still exactly one source of truth and nothing to reconcile afterwards.
  //
  // Mutations are intercepted here rather than in the seven sport controllers,
  // which call update() with a function 38 times over. A function cannot be
  // sent across the wire, so a follower applies it to its mirrored state,
  // diffs the result, and sends the changed fields as an ordinary patch.
  /** @type {null | ((msg: object) => void)} */
  let forwardToHost = null;

  function setFollowerTransport(send) {
    forwardToHost = send;
    followerMode.set(!!send);
  }

  /** Apply state from the host. Never re-broadcast, never forward. */
  function applyHostState(state, sentAt) {
    applyIncoming(state, sentAt);
  }

  /** Fields that differ between two states. */
  function changedFields(before, after) {
    const out = {};
    for (const key of Object.keys(after)) {
      if (!Object.is(before[key], after[key])) out[key] = after[key];
    }
    return out;
  }

  /**
   * Apply a follower's own change locally, then forward it.
   *
   * The local application is not cosmetic. Changes are computed from the
   * mirrored state and sent as absolute values, so without it two taps landing
   * inside one network round trip both compute from the same starting value and
   * the second silently overwrites the first — tapping +1 twice quickly would
   * score one goal, not two.
   *
   * The host remains authoritative: its echo overwrites whatever was assumed
   * here, so a rejected or adjusted change corrects itself within a round trip.
   */
  function applyLocallyAndForward(current, partial) {
    set({ ...current, ...withClockAnchors(current, partial) });
    forwardToHost({ kind: 'patch', patch: partial });
  }

  function publicPatch(partial) {
    if (forwardToHost) {
      applyLocallyAndForward(get({ subscribe }), partial);
      return;
    }
    update((current) => {
      recordUndo(current);
      const next = { ...current, ...withClockAnchors(current, partial) };
      broadcast(next);
      return next;
    });
  }

  /** Re-anchor every clock to its current seconds value. */
  function anchorAll(state) {
    const now = Date.now();
    const next = { ...state };
    for (const c of CLOCKS) {
      next[c.anchorMs] = now;
      next[c.anchorSeconds] = next[c.seconds];
    }
    return next;
  }

  // ── Public API ────────────────────────────────────────
  return {
    subscribe,
    connectRealtime,
    restorePersisted,
    clearPersisted,

    /** Mark this client as the Controller: owns clock expiry and persistence. */
    becomeController() {
      isController = true;
      persistEnabled = true;
      hostClockSkewMs = 0;
      skewSamples = [];
    },

    setFollowerTransport,
    applyHostState,

    undo() {
      if (forwardToHost) return forwardToHost({ kind: 'call', method: 'undo' });
      return undo();
    },

    set(newState) {
      if (forwardToHost) {
        const current = get({ subscribe });
        applyLocallyAndForward(current, changedFields(current, newState));
        return;
      }
      update((current) => {
        recordUndo(current);
        const next = anchorAll(newState);
        broadcast(next);
        return next;
      });
    },
    update(fn) {
      if (forwardToHost) {
        // Apply against the mirrored state, then send only what it changed.
        const current = get({ subscribe });
        applyLocallyAndForward(current, changedFields(current, fn(current)));
        return;
      }
      update((current) => {
        recordUndo(current);
        const next = anchorAll(fn(current));
        broadcast(next);
        return next;
      });
    },
    patch: publicPatch,
    reset() {
      if (forwardToHost) return forwardToHost({ kind: 'call', method: 'reset' });
      update((current) => {
        recordUndo(current);
        const fresh = anchorAll({ ...DEFAULT_STATE });
        broadcast(fresh);
        undoableReset.set(true);
        return fresh;
      });
    },
    // Reset to sport-specific defaults, preserving team names/colours
    resetSport(sport) {
      if (forwardToHost) return forwardToHost({ kind: 'call', method: 'resetSport', args: [sport] });
      update((current) => {
        recordUndo(current);
        undoableReset.set(true);
        const defaults = SPORT_DEFAULTS[sport] ?? {};
        const next = anchorAll({
          ...current,
          ...defaults,
          sport,
        });
        broadcast(next);
        return next;
      });
    },
    setSport(sport) {
      if (forwardToHost) return forwardToHost({ kind: 'call', method: 'setSport', args: [sport] });
      update((current) => {
        recordUndo(current);
        const defaults = SPORT_DEFAULTS[sport] ?? {};
        const next = anchorAll({
          ...current,
          ...defaults,
          sport,
          // MTG commander: bump life to 40 for all 4 players
          ...(sport === 'mtg' && current.mtgFormat === 'commander'
            ? { homeLife: 40, awayLife: 40, player3Life: 40, player4Life: 40 }
            : {}),
        });
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

// ── Clock lifecycle ──────────────────────────────────────
// Timing is no longer driven by per-clock intervals. A clock advances because
// wall time passes, and every client projects it from its anchor (see CLOCKS).
//
// These functions are retained because all seven sport controllers call them
// around clock changes. They no longer own timing — starting and stopping is
// expressed purely through the `*Running` flags those controllers already
// patch — but `stopAllIntervals` remains meaningful: it halts every clock at
// once, which is what "Reset Game" and "Change Sport" need.

function stopClocks(clocks) {
  const s = scoreboard.get();
  const patch = {};
  for (const c of clocks) {
    if (s[c.running]) patch[c.running] = false;
  }
  if (Object.keys(patch).length) scoreboard.patch(patch);
}

const byField = (field) => CLOCKS.filter((c) => c.running === field);

export function startGameClockInterval() {}
export function stopGameClockInterval() { stopClocks(byField('gameClockRunning')); }

export function startPlayClockInterval() {}
export function stopPlayClockInterval() { stopClocks(byField('playClockRunning')); }

export function startShotClockInterval() {}
export function stopShotClockInterval() { stopClocks(byField('shotClockRunning')); }

export function startHomePenaltyInterval() {}
export function stopHomePenaltyInterval() { stopClocks(byField('homePenaltyRunning')); }

export function startAwayPenaltyInterval() {}
export function stopAwayPenaltyInterval() { stopClocks(byField('awayPenaltyRunning')); }

export function stopAllIntervals() {
  stopClocks(CLOCKS);
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
