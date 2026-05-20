import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const TEAL   = '#1D9E75'
const DARK   = '#1a1a1a'
const MID    = '#555555'
const MUTED  = '#888780'
const BORDER = '#E8E6DD'
const BG     = '#f5f4f0'
const WHITE  = '#ffffff'

function SectionCard({ label, items, dotColor }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{
      background: WHITE,
      border: `0.5px solid ${BORDER}`,
      borderRadius: 10,
      padding: '20px 24px',
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: MUTED,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div style={{
              flexShrink: 0, marginTop: 5,
              width: 6, height: 6, borderRadius: '50%',
              background: dotColor,
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: DARK, marginBottom: 3 }}>
                {item.observation}
              </div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.65 }}>
                {item.evidence}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BriefCard({ brief }) {
  if (!brief) return null
  const rows = [
    ['Angle',      brief.recommended_angle],
    ['Format',     brief.recommended_format],
    ['Channel',    brief.recommended_channel],
    ['ICP hook',   brief.icp_hook],
    ['Avoid',      brief.what_to_avoid],
  ]
  return (
    <div style={{
      background: '#E1F5EE',
      border: `0.5px solid #A8DECE`,
      borderRadius: 10,
      padding: '20px 24px',
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#085041',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        Content brief
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([label, value]) => value ? (
          <div key={label} style={{ display: 'flex', gap: 12 }}>
            <div style={{
              flexShrink: 0, minWidth: 72,
              fontSize: 11, fontWeight: 600, color: '#085041',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              paddingTop: 1,
            }}>
              {label}
            </div>
            <div style={{ fontSize: 13, color: '#0d5c45', lineHeight: 1.6 }}>
              {value}
            </div>
          </div>
        ) : null)}
      </div>
    </div>
  )
}

function MetaBadge({ label, value }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '10px 16px',
      background: WHITE,
      border: `0.5px solid ${BORDER}`,
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: DARK }}>
        {value}
      </div>
    </div>
  )
}

export default function Analysis() {
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  async function runAnalysis() {
    setState('loading')
    setErrorMsg(null)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setErrorMsg('No active session. Try signing out and back in.')
        setState('error')
        return
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const json = await res.json()

      if (!res.ok) {
        setErrorMsg(json.error ?? `Error ${res.status}`)
        setState('error')
        return
      }

      setResult(json)
      setState('done')
    } catch (err) {
      setErrorMsg(err.message ?? 'Unexpected error')
      setState('error')
    }
  }

  const { analysis, meta } = result ?? {}

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: BG }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 28, gap: 16,
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: DARK }}>
              Compound analysis
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              Claude reads your full action log and identifies what is building traction, what is burning time, and what to publish next.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={state === 'loading'}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: state === 'loading' ? '#9FE1CB' : TEAL,
              color: WHITE, border: 'none', borderRadius: 6,
              fontSize: 13, fontWeight: 500,
              cursor: state === 'loading' ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {state === 'loading' ? (
              <>
                <i className="ti ti-loader-2" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                Analysing...
              </>
            ) : (
              <>
                <i className="ti ti-sparkles" style={{ fontSize: 14 }} aria-hidden="true" />
                Run analysis
              </>
            )}
          </button>
        </div>

        {/* Idle state */}
        {state === 'idle' && (
          <div style={{
            background: WHITE,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 10,
            padding: '40px 32px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#E1F5EE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <i className="ti ti-chart-dots" style={{ fontSize: 20, color: TEAL }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: DARK, marginBottom: 6 }}>
              Ready when you are
            </div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
              Click Run analysis to see what is compounding, what is not, and what to publish next.
            </div>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div style={{
            background: '#FEF2F2',
            border: `0.5px solid #FECACA`,
            borderRadius: 10,
            padding: '20px 24px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#991B1B', marginBottom: 4 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C', lineHeight: 1.6 }}>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Results */}
        {state === 'done' && analysis && (
          <>
            {/* Meta strip */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              <MetaBadge label="Actions analysed" value={meta?.actions_analysed ?? '—'} />
              <MetaBadge label="Avg action score" value={meta?.avg_action_score != null ? `${meta.avg_action_score}/25` : '—'} />
              <MetaBadge
                label="TAS signal"
                value={
                  meta?.avg_action_score >= 15 ? 'Compounding'
                  : meta?.avg_action_score >= 8  ? 'Treadmill'
                  : 'Noise'
                }
              />
            </div>

            <BriefCard brief={analysis.content_brief} />

            <SectionCard
              label="Compounding"
              items={analysis.compounding}
              dotColor={TEAL}
            />
            <SectionCard
              label="Underperforming"
              items={analysis.underperforming}
              dotColor="#D4A017"
            />
            <SectionCard
              label="Signals"
              items={analysis.signals}
              dotColor={MID}
            />
            <SectionCard
              label="Blind spots"
              items={analysis.blind_spots}
              dotColor={MUTED}
            />

            <div style={{ fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 8 }}>
              Generated {meta?.generated_at ? new Date(meta.generated_at).toLocaleString() : ''}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
