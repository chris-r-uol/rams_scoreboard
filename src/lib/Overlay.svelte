<svelte:head>
  <style>
    html, body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
  </style>
</svelte:head>

<script>
  import { onDestroy } from 'svelte';
  import { scoreboard } from './store.js';
  import { stats } from './statsStore.js';
  import { getRoomFromUrl } from './room.js';
  import { leaveRoom } from './realtime.js';
  import {
    overlayAnchorStyle, DEFAULT_OVERLAY_POSITION, DEFAULT_OVERLAY_SCALE,
    DEFAULT_STATS_PLACEMENT,
  } from './overlayLayout.js';
  import { sponsorVisible, currentSponsor } from './sponsors.js';
  import FootballOverlay from './sports/FootballOverlay.svelte';
  import SoccerOverlay from './sports/SoccerOverlay.svelte';
  import IceHockeyOverlay from './sports/IceHockeyOverlay.svelte';
  import BasketballOverlay from './sports/BasketballOverlay.svelte';
  import BaseballOverlay from './sports/BaseballOverlay.svelte';
  import CricketOverlay from './sports/CricketOverlay.svelte';
  import MtgOverlay from './sports/MtgOverlay.svelte';
  import StatsPanelOverlay from './stats/ui/StatsOverlay.svelte';
  import FeaturedPlayerOverlay from './stats/ui/FeaturedPlayerOverlay.svelte';
  import LeaderboardOverlay from './stats/ui/LeaderboardOverlay.svelte';
  import Last5PlaysOverlay from './stats/ui/Last5PlaysOverlay.svelte';
  import RunPassChartOverlay from './stats/ui/RunPassChartOverlay.svelte';
  import DriveSummaryOverlay from './stats/ui/DriveSummaryOverlay.svelte';
  import AlertOverlay from './stats/ui/AlertOverlay.svelte';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // Stats arrive on their own Realtime event, wired up by connectRealtime.
  //
  // Declared a viewer explicitly rather than relying on never having been a
  // controller: the store is module scope, and hash-routing here from the
  // controller does not reload the page.
  stats.becomeViewer();
  let game = $state(stats.get());
  stats.subscribe((s) => { game = s; });

  // Connect to the Controller's room. Without a room id the overlay can only
  // receive BroadcastChannel messages, which never cross into OBS.
  //
  // Tracked reactively rather than read once: changing the hash does not
  // remount this component, so a captured value would go stale whenever the
  // URL is edited in place.
  let room = $state(getRoomFromUrl());

  $effect(() => {
    const onHashChange = () => { room = getRoomFromUrl(); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  $effect(() => {
    if (room) scoreboard.connectRealtime(room, 'viewer');
  });

  onDestroy(() => leaveRoom());

  // Anchor and scale are applied to the stage, so the scorebug and any sponsor
  // move and scale together as one unit.
  // Sponsor rotation is derived from elapsed time, so this ticks the clock
  // forward locally rather than waiting for a broadcast that never comes.
  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => { now = Date.now(); }, 500);
    return () => clearInterval(id);
  });

  const showSponsor = $derived(sponsorVisible(state));
  const sponsor = $derived(showSponsor ? currentSponsor(state, now) : null);

  const anchorStyle = $derived(
    overlayAnchorStyle(
      state.overlayPosition ?? DEFAULT_OVERLAY_POSITION,
      state.overlayScale ?? DEFAULT_OVERLAY_SCALE,
    ),
  );

  // ── Stat panels ──────────────────────────────────────────
  // Football only: every category the stat engine knows is American football.
  // Stacked with the scorebug rather than anchored on their own — see
  // statsPlacement in store.js.
  const statsPlacement = $derived(state.statsPlacement ?? DEFAULT_STATS_PLACEMENT);

  const statsOn = $derived(state.sport === 'american-football');

  // An alert pre-empts whatever panel is up: it is a ten-second interruption
  // for a milestone or a big play, and two cards stacked in the same corner is
  // worse than briefly losing the panel underneath.
  const activeAlert = $derived(
    statsOn ? (game.alertQueue ?? []).find((a) => a.expiresAt > now) ?? null : null,
  );

  const statsMode = $derived(activeAlert ? 'alert' : (statsOn ? game.overlayMode ?? 'hidden' : 'hidden'));
</script>

{#if !room}
  <div style="position:fixed;bottom:48px;left:50%;transform:translateX(-50%);
              background:rgba(127,29,29,0.9);color:#fecaca;padding:10px 22px;
              border-radius:8px;font-family:sans-serif;font-size:13px;font-weight:600;
              text-align:center;line-height:1.5;">
    No scoreboard linked to this overlay.<br />
    Copy the overlay URL from the controller — it must include <code>?r=…</code>
  </div>
{:else if !state.sport}
  <div style="position:fixed;bottom:48px;left:50%;transform:translateX(-50%);
              background:rgba(0,0,0,0.7);color:#9ca3af;padding:8px 20px;
              border-radius:8px;font-family:sans-serif;font-size:13px;font-weight:600;">
    Waiting for sport selection…
  </div>
{:else}
<!--
  One anchored stack: stat panel, scorebug, sponsor. Everything moves and scales
  together, and because they are siblings in a flex column rather than separately
  positioned layers, a panel physically cannot land on top of the score.
-->
<div class="stage" style={anchorStyle} data-stats={statsPlacement}>

{#if statsMode !== 'hidden'}
  <div class="stats-panel">
    {#if activeAlert}
      <AlertOverlay alert={activeAlert} team={game.team} {now} />
    {:else if statsMode === 'team_stats'}
      <StatsPanelOverlay state={game} />
    {:else if statsMode === 'featured_player'}
      <FeaturedPlayerOverlay state={game} />
    {:else if statsMode === 'leaderboard'}
      <LeaderboardOverlay state={game} />
    {:else if statsMode === 'last_5_plays'}
      <Last5PlaysOverlay state={game} />
    {:else if statsMode === 'run_pass_chart'}
      <RunPassChartOverlay state={game} />
    {:else if statsMode === 'drive_summary'}
      <DriveSummaryOverlay state={game} />
    {/if}
  </div>
{/if}

<div class="bug-group" data-placement={state.sponsorPlacement ?? 'below'}>
<div class="bug">
{#if state.sport === 'american-football'}
  <FootballOverlay />
{:else if state.sport === 'soccer'}
  <SoccerOverlay />
{:else if state.sport === 'ice-hockey'}
  <IceHockeyOverlay />
{:else if state.sport === 'basketball'}
  <BasketballOverlay />
{:else if state.sport === 'baseball'}
  <BaseballOverlay />
{:else if state.sport === 'cricket'}
  <CricketOverlay />
{:else if state.sport === 'mtg'}
  <MtgOverlay />
{/if}
</div>

{#if sponsor}
  <img class="sponsor" src={sponsor.image} alt={sponsor.name}
       onerror={(e) => (e.currentTarget.style.display = 'none')} />
{/if}

</div>
</div>

<!--
  Free-tier watermark. Deliberately small and low-contrast: it should be a
  visible reason to upgrade without making the free tier unusable on a real
  stream, because a free tier nobody can broadcast with converts nobody.

  The plan travels in the broadcast state, so it is client-controlled and could
  be edited out by a determined user. Enforcing it properly needs the value
  signed server-side; that is a deliberate trade for now.
-->
{#if state.plan === 'free'}
  <div class="watermark">Stream Your Score</div>
{/if}
{/if}

<style>
  /* The anchored unit: stat panel, scorebug and any sponsor, moved and scaled
     together so nothing drifts apart at other scales. */
  .stage {
    position: fixed;
    inset: var(--sb-inset, auto auto 48px 50%);
    transform: var(--sb-translate, translateX(-50%)) scale(var(--sb-scale, 1));
    transform-origin: var(--sb-origin, bottom center);
    display: flex;
    flex-direction: column;
    /* Line the stack up with the edge it is anchored to: a top-left bug and the
       panel above it share a left edge rather than being centred on each other. */
    align-items: var(--sb-align, center);
    gap: 10px;
    pointer-events: none;
    z-index: 9999;
  }
  /* "Below" reverses the column, so the panel renders after the bug. The stack
     still grows away from the anchored edge, so neither can leave the canvas. */
  .stage[data-stats="below"] { flex-direction: column-reverse; }

  /* The scorebug and its sponsor, which has its own placement around the bug. */
  .bug-group { display: flex; align-items: center; gap: 10px; }
  .bug-group[data-placement="below"] { flex-direction: column; }
  .bug-group[data-placement="above"] { flex-direction: column-reverse; }
  .bug-group[data-placement="right"] { flex-direction: row; }
  .bug-group[data-placement="left"]  { flex-direction: row-reverse; }

  .bug { display: flex; }

  .stats-panel { display: flex; }

  .sponsor {
    display: block;
    max-height: 64px;
    max-width: 260px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
  }

  .watermark {
    position: fixed;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.62);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
    pointer-events: none;
    white-space: nowrap;
  }
</style>
