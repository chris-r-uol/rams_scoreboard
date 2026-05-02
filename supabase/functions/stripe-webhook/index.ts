/**
 * Supabase Edge Function: stripe-webhook
 *
 * Receives Stripe webhook events and updates the subscriptions table
 * in Supabase accordingly. Handles:
 *   - checkout.session.completed  → create initial subscription record
 *   - customer.subscription.updated → status changes, renewals
 *   - customer.subscription.deleted → cancellation
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_...
 *
 * Deploy (must skip JWT verification — Stripe sends raw HTTP):
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeKey || !webhookSecret) {
      throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });

    // Verify the webhook signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[stripe-webhook] Signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    // Supabase admin client (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[stripe-webhook] Processing event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;

        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Look up the Supabase user from our customer mapping
        const { data: customerData } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (!customerData) {
          console.error('[stripe-webhook] No user mapping for customer:', customerId);
          break;
        }

        // Fetch the full subscription from Stripe to get period dates and price
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase.from('subscriptions').upsert(
          {
            user_id: customerData.user_id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
          { onConflict: 'stripe_subscription_id' },
        );

        console.log('[stripe-webhook] Subscription created for user:', customerData.user_id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscriptionId);

        console.log('[stripe-webhook] Subscription updated:', subscriptionId, '→', subscription.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscriptionId);

        console.log('[stripe-webhook] Subscription canceled:', subscriptionId);
        break;
      }

      default:
        console.log('[stripe-webhook] Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stripe-webhook] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
