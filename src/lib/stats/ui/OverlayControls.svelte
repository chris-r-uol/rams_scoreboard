<script>
  /**
   * What the stat panels are showing, and where they sit.
   *
   * Modes are a single-select row rather than toggles: only one panel is ever
   * on air, and a set of independent switches would invite the operator to turn
   * two on and wonder why only one appeared.
   *
   * Position and scale live in scoreboard state alongside the scorebug's own
   * anchor, because that is what the overlay reads and it is a display setting
   * rather than part of the match record. Panels get their own anchor: a
   * leaderboard is a 380px card, not a strip beside the bug.
   */
  import { onDestroy } from 'svelte';
  import { scoreboard } from '../../store.js';
  import { stats } from '../../statsStore.js';
  import {
    OVERLAY_POSITIONS, positionLabel, clampScale,
    SCALE_MIN, SCALE_MAX,
  } from '../../overlayLayout.js';

  let game = $state(stats.get());
  let board = $state({});
  const unsubs = [
    stats.subscribe((s) => (game = s)),
    scoreboard.subscribe((s) => (board = s)),
  ];
  onDestroy(() => unsubs.forEach((u) => u()));

  const MODES = [
    { id: 'hidden', label: 'Off' },
    { id: 'team_stats', label: 'Team' },
    { id: 'featured_player', label: 'Player' },
    { id: 'leaderboard', label: 'Leaders' },
    { id: 'last_5_plays', label: 'Last 5' },
    { id: 'run_pass_chart', label: 'Run/Pass' },
    { id: 'drive_summary', label: 'Drive' },
  ];

  const LEADER_CATEGORIES = [
    { id: 'passing', label: 'Passing yds' },
    { id: 'rushing', label: 'Rushing yds' },
    { id: 'receiving', label: 'Receiving yds' },
    { id: 'tackles', label: 'Tackles' },
    { id: 'sacks', label: 'Sacks' },
    { id: 'touchdowns', label: 'Touchdowns' },
  ];

  const mode = $derived(game.overlayMode ?? 'hidden');
  const featuredId = $derived(game.selectedOverlayPlayers?.[0] ?? '');
  const position = $derived(board.statsOverlayPosition ?? 'bottom-left');
  const scale = $derived(board.statsOverlayScale ?? 1);

  // Alerts pre-empt whatever panel is up, so the operator needs a way to pull
  // one that fired on a mis-keyed play without deleting the play itself.
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 500);
    return () => clearInterval(id);
  });
  const alertOnAir = $derived((game.alertQueue ?? []).some((a) => a.expiresAt > now));

  /** Roster sorted for a picker: by number where there is one, then by name. */
  const sortedRoster = $derived(
    [...(game.roster ?? [])].sort((a, b) => {
      const na = Number(a.number), nb = Number(b.number);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return (a.playerName ?? '').localeCompare(b.playerName ?? '');
    }),
  );
</script>

<div class="oc">
  <div class="oc-head">
    <span class="oc-label">Overlay panel</span>
    {#if alertOnAir}
      <button class="oc-alert" onclick={() => stats.clearActiveAlert()}>Alert on air — clear</button>
    {/if}
  </div>

  <div class="oc-modes">
    {#each MODES as m}
      <button
        class="oc-mode"
        class:oc-mode-on={mode === m.id}
        class:oc-mode-off={m.id === 'hidden' && mode === 'hidden'}
        onclick={() => stats.setOverlayMode(m.id)}
      >{m.label}</button>
    {/each}
  </div>

  {#if mode === 'leaderboard'}
    <label class="oc-field">
      <span>Leaders by</span>
      <select
        value={game.leaderboardCategory ?? 'rushing'}
        onchange={(e) => stats.patch({ leaderboardCategory: e.currentTarget.value })}
      >
        {#each LEADER_CATEGORIES as c}<option value={c.id}>{c.label}</option>{/each}
      </select>
    </label>
  {/if}

  {#if mode === 'featured_player'}
    <label class="oc-field">
      <span>Player</span>
      <select
        value={featuredId}
        onchange={(e) => stats.patch({
          selectedOverlayPlayers: e.currentTarget.value ? [e.currentTarget.value] : [],
        })}
      >
        <option value="">Choose a player…</option>
        {#each sortedRoster as p}
          <option value={p.id}>{p.number ? `#${p.number} ` : ''}{p.playerName}</option>
        {/each}
      </select>
    </label>
    {#if !featuredId}
      <p class="oc-note">Nothing goes on air until a player is chosen.</p>
    {/if}
  {/if}

  {#if mode !== 'hidden'}
    <div class="oc-place">
      <label class="oc-field">
        <span>Position</span>
        <select
          value={position}
          onchange={(e) => scoreboard.patch({ statsOverlayPosition: e.currentTarget.value })}
        >
          {#each OVERLAY_POSITIONS as p}<option value={p}>{positionLabel(p)}</option>{/each}
        </select>
      </label>

      <label class="oc-field">
        <span>Size {Math.round(scale * 100)}%</span>
        <input
          type="range" min={SCALE_MIN} max={SCALE_MAX} step="0.05" value={scale}
          oninput={(e) => scoreboard.patch({ statsOverlayScale: clampScale(e.currentTarget.value) })}
        />
      </label>
    </div>
  {/if}
</div>

<style>
  .oc { display: flex; flex-direction: column; gap: 12px; }

  .oc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .oc-label {
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--c-text-mute);
  }
  .oc-alert {
    padding: 4px 10px; border-radius: 8px; cursor: pointer;
    background: rgba(217, 119, 6, 0.16); border: 1px solid rgba(217, 119, 6, 0.4);
    color: #fcd34d; font-size: 11.5px; font-weight: 600;
  }

  .oc-modes { display: flex; flex-wrap: wrap; gap: 6px; }
  .oc-mode {
    padding: 7px 12px; border-radius: 9px;
    background: var(--c-bg-input); border: 1px solid var(--c-bd-input);
    color: var(--c-text-sub); font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
  }
  .oc-mode:hover { background: var(--c-bg-btn-h); }
  .oc-mode-on { background: rgba(22, 163, 74, 0.18); border-color: #16a34a; color: var(--c-text); }
  /* "Off" selected is a neutral state, not a live one — green would read as
     "something is on air". */
  .oc-mode-off { background: var(--c-bg-btn); border-color: var(--c-bd-btn); color: var(--c-text-btn); }

  .oc-place { display: flex; gap: 12px; flex-wrap: wrap; }
  .oc-place .oc-field { flex: 1 1 160px; }

  .oc-field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--c-text-mute); }
  .oc-field select {
    padding: 8px 10px; border-radius: 9px;
    background: var(--c-bg-input); border: 1px solid var(--c-bd-input);
    color: var(--c-text-val); font-size: 13px; font-weight: 600;
  }
  .oc-field input[type='range'] { accent-color: #2563eb; }

  .oc-note { margin: 0; font-size: 12.5px; color: #fcd34d; }
</style>
