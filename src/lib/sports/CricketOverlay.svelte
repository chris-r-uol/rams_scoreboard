<script>
  import { scoreboard, formatOvers, calcRunRate, calcRequiredRate } from '../store.js';
  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  let battingRuns = $derived(state.battingTeam === 'home' ? state.homeScore : state.awayScore);
  let battingWickets = $derived(state.battingTeam === 'home' ? state.homeWickets : state.awayWickets);
  let battingOvers = $derived(state.battingTeam === 'home' ? state.homeOvers : state.awayOvers);
  let battingBalls = $derived(state.battingTeam === 'home' ? state.homeBalls : state.awayBalls);
  let fieldingName = $derived(state.battingTeam === 'home' ? state.awayName : state.homeName);
  let battingName = $derived(state.battingTeam === 'home' ? state.homeName : state.awayName);
  let battingPrimary = $derived(state.battingTeam === 'home' ? state.homePrimary : state.awayPrimary);
  let battingSecondary = $derived(state.battingTeam === 'home' ? state.homeSecondary : state.awaySecondary);
  let battingText = $derived(state.battingTeam === 'home' ? state.homeText : state.awayText);

  let currentOvers = $derived(formatOvers(battingOvers, battingBalls));
  let currentRR = $derived(calcRunRate(battingRuns, battingOvers, battingBalls));
  let reqRR = $derived(state.innings > 1 ? calcRequiredRate(state.target, battingRuns, battingOvers, battingBalls, 20) : null);
  let runsNeeded = $derived(state.innings > 1 ? Math.max(0, state.target - battingRuns) : null);
</script>

<div class="overlay-root">
  <div class="scorebug">
    <!-- Batting team -->
    <div class="team-block"
         style="background: linear-gradient(135deg, {battingPrimary} 70%, {battingSecondary} 100%); color: {battingText};">
      <div class="team-inner">
        <div class="team-info">
          <span class="bat-icon">🏏</span>
          <span class="team-name">{battingName}</span>
        </div>
        <div class="score-block">
          <span class="score">{battingRuns}/{battingWickets}</span>
        </div>
      </div>
    </div>
    <!-- Centre -->
    <div class="center-block">
      <div class="overs">{currentOvers} ov</div>
      <div class="rr-row">
        <span class="rr-label">RR</span>
        <span class="rr-val">{currentRR}</span>
      </div>
      {#if state.innings > 1 && reqRR}
        <div class="rr-row req">
          <span class="rr-label">RRR</span>
          <span class="rr-val">{reqRR}</span>
        </div>
      {/if}
    </div>
    <!-- Fielding team -->
    <div class="team-block fielding"
         style="background: rgba(10,10,10,0.5);">
      <div class="team-inner">
        <div class="team-info">
          <span class="target-icon">🎯</span>
          <span class="team-name fielding">{fieldingName}</span>
        </div>
        {#if state.innings > 1}
          <div class="target-block">
            <span class="target-label">TGT</span>
            <span class="target-val">{state.target}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
  {#if state.innings > 1 && runsNeeded !== null}
    <div class="need-strip">Need {runsNeeded} to win</div>
  {/if}
</div>

<style>
  .overlay-root {
    position: fixed; bottom: 48px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    pointer-events: none; z-index: 9999;
  }
  .scorebug {
    display: flex; align-items: stretch; border-radius: 10px; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
  .team-block { min-width: 180px; }
  .team-inner { display: flex; align-items: center; gap: 10px; padding: 12px 18px; }
  .team-info { display: flex; align-items: center; gap: 6px; flex: 1; }
  .bat-icon, .target-icon { font-size: 14px; }
  .team-name { font-size: 14px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap; color: #f3f4f6; }
  .team-name.fielding { color: #9ca3af; }
  .score-block { text-align: right; }
  .score { font-size: 30px; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; white-space: nowrap; }
  .center-block {
    background: #0a0a0a; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 10px 24px; min-width: 120px; gap: 2px;
  }
  .overs { font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; }
  .rr-row { display: flex; gap: 5px; align-items: baseline; }
  .rr-row.req .rr-label { color: #fbbf24; }
  .rr-row.req .rr-val  { color: #fbbf24; }
  .rr-label { font-size: 9px; font-weight: 700; color: #6b7280; letter-spacing: 0.1em; }
  .rr-val   { font-size: 13px; font-weight: 800; color: #d1d5db; }
  .target-block { display: flex; flex-direction: column; align-items: flex-end; }
  .target-label { font-size: 9px; font-weight: 700; color: #6b7280; letter-spacing: 0.1em; }
  .target-val   { font-size: 20px; font-weight: 900; color: #fbbf24; }
  .need-strip {
    background: rgba(10,10,10,0.88); color: #fbbf24;
    padding: 4px 18px; border-radius: 0 0 8px 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.05em;
  }
</style>
