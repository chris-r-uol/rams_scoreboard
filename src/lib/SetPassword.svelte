<script>
  /**
   * Shown after arriving from a password-reset link.
   *
   * Takes precedence over every route, because the recovery link creates a real
   * session — without this the user would land straight in the controller and
   * never be asked for the password they came to set.
   */
  import { updatePassword, cancelPasswordRecovery, user } from './auth.js';
  import { onDestroy } from 'svelte';

  const MIN_LENGTH = 6;

  let password = $state('');
  let confirm = $state('');
  let busy = $state(false);
  let error = $state('');
  let done = $state(false);

  let email = $state('');
  const unsub = user.subscribe((u) => (email = u?.email ?? ''));
  onDestroy(unsub);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    error = '';

    if (password.length < MIN_LENGTH) {
      error = `Use at least ${MIN_LENGTH} characters.`;
      return;
    }
    if (password !== confirm) {
      // Checked here rather than after the round trip: a typo in the second box
      // is not something the server should have to tell you about.
      error = 'Those two passwords do not match.';
      return;
    }

    busy = true;
    try {
      await updatePassword(password);
      done = true;
    } catch (err) {
      error = err.message || 'Could not update your password.';
      busy = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">

    <div class="text-center mb-10">
      <span class="text-5xl mb-5 block">🔑</span>
      <h1 class="text-2xl font-bold text-white tracking-tight">
        {done ? 'Password updated' : 'Choose a new password'}
      </h1>
      {#if email && !done}
        <p class="text-gray-500 text-sm mt-2.5">for {email}</p>
      {/if}
    </div>

    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 sm:p-10 shadow-xl shadow-black/20">
      {#if done}
        <p class="text-gray-300 text-sm leading-relaxed text-center mb-7">
          You're signed in and ready to go. Use this password next time you sign in.
        </p>
        <button
          onclick={cancelPasswordRecovery}
          class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white
                 font-semibold text-sm transition-all duration-150 active:scale-[0.98]"
        >
          Continue to the scoreboard
        </button>
      {:else}
        <form onsubmit={handleSubmit} novalidate>
          <label class="block mb-4">
            <span class="block text-xs font-semibold text-gray-400 mb-2 tracking-wide">New password</span>
            <input
              type="password" bind:value={password} disabled={busy}
              autocomplete="new-password" placeholder="At least {MIN_LENGTH} characters"
              class="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white
                     placeholder:text-gray-600 focus:border-amber-400 outline-none
                     disabled:opacity-50 transition-colors"
            />
          </label>

          <label class="block mb-5">
            <span class="block text-xs font-semibold text-gray-400 mb-2 tracking-wide">Confirm it</span>
            <input
              type="password" bind:value={confirm} disabled={busy}
              autocomplete="new-password" placeholder="Type it again"
              class="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white
                     placeholder:text-gray-600 focus:border-amber-400 outline-none
                     disabled:opacity-50 transition-colors"
            />
          </label>

          <button
            type="submit" disabled={busy}
            class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold
                   text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                   active:scale-[0.98]"
          >
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>

        {#if error}
          <div class="mt-5 p-3.5 rounded-xl bg-red-950/50 border border-red-900/50 text-red-300 text-sm leading-relaxed">
            {error}
          </div>
        {/if}

        <div class="mt-6 text-center text-[13px] text-gray-500">
          <button onclick={cancelPasswordRecovery} class="link">Skip for now</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .link {
    color: #60a5fa; background: none; border: none; padding: 0;
    font: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 2px;
  }
  .link:hover { color: #93c5fd; }
</style>
