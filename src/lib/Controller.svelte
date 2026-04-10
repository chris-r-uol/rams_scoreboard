<script>
  import { scoreboard, formatGameClock, quarterLabel, downLabel } from './store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // ── Color presets ──────────────────────────────────────
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
  ];

  const quickColors = [
    { name: 'Black', hex: '#000000' },
    { name: 'Gold',  hex: '#FFB612' },
  ];

  // ── Score helpers ──────────────────────────────────────
  function addScore(team, pts) {
    const key = team === 'home' ? 'homeScore' : 'awayScore';
    scoreboard.update((s) => {
      const val = Math.max(0, Math.min(99, s[key] + pts));
      return { ...s, [key]: val };
    });
  }

  // ── Clock helpers ──────────────────────────────────────
  function toggleGameClock() {
    scoreboard.patch({ gameClockRunning: !state.gameClockRunning });
  }

  function resetGameClock(minutes) {
    scoreboard.patch({ gameClockSeconds: minutes * 60, gameClockRunning: false });
  }

  function togglePlayClock() {
    scoreboard.patch({ playClockRunning: !state.playClockRunning });
  }

  function resetPlayClock(seconds) {
    scoreboard.patch({ playClockSeconds: seconds, playClockRunning: false });
  }

  // ── Quarter helpers ────────────────────────────────────
  function nextQuarter() {
    scoreboard.update((s) => {
      const q = s.quarter >= 5 ? 1 : s.quarter + 1;
      const timeouts = q === 3 ? 3 : undefined;
      const patch = { quarter: q, gameClockRunning: false };
      if (q === 1) patch.gameClockSeconds = 900;
      if (q === 3) {
        patch.gameClockSeconds = 900;
        patch.homeTimeouts = 3;
        patch.awayTimeouts = 3;
      }
      return { ...s, ...patch };
    });
  }

  function prevQuarter() {
    scoreboard.update((s) => {
      const q = s.quarter <= 1 ? 5 : s.quarter - 1;
      return { ...s, quarter: q };
    });
  }

  // ── Down / Distance ────────────────────────────────────
  function nextDown() {
    scoreboard.update((s) => ({
      ...s,
      down: s.down >= 4 ? 1 : s.down + 1,
    }));
  }

  function prevDown() {
    scoreboard.update((s) => ({
      ...s,
      down: s.down <= 1 ? 4 : s.down - 1,
    }));
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
    scoreboard.update((s) => ({
      ...s,
      [key]: Math.max(0, s[key] - 1),
    }));
  }

  function restoreTimeout(team) {
    const key = team === 'home' ? 'homeTimeouts' : 'awayTimeouts';
    scoreboard.update((s) => ({
      ...s,
      [key]: Math.min(3, s[key] + 1),
    }));
  }

  // ── Flag ───────────────────────────────────────────────
  function toggleFlag() {
    scoreboard.patch({ flagThrown: !state.flagThrown });
  }

  // ── Color apply ────────────────────────────────────────
  let colorTarget = $state('homePrimary');

  function applyColor(hex) {
    scoreboard.patch({ [colorTarget]: hex });
  }
</script>

<div class="min-h-screen bg-gray-950 text-white p-4 select-none">
  <!-- Header -->
  <header class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold tracking-tight">
      <span class="text-amber-400">&#127944;</span> Scoreboard Controller
    </h1>
    <div class="flex gap-2">
      <a
        href="#/overlay"
        target="_blank"
        class="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition"
      >
        Open Overlay ↗
      </a>
      <button
        onclick={() => scoreboard.reset()}
        class="px-4 py-2 rounded-lg bg-red-900/60 hover:bg-red-800 text-sm font-medium transition"
      >
        Reset All
      </button>
    </div>
  </header>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
    <!-- ═══════════════ LEFT: HOME TEAM ═══════════════ -->
    <div class="rounded-2xl p-5 border border-gray-800 bg-gray-900/50"
         style="border-left: 4px solid {state.homePrimary}">
      <div class="flex items-center justify-between mb-4">
        <input
          type="text"
          bind:value={state.homeName}
          oninput={() => scoreboard.patch({ homeName: state.homeName })}
          class="bg-transparent text-2xl font-bold w-40 border-b border-gray-700 focus:border-amber-400 outline-none"
          maxlength="12"
        />
        <div class="flex items-center gap-2">
          {#if state.possession === 'home'}
            <span class="text-amber-400 text-xl" title="Has Possession">&#127944;</span>
          {/if}
          <span class="text-5xl font-black tabular-nums">{state.homeScore}</span>
        </div>
      </div>

      <!-- Score buttons -->
      <div class="grid grid-cols-5 gap-2 mb-4">
        {#each [6, 3, 2, 1, -1] as pts}
          <button
            onclick={() => addScore('home', pts)}
            class="py-3 rounded-xl font-bold text-lg transition
                   {pts === -1 ? 'bg-red-900/50 hover:bg-red-800 text-red-300' : 'bg-gray-800 hover:bg-gray-700'}"
          >
            {pts > 0 ? `+${pts}` : pts}
          </button>
        {/each}
      </div>

      <!-- Timeouts -->
      <div class="flex items-center gap-3 mb-3">
        <span class="text-xs uppercase tracking-wider text-gray-500">Timeouts</span>
        <div class="flex gap-1.5">
          {#each [1, 2, 3] as t}
            <div
              class="w-4 h-4 rounded-full transition {t <= state.homeTimeouts ? 'bg-amber-400' : 'bg-gray-700'}"
            ></div>
          {/each}
        </div>
        <button onclick={() => useTimeout('home')} class="ml-auto text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">Use</button>
        <button onclick={() => restoreTimeout('home')} class="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">+1</button>
      </div>

      <!-- Branding -->
      <details class="mt-2">
        <summary class="text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300">Team Colors</summary>
        <div class="mt-3 space-y-2">
          <label class="flex gap-2 items-center">
            <span class="text-xs text-gray-400 w-16">Primary</span>
            <input type="color" value={state.homePrimary} onchange={(e) => scoreboard.patch({ homePrimary: e.target.value })} class="w-8 h-8 rounded cursor-pointer" />
            <span class="text-xs text-gray-500 font-mono">{state.homePrimary}</span>
          </label>
          <label class="flex gap-2 items-center">
            <span class="text-xs text-gray-400 w-16">Secondary</span>
            <input type="color" value={state.homeSecondary} onchange={(e) => scoreboard.patch({ homeSecondary: e.target.value })} class="w-8 h-8 rounded cursor-pointer" />
            <span class="text-xs text-gray-500 font-mono">{state.homeSecondary}</span>
          </label>
          <label class="flex gap-2 items-center">
            <span class="text-xs text-gray-400 w-16">Text</span>
            <input type="color" value={state.homeText} onchange={(e) => scoreboard.patch({ homeText: e.target.value })} class="w-8 h-8 rounded cursor-pointer" />
            <span class="text-xs text-gray-500 font-mono">{state.homeText}</span>
          </label>
          <!-- Quick presets for home -->
          <div class="flex flex-wrap gap-1 mt-2">
            {#each colorPresets as c}
              <button
                onclick={() => scoreboard.patch({ homePrimary: c.hex })}
                title={c.name}
                class="w-7 h-7 rounded border border-gray-700 hover:scale-110 transition"
                style="background:{c.hex}"
              ></button>
            {/each}
            {#each quickColors as c}
              <button
                onclick={() => scoreboard.patch({ homePrimary: c.hex })}
                title={c.name}
                class="w-7 h-7 rounded border-2 border-amber-500 hover:scale-110 transition font-bold text-[9px] leading-none flex items-center justify-center"
                style="background:{c.hex}; color:{c.hex === '#000000' ? '#fff' : '#000'}"
              >{c.name}</button>
            {/each}
          </div>
        </div>
      </details>
    </div>

    <!-- ═══════════════ CENTER: GAME STATE ═══════════════ -->
    <div class="space-y-4">
      <!-- Game Clock -->
      <div class="rounded-2xl p-5 border border-gray-800 bg-gray-900/50 text-center">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-2">Game Clock</div>
        <div class="text-6xl font-black tabular-nums mb-4 {state.gameClockRunning ? 'text-green-400' : 'text-white'}">
          {formatGameClock(state.gameClockSeconds)}
        </div>
        <div class="flex gap-2 justify-center mb-3">
          <button
            onclick={toggleGameClock}
            class="px-6 py-3 rounded-xl font-bold text-lg transition
                   {state.gameClockRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}"
          >
            {state.gameClockRunning ? '⏸ STOP' : '▶ START'}
          </button>
        </div>
        <div class="flex gap-2 justify-center">
          <button onclick={() => resetGameClock(15)} class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">15:00</button>
          <button onclick={() => resetGameClock(12)} class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">12:00</button>
          <button onclick={() => resetGameClock(10)} class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">10:00</button>
          <button onclick={() => scoreboard.patch({ gameClockSeconds: Math.max(0, state.gameClockSeconds - 1), gameClockRunning: false })} class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">-1s</button>
          <button onclick={() => scoreboard.patch({ gameClockSeconds: Math.min(5999, state.gameClockSeconds + 1), gameClockRunning: false })} class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm">+1s</button>
        </div>
      </div>

      <!-- Play Clock -->
      <div class="rounded-2xl p-4 border border-gray-800 bg-gray-900/50 text-center">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-1">Play Clock</div>
        <div class="text-4xl font-black tabular-nums mb-3 {state.playClockRunning ? 'text-yellow-400' : ''} {state.playClockSeconds <= 5 && state.playClockSeconds > 0 ? 'text-red-400' : ''}">
          {state.playClockSeconds}
        </div>
        <div class="flex gap-2 justify-center mb-2">
          <button
            onclick={togglePlayClock}
            class="px-5 py-2 rounded-xl font-bold transition
                   {state.playClockRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}"
          >
            {state.playClockRunning ? '⏸ Stop' : '▶ Start'}
          </button>
        </div>
        <div class="flex gap-2 justify-center">
          <button onclick={() => resetPlayClock(40)} class="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium">Reset 40</button>
          <button onclick={() => resetPlayClock(25)} class="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium">Reset 25</button>
        </div>
      </div>

      <!-- Quarter -->
      <div class="rounded-2xl p-4 border border-gray-800 bg-gray-900/50">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-2 text-center">Quarter</div>
        <div class="flex items-center justify-center gap-4">
          <button onclick={prevQuarter} class="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-xl font-bold">‹</button>
          <span class="text-4xl font-black w-16 text-center">
            {state.quarter <= 4 ? `Q${state.quarter}` : 'OT'}
          </span>
          <button onclick={nextQuarter} class="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-xl font-bold">›</button>
        </div>
      </div>

      <!-- Down & Distance -->
      <div class="rounded-2xl p-4 border border-gray-800 bg-gray-900/50">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-2 text-center">Down & Distance</div>
        <div class="text-center text-2xl font-bold mb-3">{downLabel(state.down, state.distance)}</div>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">Down</span>
            <button onclick={prevDown} class="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold">‹</button>
            <span class="font-bold text-lg w-6 text-center">{state.down}</span>
            <button onclick={nextDown} class="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold">›</button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">Dist</span>
            <button onclick={() => scoreboard.patch({ distance: Math.max(1, state.distance - 1) })} class="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold">‹</button>
            <input
              type="number"
              bind:value={state.distance}
              oninput={() => scoreboard.patch({ distance: state.distance })}
              class="bg-transparent text-lg font-bold w-10 text-center border-b border-gray-700 outline-none"
              min="1" max="99"
            />
            <button onclick={() => scoreboard.patch({ distance: Math.min(99, state.distance + 1) })} class="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold">›</button>
          </div>
        </div>
        <!-- Ball On -->
        <div class="flex items-center justify-center gap-2">
          <span class="text-xs text-gray-400">Ball On</span>
          <input
            type="text"
            bind:value={state.ballOn}
            oninput={() => scoreboard.patch({ ballOn: state.ballOn })}
            class="bg-transparent text-lg font-bold w-20 text-center border-b border-gray-700 outline-none"
            maxlength="8"
          />
        </div>
      </div>

      <!-- Possession & Flag -->
      <div class="grid grid-cols-2 gap-2">
        <button
          onclick={togglePossession}
          class="rounded-2xl p-4 border border-gray-800 bg-gray-900/50 hover:bg-gray-800 transition text-center"
        >
          <div class="text-xs uppercase tracking-wider text-gray-500 mb-1">Possession</div>
          <div class="text-3xl mb-1">🏈</div>
          <div class="font-bold text-sm">
            {state.possession === 'home' ? state.homeName : state.awayName}
          </div>
        </button>

        <button
          onclick={toggleFlag}
          class="rounded-2xl p-4 border transition text-center
                 {state.flagThrown ? 'border-yellow-500 bg-yellow-900/30' : 'border-gray-800 bg-gray-900/50 hover:bg-gray-800'}"
        >
          <div class="text-xs uppercase tracking-wider text-gray-500 mb-1">Flag</div>
          <div class="text-3xl mb-1">{state.flagThrown ? '🟡' : '⚑'}</div>
          <div class="font-bold text-sm {state.flagThrown ? 'text-yellow-400' : 'text-gray-500'}">
            {state.flagThrown ? 'FLAG!' : 'No Flag'}
          </div>
        </button>
      </div>
    </div>

    <!-- ═══════════════ RIGHT: AWAY TEAM ═══════════════ -->
    <div class="rounded-2xl p-5 border border-gray-800 bg-gray-900/50"
         style="border-right: 4px solid {state.awayPrimary}">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="text-5xl font-black tabular-nums">{state.awayScore}</span>
          {#if state.possession === 'away'}
            <span class="text-amber-400 text-xl" title="Has Possession">&#127944;</span>
          {/if}
        </div>
        <input
          type="text"
          bind:value={state.awayName}
          oninput={() => scoreboard.patch({ awayName: state.awayName })}
          class="bg-transparent text-2xl font-bold w-40 text-right border-b border-gray-700 focus:border-amber-400 outline-none"
          maxlength="12"
        />
      </div>

      <!-- Score buttons -->
      <div class="grid grid-cols-5 gap-2 mb-4">
        {#each [6, 3, 2, 1, -1] as pts}
          <button
            onclick={() => addScore('away', pts)}
            class="py-3 rounded-xl font-bold text-lg transition
                   {pts === -1 ? 'bg-red-900/50 hover:bg-red-800 text-red-300' : 'bg-gray-800 hover:bg-gray-700'}"
          >
            {pts > 0 ? `+${pts}` : pts}
          </button>
        {/each}
      </div>

      <!-- Timeouts -->
      <div class="flex items-center gap-3 mb-3">
        <button onclick={() => restoreTimeout('away')} class="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">+1</button>
        <button onclick={() => useTimeout('away')} class="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">Use</button>
        <div class="flex gap-1.5 ml-auto">
          {#each [1, 2, 3] as t}
            <div
              class="w-4 h-4 rounded-full transition {t <= state.awayTimeouts ? 'bg-amber-400' : 'bg-gray-700'}"
            ></div>
          {/each}
        </div>
        <span class="text-xs uppercase tracking-wider text-gray-500">Timeouts</span>
      </div>

      <!-- Branding -->
      <details class="mt-2">
        <summary class="text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300">Team Colors</summary>
        <div class="mt-3 space-y-2">
          <label class="flex gap-2 items-center">
            <span class="text-xs text-gray-400 w-16">Primary</span>
            <input type="color" value={state.awayPrimary} onchange={(e) => scoreboard.patch({ awayPrimary: e.target.value })} class="w-8 h-8 rounded cursor-pointer" />
            <span class="text-xs text-gray-500 font-mono">{state.awayPrimary}</span>
          </label>
          <label class="flex gap-2 items-center">
            <span class="text-xs text-gray-400 w-16">Secondary</span>
            <input type="color" value={state.awaySecondary} onchange={(e) => scoreboard.patch({ awaySecondary: e.target.value })} class="w-8 h-8 rounded cursor-pointer" />
            <span class="text-xs text-gray-500 font-mono">{state.awaySecondary}</span>
          </label>
          <label class="flex gap-2 items-center">
            <span class="text-xs text-gray-400 w-16">Text</span>
            <input type="color" value={state.awayText} onchange={(e) => scoreboard.patch({ awayText: e.target.value })} class="w-8 h-8 rounded cursor-pointer" />
            <span class="text-xs text-gray-500 font-mono">{state.awayText}</span>
          </label>
          <!-- Quick presets for away -->
          <div class="flex flex-wrap gap-1 mt-2">
            {#each colorPresets as c}
              <button
                onclick={() => scoreboard.patch({ awayPrimary: c.hex })}
                title={c.name}
                class="w-7 h-7 rounded border border-gray-700 hover:scale-110 transition"
                style="background:{c.hex}"
              ></button>
            {/each}
            {#each quickColors as c}
              <button
                onclick={() => scoreboard.patch({ awayPrimary: c.hex })}
                title={c.name}
                class="w-7 h-7 rounded border-2 border-amber-500 hover:scale-110 transition font-bold text-[9px] leading-none flex items-center justify-center"
                style="background:{c.hex}; color:{c.hex === '#000000' ? '#fff' : '#000'}"
              >{c.name}</button>
            {/each}
          </div>
        </div>
      </details>
    </div>
  </div>

  <!-- Live Preview -->
  <div class="mt-6 rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
    <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 text-center">Live Preview</div>
    <div class="flex justify-center">
      <div class="inline-flex items-stretch rounded-lg overflow-hidden shadow-2xl text-sm font-bold" style="font-family: system-ui, sans-serif;">
        <!-- Home -->
        <div class="flex items-center gap-2 px-4 py-2" style="background:{state.homePrimary}; color:{state.homeText}">
          {#if state.possession === 'home'}
            <span class="text-xs opacity-70">◀</span>
          {/if}
          <span class="text-xs font-semibold tracking-wider">{state.homeName}</span>
          <span class="text-2xl font-black">{state.homeScore}</span>
        </div>
        <!-- Center info -->
        <div class="bg-black/90 text-white flex flex-col items-center justify-center px-4 py-1 min-w-[100px]">
          <div class="text-lg font-black tabular-nums">{formatGameClock(state.gameClockSeconds)}</div>
          <div class="text-[10px] text-gray-400">{state.quarter <= 4 ? `Q${state.quarter}` : 'OT'} · {downLabel(state.down, state.distance)}</div>
        </div>
        <!-- Away -->
        <div class="flex items-center gap-2 px-4 py-2" style="background:{state.awayPrimary}; color:{state.awayText}">
          <span class="text-2xl font-black">{state.awayScore}</span>
          <span class="text-xs font-semibold tracking-wider">{state.awayName}</span>
          {#if state.possession === 'away'}
            <span class="text-xs opacity-70">▶</span>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
