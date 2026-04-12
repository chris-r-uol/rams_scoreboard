<script>
  import { signInWithGoogle } from './auth.js';

  let error = $state('');
  let signingIn = $state(false);

  async function handleGoogleSignIn() {
    signingIn = true;
    error = '';
    try {
      await signInWithGoogle();
    } catch (err) {
      error = err.message || 'Sign-in failed. Please try again.';
      signingIn = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-950 flex items-center justify-center px-4">
  <div class="w-full max-w-md">

    <!-- Logo / Title -->
    <div class="text-center mb-10">
      <span class="text-5xl mb-4 block">🏈</span>
      <h1 class="text-3xl font-bold text-white tracking-tight">Stream Your Score</h1>
      <p class="text-gray-500 text-sm mt-2">Professional broadcast scoreboard</p>
    </div>

    <!-- Sign-in Card -->
    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8">
      <h2 class="text-lg font-semibold text-white mb-6 text-center">Sign in to continue</h2>

      <button
        onclick={handleGoogleSignIn}
        disabled={signingIn}
        class="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl
               bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm
               transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <!-- Google icon -->
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {signingIn ? 'Signing in…' : 'Continue with Google'}
      </button>

      {#if error}
        <div class="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-900/50 text-red-300 text-sm text-center">
          {error}
        </div>
      {/if}
    </div>

    <!-- Legal links -->
    <div class="mt-6 text-center text-xs text-gray-600">
      By signing in, you agree to our
      <a href="#/terms" class="text-gray-500 hover:text-gray-400 underline">Terms &amp; Conditions</a>
      and
      <a href="#/privacy" class="text-gray-500 hover:text-gray-400 underline">Privacy Policy</a>.
    </div>
  </div>
</div>
