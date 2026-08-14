<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</svelte:head>

<script>
  /**
   * Phone remote — a second controller for the same game.
   *
   * Built for one-handed use at pitchside while watching the play, not the
   * screen: large targets, no scrolling for the common actions, and the live
   * score and clock always visible so the operator can confirm without looking
   * at the laptop.
   *
   * It sends named commands rather than state patches, so a paired phone can
   * only do what the controller itself offers.
   */
  import { onDestroy } from 'svelte';
  import { getTokenFromUrl } from './room.js';
  import { joinControlChannel, leaveControlChannel, sendCommand, controlStatus } from './realtime.js';
  import { commandsFor } from './shortcuts.js';
  import { formatGameClock } from './store.js';

  const token = getTokenFromUrl();

  let state = $state(null);
  let status = $state('idle');
  let lastSent = $state(null);
  let flashTimer;

  const unsubStatus = controlStatus.subscribe((s) => (status = s));

  if (token) {
    joinControlChannel(token, {
      role: 'remote',
      onState: (incoming) => (state = incoming),
    });
  }

  onDestroy(() => {
    unsubStatus();
    leaveControlChannel();
    clearTimeout(flashTimer);
  });

  function run(id) {
    sendCommand({ id });
    // Confirm the press locally. The authoritative result arrives when the
    // Controller echoes new state, which may be a round trip away.
    lastSent = id;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (lastSent = null), 400);
    if (navigator.vibrate) navigator.vibrate(12);
  }

  const groups = $derived(state?.sport ? commandsFor(state.sport) : []);
</script>

<div class="remote">
  {#if !token}
    <div class="notice notice-bad">
      <h1>No scoreboard paired</h1>
      <p>Open the pairing link from the controller — it needs to include a token.</p>
    </div>

  {:else if status === 'error' || status === 'unavailable'}
    <div class="notice notice-bad">
      <h1>Can't reach the scoreboard</h1>
      <p>Check this phone's connection. It will reconnect on its own.</p>
    </div>

  {:else if !state}
    <div class="notice">
      <h1>Connecting…</h1>
      <p>Make sure the controller is open on your computer.</p>
    </div>

  {:else if !state.sport}
    <div class="notice">
      <h1>No sport selected</h1>
      <p>Pick a sport on the controller and this will follow.</p>
    </div>

  {:else}
    <!-- Live readout, so the operator never has to look back at the laptop -->
    <header class="board">
      <div class="side">
        <span class="side-name">{state.homeName}</span>
        <span class="side-score">{state.sport === 'mtg' ? state.homeLife : state.homeScore}</span>
      </div>
      <div class="middle">
        {#if state.sport !== 'mtg'}
          <span class="clock" class:clock-live={state.gameClockRunning}>
            {formatGameClock(state.gameClockSeconds ?? 0)}
          </span>
          <span class="clock-state">{state.gameClockRunning ? 'Running' : 'Stopped'}</span>
        {:else}
          <span class="clock-state">Turn {state.turnNumber}</span>
        {/if}
      </div>
      <div class="side">
        <span class="side-name">{state.awayName}</span>
        <span class="side-score">{state.sport === 'mtg' ? state.awayLife : state.awayScore}</span>
      </div>
    </header>

    <div class="groups">
      {#each groups as group}
        <section class="group">
          <h2 class="group-title">{group.group}</h2>
          <div class="buttons">
            {#each group.items as item}
              <button
                class="cmd"
                class:cmd-sent={lastSent === item.id}
                onclick={() => run(item.id)}
              >{item.label}</button>
            {/each}
          </div>
        </section>
      {/each}
    </div>

    <footer class="foot">
      <span class="dot" class:dot-live={status === 'connected'}></span>
      {status === 'connected' ? 'Connected to controller' : 'Reconnecting…'}
    </footer>
  {/if}
</div>

<style>
  .remote {
    --bg:     #070b14;
    --card:   #121a28;
    --line:   #223049;
    --ink:    #f1f5f9;
    --muted:  #8496b0;
    --accent: #38bdf8;

    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: 'Inter Variable', system-ui, -apple-system, sans-serif;
    padding: env(safe-area-inset-top) 14px calc(env(safe-area-inset-bottom) + 14px);
    display: flex; flex-direction: column; gap: 14px;
    -webkit-user-select: none; user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* ── Notices ── */
  .notice { margin: auto; text-align: center; padding: 32px 20px; max-width: 34ch; }
  .notice h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
  .notice p { color: var(--muted); font-size: 14px; line-height: 1.6; margin: 0; }
  .notice-bad h1 { color: #fca5a5; }

  /* ── Live readout ── */
  .board {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center; gap: 10px;
    background: var(--card); border: 1px solid var(--line);
    border-radius: 14px; padding: 14px 12px;
    position: sticky; top: 0; z-index: 5;
  }
  .side { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
  .side-name {
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--muted); max-width: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .side-score { font-size: 34px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
  .middle { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 0 6px; }
  .clock { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
  .clock-live { color: #4ade80; }
  .clock-state {
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--muted);
  }

  /* ── Commands ── */
  .groups { display: flex; flex-direction: column; gap: 14px; }
  .group-title {
    font-size: 10px; font-weight: 800; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted); margin: 0 0 8px 2px;
  }
  .buttons { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .cmd {
    /* 60px clears the ~44px minimum comfortably: this gets pressed without
       looking, by someone watching the game rather than the phone. */
    min-height: 60px;
    padding: 12px 10px; border-radius: 12px;
    background: var(--card); border: 1px solid var(--line);
    color: var(--ink); font-size: 14px; font-weight: 600; line-height: 1.3;
    font-family: inherit; cursor: pointer;
    transition: transform 0.08s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .cmd:active { transform: scale(0.96); background: #1b2740; }
  .cmd-sent { background: var(--accent); border-color: var(--accent); color: #04121c; }

  /* ── Connection ── */
  .foot {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 12px; color: var(--muted); padding: 4px 0 2px;
  }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #ef4444; }
  .dot-live { background: #22c55e; box-shadow: 0 0 6px #22c55e; }

  @media (prefers-reduced-motion: reduce) {
    .cmd { transition: none; }
    .cmd:active { transform: none; }
  }
</style>
