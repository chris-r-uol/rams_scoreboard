# Authentication Process — How It Works & How to Replicate It

This document explains the full authentication and subscription flow used in this app.
It starts with a plain-English overview, then works through every technical detail and file you need to recreate it.

---

## Table of Contents

1. [Plain-English Summary](#1-plain-english-summary)
2. [Services Used](#2-services-used)
3. [How the Flow Works — Step by Step](#3-how-the-flow-works--step-by-step)
4. [What You Need to Set Up](#4-what-you-need-to-set-up)
   - [Supabase Project](#41-supabase-project)
   - [Google OAuth (inside Supabase)](#42-google-oauth-inside-supabase)
   - [Stripe Account](#43-stripe-account)
   - [Supabase Database Tables](#44-supabase-database-tables)
   - [Supabase Edge Functions](#45-supabase-edge-functions)
   - [Front-end Environment Variables](#46-front-end-environment-variables)
   - [Front-end Code](#47-front-end-code)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Security Notes](#6-security-notes)

---

## 1. Plain-English Summary

When a user opens the app, three questions are asked automatically:

1. **Are they logged in?** If not → show the login page.
2. **Do they have an active subscription?** If not → show the subscription/pricing page.
3. **Both yes?** → Show the app.

Logging in is done with a Google account via a service called **Supabase**. Supabase handles all the hard parts of authentication (tokens, sessions, secure storage) so you never have to manage passwords or user records yourself.

Once logged in, the app checks a database table for a paid subscription. Payments are handled by **Stripe**. When a user pays, Stripe notifies a small server-side function (called an Edge Function) which records the subscription in the database. The app reads that record every time it loads.

---

## 2. Services Used

| Service | Purpose | Cost |
|---|---|---|
| **Supabase** | Authentication, database, serverless functions | Free tier available |
| **Google Cloud Console** | Provides the "Sign in with Google" button | Free |
| **Stripe** | Payment processing and subscription management | Pay-as-you-go |

---

## 3. How the Flow Works — Step by Step

```
User opens the app
       │
       ▼
supabase.auth.getSession()        ← checks for an existing login session
       │
  ┌────┴────┐
  │ No session │ → Show Login page → User clicks "Continue with Google"
  └────┬────┘         │
       │               ▼
       │    supabase.auth.signInWithOAuth({ provider: 'google' })
       │               │
       │    Browser redirects to Google → user approves
       │               │
       │    Google redirects back to the app with a token in the URL
       │               │
       │    Supabase processes the token → creates/updates user record
       │               │
       │    onAuthStateChange fires with event = 'SIGNED_IN'
       │               │
       ▼               ▼
  Has session?  ←──────┘
       │
       ▼
Query `subscriptions` table for this user
       │
  ┌────┴────┐
  │ No active  │ → Show Subscribe page → User picks a plan
  │ subscription│         │
  └────┬────┘         ▼
       │    startCheckout(priceId) called
       │               │
       │    POST to Supabase Edge Function: create-checkout
       │    (with the user's JWT as proof of identity)
       │               │
       │    Edge Function creates a Stripe Checkout Session
       │               │
       │    Browser redirects to Stripe → user pays
       │               │
       │    Stripe redirects back to app at #/subscribe/success
       │               │
       │    Stripe also sends a webhook → stripe-webhook Edge Function
       │               │
       │    Edge Function writes a row to `subscriptions` table
       │               │
       │    App calls refreshSubscription() → re-queries the table
       │               │
       ▼               ▼
  Is subscribed? ←─────┘
       │
       ▼
   Show the app ✓
```

---

## 4. What You Need to Set Up

### 4.1 Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**. Give it a name, choose a region, and set a strong database password (save it somewhere safe).
3. Wait for provisioning to finish (~1–2 minutes).
4. Once ready, go to **Project Settings → API**. You will find:
   - **Project URL** → this is your `VITE_SUPABASE_URL`
   - **anon / public key** → this is your `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → keep this secret; it is used by Edge Functions only

---

### 4.2 Google OAuth (inside Supabase)

This is the most fiddly part. Follow each step carefully.

#### Step A — Create a Google Cloud project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. At the top, click the project dropdown → **New Project**. Name it anything.
3. In the left menu go to **APIs & Services → OAuth consent screen**.
4. Choose **External** user type → click **Create**.
5. Fill in the required fields:
   - **App name** — anything descriptive
   - **User support email** — your email
   - **Developer contact email** — your email
6. Click **Save and Continue** through the remaining steps (you don't need to add scopes manually).
7. On the final step, click **Back to Dashboard**.

#### Step B — Create OAuth credentials

1. In the left menu go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Choose **Application type: Web application**.
4. Under **Authorized redirect URIs**, add:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-supabase-project-ref>` with the value shown in your Supabase project URL (e.g. `abcdefghij`).
   You can find this URL in Supabase under **Project Settings → API → Project URL**.
5. Click **Create**.
6. Google will show you a **Client ID** and **Client Secret** — copy both.

#### Step C — Add Google as a provider in Supabase

1. In your Supabase project, go to **Authentication → Providers**.
2. Find **Google** in the list and click to expand it.
3. Enable the toggle.
4. Paste in the **Client ID** and **Client Secret** from Google.
5. Click **Save**.

That's it. Supabase now knows how to authenticate users via Google.

---

### 4.3 Stripe Account

1. Go to [https://stripe.com](https://stripe.com) and create an account.
2. Complete identity verification if prompted (required for live payments).
3. While testing, make sure the **Test mode** toggle is enabled (top-right of dashboard).

#### Create subscription products and prices

1. In Stripe, go to **Product catalogue → Add product**.
2. Create your product (e.g. "Pro Subscription").
3. Add two prices to it:
   - A **monthly recurring** price (e.g. £8/month)
   - An **annual recurring** price (e.g. £55/year)
4. After saving, click each price and copy its **Price ID** (starts with `price_`).
   These IDs need to be hardcoded in `src/lib/Subscribe.svelte`:
   ```js
   const MONTHLY_PRICE_ID = 'price_xxxxxxxxxxxxxxxxxx';
   const ANNUAL_PRICE_ID  = 'price_xxxxxxxxxxxxxxxxxx';
   ```

#### Get your Stripe secret key

1. In Stripe, go to **Developers → API keys**.
2. Copy the **Secret key** (starts with `sk_test_` in test mode, `sk_live_` in production).
   This is your `STRIPE_SECRET_KEY` — keep it secret, never put it in front-end code.

#### Set up a webhook

1. In Stripe, go to **Developers → Webhooks → Add endpoint**.
2. Set the endpoint URL to your Edge Function URL:
   ```
   https://<your-supabase-project-ref>.supabase.co/functions/v1/stripe-webhook
   ```
3. Under **Events to send**, select:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**.
5. Click the webhook endpoint you just created, then reveal and copy the **Signing secret** (starts with `whsec_`).
   This is your `STRIPE_WEBHOOK_SECRET`.

---

### 4.4 Supabase Database Tables

Run the following SQL in **Supabase Dashboard → SQL Editor**. This creates the two tables the app needs:

```sql
-- ============================================================
-- subscriptions: tracks Stripe subscription state per user
-- ============================================================
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  status                 text not null default 'incomplete',
  -- status values: incomplete | incomplete_expired | trialing |
  --                active | past_due | canceled | unpaid | paused
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create index if not exists idx_subscriptions_user_id
  on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer
  on public.subscriptions(stripe_customer_id);

-- Row Level Security: users can only read their own subscriptions.
-- Edge Functions use the service_role key to write (bypasses RLS).
alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ============================================================
-- stripe_customers: maps Supabase user_id → Stripe customer_id
-- ============================================================
create table if not exists public.stripe_customers (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at         timestamptz default now()
);
```

---

### 4.5 Supabase Edge Functions

Edge Functions are small server-side scripts that run on Supabase's infrastructure. This app uses two.

#### Prerequisites — Install the Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Verify
supabase --version
```

#### Link your local project to Supabase

```bash
# From the project root
supabase login
supabase link --project-ref <your-supabase-project-ref>
```

#### Store secrets in Supabase

These environment variables are available inside your Edge Functions at runtime.
The `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected — you only need to set the Stripe ones:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

#### Function 1: `create-checkout`

Create the file at `supabase/functions/create-checkout/index.ts`.
This function is called by the front-end when a user clicks a plan. It:
- Authenticates the user by reading their JWT from the `Authorization` header
- Finds or creates a Stripe customer for that user
- Creates a Stripe Checkout Session and returns its URL

Deploy it:
```bash
supabase functions deploy create-checkout
```

> **Note:** Do _not_ use `--no-verify-jwt` for this function. It reads the user's JWT to identify them.

#### Function 2: `stripe-webhook`

Create the file at `supabase/functions/stripe-webhook/index.ts`.
This function receives events directly from Stripe (not from a logged-in user). It:
- Verifies the request came from Stripe using the webhook signing secret
- On `checkout.session.completed` → writes a new row to `subscriptions`
- On `customer.subscription.updated` → updates the status in `subscriptions`
- On `customer.subscription.deleted` → sets status to `canceled`

Deploy it **with** `--no-verify-jwt` because Stripe sends raw HTTP, not Supabase JWTs:
```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

---

### 4.6 Front-end Environment Variables

Create a `.env` file in the project root (never commit this file to git):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Add `.env` to your `.gitignore`:
```
.env
.env.local
```

These variables are accessed in code via `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`. The `VITE_` prefix is required by Vite to expose them to the browser.

---

### 4.7 Front-end Code

Here is an overview of the files you need to create or copy, with their responsibilities:

#### `src/lib/supabase.js` — Creates the Supabase client

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

This is the single shared instance used everywhere. If the env vars are missing it returns `null` rather than crashing.

#### `src/lib/auth.js` — All auth logic and reactive state

This file exposes:

| Export | Type | Description |
|---|---|---|
| `session` | writable store | The raw Supabase session object, or `null` |
| `loading` | writable store | `true` while the initial session check is running |
| `subscriptionStatus` | writable store | `'active'`, `'trialing'`, `'past_due'`, or `null` |
| `isAuthenticated` | derived store | `true` if a session exists |
| `isSubscribed` | derived store | `true` if status is `active` or `trialing` |
| `user` | derived store | The user object from the session, or `null` |
| `signInWithGoogle()` | function | Triggers the Google OAuth redirect |
| `signOut()` | function | Signs the user out and clears all state |
| `startCheckout(priceId)` | function | Calls the `create-checkout` Edge Function and redirects to Stripe |
| `refreshSubscription()` | function | Re-queries the subscriptions table |

The `init()` function (called once at module load) does two things:
1. Calls `supabase.auth.getSession()` to restore any existing session on page load.
2. Calls `supabase.auth.onAuthStateChange()` to react to login/logout/token-refresh events in real time.

After a Google OAuth sign-in, the browser URL contains a token fragment (`#access_token=...`). The auth listener detects this and redirects to `#/` to clean it up.

#### `src/lib/Login.svelte` — Login page

A simple page with a single "Continue with Google" button that calls `signInWithGoogle()`.

#### `src/lib/Subscribe.svelte` — Subscription/pricing page

Shown after login if the user has no active subscription. Calls `startCheckout(priceId)` with the Stripe price ID for the chosen plan.

#### `src/App.svelte` — Route and auth gating

The root component. Uses hash-based routing (`window.location.hash`) and checks auth/subscription state to decide which component to render:

```
#/overlay     → always public (OBS browser source)
#/privacy     → always public
#/terms       → always public
#/login       → Login page
#/subscribe   → Subscribe page (requires login)
#/ (default)  → shows loading → login → subscribe → app, in that order
```

#### Install the Supabase JS client

```bash
npm install @supabase/supabase-js
```

---

## 5. Environment Variables Reference

### Front-end `.env` file

| Variable | Where to get it | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | `https://abcdefghij.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public | `eyJhbGciOiJIUzI1Ni...` |

### Supabase Edge Function secrets (`supabase secrets set`)

| Variable | Where to get it | Example |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key | `sk_test_51...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint → Signing secret | `whsec_abc...` |

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase into every Edge Function. You do not need to set these manually.

### Google OAuth credentials (stored in Supabase, not in code)

| Value | Where to get it |
|---|---|
| Google Client ID | Google Cloud Console → APIs & Services → Credentials |
| Google Client Secret | Google Cloud Console → APIs & Services → Credentials |

These are entered directly into the Supabase dashboard under **Authentication → Providers → Google**. They never appear in your code or `.env` file.

---

## 6. Security Notes

- **Never commit `.env` to git.** Add it to `.gitignore` immediately.
- The `VITE_SUPABASE_ANON_KEY` is safe to expose in client-side code — it is designed to be public. It only grants access controlled by Row Level Security policies.
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It must only ever be used inside Edge Functions (server-side), never in front-end code.
- The `STRIPE_SECRET_KEY` must also stay server-side only (Edge Functions). If it were exposed in the browser anyone could create charges on your account.
- The Stripe webhook signature verification (`stripe.webhooks.constructEvent`) in `stripe-webhook` is critical — it proves the request genuinely came from Stripe and not a malicious third party.
- Row Level Security on the `subscriptions` table means a user can only read their own subscription data, even if they query the database directly using the anon key.
