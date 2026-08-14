<script>
  import { scoreboard, stopAllIntervals, gameResumed, undoableReset, undoDepth } from './store.js';
  import { shortcutsFor, matchShortcut } from './shortcuts.js';
  import {
    OVERLAY_POSITIONS, positionLabel, clampScale,
    SCALE_MIN, SCALE_MAX, DEFAULT_OVERLAY_POSITION, DEFAULT_OVERLAY_SCALE,
  } from './overlayLayout.js';
  import { signOut, user, plan } from './auth.js';
  import { buildOverlayUrl } from './room.js';
  import { realtimeStatus } from './realtime.js';

  let { sportLabel, sportEmoji, onReset, children } = $props();

  let darkMode = $state(localStorage.getItem('theme') !== 'light');

  // ── Overlay URL for OBS ─────────────────────────────────
  let overlayUrl = $state('');
  let rtStatus = $state('idle');
  let copied = $state(false);
  let showUrl = $state(false);
  let copyTimer;

  let currentPlan = $state('free');

  const unsubs = [
    user.subscribe((u) => { overlayUrl = u?.id ? buildOverlayUrl(u.id) : ''; }),
    realtimeStatus.subscribe((s) => { rtStatus = s; }),
    plan.subscribe((p) => { currentPlan = p; }),
  ];

  import { onDestroy } from 'svelte';
  onDestroy(() => { unsubs.forEach((u) => u()); clearTimeout(copyTimer); });

  const STATUS_LABEL = {
    connected: 'Overlay link live — OBS can connect',
    connecting: 'Connecting overlay link…',
    error: 'Overlay link lost — retrying',
    unavailable: 'Overlay link unavailable — check configuration',
    idle: 'Overlay link idle',
  };

  async function copyOverlayUrl() {
    if (!overlayUrl) return;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 2000);
    } catch (_) {
      // Clipboard blocked — reveal the URL so it can be copied by hand.
      showUrl = true;
    }
  }

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

  // ── Reset, confirmed and reversible ─────────────────────
  // Reset sits in the header beside controls used during setup, and wipes a
  // live game. It asks first, and stays undoable afterwards.
  let confirmingReset = $state(false);
  let resumed = $state(false);
  let justReset = $state(false);
  let depth = $state(0);
  let sport = $state(null);
  let showShortcuts = $state(false);

  unsubs.push(gameResumed.subscribe((v) => (resumed = v)));
  unsubs.push(undoableReset.subscribe((v) => (justReset = v)));
  unsubs.push(undoDepth.subscribe((v) => (depth = v)));
  // ── Overlay placement ───────────────────────────────────
  let showOverlaySettings = $state(false);
  let overlayPosition = $state(DEFAULT_OVERLAY_POSITION);
  let overlayScale = $state(DEFAULT_OVERLAY_SCALE);

  unsubs.push(scoreboard.subscribe((s) => {
    sport = s.sport;
    overlayPosition = s.overlayPosition ?? DEFAULT_OVERLAY_POSITION;
    overlayScale = s.overlayScale ?? DEFAULT_OVERLAY_SCALE;
  }));

  function setPosition(p) {
    scoreboard.patch({ overlayPosition: p });
  }

  function setScale(v) {
    scoreboard.patch({ overlayScale: clampScale(v) });
  }

  function requestReset() {
    confirmingReset = true;
  }

  function confirmReset() {
    confirmingReset = false;
    stopAllIntervals();
    onReset?.();
  }

  function undoLast() {
    scoreboard.undo();
  }

  // ── Keyboard ────────────────────────────────────────────
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      if (showShortcuts) { showShortcuts = false; return; }
      if (confirmingReset) { confirmingReset = false; return; }
      return;
    }

    // A dialog is open: leave the page's shortcuts alone until it is dismissed.
    if (confirmingReset) return;

    if (e.key === '?' && !isTyping(e.target)) {
      e.preventDefault();
      showShortcuts = !showShortcuts;
      return;
    }

    const action = matchShortcut(e, sport);
    if (action) {
      e.preventDefault();
      action.run();
    }
  }

  function isTyping(el) {
    const tag = el?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="controller-root min-h-screen select-none" data-theme={darkMode ? 'dark' : 'light'}>

  <!-- ═════ HEADER ═════ -->
  <header class="header-bar sticky top-0 z-50">
    <div class="header-row max-w-screen-2xl mx-auto px-5 py-3">

      <!-- Brand -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <span class="text-2xl leading-none">{sportEmoji}</span>
        <div class="leading-tight">
          <h1 class="header-title text-xl font-bold tracking-tight leading-none">{sportLabel} Scoreboard</h1>
          <p class="header-subtitle text-[10px] uppercase tracking-[0.15em] mt-0.5">Stream Your Score</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="header-actions">

        <!-- Undo -->
        <button onclick={undoLast} class="btn-header-icon" disabled={depth === 0}
                title={depth ? `Undo last action (Z) — ${depth} available` : 'Nothing to undo'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>

        <!-- Overlay placement -->
        <button onclick={() => (showOverlaySettings = true)} class="btn-header-icon" title="Overlay size and position">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6" y="14" width="9" height="4" rx="1"/></svg>
        </button>

        <!-- Keyboard shortcuts -->
        <button onclick={() => (showShortcuts = true)} class="btn-header-icon" title="Keyboard shortcuts (?)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>
        </button>

        <!-- Theme toggle -->
        <button onclick={toggleTheme} class="btn-header-icon" title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
          {#if darkMode}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          {/if}
        </button>

        {#if currentPlan === 'free'}
          <a href="#/subscribe" class="btn-upgrade" title="Unlock all sports and remove the watermark">
            <span class="plan-chip">Free</span>
            Upgrade
          </a>
        {/if}

        <div class="header-sep"></div>

        <!-- Change Sport -->
        <button onclick={handleChangeSport} class="btn-header-sport">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 8 12 12 16"/><line x1="16" y1="12" x2="8" y2="12"/></svg>
          <span>Change Sport</span>
        </button>

        <!-- Overlay link status -->
        <span class="rt-dot rt-{rtStatus}" title={STATUS_LABEL[rtStatus] ?? rtStatus}></span>

        <!-- Copy the OBS Browser Source URL -->
        <button onclick={copyOverlayUrl} class="btn-header-overlay" disabled={!overlayUrl}
                title="Copy this into an OBS Browser Source">
          {#if copied}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Copied!</span>
          {:else}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy OBS URL</span>
          {/if}
        </button>

        <!-- Preview the overlay in a normal tab -->
        <a href={overlayUrl} target="_blank" rel="noopener" class="btn-header-icon" title="Preview overlay in a new tab">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>

        <!-- Reset Game -->
        <button onclick={requestReset} class="btn-header-danger">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
          <span>Reset Game</span>
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

    {#if resumed}
      <div class="notice notice-info">
        <span>Resumed your game in progress — check the clock before you go on air.</span>
        <button onclick={() => gameResumed.set(false)} class="notice-btn">Dismiss</button>
      </div>
    {/if}

    {#if justReset}
      <div class="notice notice-warn">
        <span>Game reset.</span>
        <button onclick={undoLast} class="notice-btn">Undo reset</button>
        <button onclick={() => undoableReset.set(false)} class="notice-btn notice-btn-quiet">Dismiss</button>
      </div>
    {/if}

    {#if showUrl}
      <div class="url-fallback">
        <label for="overlay-url">Copy this URL into an OBS Browser Source:</label>
        <input id="overlay-url" type="text" readonly value={overlayUrl}
               onfocus={(e) => e.currentTarget.select()} />
      </div>
    {/if}

    {@render children()}
    <div class="h-10"></div>
  </div>

  <!-- ═════ OVERLAY PLACEMENT ═════ -->
  {#if showOverlaySettings}
    <div class="modal-scrim" role="presentation" onclick={() => (showOverlaySettings = false)}>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ov-title"
           onclick={(e) => e.stopPropagation()}>
        <div class="keys-head">
          <h2 id="ov-title" class="modal-title">Overlay size &amp; position</h2>
          <button onclick={() => (showOverlaySettings = false)} class="btn-modal-cancel">Close</button>
        </div>
        <p class="modal-body">
          Changes appear on your stream straight away. Scale here rather than resizing the
          Browser Source in OBS — OBS resamples the render and softens the text.
        </p>

        <div class="ov-field">
          <span class="ov-label">Position on canvas</span>
          <div class="ov-grid" role="radiogroup" aria-label="Overlay position">
            {#each OVERLAY_POSITIONS as p}
              <button
                class="ov-cell"
                class:ov-cell-on={overlayPosition === p}
                role="radio"
                aria-checked={overlayPosition === p}
                aria-label={positionLabel(p)}
                title={positionLabel(p)}
                onclick={() => setPosition(p)}
              ><span class="ov-dot"></span></button>
            {/each}
          </div>
        </div>

        <div class="ov-field">
          <span class="ov-label">
            Scale <span class="ov-value">{Math.round(overlayScale * 100)}%</span>
          </span>
          <input
            type="range"
            min={SCALE_MIN} max={SCALE_MAX} step="0.05"
            value={overlayScale}
            oninput={(e) => setScale(e.currentTarget.value)}
            class="ov-range"
            aria-label="Overlay scale"
          />
          <div class="ov-presets">
            <button onclick={() => setScale(0.75)} class="ov-preset">75%</button>
            <button onclick={() => setScale(1)} class="ov-preset">100%</button>
            <button onclick={() => setScale(1.35)} class="ov-preset">135%</button>
            <button onclick={() => setScale(1.8)} class="ov-preset">180% (4K)</button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ═════ KEYBOARD SHORTCUTS ═════ -->
  {#if showShortcuts}
    <div class="modal-scrim" role="presentation" onclick={() => (showShortcuts = false)}>
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="keys-title"
           onclick={(e) => e.stopPropagation()}>
        <div class="keys-head">
          <h2 id="keys-title" class="modal-title">Keyboard shortcuts</h2>
          <button onclick={() => (showShortcuts = false)} class="btn-modal-cancel">Close</button>
        </div>
        <p class="modal-body">
          Home keys sit on the left of the keyboard, away on the right — the same way round as
          the scorebug. Shortcuts pause while you're typing in a field.
        </p>

        <div class="keys-groups">
          {#each shortcutsFor(sport) as group}
            <div class="keys-group">
              <h3 class="keys-group-title">{group.group}</h3>
              {#each group.items as item}
                <div class="keys-row">
                  <span class="keys-combo">
                    {#each item.keys as k}<kbd>{k}</kbd>{/each}
                  </span>
                  <span class="keys-label">{item.label}</span>
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- ═════ RESET CONFIRMATION ═════ -->
  {#if confirmingReset}
    <div class="modal-scrim" role="presentation" onclick={() => (confirmingReset = false)}>
      <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"
           onclick={(e) => e.stopPropagation()}>
        <h2 id="reset-title" class="modal-title">Reset this game?</h2>
        <p class="modal-body">
          Scores, clocks and timeouts all return to their starting values, and the change
          appears on your overlay immediately. You'll be able to undo this.
        </p>
        <div class="modal-actions">
          <button onclick={() => (confirmingReset = false)} class="btn-modal-cancel">Cancel</button>
          <button onclick={confirmReset} class="btn-modal-danger">Reset game</button>
        </div>
      </div>
    </div>
  {/if}

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
  /* The header carries a lot for its width. Below the desktop breakpoint it
     wraps onto two rows rather than letting the title collide with the
     controls or push the timeout labels off the edge. */
  .header-row {
    display: flex; align-items: center; gap: 16px;
    flex-wrap: wrap;
  }
  .header-actions {
    display: flex; align-items: center; gap: 8px;
    flex-wrap: wrap;
  }
  @media (max-width: 900px) {
    .header-row { gap: 10px; }
    .header-actions { width: 100%; justify-content: flex-start; }
  }

  .header-title   { color: var(--c-text); }
  .header-subtitle { color: var(--c-text-mute); }

  @media (max-width: 640px) {
    .header-title { font-size: 16px; }
    /* Button labels give way to their icons before the row starts wrapping
       into an unusable stack. */
    .btn-header-sport span,
    .btn-header-overlay span,
    .btn-header-danger span { display: none; }
  }
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
  .btn-header-overlay:hover:not(:disabled)  { background: #1d4ed8; }
  .btn-header-overlay:active:not(:disabled) { transform: scale(0.97); }
  .btn-header-overlay:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Overlay link status dot ── */
  .rt-dot {
    width: 8px; height: 8px; border-radius: 50%;
    flex-shrink: 0; background: var(--c-text-mute);
    transition: background 0.2s ease;
  }
  .rt-connected  { background: #22c55e; box-shadow: 0 0 6px rgba(34, 197, 94, 0.7); }
  .rt-connecting { background: #eab308; animation: rt-pulse 1.2s ease-in-out infinite; }
  .rt-error,
  .rt-unavailable { background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.7); }

  @keyframes rt-pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.35; }
  }

  /* ── Free plan / upgrade ── */
  .btn-upgrade {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px 7px 8px; border-radius: 10px;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.4);
    color: #38bdf8; font-size: 13px; font-weight: 700;
    text-decoration: none; white-space: nowrap;
    transition: background 0.15s ease;
  }
  .btn-upgrade:hover { background: rgba(56, 189, 248, 0.2); }
  .plan-chip {
    background: #38bdf8; color: #04121c;
    font-size: 10px; font-weight: 800; letter-spacing: 0.06em;
    text-transform: uppercase; padding: 2px 7px; border-radius: 5px;
  }

  /* ── Notices (resume / undo) ── */
  .notice {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    padding: 12px 18px; border-radius: 12px;
    font-size: 13px; font-weight: 500;
    border: 1px solid transparent;
  }
  .notice-info {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.35);
    color: #93c5fd;
  }
  .notice-warn {
    background: rgba(217, 119, 6, 0.12);
    border-color: rgba(217, 119, 6, 0.35);
    color: #fcd34d;
  }
  .notice span { flex: 1; min-width: 200px; }
  .notice-btn {
    padding: 5px 12px; border-radius: 7px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: inherit; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 0.15s ease; white-space: nowrap;
  }
  .notice-btn:hover { background: rgba(255, 255, 255, 0.18); }
  .notice-btn-quiet { background: transparent; border-color: transparent; opacity: 0.75; }

  /* ── Reset confirmation ── */
  .modal-scrim {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(3, 7, 18, 0.72);
    backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .modal {
    background: var(--c-bg-card);
    border: 1px solid var(--c-bd-card);
    border-radius: 16px;
    padding: 26px;
    max-width: 440px; width: 100%;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  }
  .modal-title {
    margin: 0 0 10px; font-size: 19px; font-weight: 700;
    color: var(--c-text); letter-spacing: -0.01em;
  }
  .modal-body {
    margin: 0 0 22px; font-size: 14px; line-height: 1.6;
    color: var(--c-text-sub);
  }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .btn-modal-cancel {
    padding: 9px 18px; border-radius: 10px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    border: 1px solid var(--c-bd-btn);
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: background 0.15s ease;
  }
  .btn-modal-cancel:hover { background: var(--c-bg-btn-h); }
  .btn-modal-danger {
    padding: 9px 18px; border-radius: 10px;
    background: #dc2626; color: #fff; border: 1px solid #b91c1c;
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: background 0.15s ease;
  }
  .btn-modal-danger:hover { background: #b91c1c; }

  /* ── Overlay placement ── */
  .ov-field { margin-top: 20px; }
  .ov-label {
    display: flex; align-items: baseline; gap: 8px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.13em;
    text-transform: uppercase; color: var(--c-text-mute);
    margin-bottom: 10px;
  }
  .ov-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px; letter-spacing: 0; color: var(--c-text);
    font-variant-numeric: tabular-nums;
  }

  /* A 3x3 map of the canvas — the cell you pick is where the bug sits. */
  .ov-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 6px; width: 168px;
    aspect-ratio: 16 / 9;
  }
  .ov-cell {
    display: flex; align-items: center; justify-content: center;
    background: var(--c-bg-input); border: 1px solid var(--c-bd-input);
    border-radius: 6px; cursor: pointer; padding: 0;
    transition: all 0.15s ease;
  }
  .ov-cell:hover { border-color: #2563eb; }
  .ov-dot {
    width: 14px; height: 5px; border-radius: 2px;
    background: var(--c-text-mute); transition: background 0.15s ease;
  }
  .ov-cell-on { background: rgba(37, 99, 235, 0.18); border-color: #2563eb; }
  .ov-cell-on .ov-dot { background: #60a5fa; }

  .ov-range { width: 100%; accent-color: #2563eb; cursor: pointer; }
  .ov-presets { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
  .ov-preset {
    padding: 5px 11px; border-radius: 7px;
    background: var(--c-bg-btn); border: 1px solid var(--c-bd-btn);
    color: var(--c-text-btn); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 0.15s ease;
  }
  .ov-preset:hover { background: var(--c-bg-btn-h); }

  /* ── Keyboard shortcuts sheet ── */
  .modal-wide { max-width: 680px; }
  .keys-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; margin-bottom: 10px;
  }
  .keys-head .modal-title { margin-bottom: 0; }
  .keys-groups {
    display: grid; gap: 22px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  .keys-group-title {
    font-size: 11px; font-weight: 800; letter-spacing: 0.13em;
    text-transform: uppercase; color: var(--c-text-mute);
    margin: 0 0 10px;
  }
  .keys-row {
    display: flex; align-items: center; gap: 12px;
    padding: 5px 0; font-size: 13.5px;
  }
  .keys-combo { display: flex; gap: 4px; flex-shrink: 0; min-width: 62px; }
  .keys-label { color: var(--c-text-sub); line-height: 1.4; }

  kbd {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 24px; height: 24px; padding: 0 7px;
    background: var(--c-bg-btn); border: 1px solid var(--c-bd-btn);
    border-bottom-width: 2px; border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px; font-weight: 700; color: var(--c-text-btn);
  }

  .btn-header-icon:disabled { opacity: 0.35; cursor: not-allowed; }
  .btn-header-icon:disabled:hover { background: transparent; border-color: transparent; }

  /* ── Clipboard fallback ── */
  .url-fallback {
    background: var(--c-bg-card);
    border: 1px solid var(--c-bd-card);
    border-radius: 12px; padding: 16px 20px;
  }
  .url-fallback label {
    display: block; margin-bottom: 8px;
    font-size: 12px; font-weight: 600; color: var(--c-text-sub);
  }
  .url-fallback input {
    width: 100%; padding: 9px 12px; border-radius: 8px;
    background: var(--c-bg-input); border: 1px solid var(--c-bd-input);
    color: var(--c-text-val); font-family: ui-monospace, monospace; font-size: 13px;
  }

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
