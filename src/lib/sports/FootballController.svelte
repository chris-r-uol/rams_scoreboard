<script>
  import ControllerShell from '../ControllerShell.svelte';
  import TeamSetup from '../TeamSetup.svelte';
  import {
    scoreboard, formatGameClock, quarterLabel, downLabel,
    startGameClockInterval, stopGameClockInterval,
    startPlayClockInterval, stopPlayClockInterval,
    stopAllIntervals,
  } from '../store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // ── Score ──────────────────────────────────────────────
  function addScore(team, pts) {
    const key = team === 'home' ? 'homeScore' : 'awayScore';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, Math.min(99, s[key] + pts)) }));
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
    scoreboard.patch({ gameClockSeconds: Math.max(0, Math.min(5999, state.gameClockSeconds + delta)) });
  }

  // ── Play Clock ─────────────────────────────────────────
  function togglePlayClock() {
    const running = !state.playClockRunning;
    scoreboard.patch({ playClockRunning: running });
    if (running) startPlayClockInterval(); else stopPlayClockInterval();
  }

  function resetPlayClock(seconds) {
    stopPlayClockInterval();
    scoreboard.patch({ playClockSeconds: seconds, playClockRunning: false });
  }

  // ── Quarter ────────────────────────────────────────────
  function nextQuarter() {
    scoreboard.update((s) => {
      const q = s.quarter >= 5 ? 1 : s.quarter + 1;
      const patch = { quarter: q, gameClockRunning: false };
      if (q === 1 || q === 3) patch.gameClockSeconds = 900;
      if (q === 3) { patch.homeTimeouts = 3; patch.awayTimeouts = 3; }
      return { ...s, ...patch };
    });
    stopGameClockInterval();
  }

  function prevQuarter() {
    scoreboard.update((s) => ({ ...s, quarter: s.quarter <= 1 ? 5 : s.quarter - 1 }));
  }

  // ── Down / Distance ────────────────────────────────────
  function cycleDown(dir) {
    scoreboard.update((s) => ({
      ...s,
      down: dir > 0 ? (s.down >= 4 ? 1 : s.down + 1) : (s.down <= 1 ? 4 : s.down - 1),
    }));
  }

  function adjustDistance(delta) {
    scoreboard.patch({ distance: Math.max(1, Math.min(99, state.distance + delta)) });
  }

  // ── Possession ─────────────────────────────────────────
  function togglePossession() {
    scoreboard.patch({ possession: state.possession === 'home' ? 'away' : 'home' });
  }

  // ── Timeouts ───────────────────────────────────────────
  function useTimeout(team) {
    const key = team === 'home' ? 'homeTimeouts' : 'awayTimeouts';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] - 1) }));
  }
  function restoreTimeout(team) {
    const key = team === 'home' ? 'homeTimeouts' : 'awayTimeouts';
    scoreboard.update((s) => ({ ...s, [key]: Math.min(3, s[key] + 1) }));
  }

  // ── Flag ───────────────────────────────────────────────
  function toggleFlag() {
    scoreboard.patch({ flagThrown: !state.flagThrown });
  }

  // ── Reset ──────────────────────────────────────────────
  function handleReset() {
    scoreboard.resetSport('american-football');
  }
</script>

<ControllerShell sportLabel="American Football" sportEmoji="🏈" onReset={handleReset}>

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
      <div class="inline-flex flex-col items-center gap-2">
        <div class="inline-flex items-stretch rounded-xl overflow-hidden shadow-2xl">
          <div class="flex items-center gap-4 px-7 py-4"
               style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
            {#if state.possession === 'home'}<span class="text-xs opacity-70">◀</span>{/if}
            <span class="text-sm font-bold tracking-widest uppercase">{state.homeName}</span>
            <div class="flex gap-1.5">
              {#each [1,2,3] as t}
                <div class="w-1.5 h-1.5 rounded-full {t <= state.homeTimeouts ? 'opacity-80' : 'opacity-20'}"
                     style="background:{state.homeText}"></div>
              {/each}
            </div>
            <span class="text-4xl font-black tabular-nums leading-none">{state.homeScore}</span>
          </div>
          <div class="bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-8 py-3 min-w-[160px]">
            <div class="text-3xl font-black tabular-nums">{formatGameClock(state.gameClockSeconds)}</div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs font-bold text-gray-300">{quarterLabel(state.quarter)}</span>
              <span class="text-gray-600">·</span>
              <span class="text-xs text-gray-400">{downLabel(state.down, state.distance)}</span>
              <span class="text-gray-600">·</span>
              <span class="inline-block bg-red-700 text-white text-xs font-black px-1.5 py-0.5 rounded">{state.playClockSeconds}</span>
            </div>
          </div>
          <div class="flex items-center gap-4 px-7 py-4"
               style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
            <span class="text-4xl font-black tabular-nums leading-none">{state.awayScore}</span>
            <div class="flex gap-1.5">
              {#each [1,2,3] as t}
                <div class="w-1.5 h-1.5 rounded-full {t <= state.awayTimeouts ? 'opacity-80' : 'opacity-20'}"
                     style="background:{state.awayText}"></div>
              {/each}
            </div>
            <span class="text-sm font-bold tracking-widest uppercase">{state.awayName}</span>
            {#if state.possession === 'away'}<span class="text-xs opacity-70">▶</span>{/if}
          </div>
        </div>
        <div class="inline-flex items-center gap-5 bg-[#0a0a0a] rounded-lg px-5 py-2 text-xs text-gray-400 font-semibold tracking-wider">
          <span>{downLabel(state.down, state.distance)}</span>
          <span class="text-gray-700">|</span>
          <span>Ball on {state.ballOn}</span>
          {#if state.flagThrown}<span class="text-yellow-400 font-black">⚑ FLAG</span>{/if}
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       CLOCKS + QUARTER
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- Game Clock -->
    <div class="card text-center">
      <div class="card-header justify-center"><span class="section-label">Game Clock</span></div>
      <div class="text-[56px] font-black tabular-nums leading-none mb-6
                  {state.gameClockRunning ? 'text-green-400' : 'val-primary'}">
        {formatGameClock(state.gameClockSeconds)}
      </div>
      <button onclick={toggleGameClock}
              class="w-full py-4 rounded-xl text-sm font-bold tracking-wide mb-5
                     {state.gameClockRunning ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20' : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20'}">
        {state.gameClockRunning ? '⏸  STOP CLOCK' : '▶  START CLOCK'}
      </button>
      <div class="flex gap-2.5 flex-wrap justify-center">
        <button onclick={() => resetGameClock(15)} class="btn-secondary">15:00</button>
        <button onclick={() => resetGameClock(12)} class="btn-secondary">12:00</button>
        <button onclick={() => resetGameClock(10)} class="btn-secondary">10:00</button>
        <button onclick={() => adjustGameClock(-1)} class="btn-secondary">−1s</button>
        <button onclick={() => adjustGameClock(1)} class="btn-secondary">+1s</button>
      </div>
    </div>

    <!-- Quarter -->
    <div class="card text-center flex flex-col justify-between">
      <div class="card-header justify-center"><span class="section-label">Quarter</span></div>
      <div class="flex items-center justify-center gap-8 py-6">
        <button onclick={prevQuarter} class="btn-round">‹</button>
        <span class="text-6xl font-black val-primary tabular-nums">{quarterLabel(state.quarter)}</span>
        <button onclick={nextQuarter} class="btn-round">›</button>
      </div>
      <p class="text-[11px] text-gray-600 pb-1 tracking-wide">Next Q resets clock &amp; timeouts</p>
    </div>

    <!-- Play Clock -->
    <div class="card text-center">
      <div class="card-header justify-center"><span class="section-label">Play Clock</span></div>
      <div class="text-[56px] font-black tabular-nums leading-none mb-6
                  {state.playClockRunning ? 'text-amber-400' : 'val-primary'}
                  {state.playClockSeconds <= 5 && state.playClockSeconds > 0 ? '!text-red-400' : ''}">
        {state.playClockSeconds}
      </div>
      <button onclick={togglePlayClock}
              class="w-full py-4 rounded-xl text-sm font-bold tracking-wide mb-5
                     {state.playClockRunning ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20' : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20'}">
        {state.playClockRunning ? '⏸  STOP' : '▶  START'}
      </button>
      <div class="flex gap-3 justify-center">
        <button onclick={() => resetPlayClock(40)} class="btn-secondary flex-1">Reset 40</button>
        <button onclick={() => resetPlayClock(25)} class="btn-secondary flex-1">Reset 25</button>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       SCORE + POSSESSION/FLAG + DOWN/DISTANCE/BALL
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

    <!-- Home Score -->
    <div class="col-span-4 card" style="border-top: 3px solid {state.homePrimary};">
      <div class="card-header">
        <span class="section-label">Home — <span class="val-secondary">{state.homeName}</span></span>
      </div>
      <div class="flex items-center gap-5 mb-6">
        {#if state.possession === 'home'}<span class="text-amber-400 text-xl">🏈</span>{/if}
        <span class="text-6xl font-black tabular-nums leading-none val-primary">{state.homeScore}</span>
      </div>
      <div class="grid grid-cols-5 gap-2.5 mb-6">
        {#each [6, 3, 2, 1] as pts}
          <button onclick={() => addScore('home', pts)} class="btn-score">+{pts}</button>
        {/each}
        <button onclick={() => addScore('home', -1)} class="btn-score-neg">−1</button>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="section-label text-[10px]">TOL</span>
          {#each [1, 2, 3] as t}
            <div class="w-4 h-4 rounded-full border-2 {t <= state.homeTimeouts ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-gray-700'}"></div>
          {/each}
        </div>
        <div class="flex gap-2">
          <button onclick={() => useTimeout('home')} class="btn-sm">Use</button>
          <button onclick={() => restoreTimeout('home')} class="btn-sm">+1</button>
        </div>
      </div>
    </div>

    <!-- Centre: Possession + Flag + Down/Distance + Ball On -->
    <div class="col-span-4 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <button onclick={togglePossession} class="card hover:bg-gray-800/80 transition-colors text-center py-4 cursor-pointer">
          <div class="section-label text-[10px] mb-1">Possession</div>
          <div class="text-3xl mb-1">🏈</div>
          <div class="text-sm font-bold val-primary leading-tight">
            {state.possession === 'home' ? state.homeName : state.awayName}
          </div>
        </button>
        <button onclick={toggleFlag}
                class="card hover:bg-gray-800/80 transition-colors text-center py-4 cursor-pointer
                       {state.flagThrown ? '!border-yellow-500 !bg-yellow-950/30' : ''}">
          <div class="section-label text-[10px] mb-1">Flag</div>
          <div class="text-3xl mb-1">{state.flagThrown ? '🟡' : '⚑'}</div>
          <div class="text-sm font-bold {state.flagThrown ? 'text-yellow-400' : 'text-gray-500'}">
            {state.flagThrown ? 'FLAG!' : 'No Flag'}
          </div>
        </button>
      </div>
      <div class="card">
        <div class="text-center text-xl font-bold val-primary mb-5">
          {downLabel(state.down, state.distance)} · Ball on {state.ballOn}
        </div>
        <div class="grid grid-cols-3 gap-5">
          <div class="flex flex-col items-center gap-2">
            <span class="section-label text-[10px]">Down</span>
            <div class="flex items-center gap-2">
              <button onclick={() => cycleDown(-1)} class="btn-round-sm">‹</button>
              <span class="text-xl font-black val-primary w-6 text-center">{state.down}</span>
              <button onclick={() => cycleDown(1)} class="btn-round-sm">›</button>
            </div>
          </div>
          <div class="flex flex-col items-center gap-2">
            <span class="section-label text-[10px]">Distance</span>
            <div class="flex items-center gap-2">
              <button onclick={() => adjustDistance(-1)} class="btn-round-sm">‹</button>
              <input type="number" bind:value={state.distance}
                     oninput={() => scoreboard.patch({ distance: state.distance })}
                     class="bg-transparent text-xl font-black val-primary w-10 text-center border-b-2 border-gray-700 focus:border-amber-400 outline-none"
                     min="1" max="99" />
              <button onclick={() => adjustDistance(1)} class="btn-round-sm">›</button>
            </div>
          </div>
          <div class="flex flex-col items-center gap-2">
            <span class="section-label text-[10px]">Ball On</span>
            <input type="text" bind:value={state.ballOn}
                   oninput={() => scoreboard.patch({ ballOn: state.ballOn })}
                   class="bg-transparent text-xl font-black val-primary w-16 text-center border-b-2 border-gray-700 focus:border-amber-400 outline-none"
                   maxlength="8" />
          </div>
        </div>
      </div>
    </div>

    <!-- Away Score -->
    <div class="col-span-4 card" style="border-top: 3px solid {state.awayPrimary};">
      <div class="card-header justify-end">
        <span class="section-label"><span class="val-secondary">{state.awayName}</span> — Away</span>
      </div>
      <div class="flex items-center justify-end gap-5 mb-6">
        <span class="text-6xl font-black tabular-nums leading-none val-primary">{state.awayScore}</span>
        {#if state.possession === 'away'}<span class="text-amber-400 text-xl">🏈</span>{/if}
      </div>
      <div class="grid grid-cols-5 gap-2.5 mb-6">
        {#each [6, 3, 2, 1] as pts}
          <button onclick={() => addScore('away', pts)} class="btn-score">+{pts}</button>
        {/each}
        <button onclick={() => addScore('away', -1)} class="btn-score-neg">−1</button>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          <button onclick={() => useTimeout('away')} class="btn-sm">Use</button>
          <button onclick={() => restoreTimeout('away')} class="btn-sm">+1</button>
        </div>
        <div class="flex items-center gap-2">
          {#each [1, 2, 3] as t}
            <div class="w-4 h-4 rounded-full border-2 {t <= state.awayTimeouts ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-gray-700'}"></div>
          {/each}
          <span class="section-label text-[10px]">TOL</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Team Setup -->
  <TeamSetup />

</ControllerShell>

<style>
  /* ── Card ── */
  .card {
    background: var(--c-bg-card);
    border: 1px solid var(--c-bd-card);
    border-radius: 16px;
    padding: 28px;
    transition: border-color 0.2s ease;
  }
  .card-header {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 24px;
  }
  .section-label {
    font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--c-text-mute);
  }
  .val-primary   { color: var(--c-text-val); }
  .val-secondary { color: var(--c-text-sub); }

  /* ── Score buttons ── */
  .btn-score {
    padding: 16px 0; border-radius: 12px; font-weight: 800; font-size: 17px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    border: 1px solid var(--c-bd-btn);
    transition: all 0.15s ease; cursor: pointer;
  }
  .btn-score:hover  { background: var(--c-bg-btn-h); }
  .btn-score:active { transform: scale(0.95); }

  .btn-score-neg {
    padding: 16px 0; border-radius: 12px; font-weight: 800; font-size: 17px;
    background: rgba(127,29,29,0.3); color: #fca5a5;
    border: 1px solid rgba(127,29,29,0.5);
    transition: all 0.15s ease; cursor: pointer;
  }
  .btn-score-neg:hover  { background: rgba(127,29,29,0.5); }
  .btn-score-neg:active { transform: scale(0.95); }

  /* ── Secondary buttons ── */
  .btn-secondary {
    padding: 10px 18px; border-radius: 10px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 13px; font-weight: 600;
    border: 1px solid var(--c-bd-btn);
    transition: all 0.15s ease; cursor: pointer;
  }
  .btn-secondary:hover  { background: var(--c-bg-btn-h); }
  .btn-secondary:active { transform: scale(0.96); }

  .btn-sm {
    padding: 8px 16px; border-radius: 8px;
    background: var(--c-bg-btn); color: var(--c-text-mute);
    font-size: 12px; font-weight: 600;
    border: 1px solid var(--c-bd-btn);
    transition: all 0.15s ease; cursor: pointer;
  }
  .btn-sm:hover  { background: var(--c-bg-btn-h); }
  .btn-sm:active { transform: scale(0.96); }

  .btn-round {
    width: 48px; height: 48px; border-radius: 14px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 24px; font-weight: 700;
    border: 1px solid var(--c-bd-btn);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-round:hover  { background: var(--c-bg-btn-h); }
  .btn-round:active { transform: scale(0.93); }

  .btn-round-sm {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 18px; font-weight: 700;
    border: 1px solid var(--c-bd-btn);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-round-sm:hover  { background: var(--c-bg-btn-h); }
  .btn-round-sm:active { transform: scale(0.93); }
</style>
