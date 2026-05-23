/**
 * attention.js — Attention Quotient scoring (Focus x Intent).
 *
 * Inspired by McKinsey's "attention equation": value-bearing attention is
 * defined by FOCUS (active vs passive engagement) and INTENT (the job to be
 * done). Both are computed from aggregate, automatically-collectable signals
 * — counts normalised by reach into rates. No engager identity required.
 *
 * Honesty rule: AQ is only produced when BOTH dimensions are measurable.
 * If only one is, status is 'partial' and AQ is withheld; if neither (or no
 * reach), status is 'pending'. We never emit a fabricated or fake-zero score.
 */

export const DEFAULT_WEIGHTS = {
  // Focus — depth/active-ness of attention (the attention-cost ladder)
  reaction: 1,   // like / emoji / passive reaction
  open:     1,   // email open
  share:    5,   // share / repost
  comment:  6,   // wrote something — costly attention
  // Intent — self-directed pull toward the owned property
  click:        3,  // click-through to owned
  search_click: 4,  // arrived via organic search (sought it out)
  save:         5,  // bookmarked to return
  signup:       8,  // subscribed / became a member
  conversion:  10,  // converted
}

// "Excellent" raw-rate thresholds (weighted events / reach) per channel class.
// Defaults now; recalibrated from the publisher's own distribution as KPIs accrue.
export const DEFAULT_TARGETS = {
  social:     { focus: 0.06, intent: 0.03 },
  newsletter: { focus: 0.50, intent: 0.05 },
  article:    { focus: 0.40, intent: 0.10 },
}

const FOCUS_KEYS  = ['reaction', 'open', 'share', 'comment']
const INTENT_KEYS = ['click', 'search_click', 'save', 'signup', 'conversion']

/**
 * @param {object}  p
 * @param {object}  p.counts  aggregate event counts, e.g. { reaction, comment, share, open, click, save, signup, conversion, search_click }
 * @param {number}  p.reach   denominator (impressions / delivered / pageviews)
 * @param {string}  p.klass   'social' | 'newsletter' | 'article'
 * @param {object} [p.weights]
 * @param {object} [p.targets]
 * @returns {{ aq_status, focus_score, intent_score, aq_score, data_gaps, score_inputs }}
 */
export function scoreAttention({ counts = {}, reach, klass = 'social', weights = DEFAULT_WEIGHTS, targets = DEFAULT_TARGETS }) {
  const t = targets[klass] ?? targets.social
  const data_gaps = []

  if (!reach || reach <= 0) {
    return {
      aq_status: 'pending',
      focus_score: null, intent_score: null, aq_score: null,
      data_gaps: ['reach unavailable — cannot rate-normalise'],
      score_inputs: { counts, reach: reach ?? null, klass },
    }
  }

  const weightedSum = (keys) => keys.reduce((s, k) => {
    const v = counts[k]
    return v == null ? s : s + (weights[k] ?? 0) * v
  }, 0)

  const focusPresent  = FOCUS_KEYS.some(k => counts[k] != null)
  const intentPresent = INTENT_KEYS.some(k => counts[k] != null)

  const focus_raw  = weightedSum(FOCUS_KEYS)  / reach
  const intent_raw = weightedSum(INTENT_KEYS) / reach

  const focus_score  = focusPresent  ? clamp01(focus_raw  / t.focus)  : null
  const intent_score = intentPresent ? clamp01(intent_raw / t.intent) : null

  if (!focusPresent)  data_gaps.push('no Focus signals available')
  if (!intentPresent) data_gaps.push('no Intent signals available')

  let aq_status, aq_score = null
  if (focus_score != null && intent_score != null) {
    aq_status = 'scored'
    aq_score  = Math.round(focus_score * intent_score * 100)
  } else if (focus_score != null || intent_score != null) {
    aq_status = 'partial'   // one dimension measured; AQ withheld by the honesty rule
  } else {
    aq_status = 'pending'
  }

  return {
    aq_status, focus_score, intent_score, aq_score, data_gaps,
    score_inputs: { counts, reach, klass, focus_raw, intent_raw, targets: t },
  }
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return x < 0 ? 0 : x > 1 ? 1 : x
}
