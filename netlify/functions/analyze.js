import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY

const WINDOW_DAYS = 90
const MODEL = 'claude-haiku-4-5-20251001'

// ---------------------------------------------------------------
// Deterministic stats — the compounding signal is grounded in real
// numbers (level + slope), not the model's interpretation.
// ---------------------------------------------------------------
const DAY = 86400000
const round1 = x => Math.round(x * 10) / 10

function linregSlope(points) {
  // points: [{ x: dayIndex, y: aq }]; returns AQ units per day, or null.
  const n = points.length
  if (n < 3) return null
  const sx = points.reduce((s, p) => s + p.x, 0)
  const sy = points.reduce((s, p) => s + p.y, 0)
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0)
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0)
  const d = n * sxx - sx * sx
  if (d === 0) return null
  return (n * sxy - sx * sy) / d
}

function trendLabel(slope) {
  if (slope == null) return 'insufficient'
  const perMonth = slope * 30
  if (perMonth >= 2)  return 'rising'
  if (perMonth <= -2) return 'declining'
  return 'flat'
}

function channelBreakdown(scored, earliest) {
  const by = {}
  for (const a of scored) (by[a.channel] ??= []).push(a)
  return Object.entries(by).map(([channel, items]) => {
    const pts = items
      .map(a => ({ x: Math.round((new Date(a.action_date) - earliest) / DAY), y: a.aq_score }))
      .sort((a, b) => a.x - b.x)
    const avg = items.reduce((s, a) => s + a.aq_score, 0) / items.length
    const slope = linregSlope(pts)
    return { channel, n: items.length, avg_aq: round1(avg), slope_per_month: slope == null ? null : round1(slope * 30), trend: trendLabel(slope) }
  }).sort((a, b) => b.avg_aq - a.avg_aq)
}

function formatActions(actions) {
  return actions.map((a, i) => {
    const date = a.action_date ? a.action_date.slice(0, 10) : 'unknown'
    const aq   = a.aq_score != null ? `AQ ${a.aq_score}` : 'AQ pending'
    const acct = a.social_accounts?.display_name ? ` | ${a.social_accounts.display_name}` : ''
    const lines = [`[${i + 1}] ${date} | ${a.channel ?? 'unknown'} | ${aq}${acct} | ${a.title ?? 'untitled'}`]
    if (a.notes) lines.push(`    Notes: ${a.notes}`)
    return lines.join('\n')
  }).join('\n')
}

// ---------------------------------------------------------------
const SYSTEM_PROMPT = `You are an attention strategist embedded in Turquoise, a B2B content-intelligence tool.

Turquoise scores every published piece on its ATTENTION QUOTIENT, inspired by McKinsey's attention equation: valuable attention is defined by quality, not reach.
- Focus (0-100): how ACTIVE vs passive the attention was (comments/shares/saves/read-depth per reach), not impressions.
- Intent (0-100): the JOB TO BE DONE — self-directed pull toward the brand (search arrival, click-through to owned, saves, signups) per reach.
- AQ = Focus x Intent, 0-100. TAS = rolling-90-day mean of AQ (the portfolio metric).

You are given DETERMINISTIC stats already computed from the data: per-channel average AQ, AQ slope per month, and a trend label. These numbers are ground truth — reason FROM them, never invent or contradict them.

Compounding means high AQ that is ALSO accelerating (rising trend) — each piece earns higher-quality attention than the last. A high but flat average is steady, not compounding. A declining trend despite volume is a treadmill.

Be honest. Do not flatter. Cite specific actions by number/date and specific channels by their computed stats. Never reference reach or vanity counts as success.`

const USER_PROMPT = (stats, formatted) => `Here is the action log and the computed attention stats over the last ${WINDOW_DAYS} days.

OVERALL: ${stats.scored_count} scored actions, average AQ ${stats.avg_aq}/100, overall trend ${stats.overall_trend} (${stats.overall_slope_per_month >= 0 ? '+' : ''}${stats.overall_slope_per_month} AQ/month). ${stats.pending_count} actions are still pending a score.

PER-CHANNEL (computed):
${stats.channels.map(c => `- ${c.channel}: n=${c.n}, avg AQ ${c.avg_aq}, trend ${c.trend}${c.slope_per_month != null ? ` (${c.slope_per_month >= 0 ? '+' : ''}${c.slope_per_month}/mo)` : ''}`).join('\n')}

ACTION LOG (newest first):
${formatted}

Return ONLY valid JSON with exactly this structure:
{
  "compounding":     [{ "observation": "...", "evidence": "..." }],
  "underperforming": [{ "observation": "...", "evidence": "..." }],
  "signals":         [{ "observation": "...", "evidence": "..." }],
  "blind_spots":     [{ "observation": "...", "evidence": "..." }],
  "content_brief": {
    "recommended_angle":   "...",
    "recommended_format":  "...",
    "recommended_channel": "...",
    "icp_hook":            "...",
    "what_to_avoid":       "...",
    "amplify":             ["..."],
    "reduce":              ["..."],
    "test_next":           "...",
    "distribution_note":   "..."
  }
}

Rules:
- compounding: up to 3 patterns that are high AND rising (cite the channel trend/slope).
- underperforming: up to 3 patterns that are low or declining despite volume.
- signals: up to 2 emerging patterns worth testing before they are obvious.
- blind_spots: 1-2 gaps not visible in the data alone.
- content_brief: amplify/reduce/test_next/distribution_note are the feedback PRESSROOM injects into its next draft; recommended_* describe the one concrete next piece.
- Every observation cites specific actions or channel stats. Return only JSON, no prose.`

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return json({ error: 'Missing authorization token' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const since = new Date(Date.now() - WINDOW_DAYS * DAY).toISOString().slice(0, 10)
  const { data: actions, error: dbError } = await supabase
    .from('actions')
    .select('id, organization_id, action_date, channel, title, aq_score, notes, status, social_accounts(display_name)')
    .neq('status', 'untracked')
    .gte('action_date', since)
    .order('action_date', { ascending: false })
    .limit(120)

  if (dbError) return json({ error: 'Database error', detail: dbError.message }, 500)
  if (!actions || actions.length === 0) {
    return json({ error: 'No actions in the last 90 days. Log and score some content first.' }, 422)
  }

  const scored = actions.filter(a => a.aq_score != null)
  if (scored.length < 1) {
    return json({ error: 'No scored actions yet. Fetch metrics so pieces get an AQ, then analyse.' }, 422)
  }

  const dates = scored.map(a => new Date(a.action_date))
  const earliest = new Date(Math.min(...dates))
  const overallPts = scored
    .map(a => ({ x: Math.round((new Date(a.action_date) - earliest) / DAY), y: a.aq_score }))
    .sort((a, b) => a.x - b.x)
  const overallSlope = linregSlope(overallPts)

  const stats = {
    scored_count: scored.length,
    pending_count: actions.length - scored.length,
    avg_aq: round1(scored.reduce((s, a) => s + a.aq_score, 0) / scored.length),
    overall_slope_per_month: overallSlope == null ? 0 : round1(overallSlope * 30),
    overall_trend: trendLabel(overallSlope),
    channels: channelBreakdown(scored, earliest),
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let message
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: USER_PROMPT(stats, formatActions(actions)) }],
    })
  } catch (err) {
    return json({ error: 'Anthropic API error', detail: err.message }, 502)
  }

  const raw = message.content?.[0]?.text ?? ''
  let analysis
  try {
    analysis = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim())
  } catch {
    return json({ error: 'Failed to parse model output', raw }, 500)
  }

  const generated_at = new Date().toISOString()
  const meta = {
    actions_analysed: actions.length,
    scored_actions:   scored.length,
    avg_aq:           stats.avg_aq,
    avg_action_score: stats.avg_aq,        // back-compat alias for the views
    overall_trend:    stats.overall_trend,
    window_days:      WINDOW_DAYS,
    generated_at,
  }

  // Persist the brief — the feedback payload PRESSROOM consumes. Storage
  // failure must not fail the response; we flag it instead.
  const brief = analysis.content_brief ?? {}
  let stored = false
  try {
    const { error: insErr } = await supabase.from('content_briefs').insert({
      organization_id:   actions[0].organization_id,
      generated_at,
      compounding:       analysis.compounding ?? null,
      underperforming:   analysis.underperforming ?? null,
      signals:           analysis.signals ?? null,
      blind_spots:       analysis.blind_spots ?? null,
      amplify:           brief.amplify ?? null,
      reduce:            brief.reduce ?? null,
      test_next:         brief.test_next ?? null,
      distribution_note: brief.distribution_note ?? null,
      meta:              { ...meta, next_piece: {
        recommended_angle:   brief.recommended_angle ?? null,
        recommended_format:  brief.recommended_format ?? null,
        recommended_channel: brief.recommended_channel ?? null,
        icp_hook:            brief.icp_hook ?? null,
        what_to_avoid:       brief.what_to_avoid ?? null,
      } },
    })
    stored = !insErr
  } catch { /* non-fatal */ }

  return json({ analysis, meta: { ...meta, stored, stats } }, 200)
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}

export const config = { path: '/api/analyze' }
