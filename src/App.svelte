<script>
  import Controller from './lib/Controller.svelte';
  import Overlay from './lib/Overlay.svelte';

  let route = $state(window.location.hash || '#/');

  function handleHashChange() {
    route = window.location.hash || '#/';
  }

  $effect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });
</script>

{#if route === '#/overlay'}
  <Overlay />
{:else}
  <Controller />
{/if}
