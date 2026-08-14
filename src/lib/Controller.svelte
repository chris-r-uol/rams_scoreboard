<script>
  import { onDestroy } from 'svelte';
  import { scoreboard, stopAllIntervals } from './store.js';
  import { user, plan, sportAllowedOn } from './auth.js';
  import {
    leaveRoom, joinControlChannel, leaveControlChannel, sendControlState,
  } from './realtime.js';
  import { getRemoteToken } from './room.js';
  import { runCommand } from './shortcuts.js';
  import SportPicker from './SportPicker.svelte';
  import FootballController from './sports/FootballController.svelte';
  import SoccerController from './sports/SoccerController.svelte';
  import IceHockeyController from './sports/IceHockeyController.svelte';
  import BasketballController from './sports/BasketballController.svelte';
  import BaseballController from './sports/BaseballController.svelte';
  import CricketController from './sports/CricketController.svelte';
  import MtgController from './sports/MtgController.svelte';

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  // This client drives the clocks and owns the saved copy of the game.
  scoreboard.becomeController();

  // Recover an in-progress game before going on air. Without this, a refresh
  // or crash mid-match resets to defaults and pushes those defaults out to the
  // overlay, blanking the scoreboard live.
  scoreboard.restorePersisted();

  // Host the Realtime room for this account so the OBS overlay can subscribe.
  // The room id is the account id, so the OBS URL never changes between streams.
  const unsubUser = user.subscribe((u) => {
    if (u?.id) scoreboard.connectRealtime(u.id, 'host');
  });

  let currentPlan = $state(null);
  const unsubPlan = plan.subscribe((p) => (currentPlan = p));

  // Publish the plan into the broadcast state. The Overlay runs unauthenticated
  // inside OBS and cannot look this up, so it learns whether to draw the
  // free-tier watermark from here.
  //
  // Written as a reactive correction rather than a one-shot on plan change,
  // because incoming state can overwrite the field after it is set — the dev
  // relay replays cached state to every new connection, restored games carry
  // whatever plan was saved with them. Anything that reintroduces a stale plan
  // is corrected on the next tick instead of silently persisting.
  //
  // This also enforces the free tier's single sport, so a lapsed subscription
  // or a game restored after downgrading cannot leave a Pro sport running.
  $effect(() => {
    if (!currentPlan) return;

    if (state.plan !== currentPlan) {
      scoreboard.patch({ plan: currentPlan });
    }

    if (state.sport && !sportAllowedOn(currentPlan, state.sport)) {
      stopAllIntervals();
      scoreboard.patch({ sport: null });
    }
  });

  // ── Phone remote ────────────────────────────────────────
  // Commands arrive as action ids and are resolved against this sport's own
  // list, so a paired phone can only trigger things the controller already
  // offers rather than writing arbitrary state.
  joinControlChannel(getRemoteToken(), {
    role: 'host',
    onCommand: ({ id } = {}) => {
      const current = scoreboard.get();
      if (!current.sport || !id) return;
      if (runCommand(current.sport, id)) sendControlState(scoreboard.get());
    },
    onRemoteJoined: () => sendControlState(scoreboard.get()),
  });

  // Mirror state to any paired phone. Clock movement is applied silently on
  // every client, so this only fires on real changes — not once a second.
  $effect(() => {
    sendControlState(state);
  });

  onDestroy(() => {
    unsubUser();
    unsubPlan();
    leaveRoom();
    leaveControlChannel();
  });
</script>

{#if state.sport === null || state.sport === undefined}
  <SportPicker />
{:else if state.sport === 'american-football'}
  <FootballController />
{:else if state.sport === 'soccer'}
  <SoccerController />
{:else if state.sport === 'ice-hockey'}
  <IceHockeyController />
{:else if state.sport === 'basketball'}
  <BasketballController />
{:else if state.sport === 'baseball'}
  <BaseballController />
{:else if state.sport === 'cricket'}
  <CricketController />
{:else if state.sport === 'mtg'}
  <MtgController />
{:else}
  <SportPicker />
{/if}
