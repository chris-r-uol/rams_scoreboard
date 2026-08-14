<script>
  import { onDestroy } from 'svelte';
  import { scoreboard, stopAllIntervals } from './store.js';
  import { user, plan, sportAllowedOn } from './auth.js';
  import {
    leaveRoom, joinControlChannel, leaveControlChannel, sendControlState, sendCommand,
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

  /**
   * `followerToken` set means this is a co-controller: a second device showing
   * the full controller for someone else's game. It renders the same UI but
   * owns none of the state — every change is forwarded to the host, so there
   * is still one source of truth and nothing to reconcile.
   */
  let { followerToken = null } = $props();
  const isFollower = !!followerToken;

  let state = $state({});
  scoreboard.subscribe((s) => { state = s; });

  let unsubUser = () => {};
  let unsubPlan = () => {};

  // null until the subscription resolves — "not known yet", never "free".
  let currentPlan = $state(null);

  if (isFollower) {
    // ── Co-controller ─────────────────────────────────────
    // Mirrors the host and forwards every change to it. Deliberately does not
    // become the clock authority or persist anything: two devices each
    // deciding when a clock hits zero, or each saving its own copy, is exactly
    // the divergence this design exists to avoid.
    scoreboard.setFollowerTransport((msg) => sendCommand(msg));

    joinControlChannel(followerToken, {
      role: 'remote',
      onState: (incoming, sentAt) => scoreboard.applyHostState(incoming, sentAt),
    });
  } else {
    // ── Host ──────────────────────────────────────────────
    // Drives the clocks and owns the saved copy of the game.
    scoreboard.becomeController();

    // Recover an in-progress game before going on air. Without this, a refresh
    // or crash mid-match resets to defaults and pushes those defaults out to
    // the overlay, blanking the scoreboard live.
    scoreboard.restorePersisted();

    // Host the Realtime room so the OBS overlay can subscribe. The room id is
    // the account id, so the OBS URL never changes between streams.
    unsubUser = user.subscribe((u) => {
      if (u?.id) scoreboard.connectRealtime(u.id, 'host');
    });

    unsubPlan = plan.subscribe((p) => (currentPlan = p));

    // Accept changes from paired devices. Phone remotes send named action ids,
    // resolved against this sport's own list. Co-controllers send patches and a
    // small set of named calls. Nothing else is honoured, so a paired device
    // cannot write arbitrary fields it was never offered.
    joinControlChannel(getRemoteToken(), {
      role: 'host',
      onCommand: (msg = {}) => {
        const current = scoreboard.get();

        if (msg.kind === 'patch' && msg.patch && typeof msg.patch === 'object') {
          scoreboard.patch(msg.patch);
        } else if (msg.kind === 'call') {
          const ALLOWED = ['undo', 'reset', 'resetSport', 'setSport'];
          if (ALLOWED.includes(msg.method)) {
            scoreboard[msg.method](...(Array.isArray(msg.args) ? msg.args : []));
          }
        } else if (msg.id && current.sport) {
          runCommand(current.sport, msg.id);
        }

        sendControlState(scoreboard.get());
      },
      onRemoteJoined: () => sendControlState(scoreboard.get()),
    });
  }

  // Host only: publish the plan into broadcast state, since the Overlay runs
  // unauthenticated inside OBS and cannot look it up. A co-controller has no
  // session of its own and must never assert a plan — it inherits the host's.
  //
  // Written as a reactive correction rather than a one-shot, because incoming
  // state can overwrite the field afterwards. `currentPlan` stays null until
  // the subscription resolves, and null means wait: assuming free before the
  // answer arrives wiped a Pro user's sport on every reload.
  $effect(() => {
    if (isFollower || !currentPlan) return;

    if (state.plan !== currentPlan) {
      scoreboard.patch({ plan: currentPlan });
    }

    if (state.sport && !sportAllowedOn(currentPlan, state.sport)) {
      stopAllIntervals();
      scoreboard.patch({ sport: null });
    }
  });

  // Host: mirror state to paired devices. Clock movement is applied silently on
  // every client, so this fires on real changes rather than once a second.
  $effect(() => {
    if (!isFollower) sendControlState(state);
  });

  onDestroy(() => {
    unsubUser();
    unsubPlan();
    if (isFollower) scoreboard.setFollowerTransport(null);
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
