/**
 * mcp-ghost.js
 * Ghost Admin API connector for Turquoise.
 *
 * Returns observable engagement signals for a published piece on two
 * channels — the article itself and the newsletter send — and an
 * auto-suggested EQ (engagement depth) for the operator to confirm.
 *
 * CQ (audience ICP-fit) is intentionally NOT computed here. CQ is a lookup
 * on engager identity, and Ghost does not expose who-by-name the way a
 * LinkedIn post does. CQ is therefore returned as { cq_status: 'pending' }
 * and is computed for real once LinkedIn distribution is connected. This is
 * an honest null, never a fabricated number.
 *
 * Why the Admin API (not the Content API): newsletter stats — sends, opens,
 * clicks — and post-level member signups/conversions are only visible to the
 * Admin API. The Content API exposes metadata only.
 *
 * Required env vars (Netlify dashboard):
 *   GHOST_URL             — e.g. "https://resources.scopelabs.work"
 *   GHOST_ADMIN_API_KEY   — "id:secret" from Ghost Admin > Integrations
 *
 * POST /api/mcp-ghost
 * Body: { channel, post_slug } OR { channel, post_url }
 *   channel: 'ghost_article' | 'newsletter'  (defaults to 'ghost_article')
 *
 * Returns: {
 *   channel, metrics, eq_suggested, eq_signal,
 *   cq_status, cq_reason, data_gaps, raw
 * }
 *
 * Note on robustness: the links endpoint and some post count includes are
 * semi-internal in Ghost and can vary by version. Every such call is wrapped
 * and, on failure, the missing signal is recorded in `data_gaps` rather than
 * guessed. The function never returns a score it could not observe.
 */

import crypto from 'node:crypto'

// ---------------------------------------------------------------
// Ghost Admin API JWT (HS256, kid:secret, aud:/admin/, 5-min exp)
// ---------------------------------------------------------------
function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function mintGhostToken(adminKey) {
  const [id, secret] = adminKey.split(':')
  if (!id || !secret) {
    throw new Error('GHOST_ADMIN_API_KEY must be in "id:secret" form')
  }
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }))
  const iat     = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({ iat, exp: iat + 300, aud: '/admin/' }))
  const data    = `${header}.${payload}`
  const sig     = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${data}.${sig}`
}

// ---------------------------------------------------------------
// EQ suggestion — maps observable Ghost signals to the 1–5 scale.
// Returns { eq, signal }. eq is null when nothing was observable.
// EQ 5 (pipeline signal) is always operator-only — no API exposes it.
// ---------------------------------------------------------------
function suggestEq(channel, m) {
  if (channel === 'newsletter') {
    if ((m.signups ?? 0) > 0 || (m.paid_conversions ?? 0) > 0)
      return { eq: 4, signal: 'newsletter drove a member signup/conversion' }
    if ((m.clicks ?? 0) > 0)
      return { eq: 3, signal: 'link clicks present' }
    if ((m.opened_count ?? 0) > 0)
      return { eq: 2, signal: 'opens recorded, no clicks' }
    if ((m.sends ?? 0) > 0)
      return { eq: 1, signal: 'delivered, no opens recorded' }
    return { eq: null, signal: 'no newsletter engagement data available' }
  }

  // ghost_article
  if ((m.paid_conversions ?? 0) > 0)
    return { eq: 4, signal: 'article drove a paid conversion' }
  if ((m.signups ?? 0) > 0)
    return { eq: 3, signal: 'article drove a member signup' }
  if ((m.comments ?? 0) > 0)
    return { eq: 3, signal: 'reader comments present' }
  if ((m.clicks ?? 0) > 0)
    return { eq: 2, signal: 'in-article link clicks present' }
  // Published, but deeper read signals (pageviews, read time) need Plausible,
  // which is a later phase. We do not invent an EQ above what we can see.
  return { eq: 1, signal: 'published; read-depth needs Plausible (deferred)' }
}

const CQ_PENDING_REASON =
  'CQ is sourced from named-engager identity (LinkedIn), connected in a later phase. ' +
  'Ghost exposes engagement counts but not who-by-name, so CQ stays pending rather than guessed.'

// ---------------------------------------------------------------
export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const ghostUrl = process.env.GHOST_URL
  const adminKey = process.env.GHOST_ADMIN_API_KEY
  if (!ghostUrl || !adminKey) {
    return json({ error: 'GHOST_URL and GHOST_ADMIN_API_KEY are required' }, 500)
  }

  let body
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const channel = body.channel === 'newsletter' ? 'newsletter' : 'ghost_article'
  const slug = body.post_slug
    ?? (body.post_url ? body.post_url.replace(/\/$/, '').split('/').pop() : null)
  if (!slug) {
    return json({ error: 'post_slug or post_url is required' }, 400)
  }

  const base = ghostUrl.replace(/\/$/, '')
  let token
  try { token = mintGhostToken(adminKey) } catch (err) {
    return json({ error: err.message }, 500)
  }
  const headers = { Authorization: `Ghost ${token}`, 'Accept-Version': 'v5.0' }
  const data_gaps = []

  // --- Fetch the post (metadata + email stats + member counts) ---
  let post
  try {
    const include = 'email,count.signups,count.paid_conversions,count.clicks'
    const res = await fetch(
      `${base}/ghost/api/admin/posts/slug/${slug}/?include=${include}`,
      { headers },
    )
    if (!res.ok) {
      const detail = await res.text()
      return json({ error: `Ghost ${res.status}`, detail }, res.status === 404 ? 404 : 502)
    }
    post = (await res.json())?.posts?.[0]
  } catch (err) {
    return json({ error: err.message }, 502)
  }
  if (!post) {
    return json({ error: 'Post not found', slug }, 404)
  }

  const counts = post.count ?? {}
  const email  = post.email ?? null

  // --- Link clicks (semi-internal; degrade on failure) ---
  let clicks = null
  try {
    const lr = await fetch(
      `${base}/ghost/api/admin/links/?filter=${encodeURIComponent(`post_id:'${post.id}'`)}`,
      { headers },
    )
    if (lr.ok) {
      const ld = await lr.json()
      clicks = (ld.links ?? []).reduce((sum, l) => sum + (l?.count?.clicks ?? 0), 0)
    } else {
      data_gaps.push(`link clicks (links endpoint returned ${lr.status})`)
    }
  } catch {
    data_gaps.push('link clicks (links endpoint unavailable on this instance)')
  }

  // --- Assemble channel-specific signals ---
  const metrics = {}

  if (channel === 'newsletter') {
    if (email) {
      if (email.email_count    != null) metrics.sends        = email.email_count
      if (email.delivered_count != null) metrics.delivered    = email.delivered_count
      if (email.opened_count   != null) metrics.opened_count = email.opened_count
      if (email.email_count && email.opened_count != null) {
        metrics.open_rate = Math.round((email.opened_count / email.email_count) * 1000) / 10
      }
    } else {
      data_gaps.push('newsletter stats (this post was not sent as an email)')
    }
    if (clicks != null) metrics.clicks = clicks
    if (counts.signups != null) metrics.signups = counts.signups
    if (counts.paid_conversions != null) metrics.paid_conversions = counts.paid_conversions
  } else {
    // ghost_article
    if (counts.signups != null)         metrics.signups          = counts.signups
    if (counts.paid_conversions != null) metrics.paid_conversions = counts.paid_conversions
    if (counts.clicks != null)          metrics.member_clicks    = counts.clicks
    if (clicks != null)                 metrics.clicks           = clicks
    if (post.reading_time != null)      metrics.reading_time     = post.reading_time
  }

  const { eq, signal } = suggestEq(channel, metrics)

  return json({
    channel,
    title:        post.title,
    published_at: post.published_at,
    url:          post.url,
    metrics,
    eq_suggested: eq,
    eq_signal:    signal,
    cq_status:    'pending',
    cq_reason:    CQ_PENDING_REASON,
    data_gaps,
    raw: { post, links_total_clicks: clicks },
  }, 200)
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/mcp-ghost' }
