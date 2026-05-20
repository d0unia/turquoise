/**
 * mcp-plausible.js
 * Returns page-level stats from Plausible Analytics for a given URL.
 *
 * Required env vars (Netlify dashboard):
 *   PLAUSIBLE_API_KEY   — API key from plausible.io account settings
 *   PLAUSIBLE_SITE_ID   — your site domain, e.g. "turquoise.live"
 *   PLAUSIBLE_BASE_URL  — e.g. "https://plausible.io" (or self-hosted URL)
 *
 * POST /api/mcp-plausible
 * Body: { page_path, start_date?, end_date? }
 *   page_path: the path component, e.g. "/blog/my-article"
 * Returns: { visitors, pageviews, bounce_rate, visit_duration, raw }
 */

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey   = process.env.PLAUSIBLE_API_KEY
  const siteId   = process.env.PLAUSIBLE_SITE_ID
  const baseUrl  = process.env.PLAUSIBLE_BASE_URL ?? 'https://plausible.io'

  if (!apiKey || !siteId) {
    return new Response(
      JSON.stringify({ error: 'PLAUSIBLE_API_KEY and PLAUSIBLE_SITE_ID are required' }),
      { status: 500 },
    )
  }

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { page_path, start_date, end_date } = body

  if (!page_path) {
    return new Response(JSON.stringify({ error: 'page_path is required' }), { status: 400 })
  }

  const period = start_date && end_date
    ? `period=custom&date=${start_date},${end_date}`
    : 'period=30d'

  const metrics = 'visitors,pageviews,bounce_rate,visit_duration'
  const filters = encodeURIComponent(`event:page==${page_path}`)

  const url = `${baseUrl}/api/v1/stats/aggregate?site_id=${siteId}&${period}&metrics=${metrics}&filters=${filters}`

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return new Response(
        JSON.stringify({ error: `Plausible ${res.status}`, detail: text }),
        { status: 502 },
      )
    }

    const data = await res.json()
    const r    = data?.results ?? {}

    return new Response(
      JSON.stringify({
        metrics: {
          visitors:       r.visitors?.value       ?? null,
          pageviews:      r.pageviews?.value      ?? null,
          bounce_rate:    r.bounce_rate?.value    ?? null,
          visit_duration: r.visit_duration?.value ?? null,
        },
        raw: data,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

export const config = { path: '/api/mcp-plausible' }
