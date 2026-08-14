<script>
  import { scoreboard, formatGameClock, quarterLabel } from '../store.js';
  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  let shotClockColor = $derived(
    state.shotClockSeconds <= 5 ? '#dc2626'
    : state.shotClockSeconds <= 10 ? '#d97706'
    : '#ffffff'
  );
</script>

<div class="overlay-root">
  <div class="scorebug">
    <div class="team-block"
         style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
      <div class="team-inner">
        <div class="team-info">
          {#if state.homeLogo}<img class="team-logo" src={state.homeLogo} alt="" onerror={(e) => e.currentTarget.style.display = "none"} />{/if}<span class="team-name">{state.homeName}</span>
          <div class="team-badges">
            <span class="badge foul-badge">F: {state.homeFouls}</span>
            <div class="timeout-dots">
              {#each { length: 7 } as _, i}
                {#if i < state.homeTimeouts}
                  <div class="to-dot active" style="background:{state.homeText}"></div>
                {:else}
                  <div class="to-dot" style="border: 1px solid {state.homeText}; opacity:0.25"></div>
                {/if}
              {/each}
            </div>
          </div>
        </div>
        {#key state.homeScore}<span class="team-score">{state.homeScore}</span>{/key}
        {#if state.possession === 'home'}
          <div class="poss-dot" style="background:{state.homeText}"></div>
        {/if}
      </div>
    </div>
    <div class="center-block">
      <div class="game-clock">{formatGameClock(state.gameClockSeconds)}</div>
      <div class="quarter-row">
        <span class="quarter-label">{quarterLabel(state.quarter)}</span>
      </div>
      <div class="shot-clock" style="color: {shotClockColor}">
        :{String(state.shotClockSeconds).padStart(2,'0')}
      </div>
    </div>
    <div class="team-block"
         style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
      <div class="team-inner away">
        {#if state.possession === 'away'}
          <div class="poss-dot" style="background:{state.awayText}"></div>
        {/if}
        {#key state.awayScore}<span class="team-score">{state.awayScore}</span>{/key}
        <div class="team-info">
          {#if state.awayLogo}<img class="team-logo" src={state.awayLogo} alt="" onerror={(e) => e.currentTarget.style.display = "none"} />{/if}<span class="team-name">{state.awayName}</span>
          <div class="team-badges">
            <span class="badge foul-badge">F: {state.awayFouls}</span>
            <div class="timeout-dots">
              {#each { length: 7 } as _, i}
                {#if i < state.awayTimeouts}
                  <div class="to-dot active" style="background:{state.awayText}"></div>
                {:else}
                  <div class="to-dot" style="border: 1px solid {state.awayText}; opacity:0.25"></div>
                {/if}
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay-root {
    /* Anchoring and scale now live on the stage wrapper (see Overlay.svelte),
       so the scorebug and any sponsor panel move and scale as one unit. */
    position: relative;
    /* Inherited by every digit in the bug, so a clock counting down never
       shifts width as the numerals change. */
    font-variant-numeric: tabular-nums;
    display: flex; flex-direction: column; align-items: center;
    font-family: 'Inter Variable', 'Segoe UI', system-ui, -apple-system, sans-serif;
    pointer-events: none; z-index: 9999;
  }
  .scorebug {
    display: flex; align-items: stretch; border-radius: 10px; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
  .team-block { min-width: 220px; }
  .team-inner { display: flex; align-items: center; gap: 10px; padding: 12px 18px; position: relative; }
  .team-inner.away { flex-direction: row-reverse; }
  .team-info { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .team-name { font-size: 13px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
  .team-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: rgba(0,0,0,0.25); }
  .timeout-dots { display: flex; gap: 3px; }
  .to-dot { width: 7px; height: 7px; border-radius: 50%; }
  .to-dot.active { opacity: 0.9; }
  .team-score { font-size: 40px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; flex-shrink: 0; }
  .poss-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; opacity: 0.9; }
  .center-block {
    background: #0a0a0a; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 8px 24px; min-width: 140px; gap: 2px;
  }
  .game-clock { font-size: 30px; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; }
  .quarter-row { display: flex; align-items: center; gap: 6px; }
  .quarter-label { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase; }
  .shot-clock { font-size: 16px; font-weight: 900; font-variant-numeric: tabular-nums; }

  /* A score change is the moment the audience looks up. Four of the seven
     sports had no motion at all, so scores snapped between values. */
  .team-score { display: inline-block; animation: score-pop 0.28s ease-out; }
  @keyframes score-pop {
    0%   { transform: scale(1.3); }
    60%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .team-score { animation: none; }
  }

  /* Team badge — sits beside the name, sized to the type rather than fixed, so
     it scales with the overlay. Hidden if the image fails, which matters for
     externally linked badges whose host may be unreachable at kickoff. */
  .team-logo {
    height: 1.9em; width: auto; max-width: 2.6em;
    object-fit: contain; flex-shrink: 0;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
  }
</style>
