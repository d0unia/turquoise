/**
 * mcp-ghost.js
 * Ghost Admin API connector for Turquoise.
 *
 * Returns observable engagement signals for a published piece on two channels
 * — the article and the newsletter send — and the Attention Quotient scores
 * (Focus / Intent / AQ) computed from those signals via the shared attention
 * model. All inputs are aggregate counts; no engager identity is used.
 *
 *   Newsletter: reach = delivered; scorable now from Ghost data alone.
 *   Article:    reach = pageviews — needs Plausible/Search Console (later
 *               phase), so AQ is returned 'pending' rather than guessed.
 *
 * Why the Admin API (not Content): newsletter stats (sends/opens) and
 * post-level signups/conversions are only visible to the Admin API.
 *
 * Required env vars (Netlify dashboard):
 *   GHOST_URL             — e.g. "https://resources.scopelabs.work"
 *   GHOST_ADMIN_API_KEY   — "id:secret" from Ghost Admin > Integrations
 *
 * POST /api/mcp-ghost
 * Body: { channel, post_slug } OR { channel, post_url }
 *   channel: 'ghost_article' | 'newsletter'  (defaults to 'ghost_article')
 */

import crypto from 'node:crypto'
import { scoreAttention } from '../lib/attention.js'

// ---------------------------------------------------------------
// Ghost Admin API JWT (HS256, kid:secret, aud:/admin/, 5-min exp)
// ---------------------------------------------------------------
function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function mintGhostToken(adminKey) {
  const [id, secret] = adminKey.split(':')
  if (!id || !secret) throw new Error('GHOST_ADMIN_API_KEY must be in "id:secret" form')
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }))
  const iat     = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({ iat, exp: iat + 300, aud: '/admin/' }))
  const data    = `${header}.${payload}`
  const sig     = crypto.createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(data).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${data}.${sig}`
}

export default async function handler(req, context) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const ghostUrl = process.env.GHOST_URL
  const adminKey = process.env.GHOST_ADMIN_API_KEY
  if (!ghostUrl || !adminKey) {
    return json({ error: 'GHOST_URL and GHOST_ADMIN_API_KEY are required' }, 500)
  }

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const channel = body.channel === 'newsletter' ? 'newsletter' : 'ghost_article'
  const slug = body.post_slug
    ?? (body.post_url ? body.post_url.replace(/\/$/, '').split('/').pop() : null)
  if (!slug) return json({ error: 'post_slug or post_url is required' }, 400)

  const base = ghostUrl.replace(/\/$/, '')
  let token
  try { token = mintGhostToken(adminKey) } catch (err) { return json({ error: err.message }, 500) }
  const headers = { Authorization: `Ghost ${token}`, 'Accept-Version': 'v5.0' }
  const data_gaps = []

  // --- Fetch the post (metadata + email stats + member counts) ---
  let post
  try {
    const include = 'email,count.signups,count.paid_conversions,count.clicks'
    const res = await fetch(`${base}/ghost/api/admin/posts/slug/${slug}/?include=${include}`, { headers })
    if (!res.ok) {
      const detail = await res.text()
      return json({ error: `Ghost ${res.status}`, detail }, res.status === 404 ? 404 : 502)
    }
    post = (await res.json())?.posts?.[0]
  } catch (err) {
    return json({ error: err.message }, 502)
  }
  if (!post) return json({ error: 'Post not found', slug }, 404)

  const cnt   = post.count ?? {}
  const email = post.email ?? null

  // --- Link clicks (semi-internal; degrade on failure) ---
  let clicks = null
  try {
    const lr = await fetch(
      `${base}/ghost/api/admin/links/?filter=${encodeURIComponent(`post_id:'${post.id}'`)}`,
      { headers },
    )
    if (lr.ok) {
      const ld = await lr.json()
      clicks = (ld.links ?? []).reduce((s, l) => s + (l?.count?.clicks ?? 0), 0)
    } else {
      data_gaps.push(`link clicks (links endpoint returned ${lr.status})`)
    }
  } catch {
    data_gaps.push('link clicks (links endpoint unavailable on this instance)')
  }

  // --- Assemble display metrics + scoring inputs per channel ---
  const metrics = {}
  let reach = null
  let counts = {}
  let klass  = 'article'

  if (channel === 'newsletter') {
    klass = 'newsletter'
    if (email) {
      reach = email.delivered_count ?? email.email_count ?? null
      if (email.email_count     != null) metrics.sends     = email.email_count
      if (email.delivered_count != null) metrics.delivered = email.delivered_count
      if (email.opened_count    != null) metrics.opened    = email.opened_count
      if (email.email_count && email.opened_count != null) {
        metrics.open_rate = Math.round((email.opened_count / email.email_count) * 1000) / 10
      }
    } else {
      data_gaps.push('newsletter stats (this post was not sent as an email)')
    }
    if (clicks != null)          metrics.clicks      = clicks
    if (cnt.signups != null)     metrics.signups     = cnt.signups
    if (cnt.paid_conversions != null) metrics.conversions = cnt.paid_conversions

    counts = {
      open:       email?.opened_count ?? null,
      click:      clicks ?? null,
      signup:     cnt.signups ?? null,
      conversion: cnt.paid_conversions ?? null,
    }
  } else {
    // ghost_article — reach (pageviews) needs Plausible/Search Console (later phase)
    klass = 'article'
    reach = null
    data_gaps.push('article reach (pageviews) needs Plausible or Search Console — AQ pending')
    if (cnt.signups != null)          metrics.signups      = cnt.signups
    if (cnt.paid_conversions != null) metrics.conversions  = cnt.paid_conversions
    if (cnt.clicks != null)           metrics.member_clicks = cnt.clicks
    if (clicks != null)               metrics.clicks       = clicks
    if (post.reading_time != null)    metrics.reading_time = post.reading_time

    counts = {
      click:      (clicks ?? cnt.clicks) ?? null,
      signup:     cnt.signups ?? null,
      conversion: cnt.paid_conversions ?? null,
    }
  }

  // --- Score: Focus x Intent (defaults; recalibrated later from KPIs) ---
  const score = scoreAttention({ counts, reach, klass })

  return json({
    channel,
    title:        post.title,
    published_at: post.published_at,
    url:          post.url,
    metrics,
    reach,
    focus_score:  score.focus_score,
    intent_score: score.intent_score,
    aq_score:     score.aq_score,
    aq_status:    score.aq_status,
    score_inputs: score.score_inputs,
    data_gaps:    [...data_gaps, ...score.data_gaps],
    raw: { post, links_total_clicks: clicks },
  }, 200)
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/mcp-ghost' }
