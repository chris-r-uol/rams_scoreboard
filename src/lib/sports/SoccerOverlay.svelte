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
        {#key state.homeScore}<span class="team-score">{state.homeScore}</span>{/key}
        <div class="team-info">
          {#if state.homeLogo}<img class="team-logo" src={state.homeLogo} alt="" onerror={(e) => e.currentTarget.style.display = "none"} />{/if}<span class="team-name">{state.homeName}</span>
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
          {#if state.awayLogo}<img class="team-logo" src={state.awayLogo} alt="" onerror={(e) => e.currentTarget.style.display = "none"} />{/if}<span class="team-name">{state.awayName}</span>
          <div class="card-pips">
            {#each { length: state.awayYellowCards } as _}
              <span class="card-pip yellow">▬</span>
            {/each}
            {#each { length: state.awayRedCards } as _}
              <span class="card-pip red">▬</span>
            {/each}
          </div>
        </div>
        {#key state.awayScore}<span class="team-score">{state.awayScore}</span>{/key}
      </div>
    </div>
  </div>
</div>

<style>
  .overlay-root {
    position: fixed;
    inset: var(--sb-inset, auto auto 48px 50%);
    transform: var(--sb-translate, translateX(-50%)) scale(var(--sb-scale, 1));
    transform-origin: var(--sb-origin, bottom center);
    /* Inherited by every digit in the bug, so a clock counting down never
       shifts width as the numerals change. */
    font-variant-numeric: tabular-nums;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    font-family: 'Inter Variable', 'Segoe UI', system-ui, -apple-system, sans-serif;
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
