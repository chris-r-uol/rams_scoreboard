<script>
  /**
   * Sign in, create an account, or start a password reset.
   *
   * Google stays first because it is one tap and has no deliverability
   * problems. Email exists for people who cannot or will not use a Google
   * account — which, on a shared club device, is a real constituency.
   */
  import {
    signInWithGoogle, signInWithEmail, signUpWithEmail, requestPasswordReset,
  } from './auth.js';

  /** 'signin' | 'signup' | 'reset' */
  let mode = $state('signin');

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');

  const COPY = {
    signin: { title: 'Sign in to continue', action: 'Sign in', pending: 'Signing in…' },
    signup: { title: 'Create your account', action: 'Create account', pending: 'Creating…' },
    reset:  { title: 'Reset your password', action: 'Send reset link', pending: 'Sending…' },
  };

  function switchTo(next) {
    mode = next;
    error = '';
    notice = '';
  }

  async function handleGoogle() {
    busy = true;
    error = '';
    try {
      await signInWithGoogle();
    } catch (err) {
      error = err.message || 'Sign-in failed. Please try again.';
      busy = false;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    error = '';
    notice = '';

    if (!email.trim()) {
      error = 'Enter your email address.';
      return;
    }
    if (mode !== 'reset' && !password) {
      error = 'Enter your password.';
      return;
    }

    busy = true;
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        // A successful sign-in re-renders the app; nothing more to do here.
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUpWithEmail(email, password);
        if (needsConfirmation) {
          notice = 'Account created. Check your email for a confirmation link — it may land in your spam folder.';
          password = '';
        }
      } else {
        await requestPasswordReset(email);
        // Deliberately worded so it does not reveal whether the address exists.
        notice = 'If there is an account with that email, a reset link is on its way. Check your spam folder too.';
      }
    } catch (err) {
      error = err.message || 'Something went wrong. Please try again.';
    } finally {
      busy = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">

    <!-- Logo / Title -->
    <div class="text-center mb-10">
      <span class="text-5xl mb-5 block">🏒</span>
      <h1 class="text-3xl font-bold text-white tracking-tight">Stream Your Score</h1>
      <p class="text-gray-500 text-sm mt-2.5 tracking-wide">Broadcast scoreboards for live streams</p>
    </div>

    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 sm:p-10 shadow-xl shadow-black/20">
      <h2 class="text-lg font-semibold text-white mb-7 text-center tracking-tight">{COPY[mode].title}</h2>

      {#if mode !== 'reset'}
        <button
          onclick={handleGoogle}
          disabled={busy}
          class="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl
                 bg-white hover:bg-gray-50 text-gray-900 font-semibold text-sm
                 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                 shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div class="flex items-center gap-4 my-6">
          <div class="h-px bg-gray-800 flex-1"></div>
          <span class="text-[11px] uppercase tracking-widest text-gray-600">or</span>
          <div class="h-px bg-gray-800 flex-1"></div>
        </div>
      {/if}

      <form onsubmit={handleSubmit} novalidate>
        <label class="block mb-4">
          <span class="block text-xs font-semibold text-gray-400 mb-2 tracking-wide">Email</span>
          <input
            type="email" bind:value={email} disabled={busy}
            autocomplete="email" placeholder="you@example.com"
            class="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white
                   placeholder:text-gray-600 focus:border-amber-400 outline-none
                   disabled:opacity-50 transition-colors"
          />
        </label>

        {#if mode !== 'reset'}
          <label class="block mb-5">
            <span class="block text-xs font-semibold text-gray-400 mb-2 tracking-wide">Password</span>
            <input
              type="password" bind:value={password} disabled={busy}
              autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              class="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white
                     placeholder:text-gray-600 focus:border-amber-400 outline-none
                     disabled:opacity-50 transition-colors"
            />
          </label>
        {/if}

        <button
          type="submit" disabled={busy}
          class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold
                 text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                 active:scale-[0.98]"
        >
          {busy ? COPY[mode].pending : COPY[mode].action}
        </button>
      </form>

      {#if error}
        <div class="mt-5 p-3.5 rounded-xl bg-red-950/50 border border-red-900/50 text-red-300 text-sm leading-relaxed">
          {error}
        </div>
      {/if}

      {#if notice}
        <div class="mt-5 p-3.5 rounded-xl bg-sky-950/50 border border-sky-900/50 text-sky-200 text-sm leading-relaxed">
          {notice}
        </div>
      {/if}

      <!-- Mode switching -->
      <div class="mt-6 text-center text-[13px] text-gray-500 leading-relaxed">
        {#if mode === 'signin'}
          <button onclick={() => switchTo('reset')} class="link">Forgot your password?</button>
          <div class="mt-2">
            No account?
            <button onclick={() => switchTo('signup')} class="link">Create one</button>
          </div>
        {:else if mode === 'signup'}
          Already have an account?
          <button onclick={() => switchTo('signin')} class="link">Sign in</button>
        {:else}
          <button onclick={() => switchTo('signin')} class="link">Back to sign in</button>
        {/if}
      </div>
    </div>

    <div class="mt-8 text-center text-[11px] text-gray-600 leading-relaxed tracking-wide">
      By continuing, you agree to our
      <a href="#/terms" class="text-gray-500 hover:text-gray-400 underline underline-offset-2">Terms &amp; Conditions</a>
      and
      <a href="#/privacy" class="text-gray-500 hover:text-gray-400 underline underline-offset-2">Privacy Policy</a>.
    </div>
  </div>
</div>

<style>
  .link {
    color: #60a5fa;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .link:hover { color: #93c5fd; }
</style>
