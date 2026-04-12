<script>
  import { startCheckout, signOut, refreshSubscription, subscriptionStatus, user } from './auth.js';

  let checkingOut = $state('');
  let error = $state('');
  let currentUser = $state(null);
  let subStatus = $state(null);

  const unsubs = [];
  unsubs.push(user.subscribe((v) => (currentUser = v)));
  unsubs.push(subscriptionStatus.subscribe((v) => (subStatus = v)));

  import { onDestroy } from 'svelte';
  onDestroy(() => unsubs.forEach((u) => u()));

  const MONTHLY_PRICE_ID = 'price_1TLONhHbVNaxkMpc2u37qLYt';
  const ANNUAL_PRICE_ID = 'price_1TLOOmHbVNaxkMpcgUo1AKj2';

  async function handleCheckout(priceId) {
    checkingOut = priceId;
    error = '';
    try {
      await startCheckout(priceId);
    } catch (err) {
      error = err.message || 'Failed to start checkout. Please try again.';
      checkingOut = '';
    }
  }

  async function handleRefresh() {
    error = '';
    await refreshSubscription();
    if (subStatus === 'active' || subStatus === 'trialing') {
      window.location.hash = '#/';
    }
  }

  async function handleSignOut() {
    await signOut();
    window.location.hash = '#/login';
  }
</script>

<div class="min-h-screen bg-gray-950 flex items-center justify-center px-4">
  <div class="w-full max-w-2xl">

    <!-- Header -->
    <div class="text-center mb-10">
      <span class="text-5xl mb-4 block">🏈</span>
      <h1 class="text-3xl font-bold text-white tracking-tight">Choose Your Plan</h1>
      <p class="text-gray-500 text-sm mt-2">
        Signed in as <span class="text-gray-400">{currentUser?.email ?? '...'}</span>
      </p>
    </div>

    {#if subStatus === 'past_due'}
      <div class="mb-6 p-4 rounded-xl bg-amber-950/50 border border-amber-800/40 text-amber-300 text-sm text-center">
        Your subscription payment is past due. Please update your payment method or choose a new plan below.
      </div>
    {/if}

    <!-- Plan Cards -->
    <div class="grid gap-6 sm:grid-cols-2">

      <!-- Monthly -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
        <h3 class="text-white font-semibold text-lg">Monthly</h3>
        <div class="mt-3 flex items-baseline gap-1">
          <span class="text-4xl font-bold text-white">£8</span>
          <span class="text-gray-500 text-sm">/month</span>
        </div>
        <ul class="mt-5 space-y-2 text-sm text-gray-400 flex-1">
          <li class="flex items-center gap-2">
            <span class="text-green-500 text-base">✓</span> Full scoreboard controls
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500 text-base">✓</span> OBS browser-source overlay
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500 text-base">✓</span> Real-time sync
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500 text-base">✓</span> Cancel anytime
          </li>
        </ul>
        <button
          onclick={() => handleCheckout(MONTHLY_PRICE_ID)}
          disabled={!!checkingOut}
          class="mt-6 w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold
                 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkingOut === MONTHLY_PRICE_ID ? 'Redirecting…' : 'Get Monthly'}
        </button>
      </div>

      <!-- Annual -->
      <div class="bg-gray-900 border-2 border-blue-600 rounded-2xl p-6 flex flex-col relative">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          SAVE 43%
        </div>
        <h3 class="text-white font-semibold text-lg">Annual</h3>
        <div class="mt-3 flex items-baseline gap-1">
          <span class="text-4xl font-bold text-white">£55</span>
          <span class="text-gray-500 text-sm">/year</span>
        </div>
        <p class="text-gray-500 text-xs mt-1">Just £4.58/month</p>
        <ul class="mt-5 space-y-2 text-sm text-gray-400 flex-1">
          <li class="flex items-center gap-2">
            <span class="text-green-500 text-base">✓</span> Everything in Monthly
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500 text-base">✓</span> Best value
          </li>
          <li class="flex items-center gap-2">
            <span class="text-green-500 text-base">✓</span> Priority support
          </li>
        </ul>
        <button
          onclick={() => handleCheckout(ANNUAL_PRICE_ID)}
          disabled={!!checkingOut}
          class="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold
                 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkingOut === ANNUAL_PRICE_ID ? 'Redirecting…' : 'Get Annual'}
        </button>
      </div>
    </div>

    {#if error}
      <div class="mt-6 p-3 rounded-lg bg-red-950/50 border border-red-900/50 text-red-300 text-sm text-center">
        {error}
      </div>
    {/if}

    <!-- Footer actions -->
    <div class="mt-8 flex flex-col items-center gap-3">
      <button
        onclick={handleRefresh}
        class="text-sm text-gray-500 hover:text-gray-400 underline"
      >
        Already subscribed? Refresh status
      </button>
      <button
        onclick={handleSignOut}
        class="text-sm text-gray-600 hover:text-gray-500"
      >
        Sign out
      </button>
    </div>

    <!-- Legal -->
    <div class="mt-6 text-center text-xs text-gray-600">
      <a href="#/terms" class="text-gray-500 hover:text-gray-400 underline">Terms &amp; Conditions</a>
      <span class="mx-1">·</span>
      <a href="#/privacy" class="text-gray-500 hover:text-gray-400 underline">Privacy Policy</a>
    </div>
  </div>
</div>
