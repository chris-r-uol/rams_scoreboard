<script>
  import ControllerShell from '../ControllerShell.svelte';
  import { scoreboard } from '../store.js';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // ── Player helpers ────────────────────────────────────
  // Each player key: 'home' | 'away' | 'player3' | 'player4'
  function pKey(player, field) {
    if (player === 'home')    return field === 'name' ? 'homeName'    : field === 'primary' ? 'homePrimary'    : field === 'secondary' ? 'homeSecondary' : field === 'text' ? 'homeText'    : 'home'    + field[0].toUpperCase() + field.slice(1);
    if (player === 'away')    return field === 'name' ? 'awayName'    : field === 'primary' ? 'awayPrimary'    : field === 'secondary' ? 'awaySecondary' : field === 'text' ? 'awayText'    : 'away'    + field[0].toUpperCase() + field.slice(1);
    if (player === 'player3') return field === 'name' ? 'player3Name' : field === 'primary' ? 'player3Primary' : field === 'secondary' ? 'player3Secondary' : field === 'text' ? 'player3Text' : 'player3' + field[0].toUpperCase() + field.slice(1);
    if (player === 'player4') return field === 'name' ? 'player4Name' : field === 'primary' ? 'player4Primary' : field === 'secondary' ? 'player4Secondary' : field === 'text' ? 'player4Text' : 'player4' + field[0].toUpperCase() + field.slice(1);
    return field;
  }

  function pGet(player, field) { return state[pKey(player, field)]; }

  function playerList() {
    return state.mtgFormat === 'commander'
      ? ['home', 'away', 'player3', 'player4']
      : ['home', 'away'];
  }

  // ── Life ──────────────────────────────────────────────
  function adjustLife(player, delta) {
    scoreboard.update((s) => ({ ...s, [pKey(player, 'life')]: s[pKey(player, 'life')] + delta }));
  }
  function setLife(player, value) {
    scoreboard.patch({ [pKey(player, 'life')]: value });
  }

  // ── Poison ────────────────────────────────────────────
  function adjustPoison(player, delta) {
    const key = pKey(player, 'poison');
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }

  // ── Commander damage ──────────────────────────────────
  function adjustCmdr(player, delta) {
    const key = pKey(player, 'commanderDamage');
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }

  // ── Cards in hand ─────────────────────────────────────
  function adjustCards(player, delta) {
    const key = pKey(player, 'cards');
    scoreboard.update((s) => ({ ...s, [key]: Math.max(0, s[key] + delta) }));
  }
  function cardsDisplay(n) {
    if (n === undefined || n === null) return '7';
    return n > 7 ? '>7' : String(n);
  }

  // ── Turn ──────────────────────────────────────────────
  function nextTurn() {
    scoreboard.update((s) => {
      const order = s.mtgFormat === 'commander'
        ? ['home', 'away', 'player3', 'player4']
        : ['home', 'away'];
      const idx = order.indexOf(s.activePlayer);
      const nextIdx = (idx + 1) % order.length;
      return {
        ...s,
        activePlayer: order[nextIdx],
        turnNumber: nextIdx === 0 ? s.turnNumber + 1 : s.turnNumber,
        stormCount: 0,
      };
    });
  }

  function adjustStorm(delta) {
    scoreboard.patch({ stormCount: Math.max(0, state.stormCount + delta) });
  }

  // ── Monarch / Initiative ──────────────────────────────
  function setMonarch(player) {
    scoreboard.patch({ monarch: state.monarch === player ? null : player });
  }
  function setInitiative(player) {
    scoreboard.patch({ initiative: state.initiative === player ? null : player });
  }

  // ── Day / Night ───────────────────────────────────────
  const DAY_NIGHT_ORDER = ['neither', 'day', 'night'];
  function cycleDayNight() {
    const idx = DAY_NIGHT_ORDER.indexOf(state.dayNight ?? 'neither');
    scoreboard.patch({ dayNight: DAY_NIGHT_ORDER[(idx + 1) % 3] });
  }
  function dayNightIcon(dn) {
    if (dn === 'day')   return '☀';
    if (dn === 'night') return '☾';
    return '○';
  }
  function dayNightLabel(dn) {
    if (dn === 'day')   return 'Day';
    if (dn === 'night') return 'Night';
    return 'Neither';
  }

  // ── Format ────────────────────────────────────────────
  function setFormat(fmt) {
    const life = fmt === 'commander' ? 40 : 20;
    scoreboard.patch({
      mtgFormat: fmt,
      homeLife: life, awayLife: life,
      homePoison: 0, awayPoison: 0,
      homeCommanderDamage: 0, awayCommanderDamage: 0,
      player3Life: 40, player3Poison: 0, player3CommanderDamage: 0,
      player4Life: 40, player4Poison: 0, player4CommanderDamage: 0,
      turnNumber: 1, activePlayer: 'home', stormCount: 0,
      dayNight: 'neither', monarch: null, initiative: null,
    });
  }

  // ── Reset ──────────────────────────────────────────────
  function handleReset() {
    scoreboard.resetSport('mtg');
  }

  function lifeColor(life) {
    if (life <= 0)  return '#dc2626';
    if (life <= 5)  return '#ef4444';
    if (life <= 10) return '#f97316';
    return null;
  }

  // Player name label (short display)
  const PLAYER_LABEL = { home: 'P1', away: 'P2', player3: 'P3', player4: 'P4' };
</script>

<ControllerShell sportLabel="Magic: The Gathering" sportEmoji="🃏" onReset={handleReset}>

  <!-- ══════════════════════════════════════════════════════
       FORMAT + DAY/NIGHT
  ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <span class="section-label">Format</span>
        {#each [{ id: 'standard', label: 'Standard (2 players · 20 life)' }, { id: 'commander', label: 'Commander (4 players · 40 life)' }] as fmt}
          <button onclick={() => setFormat(fmt.id)}
                  class="px-5 py-2.5 rounded-lg text-sm font-bold border transition-all
                         {state.mtgFormat === fmt.id ? 'bg-rose-900/40 text-rose-400 border-rose-700' : 'btn-secondary'}">
            {fmt.label}
          </button>
        {/each}
      </div>

      <!-- Day / Night -->
      <button onclick={cycleDayNight}
              class="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                     {state.dayNight === 'day'   ? 'bg-amber-900/40 border-amber-600 text-amber-300'
                    : state.dayNight === 'night' ? 'bg-indigo-900/40 border-indigo-600 text-indigo-300'
                    : 'btn-secondary text-gray-400'}"
              title="Cycle Day/Night — click to advance">
        <span class="text-xl leading-none">{dayNightIcon(state.dayNight)}</span>
        <span class="text-xs font-bold uppercase tracking-wider">{dayNightLabel(state.dayNight)}</span>
      </button>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       PLAYER PANELS
  ═══════════════════════════════════════════════════════ -->
  <div class="grid {state.mtgFormat === 'commander' ? 'grid-cols-2' : 'grid-cols-2'} gap-6">
    {#each playerList() as player (player)}
      {@const life = pGet(player, 'life')}
      {@const poison = pGet(player, 'poison')}
      {@const cmdrDmg = pGet(player, 'commanderDamage')}
      {@const cards = pGet(player, 'cards') ?? 7}
      {@const isActive = state.activePlayer === player}

      <div class="card {isActive ? 'active-player-card' : ''}"
           style="border-top: 4px solid {pGet(player, 'primary')};">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="section-label">{pGet(player, 'name')}</span>
            {#if isActive}
              <span class="active-badge">Active</span>
            {/if}
            <!-- Monarch toggle -->
            <button onclick={() => setMonarch(player)}
                    class="icon-toggle {state.monarch === player ? 'icon-active-gold' : ''}"
                    title="Monarch — click to grant/remove">♛</button>
            <!-- Initiative toggle -->
            <button onclick={() => setInitiative(player)}
                    class="icon-toggle {state.initiative === player ? 'icon-active-cyan' : ''}"
                    title="Initiative — click to grant/remove">💡</button>
          </div>
          <!-- Cards in hand -->
          <div class="cards-in-hand">
            <span class="cards-label">Hand</span>
            <div class="cards-pips">
              {#each { length: Math.min(cards, 7) } as _, i}
                <div class="card-pip"></div>
              {/each}
              {#if cards > 7}
                <span class="cards-overflow">+{cards - 7}</span>
              {/if}
            </div>
            <div class="flex items-center gap-1 ml-2">
              <button onclick={() => adjustCards(player, -1)} class="btn-tiny">−</button>
              <span class="cards-count {cards > 7 ? 'text-amber-400' : ''}">{cardsDisplay(cards)}</span>
              <button onclick={() => adjustCards(player, 1)} class="btn-tiny">+</button>
            </div>
          </div>
        </div>

        <!-- Life total -->
        <div class="text-center mb-5">
          <div class="text-[72px] font-black tabular-nums leading-none"
               style="color: {lifeColor(life) ?? 'var(--c-text-val)'}">
            {life}
          </div>
          {#if life <= 0}
            <div class="text-red-400 font-black text-sm animate-pulse mt-1">ELIMINATED</div>
          {/if}
        </div>

        <!-- Life buttons -->
        <div class="grid grid-cols-4 gap-2 mb-2">
          {#each [-10, -5, -2, -1] as d}
            <button onclick={() => adjustLife(player, d)} class="btn-life-neg">{d}</button>
          {/each}
        </div>
        <div class="grid grid-cols-4 gap-2 mb-4">
          {#each [1, 2, 5, 10] as d}
            <button onclick={() => adjustLife(player, d)} class="btn-life-pos">+{d}</button>
          {/each}
        </div>
        <div class="flex gap-2 justify-center mb-5">
          <button onclick={() => setLife(player, state.mtgFormat === 'commander' ? 40 : 20)}
                  class="btn-sm">Reset to {state.mtgFormat === 'commander' ? 40 : 20}</button>
          <input type="number" value={life}
                 oninput={(e) => setLife(player, parseInt(e.target.value) || 0)}
                 class="life-input" style="color:var(--c-text-val)" />
        </div>

        <!-- Poison counters -->
        <div class="counter-row bg-green-950/30 border border-green-900/40">
          <div class="flex items-center gap-2">
            <span class="text-green-400 text-sm">☠</span>
            <span class="counter-label">Poison</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick={() => adjustPoison(player, -1)} class="btn-round-sm">−</button>
            <span class="text-lg font-black {poison >= 10 ? 'text-red-400' : 'text-green-400'} w-5 text-center tabular-nums">{poison}</span>
            <button onclick={() => adjustPoison(player, 1)} class="btn-round-sm">+</button>
          </div>
        </div>
        <div class="pip-track mt-1 mb-3">
          {#each { length: 10 } as _, i}
            <div class="poison-pip {i < poison ? 'active-pip' : ''}"></div>
          {/each}
        </div>

        <!-- Commander damage (commander only) -->
        {#if state.mtgFormat === 'commander'}
          <div class="counter-row bg-orange-950/30 border border-orange-900/40">
            <div class="flex items-center gap-2">
              <span class="text-orange-400 text-sm">⚔</span>
              <span class="counter-label">Cmdr Dmg</span>
              {#if cmdrDmg >= 21}
                <span class="text-red-400 text-xs font-bold">LETHAL</span>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <button onclick={() => adjustCmdr(player, -1)} class="btn-round-sm">−</button>
              <span class="text-lg font-black {cmdrDmg >= 21 ? 'text-red-400' : 'text-orange-400'} w-6 text-center tabular-nums">{cmdrDmg}</span>
              <button onclick={() => adjustCmdr(player, 1)} class="btn-round-sm">+</button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- ══════════════════════════════════════════════════════
       TURN TRACKER + STORM COUNT
  ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <div class="grid grid-cols-3 gap-8">

      <!-- Turn number -->
      <div class="text-center">
        <div class="section-label text-[10px] mb-3">Turn Number</div>
        <div class="flex items-center justify-center gap-4">
          <button onclick={() => scoreboard.patch({ turnNumber: Math.max(1, state.turnNumber - 1) })} class="btn-round">−</button>
          <span class="text-5xl font-black val-primary tabular-nums">{state.turnNumber}</span>
          <button onclick={() => scoreboard.patch({ turnNumber: state.turnNumber + 1 })} class="btn-round">+</button>
        </div>
      </div>

      <!-- Active player + End Turn -->
      <div class="text-center">
        <div class="section-label text-[10px] mb-3">Active Player</div>
        <div class="text-xl font-black val-primary mb-4 truncate px-2">
          {pGet(state.activePlayer ?? 'home', 'name')}
        </div>
        <!-- Quick pick -->
        <div class="flex gap-2 justify-center flex-wrap mb-3">
          {#each playerList() as pl}
            <button onclick={() => scoreboard.patch({ activePlayer: pl })}
                    class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                           {state.activePlayer === pl ? 'bg-rose-900/40 text-rose-400 border-rose-700' : 'btn-secondary'}">
              {PLAYER_LABEL[pl]}
            </button>
          {/each}
        </div>
        <button onclick={nextTurn}
                class="w-full py-2.5 rounded-xl text-sm font-bold bg-rose-700 hover:bg-rose-600 text-white transition-colors">
          End Turn →
        </button>
      </div>

      <!-- Storm count -->
      <div class="text-center">
        <div class="section-label text-[10px] mb-3">Storm Count</div>
        <div class="flex items-center justify-center gap-4">
          <button onclick={() => adjustStorm(-1)} class="btn-round">−</button>
          <span class="text-5xl font-black text-purple-400 tabular-nums">{state.stormCount}</span>
          <button onclick={() => adjustStorm(1)} class="btn-round">+</button>
        </div>
        <p class="text-[11px] text-gray-600 mt-2">Auto-resets on End Turn</p>
      </div>

    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════
       PLAYER NAMES & COLOURS (collapsible)
  ═══════════════════════════════════════════════════════ -->
  <div class="card">
    <button onclick={() => document.getElementById('mtg-names').classList.toggle('hidden')}
            class="w-full flex items-center justify-between cursor-pointer">
      <span class="section-label">Player Names &amp; Colors</span>
      <span class="text-gray-500 text-xs">click to expand ▼</span>
    </button>
    <div id="mtg-names" class="hidden mt-6 pt-6 border-t border-gray-800">
      <div class="grid {state.mtgFormat === 'commander' ? 'grid-cols-4' : 'grid-cols-2'} gap-6">
        {#each playerList() as player}
          <div>
            <label class="section-label block mb-1">{PLAYER_LABEL[player]} Name</label>
            <input type="text" value={pGet(player, 'name')}
                   oninput={(e) => scoreboard.patch({ [pKey(player, 'name')]: e.target.value })}
                   class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 font-bold focus:border-rose-500 outline-none text-sm mb-3"
                   style="color:var(--c-text-val)" maxlength="12" />
            <label class="section-label block mb-1">Color</label>
            <input type="color" value={pGet(player, 'primary')}
                   onchange={(e) => scoreboard.patch({ [pKey(player, 'primary')]: e.target.value })}
                   class="w-10 h-10 rounded-lg cursor-pointer border border-gray-700" />
          </div>
        {/each}
      </div>
    </div>
  </div>

</ControllerShell>

<style>
  .card {
    background: var(--c-bg-card); border: 1px solid var(--c-bd-card);
    border-radius: 16px; padding: 24px; transition: border-color 0.2s ease;
  }
  .active-player-card { border-color: rgba(225, 29, 72, 0.45) !important; }
  .active-badge {
    font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
    background: rgba(159,18,57,0.4); color: #fda4af; border: 1px solid rgba(225,29,72,0.5);
  }
  .icon-toggle {
    font-size: 13px; line-height: 1; padding: 2px 5px; border-radius: 6px;
    background: transparent; border: 1px solid var(--c-bd-btn);
    color: var(--c-text-mute); cursor: pointer; transition: all 0.15s ease;
  }
  .icon-toggle:hover { background: var(--c-bg-btn-h); }
  .icon-active-gold { background: rgba(120,93,0,0.4) !important; border-color: #ca8a04 !important; color: #fde047 !important; }
  .icon-active-cyan { background: rgba(8,76,92,0.4) !important; border-color: #0891b2 !important; color: #67e8f9 !important; }
  .section-label {
    font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em; color: var(--c-text-mute);
  }
  .val-primary { color: var(--c-text-val); }

  /* Cards in hand */
  .cards-in-hand { display: flex; align-items: center; gap: 6px; }
  .cards-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--c-text-mute); }
  .cards-pips { display: flex; gap: 2px; align-items: flex-end; }
  .card-pip {
    width: 7px; height: 10px; border-radius: 2px;
    background: var(--c-text-mute); opacity: 0.6;
    border: 1px solid rgba(255,255,255,0.2);
  }
  .cards-overflow { font-size: 9px; font-weight: 700; color: #fbbf24; }
  .cards-count { font-size: 13px; font-weight: 800; color: var(--c-text-val); min-width: 18px; text-align: center; }
  .btn-tiny {
    width: 20px; height: 20px; border-radius: 5px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 13px; font-weight: 700; border: 1px solid var(--c-bd-btn);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; line-height: 1;
  }
  .btn-tiny:hover { background: var(--c-bg-btn-h); }

  /* Counter rows */
  .counter-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-radius: 10px; gap: 8px;
  }
  .counter-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--c-text-mute); }
  .pip-track { display: flex; gap: 3px; }
  .poison-pip { flex: 1; height: 4px; border-radius: 2px; background: var(--c-bd-card); }
  .active-pip { background: #22c55e; }

  /* Life buttons */
  .btn-life-neg {
    padding: 10px 0; border-radius: 10px; font-weight: 800; font-size: 13px;
    background: rgba(127,29,29,0.3); color: #fca5a5;
    border: 1px solid rgba(127,29,29,0.5); transition: all 0.15s ease; cursor: pointer;
  }
  .btn-life-neg:hover  { background: rgba(127,29,29,0.5); }
  .btn-life-neg:active { transform: scale(0.95); }
  .btn-life-pos {
    padding: 10px 0; border-radius: 10px; font-weight: 800; font-size: 13px;
    background: rgba(6,78,59,0.4); color: #6ee7b7;
    border: 1px solid rgba(6,78,59,0.6); transition: all 0.15s ease; cursor: pointer;
  }
  .btn-life-pos:hover  { background: rgba(6,78,59,0.6); }
  .btn-life-pos:active { transform: scale(0.95); }

  /* Life input */
  .life-input {
    width: 72px; text-align: center;
    background: var(--c-bg-btn); border: 1px solid var(--c-bd-btn);
    border-radius: 8px; font-size: 13px; font-weight: 800;
    padding: 6px 8px; outline: none;
  }
  .life-input:focus { border-color: #e11d48; }

  /* Generic buttons */
  .btn-secondary {
    padding: 8px 14px; border-radius: 8px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 12px; font-weight: 600; border: 1px solid var(--c-bd-btn);
    transition: all 0.15s ease; cursor: pointer;
  }
  .btn-secondary:hover  { background: var(--c-bg-btn-h); }
  .btn-secondary:active { transform: scale(0.96); }
  .btn-sm {
    padding: 7px 12px; border-radius: 8px;
    background: var(--c-bg-btn); color: var(--c-text-mute);
    font-size: 11px; font-weight: 600; border: 1px solid var(--c-bd-btn);
    transition: all 0.15s ease; cursor: pointer; white-space: nowrap;
  }
  .btn-sm:hover  { background: var(--c-bg-btn-h); }
  .btn-sm:active { transform: scale(0.96); }
  .btn-round {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 22px; font-weight: 700; border: 1px solid var(--c-bd-btn);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-round:hover  { background: var(--c-bg-btn-h); }
  .btn-round:active { transform: scale(0.93); }
  .btn-round-sm {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--c-bg-btn); color: var(--c-text-btn);
    font-size: 16px; font-weight: 700; border: 1px solid var(--c-bd-btn);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s ease;
  }
  .btn-round-sm:hover  { background: var(--c-bg-btn-h); }
  .btn-round-sm:active { transform: scale(0.93); }
</style>
