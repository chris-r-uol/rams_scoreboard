<script>
  import { scoreboard, formatGameClock, quarterLabel, downLabel } from './store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });
</script>

<!--
  OBS Overlay — transparent background, minimal scorebug.
  Use as a Browser Source in OBS at #/overlay
-->
<div class="w-screen h-screen bg-transparent flex items-end justify-center p-6 pointer-events-none">
  <div class="scorebug-container" style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;">
    <!-- Main scorebug bar -->
    <div class="flex items-stretch rounded-lg overflow-hidden shadow-2xl"
         style="box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);">

      <!-- Home Team -->
      <div class="flex items-center relative"
           style="background: {state.homePrimary}; color: {state.homeText};">
        <!-- Possession indicator -->
        {#if state.possession === 'home'}
          <div class="w-1 h-full absolute left-0 top-0" style="background: {state.homeText}; opacity: 0.7;"></div>
        {/if}
        <div class="flex items-center gap-3 px-5 py-3">
          <span class="text-sm font-bold tracking-widest uppercase opacity-90">{state.homeName}</span>
          <!-- Timeouts dots -->
          <div class="flex gap-0.5">
            {#each [1, 2, 3] as t}
              <div class="w-1.5 h-1.5 rounded-full {t <= state.homeTimeouts ? 'opacity-80' : 'opacity-20'}"
                   style="background: {state.homeText}"></div>
            {/each}
          </div>
          <span class="text-3xl font-black tabular-nums min-w-[2ch] text-right leading-none">{state.homeScore}</span>
        </div>
      </div>

      <!-- Center Info Block -->
      <div class="bg-[#111111] text-white flex flex-col items-center justify-center px-5 py-2 min-w-[120px]">
        <div class="text-2xl font-black tabular-nums leading-none tracking-tight {state.gameClockRunning ? '' : 'opacity-90'}">
          {formatGameClock(state.gameClockSeconds)}
        </div>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="text-[11px] font-bold text-gray-300 tracking-wider">
            {state.quarter <= 4 ? `Q${state.quarter}` : 'OT'}
          </span>
          <span class="text-gray-600 text-[10px]">|</span>
          <span class="text-[11px] text-gray-400 tracking-wide">
            {downLabel(state.down, state.distance)}
          </span>
        </div>
      </div>

      <!-- Away Team -->
      <div class="flex items-center relative"
           style="background: {state.awayPrimary}; color: {state.awayText};">
        {#if state.possession === 'away'}
          <div class="w-1 h-full absolute right-0 top-0" style="background: {state.awayText}; opacity: 0.7;"></div>
        {/if}
        <div class="flex items-center gap-3 px-5 py-3">
          <span class="text-3xl font-black tabular-nums min-w-[2ch] text-left leading-none">{state.awayScore}</span>
          <div class="flex gap-0.5">
            {#each [1, 2, 3] as t}
              <div class="w-1.5 h-1.5 rounded-full {t <= state.awayTimeouts ? 'opacity-80' : 'opacity-20'}"
                   style="background: {state.awayText}"></div>
            {/each}
          </div>
          <span class="text-sm font-bold tracking-widest uppercase opacity-90">{state.awayName}</span>
        </div>
      </div>
    </div>

    <!-- Play Clock pill (shows when running or low) -->
    {#if state.playClockRunning || state.playClockSeconds <= 10}
      <div class="flex justify-center mt-1.5">
        <div class="bg-[#111111]/90 text-white px-3 py-0.5 rounded-b-md text-sm font-bold tabular-nums
                    {state.playClockSeconds <= 5 ? 'text-red-400' : state.playClockSeconds <= 10 ? 'text-yellow-400' : ''}">
          :{String(state.playClockSeconds).padStart(2, '0')}
        </div>
      </div>
    {/if}

    <!-- Flag indicator -->
    {#if state.flagThrown}
      <div class="flex justify-center mt-1">
        <div class="bg-yellow-500 text-black px-3 py-0.5 rounded-md text-xs font-black uppercase tracking-wider animate-pulse">
          ⚑ Flag on the Play
        </div>
      </div>
    {/if}
  </div>
</div>
