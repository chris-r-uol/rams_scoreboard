<script>
  import {
    scoreboard,
    formatGameClock,
    quarterLabel,
    downLabel,
    startGameClockInterval,
    stopGameClockInterval,
    startPlayClockInterval,
    stopPlayClockInterval,
  } from './store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  let teamSetupOpen = $state(false);

  // ── Color Presets ──────────────────────────────────────
  const colorPresets = [
    { name: 'Red',        hex: '#C8102E' },
    { name: 'Navy',       hex: '#002244' },
    { name: 'Royal Blue', hex: '#0076B6' },
    { name: 'Cyan',       hex: '#00B2A9' },
    { name: 'Orange',     hex: '#FB4F14' },
    { name: 'Dk Green',   hex: '#204E32' },
    { name: 'Purple',     hex: '#4F2683' },
    { name: 'Silver',     hex: '#A5ACAF' },
    { name: 'White',      hex: '#FFFFFF' },
    { name: 'Maroon',     hex: '#773141' },
    { name: 'Teal',       hex: '#008E97' },
    { name: 'Pewter',     hex: '#69BE28' },
    { name: 'Black',      hex: '#000000' },
    { name: 'Gold',       hex: '#FFB612' },
  ];

  // ── Score ──────────────────────────────────────────────
  function addScore(team, pts) {
    const key = team === 'home' ? 'homeScore' : 'awayScore';
    scoreboard.update((s) => ({
      ...s,
      [key]: Math.max(0, Math.min(99, s[key] + pts)),
    }));
  }

  // ── Game Clock ─────────────────────────────────────────
  function toggleGameClock() {
    const running = !state.gameClockRunning;
    scoreboard.patch({ gameClockRunning: running });
    if (running) {
      startGameClockInterval();
    } else {
      stopGameClockInterval();
    }
  }

  function resetGameClock(minutes) {
    stopGameClockInterval();
    scoreboard.patch({ gameClockSeconds: minutes * 60, gameClockRunning: false });
  }

  function adjustGameClock(delta) {
    scoreboard.patch({
      gameClockSeconds: Math.max(0, Math.min(5999, state.gameClockSeconds + delta)),
    });
  }

  // ── Play Clock ─────────────────────────────────────────
  function togglePlayClock() {
    const running = !state.playClockRunning;
    scoreboard.patch({ playClockRunning: running });
    if (running) {
      startPlayClockInterval();
    } else {
      stopPlayClockInterval();
    }
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
    scoreboard.update((s) => ({
      ...s,
      quarter: s.quarter <= 1 ? 5 : s.quarter - 1,
    }));
  }

  // ── Down / Distance ────────────────────────────────────
  function cycleDown(dir) {
    scoreboard.update((s) => ({
      ...s,
      down: dir > 0
        ? (s.down >= 4 ? 1 : s.down + 1)
        : (s.down <= 1 ? 4 : s.down - 1),
    }));
  }

  function adjustDistance(delta) {
    scoreboard.patch({
      distance: Math.max(1, Math.min(99, state.distance + delta)),
    });
  }

  // ── Possession ─────────────────────────────────────────
  function togglePossession() {
    scoreboard.patch({
      possession: state.possession === 'home' ? 'away' : 'home',
    });
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
</script>

<div class="min-h-screen bg-gray-950 text-gray-100 select-none">

  <!-- ═════ HEADER ═════ -->
  <header class="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
    <div class="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
        <span>🏈</span>
        Scoreboard Controller
      </h1>
      <div class="flex gap-3">
        <a href="#/overlay" target="_blank"
           class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors border border-gray-700">
          Open Overlay ↗
        </a>
        <button onclick={() => { stopGameClockInterval(); stopPlayClockInterval(); scoreboard.reset(); }}
                class="px-4 py-2 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 text-sm font-medium transition-colors border border-red-900/50">
          Reset All
        </button>
      </div>
    </div>
  </header>

  <div class="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

    <!-- ══════════════════════════════════════════════════════════
         ROW 1 · LIVE PREVIEW
    ═══════════════════════════════════════════════════════════════ -->
    <div class="card">
      <div class="card-header">
        <span class="section-label">Live Overlay Preview</span>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full {state.gameClockRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}"></div>
          <span class="text-xs text-gray-500">{state.gameClockRunning ? 'Clock running' : 'Clock stopped'}</span>
        </div>
      </div>
      <div class="bg-[#070c14] rounded-xl p-6 flex justify-center">
        <div class="inline-flex flex-col items-center gap-2">
          <div class="inline-flex items-stretch rounded-xl overflow-hidden shadow-2xl">
            <!-- Home block -->
            <div class="flex items-center gap-4 px-7 py-4"
                 style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
              {#if state.possession === 'home'}<span class="text-xs opacity-70">◀</span>{/if}
              <span class="text-sm font-bold tracking-widest uppercase">{state.homeName}</span>
              <div class="flex gap-1.5">
                {#each [1,2,3] as t}
                  <div class="w-1.5 h-1.5 rounded-full transition-opacity {t <= state.homeTimeouts ? 'opacity-80' : 'opacity-20'}"
                       style="background:{state.homeText}"></div>
                {/each}
              </div>
              <span class="text-4xl font-black tabular-nums leading-none">{state.homeScore}</span>
            </div>
            <!-- Center block -->
            <div class="bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-8 py-3 min-w-[160px]">
              <div class="text-3xl font-black tabular-nums leading-none">{formatGameClock(state.gameClockSeconds)}</div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs font-bold text-gray-300">{quarterLabel(state.quarter)}</span>
                <span class="text-gray-600">·</span>
                <span class="text-xs text-gray-400">{downLabel(state.down, state.distance)}</span>
                <span class="text-gray-600">·</span>
                <span class="inline-block bg-red-700 text-white text-xs font-black px-1.5 py-0.5 rounded">{state.playClockSeconds}</span>
              </div>
            </div>
            <!-- Away block -->
            <div class="flex items-center gap-4 px-7 py-4"
                 style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
              <span class="text-4xl font-black tabular-nums leading-none">{state.awayScore}</span>
              <div class="flex gap-1.5">
                {#each [1,2,3] as t}
                  <div class="w-1.5 h-1.5 rounded-full transition-opacity {t <= state.awayTimeouts ? 'opacity-80' : 'opacity-20'}"
                       style="background:{state.awayText}"></div>
                {/each}
              </div>
              <span class="text-sm font-bold tracking-widest uppercase">{state.awayName}</span>
              {#if state.possession === 'away'}<span class="text-xs opacity-70">▶</span>{/if}
            </div>
          </div>
          <!-- Info strip preview -->
          <div class="inline-flex items-center gap-5 bg-[#0a0a0a] rounded-lg px-5 py-2 text-xs text-gray-400 font-semibold tracking-wider">
            <span>{downLabel(state.down, state.distance)}</span>
            <span class="text-gray-700">|</span>
            <span>Ball on {state.ballOn}</span>
            {#if state.flagThrown}
              <span class="text-yellow-400 font-black">⚑ FLAG</span>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         ROW 2 · CLOCKS + QUARTER
    ═══════════════════════════════════════════════════════════════ -->
    <div class="grid grid-cols-3 gap-5">

      <!-- Game Clock -->
      <div class="card text-center">
        <div class="card-header justify-center">
          <span class="section-label">Game Clock</span>
        </div>
        <div class="text-[64px] font-black tabular-nums leading-none mb-5
                    {state.gameClockRunning ? 'text-green-400' : 'text-white'}">
          {formatGameClock(state.gameClockSeconds)}
        </div>
        <button onclick={toggleGameClock}
                class="w-full py-4 rounded-xl text-base font-bold mb-4 transition-all duration-150
                       {state.gameClockRunning
                         ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20'
                         : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20'}">
          {state.gameClockRunning ? '⏸  STOP CLOCK' : '▶  START CLOCK'}
        </button>
        <div class="flex gap-2 flex-wrap justify-center">
          <button onclick={() => resetGameClock(15)} class="btn-secondary">15:00</button>
          <button onclick={() => resetGameClock(12)} class="btn-secondary">12:00</button>
          <button onclick={() => resetGameClock(10)} class="btn-secondary">10:00</button>
          <button onclick={() => adjustGameClock(-1)} class="btn-secondary">−1s</button>
          <button onclick={() => adjustGameClock(1)} class="btn-secondary">+1s</button>
        </div>
      </div>

      <!-- Quarter -->
      <div class="card text-center flex flex-col justify-between">
        <div class="card-header justify-center">
          <span class="section-label">Quarter</span>
        </div>
        <div class="flex items-center justify-center gap-6 py-4">
          <button onclick={prevQuarter} class="btn-round">‹</button>
          <span class="text-7xl font-black text-white tabular-nums">
            {quarterLabel(state.quarter)}
          </span>
          <button onclick={nextQuarter} class="btn-round">›</button>
        </div>
        <p class="text-xs text-gray-600 pb-2">Next Q resets clock &amp; timeouts</p>
      </div>

      <!-- Play Clock -->
      <div class="card text-center">
        <div class="card-header justify-center">
          <span class="section-label">Play Clock</span>
        </div>
        <div class="text-[64px] font-black tabular-nums leading-none mb-5
                    {state.playClockRunning ? 'text-amber-400' : 'text-white'}
                    {state.playClockSeconds <= 5 && state.playClockSeconds > 0 ? '!text-red-400' : ''}">
          {state.playClockSeconds}
        </div>
        <button onclick={togglePlayClock}
                class="w-full py-4 rounded-xl text-base font-bold mb-4 transition-all duration-150
                       {state.playClockRunning
                         ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20'
                         : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20'}">
          {state.playClockRunning ? '⏸  STOP' : '▶  START'}
        </button>
        <div class="flex gap-3 justify-center">
          <button onclick={() => resetPlayClock(40)} class="btn-secondary flex-1">Reset 40</button>
          <button onclick={() => resetPlayClock(25)} class="btn-secondary flex-1">Reset 25</button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         ROW 3 · SCORE + POSSESSION/FLAG + DOWN/DISTANCE/BALL ON
    ═══════════════════════════════════════════════════════════════ -->
    <div class="grid grid-cols-12 gap-5">

      <!-- Home Score & Timeouts -->
      <div class="col-span-4 card" style="border-top: 3px solid {state.homePrimary};">
        <div class="card-header">
          <span class="section-label">Home — <span class="text-gray-300">{state.homeName}</span></span>
        </div>
        <div class="flex items-center gap-5 mb-5">
          {#if state.possession === 'home'}
            <span class="text-amber-400 text-xl">🏈</span>
          {/if}
          <span class="text-7xl font-black tabular-nums leading-none text-white">{state.homeScore}</span>
        </div>
        <div class="grid grid-cols-5 gap-2 mb-5">
          {#each [6, 3, 2, 1] as pts}
            <button onclick={() => addScore('home', pts)} class="btn-score">+{pts}</button>
          {/each}
          <button onclick={() => addScore('home', -1)} class="btn-score-neg">−1</button>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="section-label text-[10px]">TOL</span>
            {#each [1, 2, 3] as t}
              <div class="w-4 h-4 rounded-full border-2 transition-all
                          {t <= state.homeTimeouts ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-gray-700'}"></div>
            {/each}
          </div>
          <div class="flex gap-2">
            <button onclick={() => useTimeout('home')} class="btn-sm">Use</button>
            <button onclick={() => restoreTimeout('home')} class="btn-sm">+1</button>
          </div>
        </div>
      </div>

      <!-- Center: Possession + Flag + Down/Distance + Ball On -->
      <div class="col-span-4 space-y-3">

        <!-- Possession & Flag -->
        <div class="grid grid-cols-2 gap-3">
          <button onclick={togglePossession}
                  class="card hover:bg-gray-800/80 transition-colors text-center py-4 cursor-pointer">
            <div class="section-label text-[10px] mb-1">Possession</div>
            <div class="text-3xl mb-1">🏈</div>
            <div class="text-sm font-bold text-white leading-tight">
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

        <!-- Down & Distance + Ball On -->
        <div class="card">
          <div class="text-center text-2xl font-bold text-white mb-4">
            {downLabel(state.down, state.distance)} · Ball on {state.ballOn}
          </div>
          <div class="grid grid-cols-3 gap-4">
            <!-- Down -->
            <div class="flex flex-col items-center gap-2">
              <span class="section-label text-[10px]">Down</span>
              <div class="flex items-center gap-2">
                <button onclick={() => cycleDown(-1)} class="btn-round-sm">‹</button>
                <span class="text-xl font-black text-white w-6 text-center">{state.down}</span>
                <button onclick={() => cycleDown(1)} class="btn-round-sm">›</button>
              </div>
            </div>
            <!-- Distance -->
            <div class="flex flex-col items-center gap-2">
              <span class="section-label text-[10px]">Distance</span>
              <div class="flex items-center gap-2">
                <button onclick={() => adjustDistance(-1)} class="btn-round-sm">‹</button>
                <input type="number" bind:value={state.distance}
                       oninput={() => scoreboard.patch({ distance: state.distance })}
                       class="bg-transparent text-xl font-black text-white w-10 text-center border-b-2 border-gray-700 focus:border-amber-400 outline-none"
                       min="1" max="99" />
                <button onclick={() => adjustDistance(1)} class="btn-round-sm">›</button>
              </div>
            </div>
            <!-- Ball On -->
            <div class="flex flex-col items-center gap-2">
              <span class="section-label text-[10px]">Ball On</span>
              <input type="text" bind:value={state.ballOn}
                     oninput={() => scoreboard.patch({ ballOn: state.ballOn })}
                     class="bg-transparent text-xl font-black text-white w-16 text-center border-b-2 border-gray-700 focus:border-amber-400 outline-none"
                     maxlength="8" />
            </div>
          </div>
        </div>
      </div>

      <!-- Away Score & Timeouts -->
      <div class="col-span-4 card" style="border-top: 3px solid {state.awayPrimary};">
        <div class="card-header justify-end">
          <span class="section-label"><span class="text-gray-300">{state.awayName}</span> — Away</span>
        </div>
        <div class="flex items-center justify-end gap-5 mb-5">
          <span class="text-7xl font-black tabular-nums leading-none text-white">{state.awayScore}</span>
          {#if state.possession === 'away'}
            <span class="text-amber-400 text-xl">🏈</span>
          {/if}
        </div>
        <div class="grid grid-cols-5 gap-2 mb-5">
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
              <div class="w-4 h-4 rounded-full border-2 transition-all
                          {t <= state.awayTimeouts ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-gray-700'}"></div>
            {/each}
            <span class="section-label text-[10px]">TOL</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         ROW 4 · TEAM SETUP (collapsible)
    ═══════════════════════════════════════════════════════════════ -->
    <div class="card">
      <button onclick={() => teamSetupOpen = !teamSetupOpen}
              class="w-full flex items-center justify-between cursor-pointer">
        <span class="section-label">Team Setup &amp; Colors</span>
        <div class="flex items-center gap-3">
          <!-- color chips -->
          <div class="flex items-center gap-1.5">
            <div class="w-4 h-4 rounded-full border border-gray-700" style="background:{state.homePrimary}"></div>
            <div class="w-4 h-4 rounded-full border border-gray-700" style="background:{state.homeSecondary}"></div>
            <span class="text-xs text-gray-600 mx-2">{state.homeName}</span>
          </div>
          <div class="w-px h-4 bg-gray-800"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-xs text-gray-600 mx-2">{state.awayName}</span>
            <div class="w-4 h-4 rounded-full border border-gray-700" style="background:{state.awayPrimary}"></div>
            <div class="w-4 h-4 rounded-full border border-gray-700" style="background:{state.awaySecondary}"></div>
          </div>
          <span class="text-gray-500 text-lg ml-3">{teamSetupOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {#if teamSetupOpen}
        <div class="mt-6 grid grid-cols-2 gap-8 pt-6 border-t border-gray-800">

          <!-- Home Team Config -->
          <div>
            <div class="flex items-center justify-between mb-5">
              <span class="text-sm font-bold text-white">Home Team</span>
              <div class="flex gap-2">
                <div class="w-5 h-5 rounded-full border border-gray-600" style="background:{state.homePrimary}"></div>
                <div class="w-5 h-5 rounded-full border border-gray-600" style="background:{state.homeSecondary}"></div>
              </div>
            </div>

            <!-- Name -->
            <div class="mb-5">
              <label class="section-label block mb-2">Team Abbreviation
                <input type="text" bind:value={state.homeName}
                       oninput={() => scoreboard.patch({ homeName: state.homeName })}
                       class="mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-bold text-lg focus:border-amber-400 outline-none"
                       maxlength="12" placeholder="HOME" />
              </label>
            </div>

            <!-- Primary -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-3">
                <span class="section-label">Primary Color</span>
                <label class="flex items-center gap-2">
                  <input type="color" value={state.homePrimary}
                         onchange={(e) => scoreboard.patch({ homePrimary: e.target.value })}
                         class="color-input" />
                  <span class="text-xs text-gray-500 font-mono">{state.homePrimary}</span>
                </label>
              </div>
              <div class="color-grid">
                {#each colorPresets as c}
                  <button onclick={() => scoreboard.patch({ homePrimary: c.hex })}
                          title={c.name}
                          class="color-swatch {state.homePrimary === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}"
                          style="background:{c.hex}"></button>
                {/each}
              </div>
            </div>

            <!-- Secondary -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-3">
                <span class="section-label">Secondary Color</span>
                <label class="flex items-center gap-2">
                  <input type="color" value={state.homeSecondary}
                         onchange={(e) => scoreboard.patch({ homeSecondary: e.target.value })}
                         class="color-input" />
                  <span class="text-xs text-gray-500 font-mono">{state.homeSecondary}</span>
                </label>
              </div>
              <div class="color-grid">
                {#each colorPresets as c}
                  <button onclick={() => scoreboard.patch({ homeSecondary: c.hex })}
                          title={c.name}
                          class="color-swatch {state.homeSecondary === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}"
                          style="background:{c.hex}"></button>
                {/each}
              </div>
            </div>

            <!-- Text Color -->
            <div>
              <span class="section-label block mb-3">Text Color</span>
              <div class="flex gap-2">
                <button onclick={() => scoreboard.patch({ homeText: '#FFFFFF' })}
                        class="px-5 py-2.5 rounded-lg bg-white text-black text-xs font-bold {state.homeText === '#FFFFFF' ? 'ring-2 ring-amber-400' : ''}">White</button>
                <button onclick={() => scoreboard.patch({ homeText: '#000000' })}
                        class="px-5 py-2.5 rounded-lg bg-black text-white text-xs font-bold border border-gray-600 {state.homeText === '#000000' ? 'ring-2 ring-amber-400' : ''}">Black</button>
              </div>
            </div>
          </div>

          <!-- Away Team Config -->
          <div>
            <div class="flex items-center justify-between mb-5">
              <span class="text-sm font-bold text-white">Away Team</span>
              <div class="flex gap-2">
                <div class="w-5 h-5 rounded-full border border-gray-600" style="background:{state.awayPrimary}"></div>
                <div class="w-5 h-5 rounded-full border border-gray-600" style="background:{state.awaySecondary}"></div>
              </div>
            </div>

            <!-- Name -->
            <div class="mb-5">
              <label class="section-label block mb-2">Team Abbreviation
                <input type="text" bind:value={state.awayName}
                       oninput={() => scoreboard.patch({ awayName: state.awayName })}
                       class="mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-bold text-lg focus:border-amber-400 outline-none"
                       maxlength="12" placeholder="AWAY" />
              </label>
            </div>

            <!-- Primary -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-3">
                <span class="section-label">Primary Color</span>
                <label class="flex items-center gap-2">
                  <input type="color" value={state.awayPrimary}
                         onchange={(e) => scoreboard.patch({ awayPrimary: e.target.value })}
                         class="color-input" />
                  <span class="text-xs text-gray-500 font-mono">{state.awayPrimary}</span>
                </label>
              </div>
              <div class="color-grid">
                {#each colorPresets as c}
                  <button onclick={() => scoreboard.patch({ awayPrimary: c.hex })}
                          title={c.name}
                          class="color-swatch {state.awayPrimary === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}"
                          style="background:{c.hex}"></button>
                {/each}
              </div>
            </div>

            <!-- Secondary -->
            <div class="mb-5">
              <div class="flex items-center justify-between mb-3">
                <span class="section-label">Secondary Color</span>
                <label class="flex items-center gap-2">
                  <input type="color" value={state.awaySecondary}
                         onchange={(e) => scoreboard.patch({ awaySecondary: e.target.value })}
                         class="color-input" />
                  <span class="text-xs text-gray-500 font-mono">{state.awaySecondary}</span>
                </label>
              </div>
              <div class="color-grid">
                {#each colorPresets as c}
                  <button onclick={() => scoreboard.patch({ awaySecondary: c.hex })}
                          title={c.name}
                          class="color-swatch {state.awaySecondary === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}"
                          style="background:{c.hex}"></button>
                {/each}
              </div>
            </div>

            <!-- Text Color -->
            <div>
              <span class="section-label block mb-3">Text Color</span>
              <div class="flex gap-2">
                <button onclick={() => scoreboard.patch({ awayText: '#FFFFFF' })}
                        class="px-5 py-2.5 rounded-lg bg-white text-black text-xs font-bold {state.awayText === '#FFFFFF' ? 'ring-2 ring-amber-400' : ''}">White</button>
                <button onclick={() => scoreboard.patch({ awayText: '#000000' })}
                        class="px-5 py-2.5 rounded-lg bg-black text-white text-xs font-bold border border-gray-600 {state.awayText === '#000000' ? 'ring-2 ring-amber-400' : ''}">Black</button>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- bottom breathing room -->
    <div class="h-8"></div>
  </div>

  <!-- ═════ FOOTER ═════ -->
  <footer class="border-t border-gray-800 py-4 text-center">
    <a href="#/privacy" class="text-xs text-gray-600 hover:text-gray-400 transition-colors">Privacy Policy</a>
  </footer>
</div>

<style>
  /* ── Card ── */
  .card {
    background: rgba(17, 24, 39, 0.6);
    border: 1px solid #1f2937;
    border-radius: 16px;
    padding: 24px;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #6b7280;
  }

  /* ── Score Buttons ── */
  .btn-score {
    padding: 14px 0;
    border-radius: 12px;
    font-weight: 800;
    font-size: 18px;
    background: #1f2937;
    color: #e5e7eb;
    border: 1px solid #374151;
    transition: all 0.15s;
    cursor: pointer;
  }
  .btn-score:hover { background: #374151; }
  .btn-score:active { transform: scale(0.96); }

  .btn-score-neg {
    padding: 14px 0;
    border-radius: 12px;
    font-weight: 800;
    font-size: 18px;
    background: rgba(127, 29, 29, 0.3);
    color: #fca5a5;
    border: 1px solid rgba(127, 29, 29, 0.5);
    transition: all 0.15s;
    cursor: pointer;
  }
  .btn-score-neg:hover { background: rgba(127, 29, 29, 0.5); }
  .btn-score-neg:active { transform: scale(0.96); }

  /* ── Secondary Buttons ── */
  .btn-secondary {
    padding: 8px 16px;
    border-radius: 10px;
    background: #1f2937;
    color: #d1d5db;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid #374151;
    transition: all 0.15s;
    cursor: pointer;
  }
  .btn-secondary:hover { background: #374151; }

  .btn-sm {
    padding: 6px 14px;
    border-radius: 8px;
    background: #1f2937;
    color: #9ca3af;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid #374151;
    transition: all 0.15s;
    cursor: pointer;
  }
  .btn-sm:hover { background: #374151; }

  .btn-round {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: #1f2937;
    color: #e5e7eb;
    font-size: 24px;
    font-weight: 700;
    border: 1px solid #374151;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-round:hover { background: #374151; }

  .btn-round-sm {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #1f2937;
    color: #e5e7eb;
    font-size: 18px;
    font-weight: 700;
    border: 1px solid #374151;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-round-sm:hover { background: #374151; }

  /* ── Color Controls ── */
  .color-input {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid #374151;
    padding: 0;
  }
  .color-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .color-swatch {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: transform 0.15s;
  }
  .color-swatch:hover { transform: scale(1.15); }
</style>
