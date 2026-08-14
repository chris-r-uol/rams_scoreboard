<script>
  import Controller from './lib/Controller.svelte';
  import Overlay from './lib/Overlay.svelte';
  import PrivacyPolicy from './lib/PrivacyPolicy.svelte';
  import TermsAndConditions from './lib/TermsAndConditions.svelte';
  import Login from './lib/Login.svelte';
  import Subscribe from './lib/Subscribe.svelte';
  import Landing from './lib/Landing.svelte';
  import Remote from './lib/Remote.svelte';
  import { loading, isAuthenticated, isSubscribed, refreshSubscription } from './lib/auth.js';
  import { parseHash, getTokenFromUrl } from './lib/room.js';

  // Route matching uses the hash *path* only — the overlay carries its room id
  // as a query string inside the hash (`#/overlay?r=…`), which must not defeat
  // the match.
  let route = $state(parseHash(window.location.hash).path);
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
    route = parseHash(window.location.hash).path;
  }

  $effect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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

  // Determine which view to show for the default route.
  //
  // A subscription no longer gates access — it gates *scope*. Signed-in users
  // without one get the free tier (one sport, watermarked overlay), which is
  // enforced in the picker and the controller rather than here. Signed-out
  // visitors get the marketing page instead of a bare login form, so the
  // product can be understood before it asks for anything.
  function controllerView() {
    if (authLoading) return 'loading';
    if (!authenticated) return 'landing';
    return 'controller';
  }
</script>

<!-- Public routes: always accessible -->
{#if route === '#/overlay'}
  <Overlay />
{:else if route === '#/join'}
  <!-- Co-controller: the full controller on a second device. Public like the
       overlay and remote, because a helper's laptop has no session of its own —
       access is gated by the pairing token, not by login. -->
  {#if getTokenFromUrl()}
    <Controller followerToken={getTokenFromUrl()} />
  {:else}
    <div class="min-h-screen bg-gray-950 flex items-center justify-center px-6 text-center">
      <div class="text-gray-400 max-w-sm leading-relaxed">
        <p class="text-lg font-semibold text-gray-200 mb-2">No scoreboard paired</p>
        <p class="text-sm">Open the co-controller link from the main controller — it needs to include a token.</p>
      </div>
    </div>
  {/if}
{:else if route === '#/remote'}
  <!-- Public like the overlay: a phone has no session. Access is gated by the
       pairing token in the URL, not by login. -->
  <Remote />
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
{:else if route === '#/subscribe/success'}
  <div class="min-h-screen bg-gray-950 flex items-center justify-center">
    <div class="text-gray-500 text-lg">Processing…</div>
  </div>

<!-- Default: gated controller -->
{:else}
  {#if controllerView() === 'loading'}
    <div class="min-h-screen bg-gray-950 flex items-center justify-center">
      <div class="text-gray-500 text-lg">Loading…</div>
    </div>
  {:else if controllerView() === 'landing'}
    <Landing />
  {:else}
    <Controller />
  {/if}
{/if}
