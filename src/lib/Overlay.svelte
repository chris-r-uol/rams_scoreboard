<script>
  import { scoreboard, formatGameClock, quarterLabel, downLabel } from './store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });
</script>

<!--
  OBS Overlay — fully transparent background.
  Add as Browser Source in OBS with Custom CSS:
    body { background-color: rgba(0,0,0,0) !important; }
  or rely on the transparent body below.
-->
<svelte:head>
  <style>
    html, body { background: transparent !important; overflow: hidden; }
  </style>
</svelte:head>

<div class="overlay-root">
  <div class="scorebug">

    <!-- ── Home Team Block ── -->
    <div class="team-block team-home"
         style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
      {#if state.possession === 'home'}
        <div class="possession-bar" style="background: {state.homeText};"></div>
      {/if}
      <div class="team-inner">
        <span class="team-name">{state.homeName}</span>
        <div class="timeout-dots">
          {#each [1, 2, 3] as t}
            <div class="timeout-dot {t <= state.homeTimeouts ? 'active' : ''}"
                 style="background: {state.homeText};"></div>
          {/each}
        </div>
        <span class="team-score">{state.homeScore}</span>
      </div>
    </div>

    <!-- ── Center Info Block ── -->
    <div class="center-block">
      <div class="game-clock {state.gameClockRunning ? 'running' : ''}">
        {formatGameClock(state.gameClockSeconds)}
      </div>
      <div class="center-meta">
        <span class="quarter-tag">{quarterLabel(state.quarter)}</span>
        <span class="meta-sep"></span>
        <span class="play-clock-inline {state.playClockSeconds <= 5 ? 'critical' : state.playClockSeconds <= 10 ? 'warning' : ''}">
          :{String(state.playClockSeconds).padStart(2, '0')}
        </span>
      </div>
    </div>

    <!-- ── Away Team Block ── -->
    <div class="team-block team-away"
         style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
      {#if state.possession === 'away'}
        <div class="possession-bar away-bar" style="background: {state.awayText};"></div>
      {/if}
      <div class="team-inner">
        <span class="team-score">{state.awayScore}</span>
        <div class="timeout-dots">
          {#each [1, 2, 3] as t}
            <div class="timeout-dot {t <= state.awayTimeouts ? 'active' : ''}"
                 style="background: {state.awayText};"></div>
          {/each}
        </div>
        <span class="team-name">{state.awayName}</span>
      </div>
    </div>
  </div>

  <!-- ── Down, Distance & Ball On strip ── -->
  <div class="info-strip">
    <span class="info-down">{downLabel(state.down, state.distance)}</span>
    <span class="info-sep"></span>
    <span class="info-ballon">Ball on {state.ballOn}</span>
  </div>

  <!-- ── Flag Indicator ── -->
  {#if state.flagThrown}
    <div class="flag-bar">
      <span class="flag-icon">⚑</span> FLAG ON THE PLAY
    </div>
  {/if}
</div>

<style>
  /* ── Root ── */
  .overlay-root {
    position: fixed;
    bottom: 48px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    pointer-events: none;
    z-index: 9999;
  }

  /* ── Scorebug Container ── */
  .scorebug {
    display: flex;
    align-items: stretch;
    border-radius: 10px;
    overflow: hidden;
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.5),
      0 1px 4px rgba(0, 0, 0, 0.3);
  }

  /* ── Team Blocks ── */
  .team-block {
    position: relative;
    min-width: 200px;
  }
  .team-inner {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 22px;
  }
  .team-name {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.95;
    white-space: nowrap;
  }
  .team-score {
    font-size: 40px;
    font-weight: 900;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    min-width: 2ch;
  }
  .team-home .team-score { text-align: right; }
  .team-away .team-score { text-align: left; }

  /* ── Possession Indicator ── */
  .possession-bar {
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    opacity: 0.85;
  }
  .away-bar {
    left: auto;
    right: 0;
  }

  /* ── Timeout Dots ── */
  .timeout-dots {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .timeout-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    opacity: 0.15;
    transition: opacity 0.3s ease;
  }
  .timeout-dot.active {
    opacity: 0.85;
  }

  /* ── Center Block ── */
  .center-block {
    background: #0a0a0a;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px 28px;
    min-width: 150px;
    gap: 3px;
  }
  .game-clock {
    font-size: 32px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .game-clock.running {
    color: #ffffff;
  }
  .center-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }
  .quarter-tag {
    font-size: 12px;
    font-weight: 700;
    color: #d1d5db;
    letter-spacing: 0.08em;
  }
  .meta-sep {
    width: 1px;
    height: 10px;
    background: #4b5563;
  }
  .play-clock-inline {
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #d1d5db;
    letter-spacing: 0.02em;
  }
  .play-clock-inline.warning { color: #facc15; }
  .play-clock-inline.critical { color: #ef4444; }

  /* ── Info Strip (Down, Distance, Ball On) ── */
  .info-strip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: rgba(10, 10, 10, 0.92);
    padding: 5px 20px;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
  .info-down {
    font-size: 12px;
    font-weight: 700;
    color: #e5e7eb;
    letter-spacing: 0.04em;
  }
  .info-sep {
    width: 1px;
    height: 12px;
    background: #4b5563;
  }
  .info-ballon {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
    letter-spacing: 0.03em;
  }

  /* ── Flag ── */
  .flag-bar {
    background: #eab308;
    color: #000000;
    padding: 5px 18px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    animation: flag-pulse 1s ease-in-out infinite;
    box-shadow: 0 2px 12px rgba(234, 179, 8, 0.4);
  }
  .flag-icon {
    margin-right: 4px;
  }
  @keyframes flag-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
</style>
