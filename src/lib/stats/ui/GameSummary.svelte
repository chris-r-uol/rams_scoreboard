<script>
  /**
   * The match totals, and the way stats leave the app.
   *
   * Standalone, this was a separate `/summary` route. Here it folds into the
   * controller: an operator finishing a game is already on this page, and a
   * second route would mean a second thing to find, on a second URL, after the
   * stream has ended.
   *
   * Exports are built from the live store rather than from anything saved, so
   * what comes out is exactly what is on screen.
   */
  import { onDestroy } from 'svelte';
  import { stats } from '../../statsStore.js';
  import { exportXLSX, exportCSV } from '../exportStats.ts';
  import TeamTotals from './TeamTotals.svelte';

  let open = $state(false);
  let game = $state(stats.get());
  const unsub = stats.subscribe((s) => (game = s));
  onDestroy(unsub);

  const CSV_SHEETS = [
    { id: 'team', label: 'Team CSV' },
    { id: 'players', label: 'Players CSV' },
    { id: 'events', label: 'Event log CSV' },
  ];

  const hasData = $derived((game.events?.length ?? 0) > 0);

  /**
   * A failed export must say so. It writes a file to the operator's disk, and
   * a button that silently does nothing is indistinguishable from a browser
   * that blocked the download.
   */
  let problem = $state('');

  function run(fn) {
    problem = '';
    try {
      fn();
    } catch (err) {
      problem = err?.message || 'Could not build that file.';
    }
  }
</script>

<div class="card">
  <button onclick={() => (open = !open)} class="w-full flex items-center justify-between cursor-pointer">
    <span class="section-label">Game Summary &amp; Export</span>
    <div class="flex items-center gap-3 text-xs" style="color:var(--c-text-mute)">
      <span>{game.teamStats?.totalOffensiveYards ?? 0} yds</span>
      <span style="color:var(--c-sep)">·</span>
      <span>{game.teamStats?.totalTouchdowns ?? 0} TD</span>
      <span class="text-lg ml-2" style="color:var(--c-text-mute)">{open ? '▲' : '▼'}</span>
    </div>
  </button>

  {#if open}
    <div class="gs-body">
      {#if !hasData}
        <p class="gs-empty">Nothing recorded yet — totals and exports appear once plays are entered.</p>
      {:else}
        <TeamTotals stats={game.teamStats} />

        <div class="gs-export">
          <p class="gs-label">Export</p>
          <div class="gs-buttons">
            <button onclick={() => run(() => exportXLSX(game))} class="gs-btn gs-btn-primary">
              Excel workbook
            </button>
            {#each CSV_SHEETS as sheet}
              <button onclick={() => run(() => exportCSV(game, sheet.id))} class="gs-btn">{sheet.label}</button>
            {/each}
          </div>
          <p class="gs-note">
            The workbook holds all three tables. The CSVs are the same data one table at a time,
            for anything that would rather have a plain file.
          </p>
          {#if problem}<p class="gs-error">{problem}</p>{/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .gs-body { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--c-bd-card); display: flex; flex-direction: column; gap: 18px; }
  .gs-empty { margin: 0; font-size: 13px; line-height: 1.6; color: var(--c-text-mute); }

  .gs-export { display: flex; flex-direction: column; gap: 10px; }
  .gs-label { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-text-mute); }
  .gs-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .gs-note { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--c-text-mute); }
  .gs-error { margin: 0; font-size: 12.5px; color: #fca5a5; }

  .gs-btn {
    padding: 8px 14px; border-radius: 9px; white-space: nowrap;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    border: 1px solid var(--c-bd-btn);
    font-size: 12.5px; font-weight: 600; cursor: pointer;
    transition: background 0.15s ease;
  }
  .gs-btn:hover { background: var(--c-bg-btn-h); }
  .gs-btn-primary { background: #2563eb; border-color: #1d4ed8; color: #fff; }
  .gs-btn-primary:hover { background: #1d4ed8; }
</style>
