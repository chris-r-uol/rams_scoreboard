/**
 * Supabase keep-alive.
 *
 * Free-tier Supabase projects pause after roughly 7 days with no API activity,
 * and unpausing is manual — which means a quiet week takes the scoreboard
 * offline for every signed-in user until someone notices.  This endpoint is
 * invoked by a Vercel cron job (see vercel.json) to generate that activity.
 *
 * It issues a real PostgREST query rather than pinging the host, so the request
 * reaches Postgres itself.  Row-level security may well return an empty result
 * for the anon key — that is fine and expected.  The query having executed at
 * all is the point.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Any table will do; this one is part of the auth flow and always present.
const PROBE_PATH = '/rest/v1/subscriptions?select=id&limit=1';
const TIMEOUT_MS = 10000;

export default async function handler(req, res) {
  // Vercel signs cron invocations with CRON_SECRET when that env var is set.
  // If it is absent the endpoint stays open, which is harmless — it exposes
  // nothing and does nothing but read a single row.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Missing SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_ prefixed equivalents).',
    });
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${SUPABASE_URL}${PROBE_PATH}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAt;

    // 2xx and 4xx both prove the project is awake and serving; only a network
    // failure or 5xx suggests it is paused or unhealthy.
    if (response.status >= 500) {
      console.error(`[keepalive] Supabase returned ${response.status}`);
      return res.status(502).json({
        ok: false,
        status: response.status,
        durationMs,
        error: 'Supabase unhealthy',
      });
    }

    console.log(`[keepalive] OK — status ${response.status} in ${durationMs}ms`);
    return res.status(200).json({
      ok: true,
      status: response.status,
      durationMs,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    console.error(`[keepalive] Failed:`, aborted ? `timed out after ${TIMEOUT_MS}ms` : err);
    return res.status(504).json({
      ok: false,
      error: aborted ? `Timed out after ${TIMEOUT_MS}ms` : String(err?.message ?? err),
    });
  } finally {
    clearTimeout(timeout);
  }
}
