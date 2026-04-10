# Rams Scoreboard

A professional American football scoreboard system built for live broadcasting. The operator controls the game state from a dashboard; the overlay appears transparently in OBS as a real-time scorebug.

## Features

- **Live scorebug overlay** — transparent background, ready to drop into OBS as a Browser Source
- **Full game state control** — scores, game clock, play clock, quarter, down & distance, ball on, possession, penalty flag, timeouts
- **Real-time sync** — a WebSocket relay (port 5199) keeps the Controller and OBS overlay in perfect sync across separate processes
- **Team branding** — primary colour, secondary colour, and text colour per team, with NFL colour presets
- **Tauri desktop app** — ships as a native macOS app; in production, a built-in HTTP server serves the overlay on `localhost:5173` so OBS always has somewhere to connect

## Stack

| Layer | Technology |
|---|---|
| UI framework | Svelte 5 (runes) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Desktop shell | Tauri 2 (Rust) |
| State sync | WebSocket relay (tokio-tungstenite) |
| OBS HTTP server | Axum (release builds only) |

## Running

### Prerequisites

- Node.js 18+
- Rust (install via [rustup](https://rustup.rs))

### In the browser (Svelte only)

```bash
npm install
npm run dev
```

Open `http://localhost:5173` for the Controller. The OBS overlay URL is `http://localhost:5173/#/overlay`.

### As a native desktop app (Tauri)

```bash
npm install
source "$HOME/.cargo/env"   # if Rust was just installed
npm run tauri dev
```

The first run compiles the Rust backend (~1–2 minutes). Rebuilds are fast. The app opens the Controller in a native window. The OBS overlay URL remains `http://localhost:5173/#/overlay`.

### Production build

```bash
npm run tauri build
```

Outputs a `.app` bundle to `src-tauri/target/release/bundle/macos/`. The bundle includes the WS relay and an embedded HTTP server — no Node.js or Vite required at runtime.

## Architecture

```
┌──────────────────────────┐       WebSocket        ┌─────────────────────┐
│  Controller              │ ─── ws://localhost:5199 ─▶  OBS Browser Source │
│  localhost:5173/         │ ◀──────────────────────   localhost:5173/#/overlay
└──────────────────────────┘
              │
     Tauri native window
     (wraps the Vite frontend)
```

- `src/lib/store.js` — Svelte writable store; every state change is broadcast over WebSocket
- `src/lib/Controller.svelte` — operator dashboard (clocks, scores, down/distance, colours)
- `src/lib/Overlay.svelte` — the scorebug; purely reactive, never runs clock intervals itself
- `src/App.svelte` — hash router: `#/` → Controller, `#/overlay` → Overlay
- `src-tauri/src/ws_relay.rs` — Rust WebSocket relay; caches latest state for late-connecting OBS sources
- `src-tauri/src/http_server.rs` — Axum static file server (release only); embeds the `dist/` folder so OBS works without Vite running

## OBS Setup

The app uses two sync mechanisms simultaneously:

| Mechanism | When it works |
|---|---|
| BroadcastChannel | Controller + Overlay open in the **same browser** — no relay needed |
| WebSocket relay | Controller in browser + Overlay in **OBS** (separate process) — requires `relay.js` |

### Browser-only (no OBS)

1. Open your Vercel URL in Chrome/Safari — this is the Controller (`/`)
2. Open a second tab to `https://your-app.vercel.app/#/overlay`
3. They sync automatically via BroadcastChannel — no extra steps

### With OBS Browser Source

1. Make sure Node.js is installed (`node --version`)
2. In the project folder, run:
   ```bash
   node relay.js
   ```
3. Open your Vercel URL in Chrome/Safari (Controller)
4. In OBS, add a **Browser Source** pointing to `https://your-app.vercel.app/#/overlay`
5. Set width/height to match your canvas (e.g. 1920×1080)
6. Leave `relay.js` running for the duration of your broadcast — Ctrl+C to stop

The overlay background is fully transparent — no chroma key needed.
