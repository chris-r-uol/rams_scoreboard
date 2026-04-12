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

<div class="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-2xl">

    <!-- Header -->
    <div class="text-center mb-12">
      <span class="text-5xl mb-5 block">🏈</span>
      <h1 class="text-3xl font-bold text-white tracking-tight">Choose Your Plan</h1>
      <p class="text-gray-500 text-sm mt-2.5 tracking-wide">
        Signed in as <span class="text-gray-400">{currentUser?.email ?? '...'}</span>
      </p>
    </div>

    {#if subStatus === 'past_due'}
      <div class="mb-8 p-4 rounded-xl bg-amber-950/50 border border-amber-800/40 text-amber-300 text-sm text-center leading-relaxed">
        Your subscription payment is past due. Please update your payment method or choose a new plan below.
      </div>
    {/if}

    <!-- Plan Cards -->
    <div class="grid gap-6 sm:grid-cols-2">

      <!-- Monthly -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col shadow-lg shadow-black/10">
        <h3 class="text-white font-semibold text-lg tracking-tight">Monthly</h3>
        <div class="mt-4 flex items-baseline gap-1.5">
          <span class="text-5xl font-extrabold text-white tracking-tight">£8</span>
          <span class="text-gray-500 text-sm">/month</span>
        </div>
        <ul class="mt-6 space-y-3 text-sm text-gray-400 flex-1">
          <li class="flex items-center gap-2.5">
            <span class="text-green-500 text-sm font-bold">✓</span> Full scoreboard controls
          </li>
          <li class="flex items-center gap-2.5">
            <span class="text-green-500 text-sm font-bold">✓</span> OBS browser-source overlay
          </li>
          <li class="flex items-center gap-2.5">
            <span class="text-green-500 text-sm font-bold">✓</span> Real-time sync
          </li>
          <li class="flex items-center gap-2.5">
            <span class="text-green-500 text-sm font-bold">✓</span> Cancel anytime
          </li>
        </ul>
        <button
          onclick={() => handleCheckout(MONTHLY_PRICE_ID)}
          disabled={!!checkingOut}
          class="mt-8 w-full py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold
                 text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                 border border-gray-700 hover:border-gray-600 active:scale-[0.98]"
        >
          {checkingOut === MONTHLY_PRICE_ID ? 'Redirecting…' : 'Get Monthly'}
        </button>
      </div>

      <!-- Annual -->
      <div class="bg-gray-900 border-2 border-blue-600 rounded-2xl p-8 flex flex-col relative shadow-lg shadow-blue-900/15">
        <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full tracking-widest uppercase">
          Save 43%
        </div>
        <h3 class="text-white font-semibold text-lg tracking-tight">Annual</h3>
        <div class="mt-4 flex items-baseline gap-1.5">
          <span class="text-5xl font-extrabold text-white tracking-tight">£55</span>
          <span class="text-gray-500 text-sm">/year</span>
        </div>
        <p class="text-gray-500 text-xs mt-1.5 tracking-wide">Just £4.58/month</p>
        <ul class="mt-6 space-y-3 text-sm text-gray-400 flex-1">
          <li class="flex items-center gap-2.5">
            <span class="text-green-500 text-sm font-bold">✓</span> Everything in Monthly
          </li>
          <li class="flex items-center gap-2.5">
            <span class="text-green-500 text-sm font-bold">✓</span> Best value
          </li>
          <li class="flex items-center gap-2.5">
            <span class="text-green-500 text-sm font-bold">✓</span> Priority support
          </li>
        </ul>
        <button
          onclick={() => handleCheckout(ANNUAL_PRICE_ID)}
          disabled={!!checkingOut}
          class="mt-8 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold
                 text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                 active:scale-[0.98]"
        >
          {checkingOut === ANNUAL_PRICE_ID ? 'Redirecting…' : 'Get Annual'}
        </button>
      </div>
    </div>

    {#if error}
      <div class="mt-6 p-3.5 rounded-xl bg-red-950/50 border border-red-900/50 text-red-300 text-sm text-center leading-relaxed">
        {error}
      </div>
    {/if}

    <!-- Footer actions -->
    <div class="mt-10 flex flex-col items-center gap-4">
      <button
        onclick={handleRefresh}
        class="text-sm text-gray-500 hover:text-gray-400 underline underline-offset-2 transition-colors"
      >
        Already subscribed? Refresh status
      </button>
      <button
        onclick={handleSignOut}
        class="text-sm text-gray-600 hover:text-gray-500 transition-colors"
      >
        Sign out
      </button>
    </div>

    <!-- Legal -->
    <div class="mt-8 text-center text-[11px] text-gray-600 tracking-wide">
      <a href="#/terms" class="text-gray-500 hover:text-gray-400 underline underline-offset-2">Terms &amp; Conditions</a>
      <span class="mx-1.5">·</span>
      <a href="#/privacy" class="text-gray-500 hover:text-gray-400 underline underline-offset-2">Privacy Policy</a>
    </div>
  </div>
</div>
