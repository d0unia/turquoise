import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import TasBadge from '../components/TasBadge.jsx'

const STATUS_CONFIG = {
  active:         { dot: '#1D9E75', label: 'active' },
  pending_review: { dot: '#EF9F27', label: 'pending review' },
  measured:       { dot: '#B4B2A9', label: 'measured' },
  untracked:      { dot: '#D3D1C7', label: 'untracked' },
}

const CHANNEL_ICONS = {
  linkedin_personal: 'ti-brand-linkedin',
  linkedin_company:  'ti-brand-linkedin',
  x:                 'ti-brand-x',
  ghost_article:     'ti-pencil',
  newsletter:        'ti-mail',
  search_console:    'ti-search',
}

function groupByWeek(actions) {
  const groups = {}
  actions.forEach(a => {
    const date = new Date(a.action_date)
    const now  = new Date()
    const diffDays = Math.floor((now - date) / 86400000)
    const label = diffDays < 7 ? 'This week' : diffDays < 14 ? 'Last week' : 'Earlier'
    if (!groups[label]) groups[label] = []
    groups[label].push(a)
  })
  return groups
}

function ActionCard({ action, selected, onClick }) {
  const sc  = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.active
  const tas = action.tas_score ?? (action.eq_score && action.cq_score ? action.eq_score * action.cq_score : null)
  const icon = CHANNEL_ICONS[action.channel] ?? 'ti-file'
  const account = action.social_accounts?.display_name ?? action.channel

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: selected ? '1px solid #1D9E75' : '0.5px solid #E8E6DD',
        borderRadius: 8, padding: '10px 12px', marginBottom: 5,
        display: 'flex', alignItems: 'flex-start', gap: 10,
        cursor: 'pointer',
      }}
    >
      {tas != null
        ? <TasBadge score={tas} />
        : <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F1EFE8', flexShrink: 0 }} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500, color: '#1a1a1a', marginBottom: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {action.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#888780', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 20,
            border: '0.5px solid #E8E6DD', background: '#faf9f6', fontSize: 10,
          }}>
            <i className={`ti ${icon}`} style={{ fontSize: 10 }} aria-hidden="true" />
            {account}
          </span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
          <span>{sc.label}</span>
          {action.metric_value_draft != null && (
            <span style={{ color: '#B4B2A9' }}>{action.metric_value_draft.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function AnalysisPane({ action, actions }) {
  const scored = actions.filter(a => a.eq_score && a.cq_score)
  const avgTas = scored.length
    ? (scored.reduce((s, a) => s + a.eq_score * a.cq_score, 0) / scored.length).toFixed(1)
    : '—'
  const avgEq = scored.length
    ? (scored.reduce((s, a) => s + a.eq_score, 0) / scored.length).toFixed(1)
    : '—'
  const avgCq = scored.length
    ? (scored.reduce((s, a) => s + a.cq_score, 0) / scored.length).toFixed(1)
    : '—'

  return (
    <div style={{
      width: 272, minWidth: 272,
      background: '#fff', borderLeft: '0.5px solid #E8E6DD',
      overflowY: 'auto', padding: 14,
    }}>
      <button style={{
        width: '100%', padding: '7px 0',
        background: '#1D9E75', color: '#fff',
        border: 'none', borderRadius: 6,
        fontSize: 12, fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        marginBottom: 6, cursor: 'pointer',
      }}>
        <i className="ti ti-sparkles" style={{ fontSize: 13 }} aria-hidden="true" />
        Run analysis
      </button>
      <div style={{ fontSize: 10, color: '#B4B2A9', textAlign: 'center', marginBottom: 12 }}>
        {scored.length} scored actions
      </div>

      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        {[['Avg TAS', avgTas], ['Avg EQ', avgEq], ['Avg CQ', avgCq]].map(([lbl, val]) => (
          <div key={lbl} style={{
            flex: 1, background: '#faf9f6', border: '0.5px solid #E8E6DD',
            borderRadius: 6, padding: '7px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>{val}</div>
            <div style={{ fontSize: 9, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>{lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ height: '0.5px', background: '#E8E6DD', margin: '0 0 12px' }} />

      {action && (
        <>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Selected
          </div>
          <div style={{ background: '#faf9f6', border: '0.5px solid #E8E6DD', borderRadius: 6, padding: '9px 10px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 6, lineHeight: 1.4 }}>
              {action.title}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['EQ', action.eq_score], ['CQ', action.cq_score], ['TAS', action.tas_score]].map(([k, v]) => (
                <span key={k} style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 20,
                  border: '0.5px solid #E8E6DD', color: v ? '#1a1a1a' : '#B4B2A9',
                }}>
                  {k} {v ?? '—'}
                </span>
              ))}
            </div>
            {action.outcome_draft && (
              <div style={{ fontSize: 11, color: '#888780', marginTop: 7, lineHeight: 1.5 }}>
                {action.outcome_draft}
              </div>
            )}
          </div>
          <div style={{ height: '0.5px', background: '#E8E6DD', margin: '0 0 12px' }} />
        </>
      )}

      <div style={{ fontSize: 12, color: '#B4B2A9', textAlign: 'center', lineHeight: 1.6 }}>
        Run an analysis to surface compounding patterns, blind spots, and signals.
      </div>
    </div>
  )
}

export default function Actions() {
  const [actions, setActions]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          social_accounts ( display_name ),
          projects ( name )
        `)
        .neq('status', 'untracked')
        .order('action_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setActions(data)
        if (data.length > 0) setSelected(data[0])
      }
      setLoading(false)
    }

    load()

    // Real-time: refresh on any change to actions
    const channel = supabase
      .channel('actions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actions' }, load)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const groups = groupByWeek(actions)
  const weekOrder = ['This week', 'Last week', 'Earlier']

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#888780' }}>
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#A32D2D', padding: 32 }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {actions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#B4B2A9', fontSize: 13 }}>
            No actions yet. Log your first piece of content.
          </div>
        ) : (
          weekOrder.map(week => {
            const items = groups[week]
            if (!items) return null
            return (
              <div key={week}>
                <div style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#B4B2A9', marginBottom: 8, marginTop: week === 'This week' ? 0 : 12 }}>
                  {week}
                </div>
                {items.map(action => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    selected={selected?.id === action.id}
                    onClick={() => setSelected(action)}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>

      <AnalysisPane action={selected} actions={actions} />
    </div>
  )
}
