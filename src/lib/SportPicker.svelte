<script>
  import { scoreboard, stopAllIntervals } from './store.js';
  import { signOut } from './auth.js';

  const sports = [
    {
      id: 'american-football',
      emoji: '🏈',
      name: 'American Football',
      description: 'Quarters · Play clock · Down & distance · Timeouts · Possession · Flag',
      accent: '#FB4F14',
      bg: 'from-orange-950/60 to-gray-900',
    },
    {
      id: 'soccer',
      emoji: '⚽',
      name: 'Soccer',
      description: 'Match clock · Halves · Extra time · Yellow & red cards',
      accent: '#22c55e',
      bg: 'from-green-950/60 to-gray-900',
    },
    {
      id: 'ice-hockey',
      emoji: '🏒',
      name: 'Ice Hockey',
      description: 'Period clock · Periods · Power plays · Penalty timers · Timeouts',
      accent: '#60a5fa',
      bg: 'from-blue-950/60 to-gray-900',
    },
    {
      id: 'basketball',
      emoji: '🏀',
      name: 'Basketball',
      description: 'Game clock · Shot clock · Quarters · Fouls · Timeouts · Possession',
      accent: '#f97316',
      bg: 'from-orange-950/60 to-gray-900',
    },
    {
      id: 'baseball',
      emoji: '⚾',
      name: 'Baseball',
      description: 'Innings · Top/Bottom · Count (B·S·O) · Base runners · R/H/E',
      accent: '#fbbf24',
      bg: 'from-yellow-950/60 to-gray-900',
    },
    {
      id: 'cricket',
      emoji: '🏏',
      name: 'Cricket',
      description: 'Innings · Overs · Wickets · Run rate · Required rate · Target',
      accent: '#a78bfa',
      bg: 'from-violet-950/60 to-gray-900',
    },
    {
      id: 'mtg',
      emoji: '🃏',
      name: 'Magic: The Gathering',
      description: 'Life totals · Poison counters · Commander damage · Turn tracker · Storm count',
      accent: '#f43f5e',
      bg: 'from-rose-950/60 to-gray-900',
    },
  ];

  function selectSport(id) {
    stopAllIntervals();
    scoreboard.setSport(id);
  }

  async function handleSignOut() {
    await signOut();
    window.location.hash = '#/login';
  }
</script>

<div class="picker-root min-h-screen select-none">

  <!-- Header -->
  <header class="picker-header sticky top-0 z-50">
    <div class="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="leading-tight">
        <h1 class="text-xl font-bold tracking-tight text-white">Scoreboard</h1>
        <p class="text-[10px] uppercase tracking-[0.15em] text-gray-500 mt-0.5">Stream Your Score</p>
      </div>
      <button onclick={handleSignOut}
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent hover:border-gray-700 text-sm font-medium transition-all duration-150"
              title="Sign out">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign out
      </button>
    </div>
  </header>

  <!-- Hero -->
  <div class="max-w-screen-xl mx-auto px-6 pt-16 pb-12 text-center">
    <div class="inline-flex items-center gap-2 bg-gray-800/60 border border-gray-700/60 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
      Choose your sport
    </div>
    <h2 class="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
      Which sport are you<br/>streaming today?
    </h2>
    <p class="text-gray-500 text-lg max-w-lg mx-auto">
      Pick your sport to launch a tailored scoreboard controller with a matching OBS overlay.
    </p>
  </div>

  <!-- Sport Grid -->
  <div class="max-w-screen-xl mx-auto px-6 pb-20">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {#each sports as sport}
        <button
          onclick={() => selectSport(sport.id)}
          class="sport-card group text-left"
          style="--accent: {sport.accent};"
        >
          <div class="sport-card-inner bg-gradient-to-br {sport.bg}">
            <div class="sport-emoji">{sport.emoji}</div>
            <h3 class="sport-name">{sport.name}</h3>
            <p class="sport-desc">{sport.description}</p>
            <div class="sport-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Footer -->
  <footer class="border-t border-gray-800/60 py-6 text-center">
    <div class="flex items-center justify-center gap-5 text-[11px] text-gray-700 tracking-wide">
      <a href="#/privacy" class="hover:text-gray-400 transition-colors">Privacy Policy</a>
      <span class="text-gray-800">·</span>
      <a href="#/terms" class="hover:text-gray-400 transition-colors">Terms &amp; Conditions</a>
    </div>
  </footer>
</div>

<style>
  .picker-root {
    background: #030712;
    color: #f9fafb;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .picker-header {
    background: rgba(3, 7, 18, 0.88);
    border-bottom: 1px solid #1f2937;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .sport-card {
    display: block;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid #1f2937;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
  }
  .sport-card:hover {
    border-color: var(--accent);
    transform: translateY(-3px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--accent);
  }
  .sport-card:active { transform: translateY(-1px) scale(0.99); }

  .sport-card-inner {
    padding: 28px 26px 24px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sport-emoji {
    font-size: 42px;
    line-height: 1;
    margin-bottom: 4px;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
    transition: transform 0.2s ease;
  }
  .sport-card:hover .sport-emoji { transform: scale(1.1); }

  .sport-name {
    font-size: 17px;
    font-weight: 800;
    color: #f9fafb;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .sport-desc {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.6;
    flex: 1;
    font-weight: 500;
  }

  .sport-arrow {
    color: var(--accent);
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    align-self: flex-end;
  }
  .sport-card:hover .sport-arrow {
    opacity: 1;
    transform: translateX(4px);
  }
</style>
