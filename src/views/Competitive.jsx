import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const DARK   = '#1a1a1a'
const MUTED  = '#888780'
const FAINT  = '#B4B2A9'
const BORDER = '#E8E6DD'
const BG     = '#f5f4f0'
const WHITE  = '#ffffff'
const TEAL   = '#1D9E75'

const CATEGORY_CONFIG = {
  competitor:  { label: 'Competitor',  dot: '#A32D2D' },
  benchmark:   { label: 'Benchmark',   dot: '#EF9F27' },
  inspiration: { label: 'Inspiration', dot: MUTED },
}

const PRODUCT_LABELS = {
  scopelabs:   'Scopelabs',
  promptranks: 'Prompt Ranks',
  both:        'Both',
}

function CategoryDot({ category }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.benchmark
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: MUTED,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function SnapshotDiff({ snapshot }) {
  if (!snapshot) return (
    <div style={{ fontSize: 11, color: FAINT, fontStyle: 'italic' }}>No snapshot yet</div>
  )

  const date = new Date(snapshot.fetched_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {snapshot.has_changed ? (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
            background: '#FEF3C7', color: '#92400E', border: '0.5px solid #FDE68A',
          }}>
            Changed
          </span>
        ) : (
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 20,
            background: '#F0EFE9', color: MUTED, border: `0.5px solid ${BORDER}`,
          }}>
            No change
          </span>
        )}
        <span style={{ fontSize: 11, color: FAINT }}>{date}</span>
        {snapshot.word_count != null && (
          <span style={{ fontSize: 11, color: FAINT }}>{snapshot.word_count.toLocaleString()} words</span>
        )}
      </div>
      {snapshot.diff_summary && (
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.65 }}>
          {snapshot.diff_summary}
        </div>
      )}
      {snapshot.h1 && (
        <div style={{ fontSize: 12, color: DARK, marginTop: 6, fontStyle: 'italic' }}>
          "{snapshot.h1}"
        </div>
      )}
    </div>
  )
}

function PageRow({ page, selected, onClick }) {
  const snapshot = page.competitor_snapshots?.[0]
  const hasChange = snapshot?.has_changed

  return (
    <div
      onClick={onClick}
      style={{
        background: WHITE,
        border: selected ? `1px solid ${TEAL}` : `0.5px solid ${BORDER}`,
        borderRadius: 8, padding: '10px 12px', marginBottom: 5,
        cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
      }}
    >
      <div style={{
        flexShrink: 0, marginTop: 2,
        width: 8, height: 8, borderRadius: '50%',
        background: hasChange ? '#EF9F27' : (snapshot ? '#D3D1C7' : BORDER),
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500, color: DARK, marginBottom: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {page.company_name}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <CategoryDot category={page.category} />
          <span style={{ fontSize: 11, color: FAINT }}>{PRODUCT_LABELS[page.product] ?? page.product}</span>
        </div>
      </div>
    </div>
  )
}

function DetailPane({ page }) {
  if (!page) return (
    <div style={{
      width: 320, minWidth: 320,
      background: WHITE, borderLeft: `0.5px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ fontSize: 13, color: FAINT, textAlign: 'center', lineHeight: 1.6 }}>
        Select a page to see its latest snapshot.
      </div>
    </div>
  )

  const snapshots = page.competitor_snapshots ?? []
  const latest = snapshots[0]

  return (
    <div style={{
      width: 320, minWidth: 320,
      background: WHITE, borderLeft: `0.5px solid ${BORDER}`,
      overflowY: 'auto', padding: 16,
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: DARK, marginBottom: 4 }}>
          {page.company_name}
        </div>
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: TEAL, textDecoration: 'none', wordBreak: 'break-all' }}
        >
          {page.url}
        </a>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <CategoryDot category={page.category} />
        <span style={{ fontSize: 11, color: FAINT }}>{PRODUCT_LABELS[page.product]}</span>
      </div>

      <div style={{ height: '0.5px', background: BORDER, marginBottom: 14 }} />

      <div style={{
        fontSize: 10, fontWeight: 600, color: MUTED,
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        Latest snapshot
      </div>

      <SnapshotDiff snapshot={latest} />

      {snapshots.length > 1 && (
        <>
          <div style={{ height: '0.5px', background: BORDER, margin: '16px 0 12px' }} />
          <div style={{
            fontSize: 10, fontWeight: 600, color: MUTED,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            History
          </div>
          {snapshots.slice(1).map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: FAINT, marginBottom: 4 }}>
                {new Date(s.fetched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                {s.has_changed && (
                  <span style={{ marginLeft: 6, color: '#92400E' }}>changed</span>
                )}
              </div>
              {s.diff_summary && (
                <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>{s.diff_summary}</div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function AddPageModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    url: '', company_name: '', product: 'scopelabs', category: 'competitor',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .single()

    const { error: err } = await supabase.from('competitor_pages').insert({
      ...form,
      organization_id: profile.organization_id,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const fieldStyle = {
    display: 'block', width: '100%',
    padding: '7px 10px', fontSize: 13,
    border: `0.5px solid ${BORDER}`, borderRadius: 6,
    background: '#faf9f6', color: DARK,
    marginBottom: 12, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: 11, color: MUTED,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: WHITE, borderRadius: 12, padding: '28px 28px 24px',
        width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: DARK, marginBottom: 20 }}>
          Add competitor page
        </div>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>URL</label>
          <input required style={fieldStyle} type="url" placeholder="https://competitor.com/pricing"
            value={form.url} onChange={e => set('url', e.target.value)} />

          <label style={labelStyle}>Company name</label>
          <input required style={fieldStyle} type="text" placeholder="Acme Corp"
            value={form.company_name} onChange={e => set('company_name', e.target.value)} />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Product</label>
              <select style={{ ...fieldStyle, marginBottom: 0 }} value={form.product} onChange={e => set('product', e.target.value)}>
                <option value="scopelabs">Scopelabs</option>
                <option value="promptranks">Prompt Ranks</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select style={{ ...fieldStyle, marginBottom: 0 }} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="competitor">Competitor</option>
                <option value="benchmark">Benchmark</option>
                <option value="inspiration">Inspiration</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#A32D2D', marginTop: 10 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '8px', fontSize: 13,
              background: 'transparent', border: `0.5px solid ${BORDER}`,
              borderRadius: 6, color: MUTED, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '8px', fontSize: 13, fontWeight: 500,
              background: saving ? '#9FE1CB' : TEAL,
              border: 'none', borderRadius: 6, color: WHITE,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Saving…' : 'Add page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Competitive() {
  const [pages, setPages]     = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('competitor_pages')
      .select(`
        *,
        competitor_snapshots (
          id, fetched_at, has_changed, diff_summary, h1, word_count
        )
      `)
      .eq('is_active', true)
      .order('company_name', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      // Sort snapshots newest first per page
      const sorted = (data ?? []).map(p => ({
        ...p,
        competitor_snapshots: (p.competitor_snapshots ?? []).sort(
          (a, b) => new Date(b.fetched_at) - new Date(a.fetched_at)
        ),
      }))
      setPages(sorted)
      if (sorted.length > 0 && !selected) setSelected(sorted[0])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const changed = pages.filter(p => p.competitor_snapshots?.[0]?.has_changed)

  if (loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: MUTED }}>
      Loading…
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#A32D2D', padding: 32 }}>
      {error}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>

        {changed.length > 0 && (
          <div style={{
            background: '#FEF3C7', border: '0.5px solid #FDE68A',
            borderRadius: 8, padding: '9px 12px', marginBottom: 12,
            fontSize: 12, color: '#92400E',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />
            {changed.length} page{changed.length > 1 ? 's' : ''} changed since last check
          </div>
        )}

        {pages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 13, color: FAINT, marginBottom: 12 }}>
              No competitor pages tracked yet.
            </div>
            <button
              onClick={() => setAddOpen(true)}
              style={{
                fontSize: 12, padding: '7px 14px',
                background: TEAL, color: WHITE, border: 'none',
                borderRadius: 6, cursor: 'pointer', fontWeight: 500,
              }}
            >
              Add first page
            </button>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 11, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {pages.length} pages tracked
              </div>
              <button
                onClick={() => setAddOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '5px 10px',
                  background: WHITE, border: `0.5px solid ${BORDER}`,
                  borderRadius: 6, cursor: 'pointer', color: MUTED,
                }}
              >
                <i className="ti ti-plus" style={{ fontSize: 12 }} aria-hidden="true" />
                Add page
              </button>
            </div>
            {pages.map(page => (
              <PageRow
                key={page.id}
                page={page}
                selected={selected?.id === page.id}
                onClick={() => setSelected(page)}
              />
            ))}
          </>
        )}
      </div>

      <DetailPane page={selected} />

      {addOpen && (
        <AddPageModal
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); load() }}
        />
      )}
    </div>
  )
}
