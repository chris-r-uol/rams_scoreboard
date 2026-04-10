import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { WebSocketServer, WebSocket } from 'ws'

/**
 * Scoreboard Relay Plugin
 *
 * Starts a WebSocket relay server on port 5199 alongside the Vite dev server.
 * Both the Controller (Chrome/Safari) and the Overlay (OBS Browser Source)
 * connect to this relay. State sent by the Controller is immediately
 * broadcast to every other connected client, including OBS.
 *
 * This is necessary because BroadcastChannel only works within the same
 * browser process — OBS runs in a sandboxed Chromium instance and cannot
 * receive BroadcastChannel messages from your main browser.
 */
const WS_RELAY_PORT = 5199

function scoreboardRelayPlugin() {
  return {
    name: 'scoreboard-relay',
    configureServer(server) {
      let latestState = null
      const wss = new WebSocketServer({ port: WS_RELAY_PORT })

      wss.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`\n  ⚠️  Relay port ${WS_RELAY_PORT} already in use — stop the other dev server first.\n`)
        } else {
          throw err
        }
      })

      wss.on('listening', () => {
        console.log(`\n  🏈 Scoreboard relay running on ws://localhost:${WS_RELAY_PORT}\n`)
      })

      wss.on('connection', (client) => {
        // Immediately send current state so OBS overlay isn't blank on load
        if (latestState) {
          client.send(JSON.stringify({ type: 'state-update', state: latestState }))
        }

        client.on('message', (rawData) => {
          try {
            const msg = JSON.parse(rawData.toString())
            if (msg.type === 'state-update') {
              latestState = msg.state
              // Relay to every other connected client
              wss.clients.forEach((other) => {
                if (other !== client && other.readyState === WebSocket.OPEN) {
                  other.send(rawData.toString())
                }
              })
            }
          } catch (_) {
            // Ignore malformed messages
          }
        })
      })

      // Clean up when Vite dev server closes
      server.httpServer?.once('close', () => wss.close())
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), svelte(), scoreboardRelayPlugin()],

  // Tauri-recommended settings
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Don't trigger HMR on Rust source changes
      ignored: ['**/src-tauri/**'],
    },
  },
})
