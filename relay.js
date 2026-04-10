/**
 * Standalone WebSocket relay for OBS sync.
 *
 * Needed when the Controller is served from Vercel (or any remote URL) and
 * OBS Browser Source needs to stay in sync with it. OBS runs a sandboxed
 * Chromium process that cannot receive BroadcastChannel messages from your
 * main browser, so a local relay is required.
 *
 * Usage:
 *   node relay.js
 *
 * Then in OBS, set the Browser Source URL to your Vercel overlay URL:
 *   https://your-app.vercel.app/#/overlay
 *
 * Leave this script running for the duration of your broadcast.
 * Ctrl+C to stop.
 */

import { WebSocketServer, WebSocket } from 'ws';

const PORT = 5199;

const wss = new WebSocketServer({ port: PORT });
let latestState = null;

wss.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop any other relay or Vite dev server first.`);
    process.exit(1);
  }
  throw err;
});

wss.on('listening', () => {
  console.log(`\n🏈  Scoreboard relay running on ws://localhost:${PORT}`);
  console.log(`    Controller: open your Vercel URL in Chrome/Safari`);
  console.log(`    Overlay:    add your Vercel URL + #/overlay as an OBS Browser Source`);
  console.log(`    Press Ctrl+C to stop.\n`);
});

wss.on('connection', (client) => {
  // Send cached state immediately so OBS overlay isn't blank on connect
  if (latestState) {
    client.send(JSON.stringify({ type: 'state-update', state: latestState }));
  }

  client.on('message', (rawData) => {
    try {
      const msg = JSON.parse(rawData.toString());
      if (msg.type === 'state-update') {
        latestState = msg.state;
        // Relay to every other connected client
        wss.clients.forEach((other) => {
          if (other !== client && other.readyState === WebSocket.OPEN) {
            other.send(rawData.toString());
          }
        });
      }
    } catch (_) {
      // Ignore malformed messages
    }
  });
});
