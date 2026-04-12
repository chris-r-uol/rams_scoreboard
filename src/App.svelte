<script>
  import Controller from './lib/Controller.svelte';
  import Overlay from './lib/Overlay.svelte';
  import PrivacyPolicy from './lib/PrivacyPolicy.svelte';
  import TermsAndConditions from './lib/TermsAndConditions.svelte';
  import Login from './lib/Login.svelte';
  import Subscribe from './lib/Subscribe.svelte';
  import { loading, isAuthenticated, isSubscribed, refreshSubscription } from './lib/auth.js';

  let route = $state(window.location.hash || '#/');
  let authLoading = $state(true);
  let authenticated = $state(false);
  let subscribed = $state(false);

  const unsubs = [];
  unsubs.push(loading.subscribe((v) => (authLoading = v)));
  unsubs.push(isAuthenticated.subscribe((v) => (authenticated = v)));
  unsubs.push(isSubscribed.subscribe((v) => (subscribed = v)));

  import { onDestroy } from 'svelte';
  onDestroy(() => unsubs.forEach((u) => u()));

  function handleHashChange() {
    route = window.location.hash || '#/';
  }

  $effect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  // Handle OAuth callback — refresh subscription then redirect
  $effect(() => {
    if (route === '#/auth/callback' && authenticated && !authLoading) {
      refreshSubscription().then(() => {
        window.location.hash = subscribed ? '#/' : '#/subscribe';
      });
    }
  });

  // Handle successful subscription return — refresh and redirect
  $effect(() => {
    if (route === '#/subscribe/success' && authenticated && !authLoading) {
      refreshSubscription().then(() => {
        window.location.hash = '#/';
      });
    }
  });

  // Set body background per route
  $effect(() => {
    if (route === '#/overlay') {
      document.body.style.background = 'transparent';
    } else {
      document.body.style.background = '#030712';
    }
  });

  // Determine which view to show for the default/controller route
  function controllerView() {
    if (authLoading) return 'loading';
    if (!authenticated) return 'login';
    if (!subscribed) return 'subscribe';
    return 'controller';
  }
</script>

<!-- Public routes: always accessible -->
{#if route === '#/overlay'}
  <Overlay />
{:else if route === '#/privacy'}
  <PrivacyPolicy />
{:else if route === '#/terms'}
  <TermsAndConditions />

<!-- Auth routes -->
{:else if route === '#/login'}
  <Login />
{:else if route === '#/subscribe'}
  {#if authLoading}
    <div class="min-h-screen bg-gray-950 flex items-center justify-center">
      <div class="text-gray-500 text-lg">Loading…</div>
    </div>
  {:else if !authenticated}
    <Login />
  {:else}
    <Subscribe />
  {/if}
{:else if route === '#/auth/callback' || route === '#/subscribe/success'}
  <div class="min-h-screen bg-gray-950 flex items-center justify-center">
    <div class="text-gray-500 text-lg">Processing…</div>
  </div>

<!-- Default: gated controller -->
{:else}
  {#if controllerView() === 'loading'}
    <div class="min-h-screen bg-gray-950 flex items-center justify-center">
      <div class="text-gray-500 text-lg">Loading…</div>
    </div>
  {:else if controllerView() === 'login'}
    <Login />
  {:else if controllerView() === 'subscribe'}
    <Subscribe />
  {:else}
    <Controller />
  {/if}
{/if}
