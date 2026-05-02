<script>
  import ControllerShell from '../ControllerShell.svelte';
  import TeamSetup from '../TeamSetup.svelte';
  import { scoreboard, inningLabel } from '../store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // ── Runs ───────────────────────────────────────────────
  function addRun(team, delta) {
    const key = team === 'home' ? 'homeScore' : 'awayScore';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }
  function addHit(team, delta) {
    const key = team === 'home' ? 'homeHits' : 'awayHits';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }
  function addError(team, delta) {
    const key = team === 'home' ? 'homeErrors' : 'awayErrors';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }

  // ── Count ──────────────────────────────────────────────
  function addBall() {
    scoreboard.update((s) => {
      if (s.balls >= 3) return { ...s, balls: 0, strikes: 0 }; // walk — reset count
      return { ...s, balls: s.balls + 1 };
    });
  }
  function addStrike() {
    scoreboard.update((s) => {
      if (s.strikes >= 2) {
        // strikeout — advance outs
        const outs = s.outs >= 2 ? 0 : s.outs + 1;
        const halfInning = outs === 0 ? (s.halfInning === 'top' ? 'bottom' : 'top') : s.halfInning;
        const inning = outs === 0 && halfInning === 'top' ? s.inning + 1 : s.inning;
        return { ...s, strikes: 0, balls: 0, outs, halfInning, inning: Math.min(inning, 20) };
      }
      return { ...s, strikes: s.strikes + 1 };
    });
  }
  function clearCount() {
    scoreboard.patch({ balls: 0, strikes: 0 });
  }

  // ── Outs ───────────────────────────────────────────────
  function addOut() {
    scoreboard.update((s) => {
      if (s.outs >= 2) {
        const halfInning = s.halfInning === 'top' ? 'bottom' : 'top';
        const inning = halfInning === 'top' ? s.inning + 1 : s.inning;
        return { ...s, outs: 0, balls: 0, strikes: 0, halfInning, inning: Math.min(inning, 20),
                 runnerFirst: false, runnerSecond: false, runnerThird: false };
      }
      return { ...s, outs: s.outs + 1, balls: 0, strikes: 0 };
    });
  }
  function removeOut() {
    scoreboard.update((s) => ({ ...s, outs: Math.max(0, s.outs - 1) }));
  }

  // ── Inning ─────────────────────────────────────────────
  function setHalf(half) {
    scoreboard.patch({ halfInning: half, balls: 0, strikes: 0, outs: 0,
                       runnerFirst: false, runnerSecond: false, runnerThird: false });
  }
  function adjustInning(delta) {
    scoreboard.patch({ inning: Math.max(1, Math.min(20, state.inning + delta)) });
  }

  // ── Runners ────────────────────────────────────────────
  function toggleRunner(base) {
    scoreboard.patch({ [base]: !state[base] });
  }

  // ── Reset ──────────────────────────────────────────────
  function handleReset() {
    scoreboard.resetSport('baseball');
  }
</script>

<ControllerShell sportLabel="Baseball" sportEmoji="⚾" onReset={handleReset}>

  <!-- ══════════════════════════════════════════════════════
       LIVE PREVIEW
  ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <div class="card-header">
      <span class="section-label">Live Overlay Preview</span>
    </div>
    <div class="bg-[#070c14] rounded-xl p-6 flex justify-center">
      <div class="inline-flex gap-6 items-center">
        <!-- Scoreboard -->
        <div class="inline-flex rounded-xl overflow-hidden shadow-2xl">
          <div class="bg-[#0a0a0a] text-white px-4 py-3 flex flex-col gap-1 min-w-[280px]">
            <!-- Header row -->
            <div class="flex items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
              <span class="w-24">Team</span>
              <span class="flex-1 text-center">R</span>
              <span class="flex-1 text-center">H</span>
              <span class="flex-1 text-center">E</span>
            </div>
            <!-- Home row -->
            <div class="flex items-center" style="color:{state.homeText}">
              <div class="w-24 px-2 py-1 rounded text-sm font-bold" style="background:{state.homePrimary}">{state.homeName}</div>
              <span class="flex-1 text-center text-lg font-black tabular-nums">{state.homeScore}</span>
              <span class="flex-1 text-center text-sm font-semibold text-gray-400">{state.homeHits}</span>
              <span class="flex-1 text-center text-sm font-semibold text-gray-400">{state.homeErrors}</span>
            </div>
            <!-- Away row -->
            <div class="flex items-center" style="color:{state.awayText}">
              <div class="w-24 px-2 py-1 rounded text-sm font-bold" style="background:{state.awayPrimary}">{state.awayName}</div>
              <span class="flex-1 text-center text-lg font-black tabular-nums">{state.awayScore}</span>
              <span class="flex-1 text-center text-sm font-semibold text-gray-400">{state.awayHits}</span>
              <span class="flex-1 text-center text-sm font-semibold text-gray-400">{state.awayErrors}</span>
            </div>
          </div>
        </div>
        <!-- Count + Inning + Runners -->
        <div class="bg-[#0a0a0a] rounded-xl px-5 py-4 text-white flex flex-col gap-3">
          <div class="text-center text-sm font-bold text-gray-300">{inningLabel(state.inning, state.halfInning)}</div>
          <div class="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            <span>B {state.balls}</span><span>S {state.strikes}</span><span>O {state.outs}</span>
          </div>
          <!-- Diamond -->
          <div class="relative w-16 h-16 mx-auto">
            <div class="diamond-base {state.runnerSecond ? 'occupied' : ''}" style="top:0;left:50%;transform:translateX(-50%) rotate(45deg)"></div>
            <div class="diamond-base {state.runnerThird ? 'occupied' : ''}" style="bottom:8px;left:0;transform:rotate(45deg)"></div>
            <div class="diamond-base {state.runnerFirst ? 'occupied' : ''}" style="bottom:8px;right:0;transform:rotate(45deg)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       INNING + COUNT + OUTS
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-3 gap-6">

    <!-- Inning -->
    <div class="card text-center">
      <div class="card-header justify-center"><span class="section-label">Inning</span></div>
      <div class="text-[52px] font-black tabular-nums leading-none val-primary mb-4">
        {inningLabel(state.inning, state.halfInning)}
      </div>
      <div class="flex items-center justify-center gap-3 mb-5">
        <button onclick={() => adjustInning(-1)} class="btn-round">‹</button>
        <span class="text-2xl font-black val-primary w-12 text-center">{state.inning}</span>
        <button onclick={() => adjustInning(1)} class="btn-round">›</button>
      </div>
      <div class="flex gap-3 justify-center">
        <button onclick={() => setHalf('top')}
                class="btn-secondary flex-1 {state.halfInning === 'top' ? '!bg-amber-600 !border-amber-500 !text-white' : ''}">▲ Top</button>
        <button onclick={() => setHalf('bottom')}
                class="btn-secondary flex-1 {state.halfInning === 'bottom' ? '!bg-amber-600 !border-amber-500 !text-white' : ''}">▼ Bottom</button>
      </div>
    </div>

    <!-- Count (Balls & Strikes) -->
    <div class="card">
      <div class="card-header justify-center"><span class="section-label">Count</span></div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="text-center">
          <div class="section-label text-[10px] mb-2">Balls</div>
          <div class="text-5xl font-black tabular-nums val-primary mb-3">{state.balls}</div>
          <div class="flex justify-center gap-1 mb-3">
            {#each [0,1,2,3] as i}
              <div class="w-3 h-3 rounded-full border {i < state.balls ? 'bg-green-500 border-green-500' : 'border-gray-600'}"></div>
            {/each}
          </div>
          <button onclick={addBall} class="btn-count w-full">Ball</button>
        </div>
        <div class="text-center">
          <div class="section-label text-[10px] mb-2">Strikes</div>
          <div class="text-5xl font-black tabular-nums val-primary mb-3">{state.strikes}</div>
          <div class="flex justify-center gap-1 mb-3">
            {#each [0,1,2] as i}
              <div class="w-3 h-3 rounded-full border {i < state.strikes ? 'bg-red-500 border-red-500' : 'border-gray-600'}"></div>
            {/each}
          </div>
          <button onclick={addStrike} class="btn-count w-full">Strike</button>
        </div>
      </div>
      <button onclick={clearCount} class="btn-secondary w-full">Clear Count</button>
    </div>

    <!-- Outs + Runners -->
    <div class="card">
      <div class="card-header justify-center"><span class="section-label">Outs &amp; Runners</span></div>
      <div class="text-center mb-5">
        <div class="section-label text-[10px] mb-2">Outs</div>
        <div class="flex justify-center gap-3 mb-3">
          {#each [0,1,2] as i}
            <div class="w-8 h-8 rounded-full border-2 {i < state.outs ? 'bg-red-500 border-red-500' : 'border-gray-600'}"></div>
          {/each}
        </div>
        <div class="flex gap-2 justify-center">
          <button onclick={addOut} class="btn-count">Out</button>
          <button onclick={removeOut} class="btn-sm">−</button>
        </div>
      </div>
      <!-- Diamond -->
      <div class="section-label text-[10px] mb-4 text-center">Base Runners</div>
      <div class="relative w-24 h-24 mx-auto mb-4">
        <button onclick={() => toggleRunner('runnerSecond')}
                class="base-btn {state.runnerSecond ? 'occupied' : ''}" style="top:0;left:50%;transform:translateX(-50%) rotate(45deg)"></button>
        <button onclick={() => toggleRunner('runnerThird')}
                class="base-btn {state.runnerThird ? 'occupied' : ''}" style="bottom:8px;left:0;transform:rotate(45deg)"></button>
        <button onclick={() => toggleRunner('runnerFirst')}
                class="base-btn {state.runnerFirst ? 'occupied' : ''}" style="bottom:8px;right:0;transform:rotate(45deg)"></button>
      </div>
      <button onclick={() => scoreboard.patch({ runnerFirst: false, runnerSecond: false, runnerThird: false })}
              class="btn-secondary w-full text-sm">Clear Bases</button>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       R/H/E SCOREBOARD
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-2 gap-6">

    <!-- Home R/H/E -->
    <div class="card" style="border-top: 3px solid {state.homePrimary};">
      <div class="card-header">
        <span class="section-label">Home — <span class="val-secondary">{state.homeName}</span></span>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div class="text-center">
          <div class="section-label text-[10px] mb-2">Runs (R)</div>
          <div class="text-4xl font-black val-primary tabular-nums mb-3">{state.homeScore}</div>
          <div class="flex gap-1.5 justify-center">
            <button onclick={() => addRun('home', 1)} class="btn-sm">+</button>
            <button onclick={() => addRun('home', -1)} class="btn-sm">−</button>
          </div>
        </div>
        <div class="text-center">
          <div class="section-label text-[10px] mb-2">Hits (H)</div>
          <div class="text-4xl font-black val-primary tabular-nums mb-3">{state.homeHits}</div>
          <div class="flex gap-1.5 justify-center">
            <button onclick={() => addHit('home', 1)} class="btn-sm">+</button>
            <button onclick={() => addHit('home', -1)} class="btn-sm">−</button>
          </div>
        </div>
        <div class="text-center">
          <div class="section-label text-[10px] mb-2">Errors (E)</div>
          <div class="text-4xl font-black val-primary tabular-nums mb-3">{state.homeErrors}</div>
          <div class="flex gap-1.5 justify-center">
            <button onclick={() => addError('home', 1)} class="btn-sm">+</button>
            <button onclick={() => addError('home', -1)} class="btn-sm">−</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Away R/H/E -->
    <div class="card" style="border-top: 3px solid {state.awayPrimary};">
      <div class="card-header justify-end">
        <span class="section-label"><span class="val-secondary">{state.awayName}</span> — Away</span>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div class="text-center">
          <div class="section-label text-[10px] mb-2">Runs (R)</div>
          <div class="text-4xl font-black val-primary tabular-nums mb-3">{state.awayScore}</div>
          <div class="flex gap-1.5 justify-center">
            <button onclick={() => addRun('away', 1)} class="btn-sm">+</button>
            <button onclick={() => addRun('away', -1)} class="btn-sm">−</button>
          </div>
        </div>
        <div class="text-center">
          <div class="section-label text-[10px] mb-2">Hits (H)</div>
          <div class="text-4xl font-black val-primary tabular-nums mb-3">{state.awayHits}</div>
          <div class="flex gap-1.5 justify-center">
            <button onclick={() => addHit('away', 1)} class="btn-sm">+</button>
            <button onclick={() => addHit('away', -1)} class="btn-sm">−</button>
          </div>
        </div>
        <div class="text-center">
          <div class="section-label text-[10px] mb-2">Errors (E)</div>
          <div class="text-4xl font-black val-primary tabular-nums mb-3">{state.awayErrors}</div>
          <div class="flex gap-1.5 justify-center">
            <button onclick={() => addError('away', 1)} class="btn-sm">+</button>
            <button onclick={() => addError('away', -1)} class="btn-sm">−</button>
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
  .btn-count {
    padding: 10px 18px; border-radius: 10px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 13px; font-weight: 700; border: 1px solid var(--c-bd-btn);
    transition: all 0.15s ease; cursor: pointer;
  }
  .btn-count:hover  { background: var(--c-bg-btn-h); }
  .btn-count:active { transform: scale(0.95); }
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
  .diamond-base {
    position: absolute; width: 16px; height: 16px; border-radius: 2px;
    background: #374151; border: 1.5px solid #4b5563;
  }
  .diamond-base.occupied { background: #fbbf24; border-color: #f59e0b; }
  .base-btn {
    position: absolute; width: 22px; height: 22px; border-radius: 3px;
    background: #374151; border: 2px solid #4b5563; cursor: pointer;
    transition: all 0.15s ease;
  }
  .base-btn.occupied { background: #fbbf24; border-color: #f59e0b; box-shadow: 0 0 8px rgba(251,191,36,0.4); }
  .base-btn:hover { background: #4b5563; }
  .base-btn.occupied:hover { background: #f59e0b; }
</style>
