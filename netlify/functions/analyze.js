import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY

function eqLabel(eq) {
  const map = { 1: 'impressions only', 2: 'passive reactions', 3: 'substantive engagement', 4: 'DM / deep read', 5: 'pipeline signal' }
  return map[eq] ?? eq
}

function cqLabel(cq) {
  const map = { 1: 'no ICP match', 2: 'adjacent fit', 3: 'partial ICP match', 4: 'strong ICP match', 5: 'confirmed decision-maker' }
  return map[cq] ?? cq
}

function formatActions(actions) {
  return actions.map((a, i) => {
    const eq    = a.eq_score
    const cq    = a.cq_score
    const score = (eq ?? 0) * (cq ?? 0)
    const date  = a.action_date ? a.action_date.slice(0, 10) : 'unknown date'
    const lines = [
      `[${i + 1}] ${date} | ${a.channel ?? 'unknown channel'} | ${a.title ?? 'untitled'}`,
      `    Action Score: ${score}/25  (EQ ${eq ?? '?'} = ${eqLabel(eq)} × CQ ${cq ?? '?'} = ${cqLabel(cq)})`,
    ]
    if (a.notes) lines.push(`    Notes: ${a.notes}`)
    if (a.social_accounts?.platform) lines.push(`    Platform account: ${a.social_accounts.platform}`)
    if (a.projects?.name) lines.push(`    Project: ${a.projects.name}`)
    return lines.join('\n')
  }).join('\n\n')
}

const SYSTEM_PROMPT = `You are a content strategist embedded in Turquoise, a marketing intelligence tool that tracks content actions and scores them against commercial audience fit.

Your job is to analyse a user's content action log and produce a structured compound analysis. You reason from evidence in the data. You do not guess or flatter.

Action Score = EQ × CQ (1–25).
EQ (Engagement Quotient 1–5): quality of engagement received.
  1 = impressions only, 2 = passive reactions, 3 = substantive comment/save/share, 4 = DM or deep read (>3min), 5 = pipeline signal.
CQ (Commercial Quotient 1–5): ICP fit of engaged audience.
  1 = no ICP match, 2 = adjacent, 3 = partial match, 4 = strong match, 5 = confirmed decision-maker at target account.
TAS = 90-day rolling average of all Action Scores. Higher = compounding with the right audience.

Your analysis must be honest. Low scores are not failures to soften. High scores with no commercial pattern are worth flagging.`

const USER_PROMPT_TEMPLATE = (formatted, avgScore, count) => `Here is the content action log for analysis. ${count} actions, average Action Score ${avgScore.toFixed(1)}/25 over the available period.

${formatted}

Return your analysis as a JSON object with exactly this structure:
{
  "compounding": [
    { "observation": "...", "evidence": "..." }
  ],
  "underperforming": [
    { "observation": "...", "evidence": "..." }
  ],
  "signals": [
    { "observation": "...", "evidence": "..." }
  ],
  "blind_spots": [
    { "observation": "...", "evidence": "..." }
  ],
  "content_brief": {
    "recommended_angle": "...",
    "recommended_format": "...",
    "recommended_channel": "...",
    "icp_hook": "...",
    "what_to_avoid": "..."
  }
}

Rules:
- compounding: patterns that are building commercial traction over time (high and rising Action Scores)
- underperforming: channels or topics with consistently low Action Scores despite volume
- signals: non-obvious observations worth acting on (timing, format, audience crossover, decay)
- blind_spots: gaps in the strategy not visible from reach data alone
- content_brief: one concrete next piece to publish, derived from the analysis above
- Each observation must cite specific actions from the log by number or date
- Return only valid JSON. No prose before or after.`

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build Supabase client with user JWT so RLS applies
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  // Fetch up to 60 actions (newest first), excluding untracked
  const { data: actions, error: dbError } = await supabase
    .from('actions')
    .select('id, action_date, channel, title, eq_score, cq_score, tas_score, notes, social_accounts(platform), projects(name)')
    .neq('channel', 'untracked')
    .order('action_date', { ascending: false })
    .limit(60)

  if (dbError) {
    return new Response(JSON.stringify({ error: 'Database error', detail: dbError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!actions || actions.length === 0) {
    return new Response(JSON.stringify({ error: 'No actions found. Log some content first.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const scored   = actions.filter(a => a.eq_score && a.cq_score)
  const avgScore = scored.length
    ? scored.reduce((sum, a) => sum + (a.eq_score * a.cq_score), 0) / scored.length
    : 0

  const formatted   = formatActions(actions)
  const userPrompt  = USER_PROMPT_TEMPLATE(formatted, avgScore, actions.length)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let message
  try {
    message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Anthropic API error', detail: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const raw = message.content?.[0]?.text ?? ''

  let analysis
  try {
    // Strip potential markdown code fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    analysis = JSON.parse(clean)
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse model output', raw }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      analysis,
      meta: {
        actions_analysed: actions.length,
        scored_actions:   scored.length,
        avg_action_score: Math.round(avgScore * 10) / 10,
        generated_at:     new Date().toISOString(),
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

export const config = { path: '/api/analyze' }
