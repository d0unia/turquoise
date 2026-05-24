/**
 * brief.js — the PRESSROOM-facing feedback endpoint.
 *
 * Returns the latest Content Brief so a PRESSROOM instance can inject it into
 * its draft prompt (amplify / reduce / test_next / distribution_note), closing
 * the Turquoise -> PRESSROOM loop.
 *
 * Server-to-server: reads content_briefs with the service-role key (bypasses
 * RLS, never exposed to a browser) and is gated by a shared token. Right-sized
 * for an internal PoC; swap for per-project auth if this ever goes multi-tenant.
 *
 * Required env vars (Netlify dashboard):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   — server-side only
 *   BRIEF_API_TOKEN             — shared secret; PRESSROOM sends it as Bearer
 *
 * GET /api/brief            -> latest brief (org-wide)
 * GET /api/brief?project=ID  -> latest brief for that project (when projects go first-class)
 * Header: Authorization: Bearer <BRIEF_API_TOKEN>
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const expected = process.env.BRIEF_API_TOKEN
  if (!expected) return json({ error: 'BRIEF_API_TOKEN not configured' }, 500)
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Supabase not configured' }, 500)

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (token !== expected) return json({ error: 'Unauthorized' }, 401)

  const project = new URL(req.url).searchParams.get('project')

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  let q = supabase
    .from('content_briefs')
    .select('generated_at, project_id, amplify, reduce, test_next, distribution_note, meta')
    .order('generated_at', { ascending: false })
    .limit(1)
  if (project) q = q.eq('project_id', project)

  const { data, error } = await q
  if (error) return json({ error: 'Database error', detail: error.message }, 500)
  if (!data || data.length === 0) return json({ error: 'No brief generated yet' }, 404)

  const b = data[0]
  return json({
    generated_at:      b.generated_at,
    project_id:        b.project_id,
    amplify:           b.amplify ?? [],
    reduce:            b.reduce ?? [],
    test_next:         b.test_next ?? null,
    distribution_note: b.distribution_note ?? null,
    next_piece:        b.meta?.next_piece ?? null,
  }, 200)
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}

export const config = { path: '/api/brief' }
