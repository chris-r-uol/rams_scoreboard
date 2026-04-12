# Rams Scoreboard

A professional American football scoreboard system built for live broadcasting. The operator controls game state from a dashboard; the scorebug overlay appears transparently in OBS as a real-time Browser Source.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [State Model](#state-model)
- [Codebase Overview](#codebase-overview)
- [Running the App](#running-the-app)
- [Production Build](#production-build)
- [OBS Setup](#obs-setup)
- [Sync Internals](#sync-internals)
- [Rust Backend](#rust-backend)

---

## Features

- **Live scorebug overlay** — fully transparent background, ready to drop into OBS as a Browser Source
- **Full game state** — scores, game clock, play clock, quarter, down & distance, ball on, possession, penalty flag, timeouts (3 per team)
- **Dual-channel real-time sync** — BroadcastChannel for same-browser tabs; WebSocket relay (port 5199) for cross-process sync with an OBS Browser Source
- **Stateful relay** — the relay caches the latest game state and pushes it to any late-connecting client, so the overlay is never blank on reconnect
- **Team branding** — primary colour, secondary colour, and text colour per team, with a palette of 14 NFL-style colour presets
- **Clock architecture** — only the Controller tab runs clock intervals; every tick is broadcast so the Overlay is purely reactive and needs no timers of its own
- **Tauri desktop app** — ships as a self-contained native macOS `.app`; in production, an embedded Axum HTTP server serves the overlay on `localhost:5173` so OBS always has somewhere to point

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI framework | Svelte (runes / `$state`) | 5.x |
| Build tool | Vite | 8.x |
| Styling | Tailwind CSS | 4.x |
| Desktop shell | Tauri | 2.x |
| Async runtime | Tokio | 1.x |
| WebSocket relay (Rust) | tokio-tungstenite | 0.24 |
| HTTP server (Rust, release only) | Axum | 0.8 |
| Static asset embedding | rust-embed | 8.x |
| Standalone relay (Node.js) | ws | 8.x |

---

## Architecture

```
┌─────────────────────────────────────┐
│  Tauri native window                │
│  ┌───────────────────────────────┐  │
│  │  Vite / Svelte frontend       │  │
│  │  http://localhost:5173/       │  │
│  │  (Controller UI)              │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Rust WS relay                │  │   ws://localhost:5199
│  │  ws_relay.rs                  │◀─┼─────────────────────────────────────┐
│  └───────────────────────────────┘  │                                     │
│                                     │                                     │
│  ┌───────────────────────────────┐  │   http://localhost:5173/#/overlay   │
│  │  Axum HTTP server (release)   │──┼────────────────────────────────▶   │
│  │  http_server.rs               │  │   OBS Browser Source                │
│  └───────────────────────────────┘  │   (separate Chromium process)       │
└─────────────────────────────────────┘                                     │
                                                                             │
         BroadcastChannel (same-browser only) ───────────────────────────▶ │
         WebSocket relay ───────────────────────────────────────────────▶  ┘
```

**Routing** is handled client-side with a minimal hash router in `App.svelte`:

| Hash | View |
|---|---|
| `#/` (default) | Controller (operator dashboard) |
| `#/overlay` | Scorebug overlay (transparent, for OBS) |

---

## State Model

The single source of truth lives in `src/lib/store.js`. All fields are merged into one flat object and broadcast atomically on every change.

| Field | Type | Description |
|---|---|---|
| `homeName` / `awayName` | `string` | Team abbreviations displayed on the scorebug |
| `homeScore` / `awayScore` | `number` | Scores (clamped 0–99) |
| `possession` | `'home' \| 'away'` | Which team has the ball; drives the possession bar |
| `homeTimeouts` / `awayTimeouts` | `number` | Timeouts remaining (0–3); resets to 3 at the start of the 2nd half |
| `homePrimary` / `awayPrimary` | `string` (hex) | Scorebug background gradient start colour |
| `homeSecondary` / `awaySecondary` | `string` (hex) | Scorebug background gradient end colour |
| `homeText` / `awayText` | `string` (hex) | Team name, score, and timeout dot colour |
| `gameClockSeconds` | `number` | Game clock in seconds (displayed as MM:SS) |
| `gameClockRunning` | `boolean` | Whether the game clock interval is active |
| `playClockSeconds` | `number` | Play clock countdown (displayed as :SS) |
| `playClockRunning` | `boolean` | Whether the play clock interval is active |
| `quarter` | `1–5` | Current quarter (5 = overtime) |
| `down` | `1–4` | Current down |
| `distance` | `number` | Yards to go |
| `ballOn` | `string` | Yard line (free-form, e.g. `"Own 25"` or `"50"`) |
| `flagThrown` | `boolean` | Penalty flag indicator |

**Defaults:** 15:00 game clock, 40s play clock, 1st & 10, ball on the 50, possession home.

---

## Codebase Overview

```
rams_scoreboard/
├── src/
│   ├── App.svelte            # Hash router — dispatches to Controller or Overlay
│   ├── app.css               # Global styles / Tailwind entry point
│   ├── main.js               # Svelte app bootstrap
│   └── lib/
│       ├── store.js          # Scoreboard state store + clock intervals + dual-channel sync
│       ├── Controller.svelte # Operator dashboard (scores, clocks, branding, flags)
│       └── Overlay.svelte    # Scorebug UI (purely reactive; zero timers)
├── src-tauri/
│   ├── Cargo.toml            # Rust dependencies
│   ├── tauri.conf.json       # App metadata, window size, build commands
│   └── src/
│       ├── main.rs           # Tauri entry point (desktop)
│       ├── lib.rs            # Tauri builder + spawns relay and HTTP server
│       ├── ws_relay.rs       # Async WS relay (tokio-tungstenite, broadcasts + caches state)
│       └── http_server.rs    # Axum static server embedding dist/ (release builds only)
├── relay.js                  # Standalone Node.js relay (for Vercel/remote deployments)
├── vite.config.js            # Vite config + dev-mode WS relay plugin (port 5199)
├── svelte.config.js          # Svelte compiler config
├── package.json              # npm scripts and dev dependencies
└── specification             # Original product specification document
```

### Key design decisions

- **Clock authority** — The Controller is the sole clock owner. Every `setInterval` tick calls `scoreboard.patch()`, which broadcasts over both channels. The Overlay has no intervals; it just renders whatever state it receives.
- **Silent applies** — Incoming WebSocket or BroadcastChannel messages call the internal `set()` directly (not the public `scoreboard.set()`), preventing re-broadcast loops.
- **Late-join warm-up** — Both the Vite plugin relay and the Rust relay cache the last known state and immediately push it to newly connected clients. The overlay is never blank after a reconnect.
- **Conditional compilation** — `http_server.rs` is gated behind `#[cfg(not(debug_assertions))]`. In dev mode, Vite's own dev server handles `localhost:5173`. In a production `.app`, Vite is absent, so Axum serves the embedded `dist/` directory instead.

---

## Running the App

### Prerequisites

- Node.js 18+
- Rust toolchain — install via [rustup.rs](https://rustup.rs)

### Browser-only (Svelte + Vite, no Tauri)

```bash
npm install
npm run dev
```

- **Controller:** `http://localhost:5173/`
- **Overlay:** `http://localhost:5173/#/overlay`
- The Vite WS relay plugin starts automatically on `ws://localhost:5199`.

### As a native desktop app (Tauri dev mode)

```bash
npm install
source "$HOME/.cargo/env"   # if Rust was just installed in this session
npm run tauri dev
```

The first compile takes ~1–2 minutes while Cargo fetches and builds all crates. Subsequent rebuilds are fast (incremental). The Controller opens in a native macOS window. The OBS overlay URL is still `http://localhost:5173/#/overlay` (served by Vite).

---

## Production Build

```bash
npm run tauri build
```

Tauri runs `npm run build` first (produces `dist/`), then compiles the Rust backend in release mode. Output is a self-contained `.app` bundle:

```
src-tauri/target/release/bundle/macos/Rams Scoreboard.app
```

At runtime the app:
1. Opens the Controller in a native window
2. Starts the Rust WS relay on `ws://localhost:5199`
3. Starts the Axum HTTP server on `http://localhost:5173` (serving the embedded `dist/`)

No Node.js, no Vite, and no separate processes are required. OBS points its Browser Source at `http://localhost:5173/#/overlay` as normal.

---

## OBS Setup

The app offers two sync channels simultaneously — you get whichever one works for your setup:

| Mechanism | Works when… | Notes |
|---|---|---|
| `BroadcastChannel` | Controller and Overlay are in the **same browser process** | Zero config; automatic |
| WebSocket relay | Overlay is in an **OBS Browser Source** (separate Chromium process) | Relay must be running |

### Tauri desktop app (recommended for production)

1. Launch `Rams Scoreboard.app`
2. In OBS, add a **Browser Source** → URL: `http://localhost:5173/#/overlay`
3. Recommended OBS Browser Source settings:
   - Width: `1920`, Height: `1080`
   - Custom CSS: `body { background-color: rgba(0,0,0,0) !important; }`
4. The relay and HTTP server start automatically — nothing else to configure.

### Browser-only (same machine, no Tauri)

1. Run `npm run dev`
2. Open `http://localhost:5173/` in Chrome/Safari — this is the Controller
3. In OBS, add a **Browser Source** → URL: `http://localhost:5173/#/overlay`
4. The Vite relay plugin handles WS sync on port 5199 automatically.

### Remote / Vercel deployment (Controller on Vercel, OBS local)

Because OBS runs a sandboxed Chromium process that cannot receive `BroadcastChannel` messages from your main browser, a local relay is required:

1. Run the standalone relay:
   ```bash
   node relay.js
   ```
2. Open your Vercel URL in Chrome/Safari (Controller)
3. In OBS, add a **Browser Source** → URL: `https://your-app.vercel.app/#/overlay`
4. Leave `relay.js` running for the duration of the broadcast; press `Ctrl+C` to stop.

---

## Sync Internals

`store.js` wraps a Svelte `writable` store with a custom API that fires on both channels on every mutation:

```
scoreboard.patch({ homeScore: 7 })
      │
      ├─▶ bc.postMessage(...)       // BroadcastChannel → same-browser overlay tab
      └─▶ ws.send(...)              // WebSocket → OBS Browser Source via relay

Incoming (from BC or WS):
      └─▶ internal set()            // silent apply — no re-broadcast
```

The public store API:

| Method | Behaviour |
|---|---|
| `scoreboard.set(state)` | Replace entire state + broadcast |
| `scoreboard.update(fn)` | Functional update + broadcast |
| `scoreboard.patch(partial)` | Shallow merge + broadcast |
| `scoreboard.reset()` | Restore defaults + broadcast |
| `scoreboard.get()` | Synchronous snapshot (no subscription) |

The WS relay uses a `tokio::sync::broadcast` channel internally. Every new connection receives the last cached state before joining the fan-out, ensuring the overlay is populated immediately.

---

## Rust Backend

### `ws_relay.rs`

- Binds `127.0.0.1:5199` (fails gracefully with a warning if the port is taken)
- Uses `tokio::sync::broadcast::channel(256)` for in-memory fan-out
- Caches the latest game state in an `Arc<Mutex<Option<String>>>`
- Each client connection is handled in its own `tokio::spawn` task using a `tokio::select!` loop over incoming messages and broadcast receiver events
- Handles `AddrInUse` gracefully — during `tauri dev`, the Vite plugin may already hold the port; the Rust relay logs a warning and exits cleanly

### `http_server.rs` _(release builds only)_

- Compiled only when `cfg(not(debug_assertions))` — absent from debug/dev builds
- Uses `rust-embed` to embed the entire `dist/` directory into the binary at compile time
- Axum router uses a single `fallback` handler; any unmatched path returns `index.html` (correct for SPA hash routing)
- Binds `127.0.0.1:5173` so OBS Browser Sources configured for dev continue to work in production without reconfiguration

### `lib.rs`

```rust
tauri::async_runtime::spawn(crate::ws_relay::start(5199));     // always
#[cfg(not(debug_assertions))]
tauri::async_runtime::spawn(crate::http_server::start(5173));  // release only
```

Both servers run as non-blocking async tasks on the Tauri async runtime (Tokio), sharing the process lifetime with the main window.
5. Set width/height to match your canvas (e.g. 1920×1080)
6. Leave `relay.js` running for the duration of your broadcast — Ctrl+C to stop

The overlay background is fully transparent — no chroma key needed.
