<script>
  import { scoreboard } from './store.js';
  import { fileToBadge, validateBadgeUrl, byteLength, formatBytes } from './logo.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  let open = $state(false);

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

  let { homeLabel = 'Home Team', awayLabel = 'Away Team' } = $props();

  // ── Saved teams ─────────────────────────────────────────
  // A club streaming a season re-typed the same name and six colour values
  // every week, and any inconsistency showed up on air. Saved teams are kept
  // on the device rather than the account: no schema change, and the operator
  // is nearly always on the same machine.
  const TEAMS_KEY = 'scoreboard-teams-v1';

  let savedTeams = $state(loadTeams());

  function loadTeams() {
    try {
      const raw = JSON.parse(localStorage.getItem(TEAMS_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (_) {
      return [];
    }
  }

  function persistTeams() {
    try {
      localStorage.setItem(TEAMS_KEY, JSON.stringify(savedTeams));
    } catch (_) {
      // Storage unavailable — saving is a convenience, never a hard dependency.
    }
  }

  /** Capture one side's current name and colours as a reusable team. */
  function saveTeam(side) {
    const name = (state[`${side}Name`] || '').trim();
    if (!name) return;

    const team = {
      name,
      primary: state[`${side}Primary`],
      secondary: state[`${side}Secondary`],
      text: state[`${side}Text`],
      logo: state[`${side}Logo`] || '',
    };

    // Saving the same name again updates it rather than making a duplicate.
    const existing = savedTeams.findIndex((t) => t.name.toLowerCase() === name.toLowerCase());
    savedTeams = existing >= 0
      ? savedTeams.map((t, i) => (i === existing ? team : t))
      : [...savedTeams, team];

    persistTeams();
  }

  /** Apply a saved team to one side. */
  function applyTeam(side, team) {
    scoreboard.patch({
      [`${side}Name`]: team.name,
      [`${side}Primary`]: team.primary,
      [`${side}Secondary`]: team.secondary,
      [`${side}Text`]: team.text,
      [`${side}Logo`]: team.logo || '',
    });
  }

  // ── Team badges ─────────────────────────────────────────
  let badgeError = $state({ home: '', away: '' });
  let badgeUrlDraft = $state({ home: '', away: '' });

  async function pickBadge(side, event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = ''; // let the same file be chosen again
    if (!file) return;

    badgeError = { ...badgeError, [side]: '' };
    try {
      const badge = await fileToBadge(file);
      scoreboard.patch({ [`${side}Logo`]: badge });
    } catch (err) {
      badgeError = { ...badgeError, [side]: err.message };
    }
  }

  function applyBadgeUrl(side) {
    badgeError = { ...badgeError, [side]: '' };
    try {
      const url = validateBadgeUrl(badgeUrlDraft[side]);
      scoreboard.patch({ [`${side}Logo`]: url });
      badgeUrlDraft = { ...badgeUrlDraft, [side]: '' };
    } catch (err) {
      badgeError = { ...badgeError, [side]: err.message };
    }
  }

  function clearBadge(side) {
    badgeError = { ...badgeError, [side]: '' };
    scoreboard.patch({ [`${side}Logo`]: '' });
  }

  /** What this badge costs on every broadcast, when it is embedded. */
  function badgeCost(value) {
    if (!value?.startsWith('data:')) return null;
    return formatBytes(byteLength(value));
  }

  function forgetTeam(name) {
    savedTeams = savedTeams.filter((t) => t.name !== name);
    persistTeams();
  }
</script>

<div class="card">
  <button onclick={() => open = !open}
          class="w-full flex items-center justify-between cursor-pointer">
    <span class="section-label">Team Setup &amp; Colors</span>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5">
        <div class="w-4 h-4 rounded-full border border-gray-700" style="background:{state.homePrimary}"></div>
        <div class="w-4 h-4 rounded-full border border-gray-700" style="background:{state.homeSecondary}"></div>
        <span class="text-xs text-gray-600 mx-2">{state.homeName}</span>
      </div>
      <div class="w-px h-4 bg-gray-800"></div>
      <div class="flex items-center gap-1.5">
        <span class="text-xs text-gray-600 mx-2">{state.awayName}</span>
        <div class="w-4 h-4 rounded-full border border-gray-700" style="background:{state.awayPrimary}"></div>
        <div class="w-4 h-4 rounded-full border border-gray-700" style="background:{state.awaySecondary}"></div>
      </div>
      <span class="text-gray-500 text-lg ml-3">{open ? '▲' : '▼'}</span>
    </div>
  </button>

  {#if open}
    <!-- Saved teams -->
    <div class="saved-teams">
      <div class="saved-head">
        <span class="saved-title">Saved teams</span>
        <div class="saved-save">
          <button onclick={() => saveTeam('home')} class="saved-btn">Save {state.homeName || 'home'}</button>
          <button onclick={() => saveTeam('away')} class="saved-btn">Save {state.awayName || 'away'}</button>
        </div>
      </div>

      {#if savedTeams.length === 0}
        <p class="saved-empty">
          Save a team to reuse its name and colours next time — no retyping at the start of every game.
        </p>
      {:else}
        <div class="saved-list">
          {#each savedTeams as team (team.name)}
            <div class="saved-chip">
              <span class="saved-swatch" style="background:{team.primary}"></span>
              <span class="saved-swatch" style="background:{team.secondary}"></span>
              <span class="saved-name">{team.name}</span>
              <button onclick={() => applyTeam('home', team)} class="saved-apply" title="Use as home team">Home</button>
              <button onclick={() => applyTeam('away', team)} class="saved-apply" title="Use as away team">Away</button>
              <button onclick={() => forgetTeam(team.name)} class="saved-remove" title="Forget {team.name}">×</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-10 pt-6 border-t border-gray-800">

      <!-- Home -->
      <div>
        <div class="flex items-center justify-between mb-5">
          <span class="text-sm font-bold" style="color:var(--c-text)">{homeLabel}</span>
          <div class="flex gap-2">
            <div class="w-5 h-5 rounded-full border border-gray-600" style="background:{state.homePrimary}"></div>
            <div class="w-5 h-5 rounded-full border border-gray-600" style="background:{state.homeSecondary}"></div>
          </div>
        </div>

        <div class="mb-5">
          <label class="section-label block mb-2">Name / Abbreviation
            <input type="text" bind:value={state.homeName}
                   oninput={() => scoreboard.patch({ homeName: state.homeName })}
                   class="mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 font-bold text-lg focus:border-amber-400 outline-none"
                   style="color:var(--c-text-val)" maxlength="12" placeholder="HOME" />
          </label>
        </div>

        <!-- Badge -->
        <div class="mb-5">
          <span class="section-label block mb-2">Badge</span>
          <div class="badge-row">
            <div class="badge-preview">
              {#if state.homeLogo}
                <img src={state.homeLogo} alt="Home badge" />
              {:else}
                <span class="badge-empty">None</span>
              {/if}
            </div>
            <div class="badge-actions">
              <label class="badge-btn">
                Upload
                <input type="file" accept="image/*" onchange={(e) => pickBadge('home', e)} hidden />
              </label>
              {#if state.homeLogo}
                <button onclick={() => clearBadge('home')} class="badge-btn badge-btn-quiet">Remove</button>
              {/if}
              {#if badgeCost(state.homeLogo)}
                <span class="badge-size">{badgeCost(state.homeLogo)} embedded</span>
              {/if}
            </div>
          </div>
          <div class="badge-url">
            <input type="url" placeholder="…or paste an https image URL"
                   bind:value={badgeUrlDraft.home}
                   onkeydown={(e) => e.key === 'Enter' && applyBadgeUrl('home')} />
            <button onclick={() => applyBadgeUrl('home')} class="badge-btn">Link</button>
          </div>
          {#if badgeError.home}
            <p class="badge-error">{badgeError.home}</p>
          {/if}
        </div>

        <div class="mb-5">
          <div class="flex items-center justify-between mb-3">
            <span class="section-label">Primary Color</span>
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

        <div class="mb-5">
          <div class="flex items-center justify-between mb-3">
            <span class="section-label">Secondary Color</span>
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

        <div>
          <span class="section-label block mb-3">Text Color</span>
          <div class="flex gap-2">
            <button onclick={() => scoreboard.patch({ homeText: '#FFFFFF' })}
                    class="px-5 py-2.5 rounded-lg bg-white text-black text-xs font-bold {state.homeText === '#FFFFFF' ? 'ring-2 ring-amber-400' : ''}">White</button>
            <button onclick={() => scoreboard.patch({ homeText: '#000000' })}
                    class="px-5 py-2.5 rounded-lg bg-black text-white text-xs font-bold border border-gray-600 {state.homeText === '#000000' ? 'ring-2 ring-amber-400' : ''}">Black</button>
          </div>
        </div>
      </div>

      <!-- Away -->
      <div>
        <div class="flex items-center justify-between mb-5">
          <span class="text-sm font-bold" style="color:var(--c-text)">{awayLabel}</span>
          <div class="flex gap-2">
            <div class="w-5 h-5 rounded-full border border-gray-600" style="background:{state.awayPrimary}"></div>
            <div class="w-5 h-5 rounded-full border border-gray-600" style="background:{state.awaySecondary}"></div>
          </div>
        </div>

        <div class="mb-5">
          <label class="section-label block mb-2">Name / Abbreviation
            <input type="text" bind:value={state.awayName}
                   oninput={() => scoreboard.patch({ awayName: state.awayName })}
                   class="mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 font-bold text-lg focus:border-amber-400 outline-none"
                   style="color:var(--c-text-val)" maxlength="12" placeholder="AWAY" />
          </label>
        </div>

        <!-- Badge -->
        <div class="mb-5">
          <span class="section-label block mb-2">Badge</span>
          <div class="badge-row">
            <div class="badge-preview">
              {#if state.awayLogo}
                <img src={state.awayLogo} alt="Away badge" />
              {:else}
                <span class="badge-empty">None</span>
              {/if}
            </div>
            <div class="badge-actions">
              <label class="badge-btn">
                Upload
                <input type="file" accept="image/*" onchange={(e) => pickBadge('away', e)} hidden />
              </label>
              {#if state.awayLogo}
                <button onclick={() => clearBadge('away')} class="badge-btn badge-btn-quiet">Remove</button>
              {/if}
              {#if badgeCost(state.awayLogo)}
                <span class="badge-size">{badgeCost(state.awayLogo)} embedded</span>
              {/if}
            </div>
          </div>
          <div class="badge-url">
            <input type="url" placeholder="…or paste an https image URL"
                   bind:value={badgeUrlDraft.away}
                   onkeydown={(e) => e.key === 'Enter' && applyBadgeUrl('away')} />
            <button onclick={() => applyBadgeUrl('away')} class="badge-btn">Link</button>
          </div>
          {#if badgeError.away}
            <p class="badge-error">{badgeError.away}</p>
          {/if}
        </div>

        <div class="mb-5">
          <div class="flex items-center justify-between mb-3">
            <span class="section-label">Primary Color</span>
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

        <div class="mb-5">
          <div class="flex items-center justify-between mb-3">
            <span class="section-label">Secondary Color</span>
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

        <div>
          <span class="section-label block mb-3">Text Color</span>
          <div class="flex gap-2">
            <button onclick={() => scoreboard.patch({ awayText: '#FFFFFF' })}
                    class="px-5 py-2.5 rounded-lg bg-white text-black text-xs font-bold {state.awayText === '#FFFFFF' ? 'ring-2 ring-amber-400' : ''}">White</button>
            <button onclick={() => scoreboard.patch({ awayText: '#000000' })}
                    class="px-5 py-2.5 rounded-lg bg-black text-white text-xs font-bold border border-gray-600 {state.awayText === '#000000' ? 'ring-2 ring-amber-400' : ''}">Black</button>
          </div>
        </div>
      </div>

    </div>
  {/if}
</div>

<style>
  /* ── Team badges ── */
  .badge-row { display: flex; align-items: center; gap: 12px; }
  .badge-preview {
    width: 52px; height: 52px; flex-shrink: 0;
    border-radius: 10px; border: 1px solid var(--c-bd-input, #374151);
    background: var(--c-bg-input, #111827);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .badge-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .badge-empty {
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--c-text-mute, #6b7280);
  }
  .badge-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .badge-btn {
    padding: 6px 13px; border-radius: 8px;
    background: var(--c-bg-btn, #1f2937); color: var(--c-text-btn, #e5e7eb);
    border: 1px solid var(--c-bd-btn, #374151);
    font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;
    transition: background 0.15s ease;
  }
  .badge-btn:hover { background: var(--c-bg-btn-h, #374151); }
  .badge-btn-quiet { background: transparent; }
  .badge-size {
    font-size: 11px; color: var(--c-text-mute, #6b7280);
    font-variant-numeric: tabular-nums;
  }
  .badge-url { display: flex; gap: 8px; margin-top: 10px; }
  .badge-url input {
    flex: 1; min-width: 0;
    padding: 7px 11px; border-radius: 8px;
    background: var(--c-bg-input, #111827);
    border: 1px solid var(--c-bd-input, #374151);
    color: var(--c-text-val, #f9fafb); font-size: 12px;
  }
  .badge-error {
    margin: 8px 0 0; font-size: 12px; line-height: 1.5;
    color: #fca5a5;
  }

  /* ── Saved teams ── */
  .saved-teams {
    margin-top: 22px; padding-top: 20px;
    border-top: 1px solid var(--c-bd-card, #1f2937);
  }
  .saved-head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
  }
  .saved-title {
    font-size: 11px; font-weight: 800; letter-spacing: 0.13em;
    text-transform: uppercase; color: var(--c-text-mute, #6b7280);
  }
  .saved-save { display: flex; gap: 8px; flex-wrap: wrap; }
  .saved-btn {
    padding: 6px 12px; border-radius: 8px;
    background: var(--c-bg-btn, #1f2937); color: var(--c-text-btn, #e5e7eb);
    border: 1px solid var(--c-bd-btn, #374151);
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s ease;
    max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .saved-btn:hover { background: var(--c-bg-btn-h, #374151); }

  .saved-empty {
    font-size: 12.5px; color: var(--c-text-mute, #6b7280);
    line-height: 1.6; margin: 0;
  }

  .saved-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .saved-chip {
    display: flex; align-items: center; gap: 7px;
    padding: 6px 8px 6px 10px; border-radius: 10px;
    background: var(--c-bg-input, #111827);
    border: 1px solid var(--c-bd-input, #374151);
  }
  .saved-swatch {
    width: 12px; height: 12px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;
  }
  .saved-name {
    font-size: 12.5px; font-weight: 700; color: var(--c-text-val, #f9fafb);
    margin-right: 3px; max-width: 140px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .saved-apply {
    padding: 3px 9px; border-radius: 6px;
    background: transparent; border: 1px solid var(--c-bd-btn, #374151);
    color: var(--c-text-sub, #9ca3af);
    font-size: 11px; font-weight: 600; cursor: pointer;
    transition: all 0.15s ease;
  }
  .saved-apply:hover { background: #2563eb; border-color: #2563eb; color: #fff; }
  .saved-remove {
    background: transparent; border: none; cursor: pointer;
    color: var(--c-text-mute, #6b7280); font-size: 16px; line-height: 1;
    padding: 0 3px; transition: color 0.15s ease;
  }
  .saved-remove:hover { color: #ef4444; }

  .card {
    background: var(--c-bg-card);
    border: 1px solid var(--c-bd-card);
    border-radius: 16px;
    padding: 28px;
  }
  .card-header {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 24px;
  }
  .section-label {
    font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--c-text-mute);
  }
  .color-input {
    width: 32px; height: 32px; border-radius: 8px;
    cursor: pointer; border: 1px solid var(--c-bd-btn);
    padding: 0; transition: border-color 0.15s ease;
  }
  .color-input:hover { border-color: var(--c-text-mute); }
  .color-grid {
    display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;
  }
  .color-swatch {
    width: 100%; aspect-ratio: 1; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    cursor: pointer; transition: all 0.15s ease;
  }
  .color-swatch:hover  { transform: scale(1.15); border-color: rgba(255,255,255,0.35); }
  .color-swatch:active { transform: scale(0.95); }
</style>
