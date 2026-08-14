<script>
  import ControllerShell from '../ControllerShell.svelte';
  import TeamSetup from '../TeamSetup.svelte';
  import {
    scoreboard, formatGameClock, halfLabel,
    startGameClockInterval, stopGameClockInterval,
  } from '../store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // ── Helpers ────────────────────────────────────────────
  function soccerMinutes(s) { return Math.floor(s / 60); }

  // ── Score ──────────────────────────────────────────────
  function addScore(team, delta) {
    const key = team === 'home' ? 'homeScore' : 'awayScore';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }

  // ── Game Clock ─────────────────────────────────────────
  function toggleClock() {
    const running = !state.gameClockRunning;
    scoreboard.patch({ gameClockRunning: running });
    if (running) startGameClockInterval(); else stopGameClockInterval();
  }

  function resetClock() {
    stopGameClockInterval();
    const startSecs = state.half === 1 ? 0 : state.half === 2 ? 2700 : state.half === 3 ? 5400 : 6300;
    scoreboard.patch({ gameClockSeconds: startSecs, gameClockRunning: false });
  }

  // ── Half ───────────────────────────────────────────────
  function nextHalf() {
    stopGameClockInterval();
    scoreboard.update((s) => {
      const h = s.half >= 4 ? 1 : s.half + 1;
      const startSecs = h === 1 ? 0 : h === 2 ? 2700 : h === 3 ? 5400 : 6300;
      return { ...s, half: h, gameClockSeconds: startSecs, gameClockRunning: false };
    });
  }

  function prevHalf() {
    scoreboard.update((s) => ({ ...s, half: s.half <= 1 ? 4 : s.half - 1 }));
  }

  // ── Cards ──────────────────────────────────────────────
  function addCard(team, type, delta) {
    const key = `${team}${type === 'yellow' ? 'Yellow' : 'Red'}Cards`;
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }

  // ── Added Time ─────────────────────────────────────────
  function adjustAddedTime(delta) {
    scoreboard.patch({ addedTimeMinutes: Math.max(0, state.addedTimeMinutes + delta) });
  }

  // ── Reset ──────────────────────────────────────────────
  function handleReset() {
    scoreboard.resetSport('soccer');
  }
</script>

<ControllerShell sportLabel="Soccer" sportEmoji="⚽" onReset={handleReset}>

  <!-- ══════════════════════════════════════════════════════
       LIVE PREVIEW
  ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <div class="card-header">
      <span class="section-label">Live Overlay Preview</span>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full {state.gameClockRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}"></div>
        <span class="text-xs text-gray-500">{state.gameClockRunning ? 'Clock running' : 'Clock stopped'}</span>
      </div>
    </div>
    <div class="preview-stage bg-[#070c14] rounded-xl p-6 flex justify-center">
      <div class="inline-flex items-stretch rounded-xl overflow-hidden shadow-2xl">
        <!-- Home -->
        <div class="flex items-center gap-3 px-6 py-4"
             style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
          <span class="text-sm font-bold tracking-widest uppercase">{state.homeName}</span>
          <div class="flex gap-1">
            {#each { length: state.homeYellowCards } as _}
              <span class="inline-block w-3 h-4 rounded-sm bg-yellow-400"></span>
            {/each}
            {#each { length: state.homeRedCards } as _}
              <span class="inline-block w-3 h-4 rounded-sm bg-red-500"></span>
            {/each}
          </div>
          <span class="text-4xl font-black tabular-nums">{state.homeScore}</span>
        </div>
        <!-- Centre -->
        <div class="bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-8 py-3 min-w-[130px]">
          <div class="text-3xl font-black tabular-nums">{soccerMinutes(state.gameClockSeconds)}'</div>
          <div class="text-xs text-gray-400 mt-1 font-semibold">
            {halfLabel(state.half)}
            {#if state.addedTimeMinutes > 0}
              <span class="text-green-400 ml-1">+{state.addedTimeMinutes}</span>
            {/if}
          </div>
        </div>
        <!-- Away -->
        <div class="flex items-center gap-3 px-6 py-4"
             style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
          <span class="text-4xl font-black tabular-nums">{state.awayScore}</span>
          <div class="flex gap-1">
            {#each { length: state.awayYellowCards } as _}
              <span class="inline-block w-3 h-4 rounded-sm bg-yellow-400"></span>
            {/each}
            {#each { length: state.awayRedCards } as _}
              <span class="inline-block w-3 h-4 rounded-sm bg-red-500"></span>
            {/each}
          </div>
          <span class="text-sm font-bold tracking-widest uppercase">{state.awayName}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       CLOCK + HALF
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- Match Clock -->
    <div class="card text-center col-span-2">
      <div class="card-header justify-center"><span class="section-label">Match Clock</span></div>
      <div class="text-[72px] font-black tabular-nums leading-none mb-2
                  {state.gameClockRunning ? 'text-green-400' : 'val-primary'}">
        {soccerMinutes(state.gameClockSeconds)}'
      </div>
      <div class="text-sm text-gray-500 mb-6">{formatGameClock(state.gameClockSeconds)}</div>
      <button onclick={toggleClock}
              class="w-full py-4 rounded-xl text-sm font-bold tracking-wide mb-5
                     {state.gameClockRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}">
        {state.gameClockRunning ? '⏸  STOP' : '▶  START'}
      </button>
      <div class="flex gap-3 justify-center flex-wrap">
        <button onclick={resetClock} class="btn-secondary">Reset Half Start</button>
        <div class="flex items-center gap-2 bg-gray-800/50 rounded-xl px-4 py-2">
          <span class="section-label text-[10px]">Added Time</span>
          <button onclick={() => adjustAddedTime(-1)} class="btn-round-sm">−</button>
          <span class="text-xl font-black val-primary w-8 text-center">+{state.addedTimeMinutes}</span>
          <button onclick={() => adjustAddedTime(1)} class="btn-round-sm">+</button>
        </div>
      </div>
    </div>

    <!-- Half -->
    <div class="card text-center flex flex-col justify-between">
      <div class="card-header justify-center"><span class="section-label">Period</span></div>
      <div class="flex items-center justify-center gap-6 py-4">
        <button onclick={prevHalf} class="btn-round">‹</button>
        <span class="text-2xl font-black val-primary text-center leading-tight">{halfLabel(state.half)}</span>
        <button onclick={nextHalf} class="btn-round">›</button>
      </div>
      <p class="text-[11px] text-gray-600 pb-1">ET = Extra Time</p>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       SCORES + CARDS
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- Home -->
    <div class="card" style="border-top: 3px solid {state.homePrimary};">
      <div class="card-header">
        <span class="section-label">Home — <span class="val-secondary">{state.homeName}</span></span>
      </div>
      <div class="text-6xl font-black tabular-nums leading-none val-primary mb-6">{state.homeScore}</div>
      <div class="grid grid-cols-4 gap-3 mb-6">
        <button onclick={() => addScore('home', 1)} class="btn-score col-span-2">+1 Goal</button>
        <button onclick={() => addScore('home', -1)} class="btn-score-neg col-span-2">−1</button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="card-inner">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-5 rounded-sm bg-yellow-400"></div>
            <span class="section-label text-[10px]">Yellow Cards</span>
          </div>
          <div class="flex items-center gap-3">
            <button onclick={() => addCard('home', 'yellow', -1)} class="btn-sm">−</button>
            <span class="text-2xl font-black val-primary w-8 text-center">{state.homeYellowCards}</span>
            <button onclick={() => addCard('home', 'yellow', 1)} class="btn-sm">+</button>
          </div>
        </div>
        <div class="card-inner">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-5 rounded-sm bg-red-500"></div>
            <span class="section-label text-[10px]">Red Cards</span>
          </div>
          <div class="flex items-center gap-3">
            <button onclick={() => addCard('home', 'red', -1)} class="btn-sm">−</button>
            <span class="text-2xl font-black val-primary w-8 text-center">{state.homeRedCards}</span>
            <button onclick={() => addCard('home', 'red', 1)} class="btn-sm">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Away -->
    <div class="card" style="border-top: 3px solid {state.awayPrimary};">
      <div class="card-header justify-end">
        <span class="section-label"><span class="val-secondary">{state.awayName}</span> — Away</span>
      </div>
      <div class="text-6xl font-black tabular-nums leading-none val-primary mb-6 text-right">{state.awayScore}</div>
      <div class="grid grid-cols-4 gap-3 mb-6">
        <button onclick={() => addScore('away', 1)} class="btn-score col-span-2">+1 Goal</button>
        <button onclick={() => addScore('away', -1)} class="btn-score-neg col-span-2">−1</button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="card-inner">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-5 rounded-sm bg-yellow-400"></div>
            <span class="section-label text-[10px]">Yellow Cards</span>
          </div>
          <div class="flex items-center gap-3">
            <button onclick={() => addCard('away', 'yellow', -1)} class="btn-sm">−</button>
            <span class="text-2xl font-black val-primary w-8 text-center">{state.awayYellowCards}</span>
            <button onclick={() => addCard('away', 'yellow', 1)} class="btn-sm">+</button>
          </div>
        </div>
        <div class="card-inner">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-5 rounded-sm bg-red-500"></div>
            <span class="section-label text-[10px]">Red Cards</span>
          </div>
          <div class="flex items-center gap-3">
            <button onclick={() => addCard('away', 'red', -1)} class="btn-sm">−</button>
            <span class="text-2xl font-black val-primary w-8 text-center">{state.awayRedCards}</span>
            <button onclick={() => addCard('away', 'red', 1)} class="btn-sm">+</button>
          </div>
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
  .card-inner {
    background: var(--c-bg-btn); border: 1px solid var(--c-bd-btn);
    border-radius: 12px; padding: 14px;
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
    font-size: 13px; font-weight: 700; border: 1px solid var(--c-bd-btn);
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
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 18px; font-weight: 700; border: 1px solid var(--c-bd-btn);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-round-sm:hover  { background: var(--c-bg-btn-h); }
  .btn-round-sm:active { transform: scale(0.93); }
</style>
