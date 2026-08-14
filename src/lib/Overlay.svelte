<svelte:head>
  <style>
    html, body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
  </style>
</svelte:head>

<script>
  import { onDestroy } from 'svelte';
  import { scoreboard } from './store.js';
  import { getRoomFromUrl } from './room.js';
  import { leaveRoom } from './realtime.js';
  import FootballOverlay from './sports/FootballOverlay.svelte';
  import SoccerOverlay from './sports/SoccerOverlay.svelte';
  import IceHockeyOverlay from './sports/IceHockeyOverlay.svelte';
  import BasketballOverlay from './sports/BasketballOverlay.svelte';
  import BaseballOverlay from './sports/BaseballOverlay.svelte';
  import CricketOverlay from './sports/CricketOverlay.svelte';
  import MtgOverlay from './sports/MtgOverlay.svelte';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

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
{:else if state.sport === 'american-football'}
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
