<script>
  import ControllerShell from '../ControllerShell.svelte';
  import TeamSetup from '../TeamSetup.svelte';
  import {
    scoreboard, formatGameClock, quarterLabel,
    startGameClockInterval, stopGameClockInterval,
    startShotClockInterval, stopShotClockInterval,
  } from '../store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // ── Score ──────────────────────────────────────────────
  function addScore(team, pts) {
    const key = team === 'home' ? 'homeScore' : 'awayScore';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + pts) }));
  }

  // ── Game Clock ─────────────────────────────────────────
  function toggleGameClock() {
    const running = !state.gameClockRunning;
    scoreboard.patch({ gameClockRunning: running });
    if (running) startGameClockInterval(); else stopGameClockInterval();
  }

  function resetGameClock(minutes) {
    stopGameClockInterval();
    scoreboard.patch({ gameClockSeconds: minutes * 60, gameClockRunning: false });
  }

  function adjustGameClock(delta) {
    scoreboard.patch({ gameClockSeconds: Math.max(0, Math.min(3600, state.gameClockSeconds + delta)) });
  }

  // ── Shot Clock ─────────────────────────────────────────
  function toggleShotClock() {
    const running = !state.shotClockRunning;
    scoreboard.patch({ shotClockRunning: running });
    if (running) startShotClockInterval(); else stopShotClockInterval();
  }

  function resetShotClock(s) {
    stopShotClockInterval();
    scoreboard.patch({ shotClockSeconds: s, shotClockRunning: false });
  }

  // ── Quarter ────────────────────────────────────────────
  function nextQuarter() {
    stopGameClockInterval();
    scoreboard.update((s) => {
      const q = s.quarter >= 5 ? 1 : s.quarter + 1;
      return { ...s, quarter: q, gameClockSeconds: q <= 4 ? 600 : 300, gameClockRunning: false };
    });
  }
  function prevQuarter() {
    scoreboard.update((s) => ({ ...s, quarter: s.quarter <= 1 ? 5 : s.quarter - 1 }));
  }

  // ── Fouls ──────────────────────────────────────────────
  function adjustFouls(team, delta) {
    const key = team === 'home' ? 'homeFouls' : 'awayFouls';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }

  // ── Timeouts ───────────────────────────────────────────
  function useTimeout(team) {
    const key = team === 'home' ? 'homeTimeouts' : 'awayTimeouts';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] - 1) }));
  }
  function restoreTimeout(team) {
    const key = team === 'home' ? 'homeTimeouts' : 'awayTimeouts';
    scoreboard.update((s) => ({ ...s, [key]: Math.min(7, s[key] + 1) }));
  }

  // ── Possession ─────────────────────────────────────────
  function togglePossession() {
    scoreboard.patch({ possession: state.possession === 'home' ? 'away' : 'home' });
  }

  // ── Reset ──────────────────────────────────────────────
  function handleReset() {
    stopShotClockInterval();
    scoreboard.resetSport('basketball');
  }
</script>

<ControllerShell sportLabel="Basketball" sportEmoji="🏀" onReset={handleReset}>

  <!-- ══════════════════════════════════════════════════════
       LIVE PREVIEW
  ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <div class="card-header">
      <span class="section-label">Live Overlay Preview</span>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full {state.gameClockRunning ? 'bg-orange-400 animate-pulse' : 'bg-gray-600'}"></div>
        <span class="text-xs text-gray-500">{state.gameClockRunning ? 'Clock running' : 'Clock stopped'}</span>
      </div>
    </div>
    <div class="preview-stage bg-[#070c14] rounded-xl p-6 flex justify-center">
      <div class="inline-flex items-stretch rounded-xl overflow-hidden shadow-2xl">
        <div class="flex items-center gap-4 px-6 py-4"
             style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
          {#if state.possession === 'home'}<span class="text-xs opacity-70">◀</span>{/if}
          <div class="flex flex-col items-center gap-1">
            <span class="text-sm font-bold tracking-widest uppercase">{state.homeName}</span>
            <span class="text-[10px] opacity-60">FOULS: {state.homeFouls}</span>
          </div>
          <div class="flex flex-col gap-1">
            {#each { length: Math.min(state.homeTimeouts, 5) } as _}
              <div class="w-1.5 h-1.5 rounded-full opacity-80" style="background:{state.homeText}"></div>
            {/each}
          </div>
          <span class="text-4xl font-black tabular-nums">{state.homeScore}</span>
        </div>
        <div class="bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-8 py-3 min-w-[150px]">
          <div class="text-3xl font-black tabular-nums">{formatGameClock(state.gameClockSeconds)}</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs font-bold text-gray-300">{quarterLabel(state.quarter)}</span>
            <span class="text-gray-600">·</span>
            <span class="inline-block px-2 py-0.5 rounded text-xs font-black
                         {state.shotClockSeconds <= 5 ? 'bg-red-700' : state.shotClockSeconds <= 10 ? 'bg-amber-600' : 'bg-gray-700'}">
              {state.shotClockSeconds}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-4 px-6 py-4"
             style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
          <span class="text-4xl font-black tabular-nums">{state.awayScore}</span>
          <div class="flex flex-col gap-1">
            {#each { length: Math.min(state.awayTimeouts, 5) } as _}
              <div class="w-1.5 h-1.5 rounded-full opacity-80" style="background:{state.awayText}"></div>
            {/each}
          </div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-sm font-bold tracking-widest uppercase">{state.awayName}</span>
            <span class="text-[10px] opacity-60">FOULS: {state.awayFouls}</span>
          </div>
          {#if state.possession === 'away'}<span class="text-xs opacity-70">▶</span>{/if}
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       CLOCKS + QUARTER
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- Game Clock -->
    <div class="card text-center col-span-1">
      <div class="card-header justify-center"><span class="section-label">Game Clock</span></div>
      <div class="text-[52px] font-black tabular-nums leading-none mb-6
                  {state.gameClockRunning ? 'text-orange-400' : 'val-primary'}">
        {formatGameClock(state.gameClockSeconds)}
      </div>
      <button onclick={toggleGameClock}
              class="w-full py-4 rounded-xl text-sm font-bold mb-4
                     {state.gameClockRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-orange-600 hover:bg-orange-500'}">
        {state.gameClockRunning ? '⏸  STOP' : '▶  START'}
      </button>
      <div class="flex gap-2 flex-wrap justify-center">
        <button onclick={() => resetGameClock(12)} class="btn-secondary">12:00</button>
        <button onclick={() => resetGameClock(10)} class="btn-secondary">10:00</button>
        <button onclick={() => adjustGameClock(-1)} class="btn-secondary">−1s</button>
        <button onclick={() => adjustGameClock(1)} class="btn-secondary">+1s</button>
      </div>
    </div>

    <!-- Quarter -->
    <div class="card text-center flex flex-col justify-between">
      <div class="card-header justify-center"><span class="section-label">Quarter</span></div>
      <div class="flex items-center justify-center gap-6 py-4">
        <button onclick={prevQuarter} class="btn-round">‹</button>
        <span class="text-5xl font-black val-primary">{quarterLabel(state.quarter)}</span>
        <button onclick={nextQuarter} class="btn-round">›</button>
      </div>
      <p class="text-[11px] text-gray-600 pb-1">OT = 5 min</p>
    </div>

    <!-- Shot Clock -->
    <div class="card text-center">
      <div class="card-header justify-center"><span class="section-label">Shot Clock</span></div>
      <div class="text-[52px] font-black tabular-nums leading-none mb-6
                  {state.shotClockRunning ? (state.shotClockSeconds <= 5 ? 'text-red-400' : 'text-orange-400') : 'val-primary'}">
        {state.shotClockSeconds}
      </div>
      <button onclick={toggleShotClock}
              class="w-full py-4 rounded-xl text-sm font-bold mb-4
                     {state.shotClockRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-orange-600 hover:bg-orange-500'}">
        {state.shotClockRunning ? '⏸  STOP' : '▶  START'}
      </button>
      <div class="flex gap-2 justify-center">
        <button onclick={() => resetShotClock(24)} class="btn-secondary flex-1">Reset 24</button>
        <button onclick={() => resetShotClock(14)} class="btn-secondary flex-1">Reset 14</button>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       SCORES + POSSESSION + FOULS + TIMEOUTS
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

    <!-- Home -->
    <div class="col-span-4 card" style="border-top: 3px solid {state.homePrimary};">
      <div class="card-header">
        <span class="section-label">Home — <span class="val-secondary">{state.homeName}</span></span>
      </div>
      <div class="flex items-center gap-4 mb-6">
        {#if state.possession === 'home'}<span class="text-orange-400 text-xl">🏀</span>{/if}
        <span class="text-6xl font-black tabular-nums val-primary">{state.homeScore}</span>
      </div>
      <div class="grid grid-cols-4 gap-2.5 mb-5">
        {#each [3, 2, 1] as pts}
          <button onclick={() => addScore('home', pts)} class="btn-score">+{pts}</button>
        {/each}
        <button onclick={() => addScore('home', -1)} class="btn-score-neg">−1</button>
      </div>
      <div class="flex items-center justify-between mb-4">
        <span class="section-label text-[10px]">Fouls</span>
        <div class="flex items-center gap-3">
          <button onclick={() => adjustFouls('home', -1)} class="btn-round-sm">−</button>
          <span class="text-2xl font-black val-primary w-8 text-center">{state.homeFouls}</span>
          <button onclick={() => adjustFouls('home', 1)} class="btn-round-sm">+</button>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="section-label text-[10px]">TOL</span>
          {#each { length: Math.min(state.homeTimeouts, 5) } as _, i}
            <div class="w-3 h-3 rounded-full bg-amber-400"></div>
          {/each}
          {#if state.homeTimeouts > 5}<span class="text-xs text-amber-400 font-bold">+{state.homeTimeouts - 5}</span>{/if}
          {#if state.homeTimeouts === 0}<span class="text-xs text-gray-600">0</span>{/if}
        </div>
        <div class="flex gap-2">
          <button onclick={() => useTimeout('home')} class="btn-sm">Use</button>
          <button onclick={() => restoreTimeout('home')} class="btn-sm">+1</button>
        </div>
      </div>
    </div>

    <!-- Centre: Possession -->
    <div class="col-span-4 flex items-center justify-center">
      <button onclick={togglePossession}
              class="card hover:bg-gray-800/80 transition-colors text-center py-8 px-10 cursor-pointer w-full">
        <div class="section-label text-[10px] mb-3">Possession</div>
        <div class="text-5xl mb-3">🏀</div>
        <div class="text-lg font-bold val-primary">
          {state.possession === 'home' ? state.homeName : state.awayName}
        </div>
        <p class="text-xs text-gray-600 mt-3">Tap to switch</p>
      </button>
    </div>

    <!-- Away -->
    <div class="col-span-4 card" style="border-top: 3px solid {state.awayPrimary};">
      <div class="card-header justify-end">
        <span class="section-label"><span class="val-secondary">{state.awayName}</span> — Away</span>
      </div>
      <div class="flex items-center justify-end gap-4 mb-6">
        <span class="text-6xl font-black tabular-nums val-primary">{state.awayScore}</span>
        {#if state.possession === 'away'}<span class="text-orange-400 text-xl">🏀</span>{/if}
      </div>
      <div class="grid grid-cols-4 gap-2.5 mb-5">
        {#each [3, 2, 1] as pts}
          <button onclick={() => addScore('away', pts)} class="btn-score">+{pts}</button>
        {/each}
        <button onclick={() => addScore('away', -1)} class="btn-score-neg">−1</button>
      </div>
      <div class="flex items-center justify-between mb-4">
        <span class="section-label text-[10px]">Fouls</span>
        <div class="flex items-center gap-3">
          <button onclick={() => adjustFouls('away', -1)} class="btn-round-sm">−</button>
          <span class="text-2xl font-black val-primary w-8 text-center">{state.awayFouls}</span>
          <button onclick={() => adjustFouls('away', 1)} class="btn-round-sm">+</button>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          <button onclick={() => useTimeout('away')} class="btn-sm">Use</button>
          <button onclick={() => restoreTimeout('away')} class="btn-sm">+1</button>
        </div>
        <div class="flex items-center gap-1.5">
          {#each { length: Math.min(state.awayTimeouts, 5) } as _, i}
            <div class="w-3 h-3 rounded-full bg-amber-400"></div>
          {/each}
          {#if state.awayTimeouts > 5}<span class="text-xs text-amber-400 font-bold">+{state.awayTimeouts - 5}</span>{/if}
          {#if state.awayTimeouts === 0}<span class="text-xs text-gray-600">0</span>{/if}
          <span class="section-label text-[10px]">TOL</span>
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
    padding: 16px 0; border-radius: 12px; font-weight: 800; font-size: 15px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    border: 1px solid var(--c-bd-btn); transition: all 0.15s ease; cursor: pointer;
  }
  .btn-score:hover  { background: var(--c-bg-btn-h); }
  .btn-score:active { transform: scale(0.95); }
  .btn-score-neg {
    padding: 16px 0; border-radius: 12px; font-weight: 800; font-size: 15px;
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
  .btn-round {
    width: 48px; height: 48px; border-radius: 14px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 24px; font-weight: 700; border: 1px solid var(--c-bd-btn);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-round:hover  { background: var(--c-bg-btn-h); }
  .btn-round:active { transform: scale(0.93); }
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
