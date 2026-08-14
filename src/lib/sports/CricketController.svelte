<script>
  import ControllerShell from '../ControllerShell.svelte';
  import TeamSetup from '../TeamSetup.svelte';
  import { scoreboard, formatOvers, calcRunRate, calcRequiredRate } from '../store.js';

  const MAX_OVERS = 20; // default T20; user can change

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  let maxOvers = $state(20);

  // ── Current batting team helpers ───────────────────────
  function battingRuns() { return state.battingTeam === 'home' ? state.homeScore : state.awayScore; }
  function battingWickets() { return state.battingTeam === 'home' ? state.homeWickets : state.awayWickets; }
  function battingOvers() { return state.battingTeam === 'home' ? state.homeOvers : state.awayOvers; }
  function battingBalls() { return state.battingTeam === 'home' ? state.homeBalls : state.awayBalls; }

  // ── Add runs ───────────────────────────────────────────
  function addRuns(delta) {
    const key = state.battingTeam === 'home' ? 'homeScore' : 'awayScore';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }

  // ── Wickets ────────────────────────────────────────────
  function addWicket(delta) {
    const key = state.battingTeam === 'home' ? 'homeWickets' : 'awayWickets';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, Math.min(10, s[key] + delta)) }));
  }

  // ── Balls / Overs ──────────────────────────────────────
  function addBall() {
    const oversKey = state.battingTeam === 'home' ? 'homeOvers' : 'awayOvers';
    const ballsKey = state.battingTeam === 'home' ? 'homeBalls' : 'awayBalls';
    scoreboard.update((s) => {
      let balls = s[ballsKey] + 1;
      let overs = s[oversKey];
      if (balls >= 6) { balls = 0; overs += 1; }
      return { ...s, [ballsKey]: balls, [oversKey]: overs };
    });
  }

  function removeBall() {
    const oversKey = state.battingTeam === 'home' ? 'homeOvers' : 'awayOvers';
    const ballsKey = state.battingTeam === 'home' ? 'homeBalls' : 'awayBalls';
    scoreboard.update((s) => {
      let balls = s[ballsKey] - 1;
      let overs = s[oversKey];
      if (balls < 0) { balls = 5; overs = Math.max(0, overs - 1); }
      return { ...s, [ballsKey]: balls, [oversKey]: overs };
    });
  }

  // ── Innings ────────────────────────────────────────────
  function nextInnings() {
    scoreboard.update((s) => {
      const newBatting = s.battingTeam === 'home' ? 'away' : 'home';
      const target = s.innings === 1 ? (s.battingTeam === 'home' ? s.homeScore + 1 : s.awayScore + 1) : s.target;
      return { ...s, battingTeam: newBatting, innings: s.innings + 1, target };
    });
  }

  // ── Set target ─────────────────────────────────────────
  function adjustTarget(delta) {
    scoreboard.patch({ target: Math.max(0, state.target + delta) });
  }

  // ── Reset ──────────────────────────────────────────────
  function handleReset() {
    scoreboard.resetSport('cricket');
  }

  // Computed display values
  let currentOvers = $derived(formatOvers(battingOvers(), battingBalls()));
  let currentRR = $derived(calcRunRate(battingRuns(), battingOvers(), battingBalls()));
  let reqRR = $derived(state.innings > 1
    ? calcRequiredRate(state.target, battingRuns(), battingOvers(), battingBalls(), maxOvers)
    : '—');
  let runsNeeded = $derived(state.innings > 1 ? Math.max(0, state.target - battingRuns()) : null);
  let ballsLeft = $derived(state.innings > 1 ? (maxOvers * 6) - (battingOvers() * 6 + battingBalls()) : null);
</script>

<ControllerShell sportLabel="Cricket" sportEmoji="🏏" onReset={handleReset}>

  <!-- ══════════════════════════════════════════════════════
       LIVE PREVIEW
  ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <div class="card-header">
      <span class="section-label">Live Overlay Preview</span>
    </div>
    <div class="preview-stage bg-[#070c14] rounded-xl p-6 flex justify-center">
      <div class="inline-flex flex-col items-center gap-3">
        <div class="inline-flex items-stretch rounded-xl overflow-hidden shadow-2xl">
          <!-- Batting team -->
          <div class="flex flex-col justify-center px-8 py-4 min-w-[200px]"
               style="background: linear-gradient(135deg, {state.battingTeam === 'home' ? state.homePrimary : state.awayPrimary} 70%, {state.battingTeam === 'home' ? state.homeSecondary : state.awaySecondary} 100%); color: {state.battingTeam === 'home' ? state.homeText : state.awayText};">
            <span class="text-xs opacity-70 mb-1">🏏 BATTING</span>
            <span class="text-lg font-bold tracking-widest uppercase">{state.battingTeam === 'home' ? state.homeName : state.awayName}</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-4xl font-black tabular-nums">{battingRuns()}</span>
              <span class="text-xl font-bold opacity-80">/{battingWickets()}</span>
            </div>
          </div>
          <!-- Centre -->
          <div class="bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-8 py-4">
            <div class="text-2xl font-black tabular-nums">{currentOvers} ov</div>
            <div class="text-xs text-gray-400 mt-1">RR {currentRR}</div>
            {#if state.innings > 1}
              <div class="text-xs text-amber-400 mt-1">Need {runsNeeded} off {ballsLeft}b</div>
              <div class="text-xs text-gray-500">RRR {reqRR}</div>
            {/if}
          </div>
          <!-- Fielding team -->
          <div class="flex flex-col justify-center px-8 py-4 min-w-[160px]"
               style="background: linear-gradient(225deg, {state.battingTeam === 'home' ? state.awayPrimary : state.homePrimary} 70%, {state.battingTeam === 'home' ? state.awaySecondary : state.homeSecondary} 100%); color: {state.battingTeam === 'home' ? state.awayText : state.homeText}; opacity:0.8;">
            <span class="text-xs opacity-70 mb-1">🎯 FIELDING</span>
            <span class="text-lg font-bold tracking-widest uppercase">{state.battingTeam === 'home' ? state.awayName : state.homeName}</span>
            {#if state.innings > 1}
              <div class="text-sm font-bold mt-1 opacity-80">Target: {state.target}</div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       MAIN CONTROLS
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

    <!-- Batting team selector + Innings -->
    <div class="col-span-3 card text-center">
      <div class="card-header justify-center"><span class="section-label">Innings</span></div>
      <div class="flex items-center justify-center gap-4 mb-5">
        <span class="text-4xl font-black val-primary">{state.innings}</span>
        <span class="text-gray-500 text-sm">of 2</span>
      </div>
      <div class="space-y-3 mb-5">
        <button onclick={() => scoreboard.patch({ battingTeam: 'home' })}
                class="w-full py-3 rounded-xl text-sm font-bold border transition-all
                       {state.battingTeam === 'home' ? '!border-amber-500 !bg-amber-900/30 text-amber-400' : 'btn-secondary'}">
          🏏 {state.homeName}
        </button>
        <button onclick={() => scoreboard.patch({ battingTeam: 'away' })}
                class="w-full py-3 rounded-xl text-sm font-bold border transition-all
                       {state.battingTeam === 'away' ? '!border-amber-500 !bg-amber-900/30 text-amber-400' : 'btn-secondary'}">
          🏏 {state.awayName}
        </button>
      </div>
      <button onclick={nextInnings} class="btn-secondary w-full text-sm">Next Innings →</button>
    </div>

    <!-- Score + Wickets + Overs -->
    <div class="col-span-5 card">
      <div class="card-header">
        <span class="section-label">Batting: {state.battingTeam === 'home' ? state.homeName : state.awayName}</span>
      </div>
      <!-- Score display -->
      <div class="flex items-baseline gap-2 mb-6">
        <span class="text-6xl font-black val-primary tabular-nums">{battingRuns()}</span>
        <span class="text-3xl font-bold text-gray-500">/{battingWickets()}</span>
        <span class="text-xl text-gray-600 ml-2">({currentOvers})</span>
      </div>
      <!-- Run buttons -->
      <div class="grid grid-cols-7 gap-2 mb-5">
        {#each [6, 4, 3, 2, 1] as r}
          <button onclick={() => addRuns(r)} class="btn-score">{r}</button>
        {/each}
        <button onclick={() => addRuns(-1)} class="btn-score-neg col-span-2">−1</button>
      </div>
      <!-- Wickets -->
      <div class="flex items-center gap-5 mb-4">
        <span class="section-label text-[10px]">Wickets</span>
        <button onclick={() => addWicket(-1)} class="btn-round-sm">−</button>
        <span class="text-2xl font-black val-primary w-8 text-center">{battingWickets()}</span>
        <button onclick={() => addWicket(1)} class="btn-round-sm">+</button>
        <div class="flex gap-1 ml-2">
          {#each { length: 10 } as _, i}
            <div class="w-2 h-4 rounded-sm {i < battingWickets() ? 'bg-red-500' : 'bg-gray-700'}"></div>
          {/each}
        </div>
      </div>
      <!-- Balls/Overs -->
      <div class="flex items-center gap-4">
        <span class="section-label text-[10px]">Overs</span>
        <button onclick={removeBall} class="btn-sm">−ball</button>
        <span class="text-xl font-black val-primary w-16 text-center">{currentOvers}</span>
        <button onclick={addBall} class="btn-sm">+ball</button>
      </div>
    </div>

    <!-- Stats + Target -->
    <div class="col-span-4 space-y-4">
      <!-- Run rates -->
      <div class="card">
        <div class="section-label text-[10px] mb-4">Run Rates</div>
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-2xl font-black val-primary tabular-nums">{currentRR}</div>
            <div class="section-label text-[9px] mt-1">Current RR</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-black {reqRR === '—' ? 'text-gray-600' : 'text-amber-400'} tabular-nums">{reqRR}</div>
            <div class="section-label text-[9px] mt-1">Req. RR</div>
          </div>
        </div>
      </div>

      <!-- Target (2nd innings) -->
      {#if state.innings > 1}
        <div class="card">
          <div class="section-label text-[10px] mb-3">Target</div>
          <div class="flex items-center gap-4">
            <button onclick={() => adjustTarget(-1)} class="btn-round-sm">−</button>
            <span class="text-3xl font-black val-primary tabular-nums flex-1 text-center">{state.target}</span>
            <button onclick={() => adjustTarget(1)} class="btn-round-sm">+</button>
          </div>
          {#if runsNeeded !== null}
            <div class="mt-3 text-center text-sm text-amber-400 font-bold">
              Need {runsNeeded} off {ballsLeft} balls
            </div>
          {/if}
        </div>
      {/if}

      <!-- Overs format -->
      <div class="card">
        <div class="section-label text-[10px] mb-3">Format (max overs)</div>
        <div class="flex gap-2 flex-wrap">
          {#each [20, 50, 15, 10] as o}
            <button onclick={() => maxOvers = o}
                    class="btn-sm {maxOvers === o ? '!bg-violet-900/40 !text-violet-400 !border-violet-700' : ''}">{o}</button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Team Setup -->
  <TeamSetup />

</ControllerShell>

<style>
  .card {
    background: var(--c-bg-card); border: 1px solid var(--c-bd-card);
    border-radius: 16px; padding: 28px; transition: border-color 0.2s ease;
  }
  .card-header {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 24px;
  }
  .section-label {
    font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em; color: var(--c-text-mute);
  }
  .val-primary   { color: var(--c-text-val); }
  .val-secondary { color: var(--c-text-sub); }
  .btn-score {
    padding: 14px 0; border-radius: 12px; font-weight: 800; font-size: 15px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    border: 1px solid var(--c-bd-btn); transition: all 0.15s ease; cursor: pointer;
  }
  .btn-score:hover  { background: var(--c-bg-btn-h); }
  .btn-score:active { transform: scale(0.95); }
  .btn-score-neg {
    padding: 14px 0; border-radius: 12px; font-weight: 800; font-size: 15px;
    background: rgba(127,29,29,0.3); color: #fca5a5;
    border: 1px solid rgba(127,29,29,0.5); transition: all 0.15s ease; cursor: pointer;
  }
  .btn-score-neg:hover  { background: rgba(127,29,29,0.5); }
  .btn-score-neg:active { transform: scale(0.95); }
  .btn-secondary {
    padding: 10px 18px; border-radius: 10px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 13px; font-weight: 600; border: 1px solid var(--c-bd-btn);
    transition: all 0.15s ease; cursor: pointer;
  }
  .btn-secondary:hover  { background: var(--c-bg-btn-h); }
  .btn-secondary:active { transform: scale(0.96); }
  .btn-sm {
    padding: 8px 14px; border-radius: 8px;
    background: var(--c-bg-btn); color: var(--c-text-mute);
    font-size: 12px; font-weight: 600; border: 1px solid var(--c-bd-btn);
    transition: all 0.15s ease; cursor: pointer;
  }
  .btn-sm:hover  { background: var(--c-bg-btn-h); }
  .btn-sm:active { transform: scale(0.96); }
  .btn-round-sm {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 18px; font-weight: 700; border: 1px solid var(--c-bd-btn);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-round-sm:hover  { background: var(--c-bg-btn-h); }
  .btn-round-sm:active { transform: scale(0.93); }
</style>
