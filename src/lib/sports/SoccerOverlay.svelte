<script>
  import { scoreboard, formatSoccerClock, halfLabel } from '../store.js';
  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });
</script>

<div class="overlay-root">
  <div class="scorebug">
    <div class="team-block"
         style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
      <div class="team-inner">
        <span class="team-score">{state.homeScore}</span>
        <div class="team-info">
          <span class="team-name">{state.homeName}</span>
          <div class="card-pips">
            {#each { length: state.homeYellowCards } as _}
              <span class="card-pip yellow">▬</span>
            {/each}
            {#each { length: state.homeRedCards } as _}
              <span class="card-pip red">▬</span>
            {/each}
          </div>
        </div>
      </div>
    </div>
    <div class="center-block">
      <div class="match-clock">{formatSoccerClock(state.gameClockSeconds)}{#if state.addedTime > 0}+{state.addedTime}{/if}'</div>
      <div class="half-label">{halfLabel(state.half)}</div>
    </div>
    <div class="team-block"
         style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
      <div class="team-inner away">
        <div class="team-info">
          <span class="team-name">{state.awayName}</span>
          <div class="card-pips">
            {#each { length: state.awayYellowCards } as _}
              <span class="card-pip yellow">▬</span>
            {/each}
            {#each { length: state.awayRedCards } as _}
              <span class="card-pip red">▬</span>
            {/each}
          </div>
        </div>
        <span class="team-score">{state.awayScore}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay-root {
    position: fixed; bottom: 48px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    pointer-events: none; z-index: 9999;
  }
  .scorebug {
    display: flex; align-items: stretch; border-radius: 10px; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
  .team-block { min-width: 220px; }
  .team-inner { display: flex; align-items: center; gap: 14px; padding: 14px 22px; }
  .team-inner.away { flex-direction: row-reverse; text-align: right; }
  .team-info { display: flex; flex-direction: column; gap: 4px; }
  .team-name { font-size: 14px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
  .team-score { font-size: 40px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
  .card-pips { display: flex; gap: 3px; align-items: center; }
  .card-pip { font-size: 11px; border-radius: 2px; }
  .card-pip.yellow { color: #fbbf24; }
  .card-pip.red    { color: #ef4444; }
  .center-block {
    background: #0a0a0a; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 10px 28px; min-width: 130px; gap: 2px;
  }
  .match-clock { font-size: 28px; font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; }
  .half-label { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.08em; text-transform: uppercase; }
</style>
