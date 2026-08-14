/**
 * Supabase Realtime transport for Controller → Overlay sync.
 *
 * WHY THIS EXISTS:
 *   An OBS Browser Source runs in its own Chromium process, so BroadcastChannel
 *   cannot reach it, and the localhost WebSocket relay only exists when the app
 *   is running on the same machine.  For the hosted (Vercel) build, Supabase
 *   Realtime is the only transport that crosses both the process boundary and
 *   the network.
 *
 * ROLES:
 *   host   — the Controller.  Publishes state; answers state requests.
 *   viewer — the Overlay.  Subscribes to state; asks for a snapshot on join.
 *
 * ROOMS:
 *   One channel per account: `scoreboard:<userId>`.  The Overlay is
 *   unauthenticated (OBS has no session), so it reads the room from its URL.
 *
 * RATE:
 *   The Controller can run up to five 1-second clock intervals at once, each
 *   firing its own patch.  Outgoing state is coalesced to at most one message
 *   per THROTTLE_MS so a busy hockey clock costs one message per second rather
 *   than four.  The throttle is trailing-edge, so the last state always lands.
 */

import { writable } from 'svelte/store';
import { supabase } from './supabase.js';

const CHANNEL_PREFIX = 'scoreboard';
const THROTTLE_MS = 100;

/** @type {'idle'|'connecting'|'connected'|'error'|'unavailable'} */
export const realtimeStatus = writable('idle');

let channel = null;
let currentRoom = null;
let currentRole = null;
// Tracks a genuinely open socket. Without this, channel.send() silently falls
// back to a REST POST per call, so the heartbeat would hammer HTTP while the
// socket is down instead of going quiet.
let connected = false;

// ── Outgoing throttle ────────────────────────────────────
let pendingState = null;
let flushTimer = null;
let lastSentAt = 0;

function rawSend(event, payload) {
  if (!channel || !connected) return;
  try {
    channel.send({ type: 'broadcast', event, payload });
  } catch (err) {
    console.error('[realtime] Send failed:', err);
  }
}

function flush() {
  flushTimer = null;
  if (!pendingState) return;
  const state = pendingState;
  pendingState = null;
  lastSentAt = Date.now();
  // Stamped at send time, not queue time, so the receiver's clock-skew estimate
  // is not skewed by however long this sat in the throttle window.
  rawSend('state', { state, sentAt: Date.now() });
}

/**
 * Queue a state broadcast (coalesced).  No-op when not connected.
 * @param {object} state
 */
export function sendState(state) {
  if (!channel || currentRole !== 'host') return;
  pendingState = state;
  if (flushTimer) return;
  const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastSentAt));
  flushTimer = setTimeout(flush, wait);
}

/**
 * Send state immediately, bypassing the throttle.  Used to answer a viewer's
 * join request so the overlay populates without waiting.
 * @param {object} state
 */
export function sendStateNow(state) {
  if (!channel || currentRole !== 'host') return;
  pendingState = null;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  lastSentAt = Date.now();
  rawSend('state', { state, sentAt: Date.now() });
}

/**
 * Join a scoreboard room.
 *
 * @param {string} roomId
 * @param {object} opts
 * @param {'host'|'viewer'} opts.role
 * @param {(state: object, sentAt?: number) => void} [opts.onState] viewer: incoming state
 * @param {() => void} [opts.onStateRequest]           host: a viewer wants a snapshot
 */
export function joinRoom(roomId, { role, onState, onStateRequest } = {}) {
  if (!supabase) {
    console.error('[realtime] Supabase client unavailable — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.');
    realtimeStatus.set('unavailable');
    return;
  }
  if (!roomId) {
    realtimeStatus.set('unavailable');
    return;
  }
  // Already in the right room in the right role — nothing to do.
  if (channel && currentRoom === roomId && currentRole === role) return;

  leaveRoom();
  currentRoom = roomId;
  currentRole = role;
  realtimeStatus.set('connecting');

  channel = supabase.channel(`${CHANNEL_PREFIX}:${roomId}`, {
    config: { broadcast: { self: false } },
  });

  if (role === 'viewer') {
    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (payload?.state) onState?.(payload.state, payload.sentAt);
    });
  }

  if (role === 'host') {
    channel.on('broadcast', { event: 'request-state' }, () => {
      onStateRequest?.();
    });
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      connected = true;
      realtimeStatus.set('connected');
      // A viewer joining mid-game needs the current state right away —
      // broadcast is fire-and-forget, so nothing arrives until the next change.
      if (role === 'viewer') rawSend('request-state', {});
      // A host that just (re)connected pushes a fresh snapshot, so an overlay
      // that was already waiting converges without a round trip.
      if (role === 'host') onStateRequest?.();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      connected = false;
      realtimeStatus.set('error');
    } else if (status === 'CLOSED') {
      connected = false;
      realtimeStatus.set('idle');
    }
  });
}

// ── Control channel ──────────────────────────────────────
//
// A second, independent channel carrying commands from a phone remote to the
// Controller.
//
// Deliberately NOT the state channel. That one is named by account id, which
// travels in the OBS overlay URL — anyone who has ever been given that URL can
// join it. Carrying commands there would silently turn "here's my overlay link"
// into "here is control of my scoreboard". The control channel is keyed by a
// secret that appears only on the pairing link the operator chooses to share.

const CONTROL_PREFIX = 'scoreboard-ctl';

/** @type {'idle'|'connecting'|'connected'|'error'|'unavailable'} */
export const controlStatus = writable('idle');

let controlChannel = null;
let controlConnected = false;
let controlRole = null;

function controlSend(event, payload) {
  if (!controlChannel || !controlConnected) return;
  try {
    controlChannel.send({ type: 'broadcast', event, payload });
  } catch (err) {
    console.error('[realtime] Control send failed:', err);
  }
}

/**
 * Join the control channel.
 *
 * @param {string} token       pairing secret — never derived from the room id
 * @param {object} opts
 * @param {'host'|'remote'} opts.role
 * @param {(command: object) => void} [opts.onCommand]  host: a remote pressed something
 * @param {(state: object) => void} [opts.onState]      remote: current scoreboard
 * @param {() => void} [opts.onRemoteJoined]            host: send a snapshot
 */
export function joinControlChannel(token, { role, onCommand, onState, onRemoteJoined } = {}) {
  if (!supabase || !token) {
    controlStatus.set('unavailable');
    return;
  }
  if (controlChannel && controlRole === role) return;

  leaveControlChannel();
  controlRole = role;
  controlStatus.set('connecting');

  controlChannel = supabase.channel(`${CONTROL_PREFIX}:${token}`, {
    config: { broadcast: { self: false } },
  });

  if (role === 'host') {
    controlChannel.on('broadcast', { event: 'command' }, ({ payload }) => {
      if (payload) onCommand?.(payload);
    });
    controlChannel.on('broadcast', { event: 'remote-hello' }, () => onRemoteJoined?.());
  }

  if (role === 'remote') {
    controlChannel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (payload?.state) onState?.(payload.state);
    });
  }

  controlChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      controlConnected = true;
      controlStatus.set('connected');
      // Announce so the Controller pushes a snapshot; without it the remote
      // shows nothing until the operator happens to change something.
      if (role === 'remote') controlSend('remote-hello', {});
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      controlConnected = false;
      controlStatus.set('error');
    } else if (status === 'CLOSED') {
      controlConnected = false;
      controlStatus.set('idle');
    }
  });
}

/** Remote → Controller: request an action. */
export function sendCommand(command) {
  if (controlRole !== 'remote') return;
  controlSend('command', command);
}

/** Controller → remote: mirror current state so the remote can display it. */
export function sendControlState(state) {
  if (controlRole !== 'host') return;
  controlSend('state', { state });
}

export function leaveControlChannel() {
  if (controlChannel) {
    try {
      supabase?.removeChannel(controlChannel);
    } catch (_) {
      // Already torn down.
    }
  }
  controlChannel = null;
  controlConnected = false;
  controlRole = null;
  controlStatus.set('idle');
}

/** Leave the current room and reset transport state. */
export function leaveRoom() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  pendingState = null;
  connected = false;
  if (channel) {
    try {
      supabase?.removeChannel(channel);
    } catch (_) {
      // Channel already torn down.
    }
  }
  channel = null;
  currentRoom = null;
  currentRole = null;
  realtimeStatus.set('idle');
}
