<script>
  import Controller from './lib/Controller.svelte';
  import Overlay from './lib/Overlay.svelte';
  import PrivacyPolicy from './lib/PrivacyPolicy.svelte';
  import TermsAndConditions from './lib/TermsAndConditions.svelte';

  let route = $state(window.location.hash || '#/');

  function handleHashChange() {
    route = window.location.hash || '#/';
  }

  $effect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  // Set body background per route
  $effect(() => {
    if (route === '#/overlay') {
      document.body.style.background = 'transparent';
    } else {
      document.body.style.background = '#030712';
    }
  });
</script>

{#if route === '#/overlay'}
  <Overlay />
{:else if route === '#/privacy'}
  <PrivacyPolicy />
{:else if route === '#/terms'}
  <TermsAndConditions />
{:else}
  <Controller />
{/if}
