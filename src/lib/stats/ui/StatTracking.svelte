<script>
  /**
   * Live stat entry, folded into the football controller.
   *
   * Football only, because the stat engine is: its categories, actions and
   * drives are all American football. The rest of the scoreboard's sports carry
   * on untouched.
   *
   * Deliberately has no team branding of its own. Standalone, the stats project
   * needed a whole setup screen for the team name, colours and logo; here the
   * scoreboard already owns those, so they are derived instead — one place to
   * change them, and no way for the scorebug and a stats overlay to disagree.
   */
  import { onDestroy } from 'svelte';
  import { scoreboard } from '../../store.js';
  import { stats } from '../../statsStore.js';
  import { withGameContext, teamConfigFrom } from '../gameContext.js';
  import { parseRosterText } from '../rosterParser.ts';
  import { getActionMeta } from '../eventTypes.ts';
  import StatEntryPanel from './StatEntryPanel.svelte';
  import RecentEvents from './RecentEvents.svelte';

  let open = $state(false);
  let category = $state('rushing');
  let primaryId = $state('');
  let secondaryId = $state('');
  let yards = $state(0);

  let rosterText = $state('');
  let rosterError = $state('');
  let showRosterImport = $state(false);

  /** The last delete, so it can be put back where it came from. */
  let lastDeleted = $state(null);
  let undoTimer;

  let game = $state(stats.get());
  let board = $state({});
  const unsubs = [
    stats.subscribe((s) => (game = s)),
    scoreboard.subscribe((s) => (board = s)),
  ];
  onDestroy(() => { unsubs.forEach((u) => u()); clearTimeout(undoTimer); });

  // Keep the stats team following the scoreboard's home side.
  $effect(() => {
    const next = teamConfigFrom(board, game.team);
    const current = game.team ?? {};
    const changed = Object.keys(next).some((k) => next[k] !== current[k]);
    if (changed) stats.setTeam(next);
  });

  const CATEGORIES = [
    { id: 'passing', label: 'Passing' },
    { id: 'rushing', label: 'Rushing' },
    { id: 'defence', label: 'Defence' },
  ];

  function record(action) {
    const meta = getActionMeta(action);
    if (!primaryId) return;

    const resolvedYards = yards !== 0 ? yards : (meta?.defaultYards ?? 0);

    stats.addEvent(withGameContext({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      category,
      action,
      primaryPlayerId: primaryId,
      secondaryPlayerId: meta?.requiresReceiver ? secondaryId || undefined : undefined,
      yards: meta?.requiresYards ? resolvedYards : undefined,
    }, board));

    // Keep the players selected — the same passer usually throws again — but
    // clear the yardage, which is different every play.
    yards = 0;
  }

  function handleDelete(event, index) {
    lastDeleted = { event, index };
    stats.removeEvent(event.id);
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => (lastDeleted = null), 10000);
  }

  function undoDelete() {
    if (!lastDeleted) return;
    stats.restoreEvent(lastDeleted.event, lastDeleted.index);
    lastDeleted = null;
  }

  function importRoster() {
    rosterError = '';
    try {
      const players = parseRosterText(rosterText);
      if (players.length === 0) {
        rosterError = 'No players found. Check there is a name column.';
        return;
      }
      stats.setRoster(players);
      rosterText = '';
      showRosterImport = false;
    } catch (err) {
      rosterError = err.message || 'Could not read that roster.';
    }
  }

  async function importFile(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    rosterText = await file.text();
    importRoster();
  }
</script>

<div class="card">
  <button onclick={() => (open = !open)} class="w-full flex items-center justify-between cursor-pointer">
    <span class="section-label">Stat Tracking</span>
    <div class="flex items-center gap-3 text-xs" style="color:var(--c-text-mute)">
      <span>{game.roster?.length ?? 0} players</span>
      <span style="color:var(--c-sep)">·</span>
      <span>{game.events?.length ?? 0} events</span>
      <span class="text-lg ml-2" style="color:var(--c-text-mute)">{open ? '▲' : '▼'}</span>
    </div>
  </button>

  {#if open}
    <div class="st-body">
      {#if !game.roster?.length}
        <!-- Nothing can be recorded without players, so lead with that. -->
        <div class="st-empty">
          <p class="st-empty-title">Import a roster to start tracking</p>
          <p class="st-empty-note">
            A CSV file, or paste straight from a spreadsheet. Recognised columns are
            name, number and position — anything else is ignored.
          </p>
        </div>
      {/if}

      {#if game.roster?.length && !showRosterImport}
        <div class="st-roster-row">
          <span>{game.roster.length} players loaded</span>
          <button onclick={() => (showRosterImport = true)} class="st-btn">Replace roster</button>
        </div>
      {/if}

      {#if !game.roster?.length || showRosterImport}
        <div class="st-import">
          <div class="st-import-actions">
            <label class="st-btn">
              Upload CSV
              <input type="file" accept=".csv,.tsv,.txt,text/*" onchange={importFile} hidden />
            </label>
            {#if showRosterImport}
              <button onclick={() => { showRosterImport = false; rosterError = ''; }} class="st-btn st-btn-quiet">Cancel</button>
            {/if}
          </div>
          <textarea
            bind:value={rosterText}
            placeholder={"player_name,number,position\nJack Smith,12,QB\nMarcus Brown,24,RB"}
            rows="4"
            class="st-textarea"
          ></textarea>
          <button onclick={importRoster} disabled={!rosterText.trim()} class="st-btn st-btn-primary">
            Import roster
          </button>
          {#if rosterError}<p class="st-error">{rosterError}</p>{/if}
        </div>
      {/if}

      {#if game.roster?.length}
        <div class="st-tabs">
          {#each CATEGORIES as c}
            <button
              class="st-tab"
              class:st-tab-on={category === c.id}
              onclick={() => (category = c.id)}
            >{c.label}</button>
          {/each}
        </div>

        <StatEntryPanel
          {category}
          roster={game.roster}
          bind:primaryId
          bind:secondaryId
          bind:yards
          onAction={record}
        />

        {#if lastDeleted}
          <div class="st-undo">
            <span>Entry deleted.</span>
            <button onclick={undoDelete} class="st-btn">Put it back</button>
          </div>
        {/if}

        <RecentEvents
          events={game.events}
          roster={game.roster}
          onUndo={() => stats.undoLastEvent()}
          onDelete={handleDelete}
          onEdit={() => {}}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .st-body { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--c-bd-card); display: flex; flex-direction: column; gap: 16px; }

  .st-empty { background: var(--c-bg-input); border: 1px solid var(--c-bd-input); border-radius: 12px; padding: 16px 18px; }
  .st-empty-title { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: var(--c-text); }
  .st-empty-note { margin: 0; font-size: 13px; line-height: 1.6; color: var(--c-text-mute); }

  .st-roster-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--c-text-sub); }

  .st-import { display: flex; flex-direction: column; gap: 10px; }
  .st-import-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .st-textarea {
    width: 100%; padding: 10px 12px; border-radius: 10px;
    background: var(--c-bg-input); border: 1px solid var(--c-bd-input);
    color: var(--c-text-val); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.5px; line-height: 1.5; resize: vertical;
  }
  .st-error { margin: 0; font-size: 12.5px; color: #fca5a5; }

  .st-btn {
    padding: 7px 14px; border-radius: 9px; white-space: nowrap;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    border: 1px solid var(--c-bd-btn);
    font-size: 12.5px; font-weight: 600; cursor: pointer;
    transition: background 0.15s ease;
  }
  .st-btn:hover:not(:disabled) { background: var(--c-bg-btn-h); }
  .st-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .st-btn-primary { background: #2563eb; border-color: #1d4ed8; color: #fff; align-self: flex-start; }
  .st-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
  .st-btn-quiet { background: transparent; }

  .st-tabs { display: flex; gap: 6px; }
  .st-tab {
    flex: 1; padding: 9px 12px; border-radius: 9px;
    background: var(--c-bg-input); border: 1px solid var(--c-bd-input);
    color: var(--c-text-sub); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
  }
  .st-tab-on { background: rgba(37, 99, 235, 0.16); border-color: #2563eb; color: var(--c-text); }

  .st-undo {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    background: rgba(217, 119, 6, 0.12); border: 1px solid rgba(217, 119, 6, 0.3);
    border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #fcd34d;
  }
</style>
