/**
 * mcp-metricool.js
 * Metricool connector for Turquoise — LinkedIn + X post engagement.
 *
 * Returns aggregate engagement counts for a post and the Attention Quotient
 * scores (Focus / Intent / AQ) computed from them via the shared attention
 * model. Uses only AGGREGATE counts (reactions/comments/shares/clicks/saves
 * per impressions) — never named-engager identity, which LinkedIn gates.
 *
 *   Focus  <- reactions, comments, shares   (active vs passive)
 *   Intent <- link clicks, saves            (self-directed pull)
 *   reach   = impressions
 *
 * Required env vars (Netlify dashboard):
 *   METRICOOL_API_TOKEN  — your Metricool API token
 *   METRICOOL_USER_TOKEN — your Metricool user token
 *
 * POST /api/mcp-metricool
 * Body: { channel, post_url, post_date }
 *   channel: 'linkedin_personal' | 'linkedin_company' | 'x'
 */

import { scoreAttention } from '../lib/attention.js'

const BASE = 'https://app.metricool.com/api/v2'

async function metricoolGet(path, token, userToken) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-Token':  userToken,
      'Content-Type':  'application/json',
    },
  })
  if (!res.ok) throw new Error(`Metricool ${res.status}: ${await res.text()}`)
  return res.json()
}

// Map a Metricool post record to the attention counts vocabulary + reach.
function extractSignals(network, raw) {
  const s = raw?.stats ?? raw?.data ?? raw ?? {}
  if (network === 'twitter') {
    return {
      reach: s.impressions ?? null,
      counts: {
        reaction: s.likes      ?? null,   // Focus
        comment:  s.replies    ?? null,   // Focus
        share:    s.retweets   ?? null,   // Focus
        click:    s.urlClicks  ?? s.clicks ?? null,  // Intent
        save:     s.bookmarks  ?? null,   // Intent
      },
    }
  }
  // linkedin
  return {
    reach: s.impressions ?? s.reach ?? null,
    counts: {
      reaction: s.reactions ?? s.likes   ?? null,   // Focus
      comment:  s.comments  ?? null,                // Focus
      share:    s.shares    ?? s.reposts ?? null,   // Focus
      click:    s.clicks    ?? s.linkClicks ?? null, // Intent
      save:     s.saves     ?? null,                // Intent
    },
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const token     = process.env.METRICOOL_API_TOKEN
  const userToken = process.env.METRICOOL_USER_TOKEN
  if (!token || !userToken) {
    return json({ error: 'METRICOOL_API_TOKEN and METRICOOL_USER_TOKEN are required' }, 500)
  }

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const { channel, post_url, post_date } = body
  if (!post_url) return json({ error: 'post_url is required' }, 400)

  const isX     = channel === 'x'
  const network = isX ? 'twitter' : 'linkedin'
  const startDate = post_date ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const endDate   = new Date().toISOString().slice(0, 10)

  let match
  try {
    const data  = await metricoolGet(
      `/stats/${network}/posts?startDate=${startDate}&endDate=${endDate}`, token, userToken,
    )
    const posts = data?.data ?? data?.posts ?? data ?? []
    const tail  = post_url.split('/').filter(Boolean).pop()
    match = posts.find(p => (p.url ?? p.permalink ?? p.link ?? '').includes(tail))
  } catch (err) {
    return json({ error: err.message }, 502)
  }

  if (!match) {
    return json({ error: 'Post not found in Metricool for this date range', post_url }, 404)
  }

  const { reach, counts } = extractSignals(network, match)
  const score = scoreAttention({ counts, reach, klass: 'social' })

  // Display metrics — only the signals actually present.
  const metrics = {}
  if (reach != null) metrics.impressions = reach
  for (const [k, v] of Object.entries(counts)) if (v != null) metrics[k] = v

  return json({
    channel,
    metrics,
    reach,
    focus_score:  score.focus_score,
    intent_score: score.intent_score,
    aq_score:     score.aq_score,
    aq_status:    score.aq_status,
    score_inputs: score.score_inputs,
    data_gaps:    score.data_gaps,
    raw: match,
  }, 200)
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}

export const config = { path: '/api/mcp-metricool' }
