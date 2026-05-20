/**
 * mcp-search-console.js
 * Returns organic search impressions and clicks for a URL from Google Search Console.
 *
 * Auth: Google service account (recommended for server-to-server).
 *
 * Required env vars (Netlify dashboard):
 *   GSC_SERVICE_ACCOUNT_EMAIL  — service account email, e.g. turquoise@project.iam.gserviceaccount.com
 *   GSC_PRIVATE_KEY            — service account private key (PEM, with \n escaped as \\n)
 *   GSC_SITE_URL               — verified property URL, e.g. "https://turquoise.live/"
 *
 * Setup steps:
 *   1. Google Cloud Console > Create service account > Download JSON key
 *   2. Google Search Console > Settings > Users and permissions > Add user (service account email, Restricted)
 *   3. Add GSC_SERVICE_ACCOUNT_EMAIL and GSC_PRIVATE_KEY (from JSON key) to Netlify env
 *
 * POST /api/mcp-search-console
 * Body: { page_url, start_date?, end_date? }
 * Returns: { clicks, impressions, ctr, position, raw }
 */

// Minimal JWT signer for Google OAuth (no external deps)
async function signJwt(payload, privateKeyPem) {
  const header  = { alg: 'RS256', typ: 'JWT' }
  const encode  = obj => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const input   = `${encode(header)}.${encode(payload)}`

  const keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(input),
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${input}.${sigB64}`
}

async function getGoogleAccessToken(serviceEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000)
  const jwt = await signJwt(
    {
      iss:   serviceEmail,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud:   'https://oauth2.googleapis.com/token',
      iat:   now,
      exp:   now + 3600,
    },
    privateKey,
  )

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  const data = await res.json()
  return data.access_token
}

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const serviceEmail = process.env.GSC_SERVICE_ACCOUNT_EMAIL
  const privateKey   = (process.env.GSC_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  const siteUrl      = process.env.GSC_SITE_URL

  if (!serviceEmail || !privateKey || !siteUrl) {
    return new Response(
      JSON.stringify({ error: 'GSC_SERVICE_ACCOUNT_EMAIL, GSC_PRIVATE_KEY, and GSC_SITE_URL are required' }),
      { status: 500 },
    )
  }

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { page_url, start_date, end_date } = body

  if (!page_url) {
    return new Response(JSON.stringify({ error: 'page_url is required' }), { status: 400 })
  }

  const endDateStr   = end_date   ?? new Date().toISOString().slice(0, 10)
  const startDateStr = start_date ?? new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10)

  try {
    const token = await getGoogleAccessToken(serviceEmail, privateKey)

    const encodedSite = encodeURIComponent(siteUrl)
    const apiUrl      = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`

    const res = await fetch(apiUrl, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate:       startDateStr,
        endDate:         endDateStr,
        dimensions:      ['page'],
        dimensionFilterGroups: [{
          filters: [{
            dimension:  'page',
            operator:   'equals',
            expression: page_url,
          }],
        }],
        rowLimit: 1,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return new Response(
        JSON.stringify({ error: `Search Console ${res.status}`, detail: text }),
        { status: 502 },
      )
    }

    const data = await res.json()
    const row  = data?.rows?.[0]

    return new Response(
      JSON.stringify({
        metrics: {
          clicks:      row?.clicks      ?? 0,
          impressions: row?.impressions  ?? 0,
          ctr:         row?.ctr         ?? 0,
          position:    row?.position    ?? null,
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

export const config = { path: '/api/mcp-search-console' }
