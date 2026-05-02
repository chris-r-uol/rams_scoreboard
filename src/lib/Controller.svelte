<script>
  import { scoreboard } from './store.js';
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
