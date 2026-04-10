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

  <!-- ═════════════════ HEADER ═════════════════ -->
  <header class="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        <span class="text-2xl">🏈</span>
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

  <div class="max-w-7xl mx-auto px-6 py-6">
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">

      <!-- ═══════════════ LEFT: HOME TEAM ═══════════════ -->
      <div class="xl:col-span-4 space-y-5">
        <div class="card" style="border-top: 3px solid {state.homePrimary};">
          <div class="card-header">
            <span class="section-label">Home Team</span>
          </div>

          <!-- Name & Score -->
          <div class="flex items-center justify-between mb-6">
            <input type="text" bind:value={state.homeName}
                   oninput={() => scoreboard.patch({ homeName: state.homeName })}
                   class="bg-transparent text-2xl font-extrabold tracking-tight border-b-2 border-gray-700 focus:border-amber-400 outline-none w-36 pb-1 text-white"
                   maxlength="12" />
            <div class="flex items-center gap-3">
              {#if state.possession === 'home'}
                <span class="text-amber-400 text-lg">🏈</span>
              {/if}
              <span class="text-6xl font-black tabular-nums leading-none text-white">{state.homeScore}</span>
            </div>
          </div>

          <!-- Score Buttons -->
          <div class="grid grid-cols-5 gap-2 mb-6">
            {#each [6, 3, 2, 1] as pts}
              <button onclick={() => addScore('home', pts)}
                      class="btn-score">+{pts}</button>
            {/each}
            <button onclick={() => addScore('home', -1)}
                    class="btn-score-neg">-1</button>
          </div>

          <!-- Timeouts -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="section-label text-[11px]">Timeouts</span>
              <div class="flex gap-2">
                {#each [1, 2, 3] as t}
                  <div class="w-5 h-5 rounded-full border-2 transition-all duration-200
                              {t <= state.homeTimeouts ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-gray-600'}"></div>
                {/each}
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick={() => useTimeout('home')} class="btn-sm">Use</button>
              <button onclick={() => restoreTimeout('home')} class="btn-sm">+1</button>
            </div>
          </div>
        </div>

        <!-- Home Colors -->
        <div class="card">
          <div class="card-header">
            <span class="section-label">Home Colors</span>
            <div class="flex gap-2">
              <div class="w-6 h-6 rounded-full border border-gray-600" style="background:{state.homePrimary}"></div>
              <div class="w-6 h-6 rounded-full border border-gray-600" style="background:{state.homeSecondary}"></div>
            </div>
          </div>

          <!-- Primary Color -->
          <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Primary</span>
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

          <!-- Secondary Color -->
          <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Secondary</span>
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
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Text Color</span>
              <label class="flex items-center gap-2">
                <input type="color" value={state.homeText}
                       onchange={(e) => scoreboard.patch({ homeText: e.target.value })}
                       class="color-input" />
                <span class="text-xs text-gray-500 font-mono">{state.homeText}</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button onclick={() => scoreboard.patch({ homeText: '#FFFFFF' })}
                      class="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold {state.homeText === '#FFFFFF' ? 'ring-2 ring-amber-400' : ''}">White</button>
              <button onclick={() => scoreboard.patch({ homeText: '#000000' })}
                      class="px-4 py-2 rounded-lg bg-black text-white text-xs font-bold border border-gray-600 {state.homeText === '#000000' ? 'ring-2 ring-amber-400' : ''}">Black</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ CENTER: GAME STATE ═══════════════ -->
      <div class="xl:col-span-4 space-y-5">

        <!-- Game Clock -->
        <div class="card text-center">
          <div class="card-header justify-center">
            <span class="section-label">Game Clock</span>
          </div>
          <div class="text-7xl font-black tabular-nums leading-none mb-6
                      {state.gameClockRunning ? 'text-green-400' : 'text-white'}">
            {formatGameClock(state.gameClockSeconds)}
          </div>
          <div class="flex justify-center mb-4">
            <button onclick={toggleGameClock}
                    class="px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-150
                           {state.gameClockRunning
                             ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20'
                             : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20'}">
              {state.gameClockRunning ? '⏸  STOP' : '▶  START'}
            </button>
          </div>
          <div class="flex gap-2 justify-center flex-wrap">
            <button onclick={() => resetGameClock(15)} class="btn-secondary">15:00</button>
            <button onclick={() => resetGameClock(12)} class="btn-secondary">12:00</button>
            <button onclick={() => resetGameClock(10)} class="btn-secondary">10:00</button>
            <button onclick={() => adjustGameClock(-1)} class="btn-secondary">-1s</button>
            <button onclick={() => adjustGameClock(1)} class="btn-secondary">+1s</button>
          </div>
        </div>

        <!-- Play Clock -->
        <div class="card text-center">
          <div class="card-header justify-center">
            <span class="section-label">Play Clock</span>
          </div>
          <div class="text-5xl font-black tabular-nums leading-none mb-5
                      {state.playClockRunning ? 'text-yellow-400' : 'text-white'}
                      {state.playClockSeconds <= 5 && state.playClockSeconds > 0 ? '!text-red-400' : ''}">
            {state.playClockSeconds}
          </div>
          <div class="flex justify-center mb-4">
            <button onclick={togglePlayClock}
                    class="px-8 py-3 rounded-xl font-bold transition-all duration-150
                           {state.playClockRunning
                             ? 'bg-red-600 hover:bg-red-500'
                             : 'bg-green-600 hover:bg-green-500'}">
              {state.playClockRunning ? '⏸  Stop' : '▶  Start'}
            </button>
          </div>
          <div class="flex gap-3 justify-center">
            <button onclick={() => resetPlayClock(40)} class="btn-secondary px-6">Reset 40</button>
            <button onclick={() => resetPlayClock(25)} class="btn-secondary px-6">Reset 25</button>
          </div>
        </div>

        <!-- Quarter -->
        <div class="card">
          <div class="card-header justify-center">
            <span class="section-label">Quarter</span>
          </div>
          <div class="flex items-center justify-center gap-6">
            <button onclick={prevQuarter} class="btn-round">‹</button>
            <span class="text-5xl font-black tabular-nums text-white">
              {quarterLabel(state.quarter)}
            </span>
            <button onclick={nextQuarter} class="btn-round">›</button>
          </div>
        </div>

        <!-- Down & Distance -->
        <div class="card">
          <div class="card-header justify-center">
            <span class="section-label">Down & Distance</span>
          </div>
          <div class="text-center text-3xl font-bold text-white mb-5">
            {downLabel(state.down, state.distance)}
          </div>
          <div class="grid grid-cols-2 gap-6 mb-5">
            <div class="flex flex-col items-center gap-2">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Down</span>
              <div class="flex items-center gap-3">
                <button onclick={() => cycleDown(-1)} class="btn-round-sm">‹</button>
                <span class="text-2xl font-bold text-white w-8 text-center">{state.down}</span>
                <button onclick={() => cycleDown(1)} class="btn-round-sm">›</button>
              </div>
            </div>
            <div class="flex flex-col items-center gap-2">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Distance</span>
              <div class="flex items-center gap-3">
                <button onclick={() => adjustDistance(-1)} class="btn-round-sm">‹</button>
                <input type="number" bind:value={state.distance}
                       oninput={() => scoreboard.patch({ distance: state.distance })}
                       class="bg-transparent text-2xl font-bold text-white w-12 text-center border-b-2 border-gray-700 focus:border-amber-400 outline-none"
                       min="1" max="99" />
                <button onclick={() => adjustDistance(1)} class="btn-round-sm">›</button>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-center gap-3">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ball On</span>
            <input type="text" bind:value={state.ballOn}
                   oninput={() => scoreboard.patch({ ballOn: state.ballOn })}
                   class="bg-transparent text-xl font-bold text-white w-24 text-center border-b-2 border-gray-700 focus:border-amber-400 outline-none"
                   maxlength="8" />
          </div>
        </div>

        <!-- Possession & Flag -->
        <div class="grid grid-cols-2 gap-4">
          <button onclick={togglePossession}
                  class="card hover:bg-gray-800/80 transition-colors text-center cursor-pointer">
            <div class="section-label text-[11px] mb-2">Possession</div>
            <div class="text-4xl mb-2">🏈</div>
            <div class="text-sm font-bold text-white">
              {state.possession === 'home' ? state.homeName : state.awayName}
            </div>
          </button>
          <button onclick={toggleFlag}
                  class="card hover:bg-gray-800/80 transition-colors text-center cursor-pointer
                         {state.flagThrown ? '!border-yellow-500 !bg-yellow-950/40' : ''}">
            <div class="section-label text-[11px] mb-2">Flag</div>
            <div class="text-4xl mb-2">{state.flagThrown ? '🟡' : '⚑'}</div>
            <div class="text-sm font-bold {state.flagThrown ? 'text-yellow-400' : 'text-gray-500'}">
              {state.flagThrown ? 'FLAG!' : 'No Flag'}
            </div>
          </button>
        </div>
      </div>

      <!-- ═══════════════ RIGHT: AWAY TEAM ═══════════════ -->
      <div class="xl:col-span-4 space-y-5">
        <div class="card" style="border-top: 3px solid {state.awayPrimary};">
          <div class="card-header">
            <span class="section-label">Away Team</span>
          </div>

          <!-- Name & Score -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <span class="text-6xl font-black tabular-nums leading-none text-white">{state.awayScore}</span>
              {#if state.possession === 'away'}
                <span class="text-amber-400 text-lg">🏈</span>
              {/if}
            </div>
            <input type="text" bind:value={state.awayName}
                   oninput={() => scoreboard.patch({ awayName: state.awayName })}
                   class="bg-transparent text-2xl font-extrabold tracking-tight text-right border-b-2 border-gray-700 focus:border-amber-400 outline-none w-36 pb-1 text-white"
                   maxlength="12" />
          </div>

          <!-- Score Buttons -->
          <div class="grid grid-cols-5 gap-2 mb-6">
            {#each [6, 3, 2, 1] as pts}
              <button onclick={() => addScore('away', pts)}
                      class="btn-score">+{pts}</button>
            {/each}
            <button onclick={() => addScore('away', -1)}
                    class="btn-score-neg">-1</button>
          </div>

          <!-- Timeouts -->
          <div class="flex items-center justify-between">
            <div class="flex gap-2">
              <button onclick={() => useTimeout('away')} class="btn-sm">Use</button>
              <button onclick={() => restoreTimeout('away')} class="btn-sm">+1</button>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex gap-2">
                {#each [1, 2, 3] as t}
                  <div class="w-5 h-5 rounded-full border-2 transition-all duration-200
                              {t <= state.awayTimeouts ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-gray-600'}"></div>
                {/each}
              </div>
              <span class="section-label text-[11px]">Timeouts</span>
            </div>
          </div>
        </div>

        <!-- Away Colors -->
        <div class="card">
          <div class="card-header">
            <span class="section-label">Away Colors</span>
            <div class="flex gap-2">
              <div class="w-6 h-6 rounded-full border border-gray-600" style="background:{state.awayPrimary}"></div>
              <div class="w-6 h-6 rounded-full border border-gray-600" style="background:{state.awaySecondary}"></div>
            </div>
          </div>

          <!-- Primary Color -->
          <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Primary</span>
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

          <!-- Secondary Color -->
          <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Secondary</span>
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
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Text Color</span>
              <label class="flex items-center gap-2">
                <input type="color" value={state.awayText}
                       onchange={(e) => scoreboard.patch({ awayText: e.target.value })}
                       class="color-input" />
                <span class="text-xs text-gray-500 font-mono">{state.awayText}</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button onclick={() => scoreboard.patch({ awayText: '#FFFFFF' })}
                      class="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold {state.awayText === '#FFFFFF' ? 'ring-2 ring-amber-400' : ''}">White</button>
              <button onclick={() => scoreboard.patch({ awayText: '#000000' })}
                      class="px-4 py-2 rounded-lg bg-black text-white text-xs font-bold border border-gray-600 {state.awayText === '#000000' ? 'ring-2 ring-amber-400' : ''}">Black</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════ LIVE PREVIEW ═══════════════ -->
    <div class="mt-8 card">
      <div class="card-header justify-center">
        <span class="section-label">Live Overlay Preview</span>
      </div>
      <div class="bg-gray-950 rounded-xl p-8 flex justify-center">
        <div class="inline-flex flex-col items-center gap-1.5">
          <div class="inline-flex items-stretch rounded-xl overflow-hidden"
               style="box-shadow: 0 4px 24px rgba(0,0,0,0.5);">
            <!-- Home preview -->
            <div class="flex items-center gap-3 px-6 py-4"
                 style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
              {#if state.possession === 'home'}
                <span class="text-xs opacity-60">◀</span>
              {/if}
              <span class="text-sm font-bold tracking-widest uppercase">{state.homeName}</span>
              <div class="flex gap-1">
                {#each [1,2,3] as t}
                  <div class="w-1.5 h-1.5 rounded-full {t <= state.homeTimeouts ? 'opacity-80' : 'opacity-20'}"
                       style="background: {state.homeText}"></div>
                {/each}
              </div>
              <span class="text-4xl font-black tabular-nums leading-none">{state.homeScore}</span>
            </div>
            <!-- Center -->
            <div class="bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-7 py-3 min-w-[140px]">
              <div class="text-3xl font-black tabular-nums leading-none">{formatGameClock(state.gameClockSeconds)}</div>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="text-xs font-bold text-gray-300">{quarterLabel(state.quarter)}</span>
                <span class="text-gray-600">|</span>
                <span class="text-xs text-gray-400">{downLabel(state.down, state.distance)}</span>
              </div>
            </div>
            <!-- Away preview -->
            <div class="flex items-center gap-3 px-6 py-4"
                 style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
              <span class="text-4xl font-black tabular-nums leading-none">{state.awayScore}</span>
              <div class="flex gap-1">
                {#each [1,2,3] as t}
                  <div class="w-1.5 h-1.5 rounded-full {t <= state.awayTimeouts ? 'opacity-80' : 'opacity-20'}"
                       style="background: {state.awayText}"></div>
                {/each}
              </div>
              <span class="text-sm font-bold tracking-widest uppercase">{state.awayName}</span>
              {#if state.possession === 'away'}
                <span class="text-xs opacity-60">▶</span>
              {/if}
            </div>
          </div>
          {#if state.flagThrown}
            <div class="bg-yellow-500 text-black px-4 py-1 rounded-md text-xs font-black uppercase tracking-wider">
              ⚑ Flag on the Play
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
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
