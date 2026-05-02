<script>
  import { scoreboard } from './store.js';

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
    <div class="mt-6 grid grid-cols-2 gap-10 pt-6 border-t border-gray-800">

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
