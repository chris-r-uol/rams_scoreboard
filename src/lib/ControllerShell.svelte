<script>
  import { scoreboard, stopAllIntervals } from './store.js';
  import { signOut } from './auth.js';

  let { sportLabel, sportEmoji, onReset, children } = $props();

  let darkMode = $state(localStorage.getItem('theme') !== 'light');

  function toggleTheme() {
    darkMode = !darkMode;
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }

  async function handleSignOut() {
    await signOut();
    window.location.hash = '#/login';
  }

  function handleChangeSport() {
    stopAllIntervals();
    scoreboard.patch({ sport: null });
  }

  function handleReset() {
    stopAllIntervals();
    onReset?.();
  }
</script>

<div class="controller-root min-h-screen select-none" data-theme={darkMode ? 'dark' : 'light'}>

  <!-- ═════ HEADER ═════ -->
  <header class="header-bar sticky top-0 z-50">
    <div class="max-w-screen-2xl mx-auto px-5 py-3 flex items-center gap-4">

      <!-- Brand -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <span class="text-2xl leading-none">{sportEmoji}</span>
        <div class="leading-tight">
          <h1 class="header-title text-xl font-bold tracking-tight leading-none">{sportLabel} Scoreboard</h1>
          <p class="header-subtitle text-[10px] uppercase tracking-[0.15em] mt-0.5">Stream Your Score</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">

        <!-- Theme toggle -->
        <button onclick={toggleTheme} class="btn-header-icon" title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
          {#if darkMode}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          {/if}
        </button>

        <div class="header-sep"></div>

        <!-- Change Sport -->
        <button onclick={handleChangeSport} class="btn-header-sport">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 8 12 12 16"/><line x1="16" y1="12" x2="8" y2="12"/></svg>
          Change Sport
        </button>

        <!-- Open Overlay -->
        <a href="#/overlay" target="_blank" class="btn-header-overlay">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Overlay
        </a>

        <!-- Reset Game -->
        <button onclick={handleReset} class="btn-header-danger">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
          Reset Game
        </button>

        <div class="header-sep"></div>

        <!-- Sign out -->
        <button onclick={handleSignOut} class="btn-header-icon" title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>

      </div>
    </div>
  </header>

  <div class="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
    {@render children()}
    <div class="h-10"></div>
  </div>

  <!-- ═════ FOOTER ═════ -->
  <footer class="border-t border-gray-800/60 py-6 text-center">
    <div class="flex items-center justify-center gap-5 text-[11px] text-gray-600 tracking-wide">
      <a href="#/privacy" class="hover:text-gray-400 transition-colors">Privacy Policy</a>
      <span class="text-gray-800">·</span>
      <a href="#/terms" class="hover:text-gray-400 transition-colors">Terms &amp; Conditions</a>
    </div>
  </footer>
</div>

<style>
  /* ════════════════════════════════════════════════════════
     THEME VARIABLES
  ════════════════════════════════════════════════════════ */
  .controller-root {
    --c-bg:         #030712;
    --c-bg-header:  rgba(3, 7, 18, 0.88);
    --c-bd-header:  #1f2937;
    --c-text:       #f9fafb;
    --c-text-sub:   #9ca3af;
    --c-text-mute:  #6b7280;
    --c-bg-card:    rgba(17, 24, 39, 0.65);
    --c-bd-card:    #1f2937;
    --c-bg-btn:     #1f2937;
    --c-bg-btn-h:   #374151;
    --c-bd-btn:     #374151;
    --c-text-btn:   #e5e7eb;
    --c-bg-input:   #111827;
    --c-bd-input:   #374151;
    --c-text-val:   #f9fafb;
    --c-sep:        #1f2937;
    --tw-ring-offset-color: #111827;
    background: var(--c-bg);
    color: var(--c-text);
  }

  .controller-root[data-theme="light"] {
    --c-bg:         #f1f5f9;
    --c-bg-header:  rgba(248, 250, 252, 0.92);
    --c-bd-header:  #e2e8f0;
    --c-text:       #0f172a;
    --c-text-sub:   #475569;
    --c-text-mute:  #64748b;
    --c-bg-card:    rgba(255, 255, 255, 0.95);
    --c-bd-card:    #e2e8f0;
    --c-bg-btn:     #f1f5f9;
    --c-bg-btn-h:   #e2e8f0;
    --c-bd-btn:     #cbd5e1;
    --c-text-btn:   #1e293b;
    --c-bg-input:   #ffffff;
    --c-bd-input:   #cbd5e1;
    --c-text-val:   #0f172a;
    --c-sep:        #e2e8f0;
    --tw-ring-offset-color: #fff;
  }

  .controller-root[data-theme="light"] input,
  .controller-root[data-theme="light"] input::placeholder {
    color: var(--c-text-val);
  }

  /* ════════════════════════════════════════════════════════
     HEADER
  ════════════════════════════════════════════════════════ */
  .header-bar {
    background: var(--c-bg-header);
    border-bottom: 1px solid var(--c-bd-header);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .header-title   { color: var(--c-text); }
  .header-subtitle { color: var(--c-text-mute); }
  .header-sep {
    width: 1px; height: 22px;
    background: var(--c-sep);
    flex-shrink: 0; border-radius: 1px;
  }

  .btn-header-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: var(--c-text-sub);
    background: transparent; border: 1px solid transparent;
    cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
  }
  .btn-header-icon:hover  { background: var(--c-bg-btn); border-color: var(--c-bd-btn); color: var(--c-text); }
  .btn-header-icon:active { transform: scale(0.9); }

  .btn-header-sport {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 10px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
    border: 1px solid var(--c-bd-btn);
    white-space: nowrap; cursor: pointer; transition: all 0.15s ease;
  }
  .btn-header-sport:hover  { background: var(--c-bg-btn-h); }
  .btn-header-sport:active { transform: scale(0.97); }

  .btn-header-overlay {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 10px;
    background: #2563eb; color: #fff;
    font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
    border: 1px solid #1d4ed8; text-decoration: none;
    white-space: nowrap; transition: all 0.15s ease;
  }
  .btn-header-overlay:hover  { background: #1d4ed8; }
  .btn-header-overlay:active { transform: scale(0.97); }

  .btn-header-danger {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 10px;
    background: #dc2626; color: #fff;
    font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
    border: 1px solid #b91c1c; white-space: nowrap;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-header-danger:hover  { background: #b91c1c; }
  .btn-header-danger:active { transform: scale(0.97); }
</style>
