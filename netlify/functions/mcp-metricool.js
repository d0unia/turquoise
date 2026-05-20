/**
 * mcp-metricool.js
 * Returns engagement metrics for a LinkedIn or X post from Metricool.
 *
 * Required env vars (Netlify dashboard):
 *   METRICOOL_API_TOKEN  — your Metricool API token
 *   METRICOOL_USER_TOKEN — your Metricool user token (from account settings)
 *
 * POST /api/mcp-metricool
 * Body: { action_id, channel, post_url, post_date }
 * Returns: { impressions, reactions, comments, shares, saves, raw }
 */

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

function normalizeLinkedIn(raw) {
  // Metricool LinkedIn post stats shape
  const stats = raw?.stats ?? raw?.data ?? raw
  return {
    impressions: stats?.impressions ?? stats?.reach    ?? null,
    reactions:   stats?.reactions   ?? stats?.likes    ?? null,
    comments:    stats?.comments    ?? null,
    shares:      stats?.shares      ?? stats?.reposts  ?? null,
    saves:       stats?.saves       ?? null,
  }
}

function normalizeX(raw) {
  const stats = raw?.stats ?? raw?.data ?? raw
  return {
    impressions: stats?.impressions ?? null,
    reactions:   stats?.likes       ?? null,
    comments:    stats?.replies     ?? null,
    shares:      stats?.retweets    ?? null,
    saves:       stats?.bookmarks   ?? null,
  }
}

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const token     = process.env.METRICOOL_API_TOKEN
  const userToken = process.env.METRICOOL_USER_TOKEN

  if (!token || !userToken) {
    return new Response(
      JSON.stringify({ error: 'METRICOOL_API_TOKEN and METRICOOL_USER_TOKEN are required' }),
      { status: 500 },
    )
  }

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { channel, post_url, post_date } = body

  if (!post_url) {
    return new Response(JSON.stringify({ error: 'post_url is required' }), { status: 400 })
  }

  try {
    const isX        = channel === 'x'
    const network    = isX ? 'twitter' : 'linkedin'
    const startDate  = post_date ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const endDate    = new Date().toISOString().slice(0, 10)

    // Fetch post list for the network in date range, match by URL
    const data = await metricoolGet(
      `/stats/${network}/posts?startDate=${startDate}&endDate=${endDate}`,
      token,
      userToken,
    )

    const posts = data?.data ?? data?.posts ?? data ?? []
    const match = posts.find(p =>
      (p.url ?? p.permalink ?? p.link ?? '').includes(
        post_url.split('/').filter(Boolean).pop()
      )
    )

    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Post not found in Metricool for this date range', post_url }),
        { status: 404 },
      )
    }

    const metrics = isX ? normalizeX(match) : normalizeLinkedIn(match)

    return new Response(
      JSON.stringify({ metrics, raw: match }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

export const config = { path: '/api/mcp-metricool' }
