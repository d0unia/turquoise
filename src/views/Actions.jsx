import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import TasBadge from '../components/TasBadge.jsx'

// ---------------------------------------------------------------
// MCP channel routing
// ---------------------------------------------------------------
const MCP_CHANNEL_MAP = {
  linkedin_personal: 'metricool',
  linkedin_company:  'metricool',
  x:                 'metricool',
  ghost_article:     'ghost',
  newsletter:        'ghost',
  search_console:    'search-console',
}

async function fetchMcpMetrics(action) {
  const mcp = MCP_CHANNEL_MAP[action.channel]
  if (!mcp) return null

  const { data: { session } } = await supabase.auth.getSession()
  const jwt = session?.access_token

  const body = {
    action_id:   action.id,
    channel:     action.channel,
    post_url:    action.outcome_draft ?? null,
    post_date:   action.action_date,
    page_path:   action.outcome_draft ?? null,
    page_url:    action.outcome_draft ?? null,
    post_slug:   action.outcome_draft
      ? action.outcome_draft.replace(/\/$/, '').split('/').pop()
      : null,
  }

  const endpoint = mcp === 'metricool'      ? '/api/mcp-metricool'
                 : mcp === 'ghost'          ? '/api/mcp-ghost'
                 : mcp === 'search-console' ? '/api/mcp-search-console'
                 : mcp === 'plausible'      ? '/api/mcp-plausible'
                 : null

  if (!endpoint) return null

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  })

  return res.json()
}

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

function AnalysisPane({ action, actions, onMetricsFetched }) {
  const [mcpState,   setMcpState]   = useState('idle')
  const [mcpResult,  setMcpResult]  = useState(null)
  const [mcpError,   setMcpError]   = useState(null)

  const canFetch = action && MCP_CHANNEL_MAP[action.channel]

  async function handleFetchMetrics() {
    setMcpState('loading')
    setMcpError(null)
    setMcpResult(null)
    try {
      const data = await fetchMcpMetrics(action)
      if (data?.error) {
        setMcpError(data.error)
        setMcpState('error')
      } else {
        setMcpResult(data?.metrics ?? data)
        setMcpState('done')
        // Persist raw response to Supabase
        await supabase.from('actions').update({
          mcp_fetched_at:   new Date().toISOString(),
          mcp_fetch_status: 'fetched',
          mcp_raw_response: data?.raw ?? data,
          metric_value_draft: data?.metrics?.impressions
            ?? data?.metrics?.pageviews
            ?? data?.metrics?.clicks
            ?? null,
        }).eq('id', action.id)
        if (onMetricsFetched) onMetricsFetched()
      }
    } catch (err) {
      setMcpError(err.message)
      setMcpState('error')
    }
  }

  // Reset MCP state when action changes
  useEffect(() => {
    setMcpState('idle')
    setMcpResult(null)
    setMcpError(null)
  }, [action?.id])
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
          {canFetch && (
            <>
              <div style={{
                fontSize: 10, fontWeight: 500, color: '#888780',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
              }}>
                Metrics
              </div>
              <button
                onClick={handleFetchMetrics}
                disabled={mcpState === 'loading'}
                style={{
                  width: '100%', padding: '6px 0',
                  background: mcpState === 'loading' ? '#E8E6DD' : '#faf9f6',
                  border: '0.5px solid #E8E6DD', borderRadius: 6,
                  fontSize: 11, color: mcpState === 'loading' ? '#B4B2A9' : '#555555',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  cursor: mcpState === 'loading' ? 'not-allowed' : 'pointer',
                  marginBottom: 8,
                }}
              >
                <i className={`ti ${mcpState === 'loading' ? 'ti-loader-2' : 'ti-refresh'}`}
                  style={{ fontSize: 12, ...(mcpState === 'loading' ? { animation: 'spin 1s linear infinite' } : {}) }}
                  aria-hidden="true" />
                {mcpState === 'loading' ? 'Fetching…' : 'Fetch metrics'}
              </button>

              {mcpState === 'error' && (
                <div style={{ fontSize: 11, color: '#A32D2D', marginBottom: 8, lineHeight: 1.5 }}>
                  {mcpError}
                </div>
              )}

              {mcpState === 'done' && mcpResult && (
                <div style={{
                  background: '#E1F5EE', border: '0.5px solid #A8DECE',
                  borderRadius: 6, padding: '8px 10px', marginBottom: 8,
                }}>
                  {Object.entries(mcpResult).filter(([, v]) => v != null).map(([k, v]) => (
                    <div key={k} style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 11, color: '#085041', marginBottom: 3,
                    }}>
                      <span style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 500 }}>
                        {typeof v === 'number' ? v.toLocaleString() : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ height: '0.5px', background: '#E8E6DD', margin: '0 0 12px' }} />
            </>
          )}
        </>
      )}

      <div style={{ fontSize: 12, color: '#B4B2A9', textAlign: 'center', lineHeight: 1.6 }}>
        Run an analysis to surface compounding patterns, blind spots, and signals.
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function Actions() {
  const [actions, setActions]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
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
      if (data.length > 0) setSelected(prev => prev ?? data[0])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    // Real-time: refresh on any change to actions
    const channel = supabase
      .channel('actions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actions' }, load)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [load])

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

      <AnalysisPane action={selected} actions={actions} onMetricsFetched={load} />
    </div>
  )
}
