<script>
  import { scoreboard, formatGameClock, periodLabel } from '../store.js';
  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  function penaltyDisplay(secs) {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }
</script>

<div class="overlay-root">
  <div class="scorebug">
    <div class="team-block"
         style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
      <div class="team-inner">
        <div class="team-info">
          <span class="team-name">{state.homeName}</span>
          <div class="team-badges">
            {#if state.homeTimeouts > 0}
              <span class="badge timeout-badge">TO: {state.homeTimeouts}</span>
            {/if}
            {#if state.homePenaltyRunning && state.homePenaltySeconds > 0}
              <span class="badge penalty-badge">PP {penaltyDisplay(state.homePenaltySeconds)}</span>
            {/if}
          </div>
        </div>
        <span class="team-score">{state.homeScore}</span>
      </div>
    </div>
    <div class="center-block">
      <div class="game-clock">{formatGameClock(state.gameClockSeconds)}</div>
      <div class="period-label">{periodLabel(state.period)}</div>
    </div>
    <div class="team-block"
         style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
      <div class="team-inner away">
        <span class="team-score">{state.awayScore}</span>
        <div class="team-info">
          <span class="team-name">{state.awayName}</span>
          <div class="team-badges">
            {#if state.awayTimeouts > 0}
              <span class="badge timeout-badge">TO: {state.awayTimeouts}</span>
            {/if}
            {#if state.awayPenaltyRunning && state.awayPenaltySeconds > 0}
              <span class="badge penalty-badge">PP {penaltyDisplay(state.awayPenaltySeconds)}</span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay-root {
    position: fixed; bottom: 48px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    pointer-events: none; z-index: 9999;
  }
  .scorebug {
    display: flex; align-items: stretch; border-radius: 10px; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
  .team-block { min-width: 220px; }
  .team-inner { display: flex; align-items: center; gap: 12px; padding: 14px 22px; }
  .team-inner.away { flex-direction: row-reverse; }
  .team-info { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .team-name { font-size: 14px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
  .team-badges { display: flex; gap: 5px; flex-wrap: wrap; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
  .timeout-badge { background: rgba(0,0,0,0.3); }
  .penalty-badge { background: rgba(220,38,38,0.7); color: white; animation: pulse 1s ease-in-out infinite; }
  .team-score { font-size: 40px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
  .center-block {
    background: #0a0a0a; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 10px 28px; min-width: 150px; gap: 3px;
  }
  .game-clock { font-size: 32px; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; }
  .period-label { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
</style>
