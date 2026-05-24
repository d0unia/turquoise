import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useProject } from '../lib/ProjectContext.jsx'

const TEAL   = '#1D9E75'
const DARK   = '#1a1a1a'
const MUTED  = '#888780'
const FAINT  = '#B4B2A9'
const BORDER = '#E8E6DD'
const WHITE  = '#ffffff'

const BRIEF_FIELDS = [
  { key: 'recommended_angle',   label: 'Angle' },
  { key: 'recommended_format',  label: 'Format' },
  { key: 'recommended_channel', label: 'Channel' },
  { key: 'icp_hook',            label: 'ICP hook' },
  { key: 'what_to_avoid',       label: 'Avoid' },
]

function BriefCard({ brief, meta }) {
  return (
    <div style={{
      background: '#E1F5EE',
      border: '0.5px solid #A8DECE',
      borderRadius: 10,
      padding: '24px 28px',
      marginBottom: 20,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#085041',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 18,
      }}>
        Content brief
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {BRIEF_FIELDS.map(({ key, label }) => brief[key] ? (
          <div key={key} style={{ display: 'flex', gap: 16 }}>
            <div style={{
              flexShrink: 0, width: 64,
              fontSize: 10, fontWeight: 600, color: '#085041',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              paddingTop: 2,
            }}>
              {label}
            </div>
            <div style={{ fontSize: 14, color: '#0d5c45', lineHeight: 1.65 }}>
              {brief[key]}
            </div>
          </div>
        ) : null)}
      </div>

      {meta && (
        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: '0.5px solid #A8DECE',
          fontSize: 11, color: '#085041', opacity: 0.7,
          display: 'flex', gap: 16,
        }}>
          <span>{meta.actions_analysed} actions analysed</span>
          <span>TAS {meta.avg_aq}/100</span>
          {meta.generated_at && (
            <span>{new Date(meta.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          )}
        </div>
      )}
    </div>
  )
}

function InsightRow({ label, items, dotColor }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{
      background: WHITE,
      border: `0.5px solid ${BORDER}`,
      borderRadius: 10,
      padding: '18px 22px',
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: MUTED,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10 }}>
            <div style={{
              flexShrink: 0, marginTop: 5,
              width: 6, height: 6, borderRadius: '50%',
              background: dotColor,
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: DARK, marginBottom: 2 }}>
                {item.observation}
              </div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                {item.evidence}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Brief() {
  const { projectId } = useProject()
  const [state, setState]   = useState('idle')
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
        body: JSON.stringify({ project_id: projectId }),
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
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>

        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 28, gap: 16,
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: DARK }}>
              Content brief
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              One concrete next piece to publish, derived from your full action log.
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
              whiteSpace: 'nowrap',
            }}
          >
            {state === 'loading' ? (
              <>
                <i className="ti ti-loader-2" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                <i className="ti ti-sparkles" style={{ fontSize: 14 }} aria-hidden="true" />
                {state === 'done' ? 'Regenerate' : 'Generate brief'}
              </>
            )}
          </button>
        </div>

        {state === 'idle' && (
          <div style={{
            background: WHITE, border: `0.5px solid ${BORDER}`,
            borderRadius: 10, padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#E1F5EE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <i className="ti ti-file-text" style={{ fontSize: 20, color: TEAL }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: DARK, marginBottom: 6 }}>
              No brief yet
            </div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
              Claude reads your action log and produces one concrete brief: angle, format, channel, ICP hook, and what to avoid.
            </div>
          </div>
        )}

        {state === 'error' && (
          <div style={{
            background: '#FEF2F2', border: '0.5px solid #FECACA',
            borderRadius: 10, padding: '20px 24px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#991B1B', marginBottom: 4 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 12, color: '#B91C1C', lineHeight: 1.6 }}>{errorMsg}</div>
          </div>
        )}

        {state === 'done' && analysis && (
          <>
            <BriefCard brief={analysis.content_brief} meta={meta} />

            <div style={{
              fontSize: 10, fontWeight: 600, color: MUTED,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              What it's based on
            </div>

            <InsightRow label="Compounding"    items={analysis.compounding}    dotColor={TEAL} />
            <InsightRow label="Underperforming" items={analysis.underperforming} dotColor="#D4A017" />
            <InsightRow label="Signals"        items={analysis.signals}        dotColor={MUTED} />
            <InsightRow label="Blind spots"    items={analysis.blind_spots}    dotColor={FAINT} />

            <div style={{ fontSize: 11, color: FAINT, textAlign: 'right', marginTop: 8 }}>
              Generated {meta?.generated_at ? new Date(meta.generated_at).toLocaleString() : ''}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
