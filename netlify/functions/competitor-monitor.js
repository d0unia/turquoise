/**
 * competitor-monitor.js
 * Netlify scheduled function — runs every Monday at 07:00 UTC.
 * Fetches each active competitor page, diffs against last snapshot,
 * writes a new competitor_snapshots row via Supabase service role.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL          — already set
 *   SUPABASE_SERVICE_ROLE_KEY  — add in Netlify dashboard
 */

import { createClient } from '@supabase/supabase-js'
import crypto            from 'crypto'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const USER_AGENT    = 'Turquoise-Monitor/1.0 (+https://turquoise.live)'
const FETCH_TIMEOUT = 12000

// ---------------------------------------------------------------
// HTML parsing — no external deps
// ---------------------------------------------------------------
function extractMeta(html) {
  const strip  = s => s?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() ?? null

  const title = strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1])

  const metaDesc = (() => {
    const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
           ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    return m ? m[1].trim() : null
  })()

  const h1  = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1])
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map(m => strip(m[1]))
    .filter(Boolean)
    .slice(0, 20)

  // Word count on visible text
  const text      = html.replace(/<style[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[\s\S]*?<\/script>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
  const wordCount = text.split(' ').filter(w => w.length > 2).length

  return { title, metaDesc, h1, h2s, wordCount }
}

function buildDiffSummary(prev, curr) {
  const changes = []
  if (prev.title !== curr.title && curr.title)
    changes.push(`Title changed to "${curr.title}"`)
  if (prev.h1 !== curr.h1 && curr.h1)
    changes.push(`H1 changed to "${curr.h1}"`)
  const wdDiff = curr.wordCount - (prev.wordCount ?? 0)
  if (Math.abs(wdDiff) > 100)
    changes.push(`Word count ${wdDiff > 0 ? '+' : ''}${wdDiff}`)
  return changes.length ? changes.join('. ') : 'Content updated.'
}

// ---------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------
export default async function handler(req, context) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE env vars')
    return new Response('Config error', { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // Load all active competitor pages
  const { data: pages, error: pagesErr } = await supabase
    .from('competitor_pages')
    .select('id, url, company_name')
    .eq('is_active', true)

  if (pagesErr) {
    console.error('DB error loading pages:', pagesErr)
    return new Response('DB error', { status: 500 })
  }

  if (!pages || pages.length === 0) {
    console.log('No active competitor pages — nothing to do')
    return new Response(JSON.stringify({ skipped: true }), { status: 200 })
  }

  const results = []

  for (const page of pages) {
    const result = { url: page.url, company: page.company_name }

    try {
      const res = await fetch(page.url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
        redirect: 'follow',
      })

      if (!res.ok) {
        result.error = `HTTP ${res.status}`
        results.push(result)
        continue
      }

      const html = await res.text()
      const meta = extractMeta(html)
      const hash = crypto.createHash('sha256').update(html).digest('hex')

      // Load last snapshot for diff
      const { data: lastSnap } = await supabase
        .from('competitor_snapshots')
        .select('raw_html_hash, title, h1, word_count')
        .eq('competitor_page_id', page.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const hasChanged   = lastSnap ? lastSnap.raw_html_hash !== hash : false
      const diffSummary  = hasChanged && lastSnap
        ? buildDiffSummary(
            { title: lastSnap.title, h1: lastSnap.h1, wordCount: lastSnap.word_count },
            meta,
          )
        : null

      const { error: insertErr } = await supabase
        .from('competitor_snapshots')
        .insert({
          competitor_page_id: page.id,
          title:              meta.title,
          meta_description:   meta.metaDesc,
          h1:                 meta.h1,
          h2s:                meta.h2s,
          word_count:         meta.wordCount,
          has_changed:        hasChanged,
          diff_summary:       diffSummary,
          raw_html_hash:      hash,
        })

      if (insertErr) {
        result.error = insertErr.message
      } else {
        result.hasChanged  = hasChanged
        result.diffSummary = diffSummary
        result.wordCount   = meta.wordCount
      }
    } catch (err) {
      result.error = err.message
    }

    results.push(result)
    console.log('Processed:', result)
  }

  const changed = results.filter(r => r.hasChanged).length
  console.log(`Competitor monitor done. ${pages.length} pages, ${changed} changed.`)

  return new Response(
    JSON.stringify({ results, ran_at: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

export const config = {
  schedule: '0 7 * * 1', // Every Monday at 07:00 UTC
}
