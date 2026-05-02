<script>
  import { scoreboard, inningLabel } from '../store.js';
  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });
</script>

<div class="overlay-root">
  <!-- Box score panel -->
  <div class="box-score">
    <div class="bs-header">
      <div class="bs-cell team-col"></div>
      <div class="bs-cell stat-col">R</div>
      <div class="bs-cell stat-col">H</div>
      <div class="bs-cell stat-col">E</div>
    </div>
    <div class="bs-row">
      <div class="bs-cell team-col">
        <span class="team-name" style="color:{state.homePrimary}">{state.homeName}</span>
      </div>
      <div class="bs-cell stat-col val">{state.homeScore}</div>
      <div class="bs-cell stat-col val">{state.homeHits}</div>
      <div class="bs-cell stat-col val">{state.homeErrors}</div>
    </div>
    <div class="bs-row">
      <div class="bs-cell team-col">
        <span class="team-name" style="color:{state.awayPrimary}">{state.awayName}</span>
      </div>
      <div class="bs-cell stat-col val">{state.awayScore}</div>
      <div class="bs-cell stat-col val">{state.awayHits}</div>
      <div class="bs-cell stat-col val">{state.awayErrors}</div>
    </div>
  </div>

  <!-- Status strip: inning + count + bases -->
  <div class="status-strip">
    <span class="inning-label">{inningLabel(state.inning, state.topBottom)}</span>
    <span class="sep"></span>
    <div class="count-block">
      <span class="count-item">B: {state.balls}</span>
      <span class="count-item">S: {state.strikes}</span>
      <span class="count-item">O: {state.outs}</span>
    </div>
    <span class="sep"></span>
    <!-- Base diamond (compact) -->
    <div class="base-diamond">
      <div class="base-row">
        <div class="base {state.secondBase ? 'occupied' : ''}"></div>
      </div>
      <div class="base-row-mid">
        <div class="base {state.thirdBase ? 'occupied' : ''}"></div>
        <div class="base empty-center"></div>
        <div class="base {state.firstBase ? 'occupied' : ''}"></div>
      </div>
      <div class="base-row">
        <div class="base home-plate {state.homeBase ? 'occupied' : ''}"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay-root {
    position: fixed; bottom: 48px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    pointer-events: none; z-index: 9999;
  }
  .box-score {
    background: rgba(10,10,10,0.92); border-radius: 10px 10px 0 0;
    overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
  .bs-header { display: grid; grid-template-columns: 120px repeat(3, 48px); background: rgba(255,255,255,0.06); }
  .bs-row    { display: grid; grid-template-columns: 120px repeat(3, 48px); }
  .bs-cell { padding: 7px 10px; display: flex; align-items: center; justify-content: center; }
  .team-col { justify-content: flex-start !important; }
  .stat-col { font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 0.1em; }
  .val { font-size: 20px; font-weight: 900; color: #ffffff; font-variant-numeric: tabular-nums; }
  .team-name { font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap; }
  .status-strip {
    display: flex; align-items: center; gap: 12px;
    background: rgba(10,10,10,0.92); padding: 7px 18px; border-radius: 0 0 10px 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .inning-label { font-size: 13px; font-weight: 800; color: #f3f4f6; letter-spacing: 0.05em; white-space: nowrap; }
  .sep { width: 1px; height: 14px; background: #374151; }
  .count-block { display: flex; gap: 10px; }
  .count-item { font-size: 12px; font-weight: 700; color: #d1d5db; }
  .base-diamond { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .base-row { display: flex; justify-content: center; }
  .base-row-mid { display: flex; gap: 10px; align-items: center; }
  .base { width: 10px; height: 10px; background: rgba(255,255,255,0.15); transform: rotate(45deg); border: 1px solid rgba(255,255,255,0.3); }
  .base.occupied { background: #fbbf24; border-color: #fbbf24; }
  .empty-center { width: 10px; height: 10px; opacity: 0; }
  .home-plate { border-radius: 0 0 4px 4px; }
</style>
