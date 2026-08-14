<script>
  import ControllerShell from '../ControllerShell.svelte';
  import TeamSetup from '../TeamSetup.svelte';
  import {
    scoreboard, formatGameClock, periodLabel,
    startGameClockInterval, stopGameClockInterval,
    startHomePenaltyInterval, stopHomePenaltyInterval,
    startAwayPenaltyInterval, stopAwayPenaltyInterval,
  } from '../store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

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
    scoreboard.patch({ gameClockSeconds: 1200, gameClockRunning: false });
  }

  function adjustClock(delta) {
    scoreboard.patch({ gameClockSeconds: Math.max(0, Math.min(1200, state.gameClockSeconds + delta)) });
  }

  // ── Period ─────────────────────────────────────────────
  function nextPeriod() {
    stopGameClockInterval();
    scoreboard.update((s) => {
      const p = s.period >= 5 ? 1 : s.period + 1;
      return { ...s, period: p, gameClockSeconds: p <= 3 ? 1200 : 300, gameClockRunning: false };
    });
  }
  function prevPeriod() {
    scoreboard.update((s) => ({ ...s, period: s.period <= 1 ? 5 : s.period - 1 }));
  }

  // ── Timeouts ───────────────────────────────────────────
  function useTimeout(team) {
    const key = team === 'home' ? 'homeTimeouts' : 'awayTimeouts';
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] - 1) }));
  }
  function restoreTimeout(team) {
    const key = team === 'home' ? 'homeTimeouts' : 'awayTimeouts';
    scoreboard.update((s) => ({ ...s, [key]: Math.min(1, s[key] + 1) }));
  }

  // ── Penalties ──────────────────────────────────────────
  function setPenalty(team, minutes) {
    if (team === 'home') {
      scoreboard.patch({ homePenaltySeconds: minutes * 60, homePenaltyRunning: false });
      stopHomePenaltyInterval();
    } else {
      scoreboard.patch({ awayPenaltySeconds: minutes * 60, awayPenaltyRunning: false });
      stopAwayPenaltyInterval();
    }
  }

  function togglePenalty(team) {
    if (team === 'home') {
      const running = !state.homePenaltyRunning;
      scoreboard.patch({ homePenaltyRunning: running });
      if (running) startHomePenaltyInterval(); else stopHomePenaltyInterval();
    } else {
      const running = !state.awayPenaltyRunning;
      scoreboard.patch({ awayPenaltyRunning: running });
      if (running) startAwayPenaltyInterval(); else stopAwayPenaltyInterval();
    }
  }

  function clearPenalty(team) {
    if (team === 'home') {
      stopHomePenaltyInterval();
      scoreboard.patch({ homePenaltySeconds: 0, homePenaltyRunning: false });
    } else {
      stopAwayPenaltyInterval();
      scoreboard.patch({ awayPenaltySeconds: 0, awayPenaltyRunning: false });
    }
  }

  // ── Reset ──────────────────────────────────────────────
  function handleReset() {
    stopHomePenaltyInterval();
    stopAwayPenaltyInterval();
    scoreboard.resetSport('ice-hockey');
  }
</script>

<ControllerShell sportLabel="Ice Hockey" sportEmoji="🏒" onReset={handleReset}>

  <!-- ══════════════════════════════════════════════════════
       LIVE PREVIEW
  ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <div class="card-header">
      <span class="section-label">Live Overlay Preview</span>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full {state.gameClockRunning ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'}"></div>
        <span class="text-xs text-gray-500">{state.gameClockRunning ? 'Clock running' : 'Clock stopped'}</span>
      </div>
    </div>
    <div class="preview-stage bg-[#070c14] rounded-xl p-6 flex justify-center">
      <div class="inline-flex items-stretch rounded-xl overflow-hidden shadow-2xl">
        <div class="flex items-center gap-4 px-6 py-4"
             style="background: linear-gradient(135deg, {state.homePrimary} 70%, {state.homeSecondary} 100%); color: {state.homeText};">
          <div class="flex flex-col items-center gap-1">
            <span class="text-sm font-bold tracking-widest uppercase">{state.homeName}</span>
            {#if state.homePenaltySeconds > 0}
              <span class="text-xs px-2 py-0.5 rounded bg-red-700 text-white font-bold">{formatGameClock(state.homePenaltySeconds)}</span>
            {:else}
              <div class="flex gap-1">
                {#each [1] as t}
                  <div class="w-2.5 h-2.5 rounded-full {t <= state.homeTimeouts ? 'opacity-80' : 'opacity-20'}" style="background:{state.homeText}"></div>
                {/each}
              </div>
            {/if}
          </div>
          <span class="text-4xl font-black tabular-nums">{state.homeScore}</span>
        </div>
        <div class="bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-8 py-3 min-w-[130px]">
          <div class="text-3xl font-black tabular-nums">{formatGameClock(state.gameClockSeconds)}</div>
          <div class="text-xs text-gray-400 mt-1 font-semibold uppercase tracking-wider">{periodLabel(state.period)}</div>
        </div>
        <div class="flex items-center gap-4 px-6 py-4"
             style="background: linear-gradient(225deg, {state.awayPrimary} 70%, {state.awaySecondary} 100%); color: {state.awayText};">
          <span class="text-4xl font-black tabular-nums">{state.awayScore}</span>
          <div class="flex flex-col items-center gap-1">
            <span class="text-sm font-bold tracking-widest uppercase">{state.awayName}</span>
            {#if state.awayPenaltySeconds > 0}
              <span class="text-xs px-2 py-0.5 rounded bg-red-700 text-white font-bold">{formatGameClock(state.awayPenaltySeconds)}</span>
            {:else}
              <div class="flex gap-1">
                {#each [1] as t}
                  <div class="w-2.5 h-2.5 rounded-full {t <= state.awayTimeouts ? 'opacity-80' : 'opacity-20'}" style="background:{state.awayText}"></div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       CLOCK + PERIOD
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- Period Clock -->
    <div class="card text-center col-span-2">
      <div class="card-header justify-center"><span class="section-label">Period Clock</span></div>
      <div class="text-[64px] font-black tabular-nums leading-none mb-6
                  {state.gameClockRunning ? 'text-blue-400' : 'val-primary'}">
        {formatGameClock(state.gameClockSeconds)}
      </div>
      <button onclick={toggleClock}
              class="w-full py-4 rounded-xl text-sm font-bold tracking-wide mb-5
                     {state.gameClockRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}">
        {state.gameClockRunning ? '⏸  STOP' : '▶  START'}
      </button>
      <div class="flex gap-3 justify-center flex-wrap">
        <button onclick={resetClock} class="btn-secondary">Reset 20:00</button>
        <button onclick={() => scoreboard.patch({ gameClockSeconds: 300, gameClockRunning: false })} class="btn-secondary">5:00 (OT)</button>
        <button onclick={() => adjustClock(-1)} class="btn-secondary">−1s</button>
        <button onclick={() => adjustClock(1)} class="btn-secondary">+1s</button>
      </div>
    </div>

    <!-- Period -->
    <div class="card text-center flex flex-col justify-between">
      <div class="card-header justify-center"><span class="section-label">Period</span></div>
      <div class="flex items-center justify-center gap-6 py-4">
        <button onclick={prevPeriod} class="btn-round">‹</button>
        <span class="text-4xl font-black val-primary">{periodLabel(state.period)}</span>
        <button onclick={nextPeriod} class="btn-round">›</button>
      </div>
      <p class="text-[11px] text-gray-600 pb-1">OT = 5 min · SO = shootout</p>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       SCORES + TIMEOUTS + PENALTIES
  ═══════════════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- Home -->
    <div class="card" style="border-top: 3px solid {state.homePrimary};">
      <div class="card-header">
        <span class="section-label">Home — <span class="val-secondary">{state.homeName}</span></span>
      </div>
      <div class="text-6xl font-black tabular-nums leading-none val-primary mb-6">{state.homeScore}</div>
      <div class="grid grid-cols-3 gap-3 mb-6">
        <button onclick={() => addScore('home', 1)} class="btn-score col-span-2">+1 Goal</button>
        <button onclick={() => addScore('home', -1)} class="btn-score-neg">−1</button>
      </div>

      <!-- Timeout -->
      <div class="flex items-center justify-between mb-5 p-3 bg-gray-800/40 rounded-xl">
        <div class="flex items-center gap-2">
          <span class="section-label text-[10px]">Timeout</span>
          <div class="w-4 h-4 rounded-full border-2 {state.homeTimeouts > 0 ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-gray-700'}"></div>
        </div>
        <div class="flex gap-2">
          <button onclick={() => useTimeout('home')} class="btn-sm">Use</button>
          <button onclick={() => restoreTimeout('home')} class="btn-sm">+1</button>
        </div>
      </div>

      <!-- Penalty -->
      <div class="p-3 bg-red-950/30 border border-red-900/40 rounded-xl">
        <div class="section-label text-[10px] mb-3">Penalty Box</div>
        <div class="text-2xl font-black tabular-nums mb-3 {state.homePenaltyRunning ? 'text-red-400' : state.homePenaltySeconds > 0 ? 'text-orange-400' : 'text-gray-600'}">
          {formatGameClock(state.homePenaltySeconds)}
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick={() => setPenalty('home', 2)} class="btn-sm">2 min</button>
          <button onclick={() => setPenalty('home', 4)} class="btn-sm">4 min</button>
          <button onclick={() => setPenalty('home', 5)} class="btn-sm">5 min</button>
          <button onclick={() => togglePenalty('home')}
                  class="btn-sm {state.homePenaltyRunning ? '!bg-red-900/50 !text-red-400' : '!bg-green-900/50 !text-green-400'}">
            {state.homePenaltyRunning ? '⏸' : '▶'}
          </button>
          <button onclick={() => clearPenalty('home')} class="btn-sm">Clear</button>
        </div>
      </div>
    </div>

    <!-- Away -->
    <div class="card" style="border-top: 3px solid {state.awayPrimary};">
      <div class="card-header justify-end">
        <span class="section-label"><span class="val-secondary">{state.awayName}</span> — Away</span>
      </div>
      <div class="text-6xl font-black tabular-nums leading-none val-primary mb-6 text-right">{state.awayScore}</div>
      <div class="grid grid-cols-3 gap-3 mb-6">
        <button onclick={() => addScore('away', 1)} class="btn-score col-span-2">+1 Goal</button>
        <button onclick={() => addScore('away', -1)} class="btn-score-neg">−1</button>
      </div>

      <!-- Timeout -->
      <div class="flex items-center justify-between mb-5 p-3 bg-gray-800/40 rounded-xl">
        <div class="flex items-center gap-2">
          <span class="section-label text-[10px]">Timeout</span>
          <div class="w-4 h-4 rounded-full border-2 {state.awayTimeouts > 0 ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-gray-700'}"></div>
        </div>
        <div class="flex gap-2">
          <button onclick={() => useTimeout('away')} class="btn-sm">Use</button>
          <button onclick={() => restoreTimeout('away')} class="btn-sm">+1</button>
        </div>
      </div>

      <!-- Penalty -->
      <div class="p-3 bg-red-950/30 border border-red-900/40 rounded-xl">
        <div class="section-label text-[10px] mb-3">Penalty Box</div>
        <div class="text-2xl font-black tabular-nums mb-3 {state.awayPenaltyRunning ? 'text-red-400' : state.awayPenaltySeconds > 0 ? 'text-orange-400' : 'text-gray-600'}">
          {formatGameClock(state.awayPenaltySeconds)}
        </div>
        <div class="flex gap-2 flex-wrap">
          <button onclick={() => setPenalty('away', 2)} class="btn-sm">2 min</button>
          <button onclick={() => setPenalty('away', 4)} class="btn-sm">4 min</button>
          <button onclick={() => setPenalty('away', 5)} class="btn-sm">5 min</button>
          <button onclick={() => togglePenalty('away')}
                  class="btn-sm {state.awayPenaltyRunning ? '!bg-red-900/50 !text-red-400' : '!bg-green-900/50 !text-green-400'}">
            {state.awayPenaltyRunning ? '⏸' : '▶'}
          </button>
          <button onclick={() => clearPenalty('away')} class="btn-sm">Clear</button>
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
</style>
