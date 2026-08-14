<script>
  import { scoreboard } from '../store.js';
  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // Same pKey/pGet as the controller
  function pKey(player, field) {
    const prefix = player === 'home' ? 'home' : player === 'away' ? 'away' : player === 'player3' ? 'player3' : 'player4';
    if (field === 'name')      return prefix + 'Name';
    if (field === 'primary')   return prefix + 'Primary';
    if (field === 'secondary') return prefix + 'Secondary';
    if (field === 'text')      return prefix + 'Text';
    return prefix + field[0].toUpperCase() + field.slice(1);
  }
  function pGet(player, field) { return state[pKey(player, field)]; }

  const players = $derived(
    state.mtgFormat === 'commander'
      ? ['home', 'away', 'player3', 'player4']
      : ['home', 'away']
  );

  function lifeColor(life) {
    if (life <= 0)  return '#dc2626';
    if (life <= 5)  return '#ef4444';
    if (life <= 10) return '#f97316';
    return null;
  }

  function dayNightIcon(dn) {
    if (dn === 'day')   return '☀';
    if (dn === 'night') return '☾';
    return null;
  }
</script>

<div class="overlay-root">
  {#if state.mtgFormat === 'commander'}
    <!-- ── Commander: 2×2 grid ── -->
    <div class="cmdr-grid">
      {#each players as player (player)}
        {@const life    = pGet(player, 'life')}
        {@const poison  = pGet(player, 'poison')}
        {@const cmdr    = pGet(player, 'commanderDamage')}
        {@const cards   = pGet(player, 'cards') ?? 7}
        {@const isActive   = state.activePlayer === player}
        {@const isMonarch  = state.monarch    === player}
        {@const isInitiative = state.initiative === player}

        <div class="cmdr-panel {isActive ? 'is-active' : ''}"
             style="background: linear-gradient(135deg, {pGet(player,'primary') || '#1f2937'}, {pGet(player,'secondary') || '#111827'});">  
          <!-- Top row: name + status icons -->
          <div class="panel-header">
            <span class="panel-name">{pGet(player,'name')}</span>
            <div class="panel-icons">
              {#if isMonarch}    <span class="status-icon gold" title="Monarch">♛</span> {/if}
              {#if isInitiative} <span class="status-icon cyan" title="Initiative">💡</span> {/if}
              {#if isActive}     <span class="active-dot"></span> {/if}
            </div>
          </div>
          <!-- Life -->
          <div class="panel-life" style="color: {lifeColor(life) ?? '#ffffff'}">{life}</div>
          <!-- Counters row -->
          <div class="panel-badges">
            {#if poison > 0}
              <span class="badge poison">☠ {poison}</span>
            {/if}
            {#if cmdr >= 21}
              <span class="badge lethal">⚔ {cmdr}!</span>
            {:else if cmdr > 0}
              <span class="badge cmdr">⚔ {cmdr}</span>
            {/if}
            {#if life <= 0}
              <span class="badge dead">✕</span>
            {/if}
            <!-- Cards in hand pips -->
            <div class="hand-pips">
              {#each { length: Math.min(cards, 7) } as _}
                <div class="hand-pip"></div>
              {/each}
              {#if cards > 7}
                <span class="hand-overflow">+{cards - 7}</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

  {:else}
    <!-- ── Standard: horizontal strip ── -->
    <div class="scorebug">
      {#each players as player, idx (player)}
        {@const life    = pGet(player, 'life')}
        {@const poison  = pGet(player, 'poison')}
        {@const cards   = pGet(player, 'cards') ?? 7}
        {@const isActive    = state.activePlayer === player}
        {@const isMonarch   = state.monarch    === player}
        {@const isInitiative = state.initiative === player}

        <div class="std-panel"
             style="background: linear-gradient(135deg, {pGet(player,'primary') || '#1f2937'}, {pGet(player,'secondary') || '#111827'});">  
          <div class="std-header">
            <span class="std-name">{pGet(player,'name')}</span>
            <div class="panel-icons">
              {#if isMonarch}    <span class="status-icon gold">♛</span> {/if}
              {#if isInitiative} <span class="status-icon cyan">💡</span> {/if}
              {#if isActive}     <span class="active-dot"></span> {/if}
            </div>
          </div>
          <div class="std-life" style="color: {lifeColor(life) ?? '#ffffff'}">{life}</div>
          <div class="std-badges">
            {#if poison > 0}
              <span class="badge poison">☠ {poison}</span>
            {/if}
            {#if life <= 0}
              <span class="badge dead">DEAD</span>
            {/if}
            <div class="hand-pips">
              {#each { length: Math.min(cards, 7) } as _}
                <div class="hand-pip"></div>
              {/each}
              {#if cards > 7}
                <span class="hand-overflow">+{cards - 7}</span>
              {/if}
            </div>
          </div>
        </div>
        <!-- Centre divider between the two players -->
        {#if idx === 0}
          <div class="std-center">
            <div class="std-vs">⚔️</div>
            <div class="std-turn">T{state.turnNumber}</div>
            {#if state.stormCount > 0}
              <div class="std-storm">⚡{state.stormCount}</div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Bottom info strip -->
  <div class="info-strip">
    <span class="strip-item">Turn {state.turnNumber}</span>
    <span class="strip-sep"></span>
    <span class="strip-item active-name">{pGet(state.activePlayer ?? 'home', 'name')}'s turn</span>
    {#if state.stormCount > 0}
      <span class="strip-sep"></span>
      <span class="strip-item storm">⚡ {state.stormCount}</span>
    {/if}
    {#if state.monarch}
      <span class="strip-sep"></span>
      <span class="strip-item gold">♛ {pGet(state.monarch, 'name')}</span>
    {/if}
    {#if state.initiative}
      <span class="strip-sep"></span>
      <span class="strip-item cyan">💡 {pGet(state.initiative, 'name')}</span>
    {/if}
    {#if dayNightIcon(state.dayNight)}
      <span class="strip-sep"></span>
      <span class="strip-item">{dayNightIcon(state.dayNight)} {state.dayNight}</span>
    {/if}
  </div>
</div>

<style>
  .overlay-root {
    /* Anchoring and scale now live on the stage wrapper (see Overlay.svelte),
       so the scorebug and any sponsor panel move and scale as one unit. */
    position: relative;
    /* Inherited by every digit in the bug, so a clock counting down never
       shifts width as the numerals change. */
    font-variant-numeric: tabular-nums;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    font-family: 'Inter Variable', 'Segoe UI', system-ui, -apple-system, sans-serif;
    pointer-events: none; z-index: 9999;
  }

  /* ── Commander 2×2 grid ── */
  .cmdr-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
    width: 460px;
  }
  .cmdr-panel {
    position: relative; border-radius: 8px; padding: 10px 14px;
    overflow: hidden; min-height: 90px;
    background: #111827;
    border: 1px solid rgba(255,255,255,0.15);
  }
  .cmdr-panel.is-active { border-color: rgba(251,191,36,0.6); box-shadow: 0 0 0 1px rgba(251,191,36,0.25); }
  .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
  .panel-name { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.75); }
  .panel-life { font-size: 40px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
  .panel-badges { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
  .panel-icons { display: flex; align-items: center; gap: 4px; }

  /* ── Standard horizontal ── */
  .scorebug {
    display: flex; align-items: stretch; border-radius: 10px; overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  }
  .std-panel { min-width: 190px; padding: 12px 18px; background: #111827; }
  .std-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
  .std-name { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.8); }
  .std-life { font-size: 48px; font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
  .std-badges { display: flex; gap: 4px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
  .std-center {
    background: #0a0a0a; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 8px 16px; gap: 3px;
  }
  .std-vs { font-size: 18px; }
  .std-turn { font-size: 11px; font-weight: 700; color: #9ca3af; }
  .std-storm { font-size: 12px; font-weight: 800; color: #c084fc; }

  /* Status icons (monarch crown / initiative bulb) */
  .status-icon { font-size: 12px; line-height: 1; }
  .status-icon.gold { color: #fde047; }
  .status-icon.cyan { color: #67e8f9; }

  /* Active dot */
  .active-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    background: #fbbf24; box-shadow: 0 0 5px #fbbf24;
  }

  /* Badges */
  .badge { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; line-height: 1.4; }
  .badge.poison { background: rgba(6,78,59,0.75); color: #6ee7b7; }
  .badge.cmdr   { background: rgba(124,45,18,0.75); color: #fdba74; }
  .badge.lethal { background: rgba(127,29,29,0.85); color: #fca5a5; }
  .badge.dead   { background: rgba(127,29,29,0.85); color: #fca5a5; animation: pulse 1s ease-in-out infinite; }

  /* Cards in hand pips */
  .hand-pips { display: flex; gap: 2px; align-items: flex-end; }
  .hand-pip { width: 5px; height: 8px; border-radius: 1px; background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.15); }
  .hand-overflow { font-size: 9px; font-weight: 700; color: #fbbf24; }

  /* Bottom info strip */
  .info-strip {
    display: flex; align-items: center; gap: 8px;
    background: rgba(10,10,10,0.88); padding: 5px 16px;
    border-radius: 0 0 8px 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .strip-sep { width: 1px; height: 12px; background: #374151; }
  .strip-item { font-size: 11px; font-weight: 700; color: #9ca3af; }
  .strip-item.active-name { color: #fbbf24; }
  .strip-item.storm       { color: #c084fc; }
  .strip-item.gold        { color: #fde047; }
  .strip-item.cyan        { color: #67e8f9; }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
</style>

