/**
 * mcp-ghost.js
 * Returns post stats from Ghost Content API for a given slug or URL.
 *
 * Required env vars (Netlify dashboard):
 *   GHOST_URL            — e.g. "https://resources.scopelabs.work"
 *   GHOST_CONTENT_API_KEY — from Ghost Admin > Integrations > Add custom integration
 *
 * POST /api/mcp-ghost
 * Body: { post_slug } OR { post_url }
 * Returns: { title, published_at, reading_time, url, raw }
 *
 * Note: Ghost Content API does not expose view counts natively.
 * View counts come from Plausible (use mcp-plausible for that).
 * This function returns post metadata and member/email stats if available.
 */

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const ghostUrl = process.env.GHOST_URL
  const apiKey   = process.env.GHOST_CONTENT_API_KEY

  if (!ghostUrl || !apiKey) {
    return new Response(
      JSON.stringify({ error: 'GHOST_URL and GHOST_CONTENT_API_KEY are required' }),
      { status: 500 },
    )
  }

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { post_slug, post_url } = body

  // Derive slug from URL if needed
  const slug = post_slug
    ?? (post_url ? post_url.replace(/\/$/, '').split('/').pop() : null)

  if (!slug) {
    return new Response(
      JSON.stringify({ error: 'post_slug or post_url is required' }),
      { status: 400 },
    )
  }

  const endpoint = `${ghostUrl.replace(/\/$/, '')}/ghost/api/content/posts/slug/${slug}/?key=${apiKey}&fields=id,title,slug,url,published_at,reading_time,email_subject,email_recipient_filter`

  try {
    const res = await fetch(endpoint, {
      headers: { 'Accept-Version': 'v5.0' },
    })

    if (!res.ok) {
      const text = await res.text()
      return new Response(
        JSON.stringify({ error: `Ghost ${res.status}`, detail: text }),
        { status: res.status === 404 ? 404 : 502 },
      )
    }

    const data = await res.json()
    const post = data?.posts?.[0]

    if (!post) {
      return new Response(
        JSON.stringify({ error: 'Post not found', slug }),
        { status: 404 },
      )
    }

    return new Response(
      JSON.stringify({
        metrics: {
          title:        post.title,
          published_at: post.published_at,
          reading_time: post.reading_time,
          url:          post.url,
        },
        raw: post,
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

export const config = { path: '/api/mcp-ghost' }
