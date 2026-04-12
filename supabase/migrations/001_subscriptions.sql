-- ============================================================
-- Subscriptions table — tracks Stripe subscription state.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- ============================================================

-- Table: subscriptions
create table if not exists public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id   text,
  status            text not null default 'incomplete',
  -- status values: incomplete | incomplete_expired | trialing |
  --                active | past_due | canceled | unpaid | paused
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Index for fast user lookups
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);

-- ============================================================
-- Row Level Security — users can only read their own subs.
-- Edge Functions use the service_role key to write.
-- ============================================================
alter table public.subscriptions enable row level security;

-- Users can read their own subscriptions
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only service_role (Edge Functions) can insert/update/delete
-- No additional policies needed — service_role bypasses RLS.

-- ============================================================
-- Helper: a mapping table so the Stripe webhook can look up
-- the Supabase user_id from a Stripe customer_id.
-- This is populated when the checkout session completes.
-- ============================================================
create table if not exists public.stripe_customers (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at        timestamptz default now()
);

alter table public.stripe_customers enable row level security;

create policy "Users can view own customer mapping"
  on public.stripe_customers for select
  using (auth.uid() = user_id);

-- ============================================================
-- Updated_at trigger
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();
