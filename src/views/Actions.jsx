import { useState } from 'react'
import TasBadge from '../components/TasBadge.jsx'

const MOCK_ACTIONS = [
  {
    id: 1, week: 'This week',
    title: 'LinkedIn: Why COSMIC beats story points for IT agencies',
    channel: 'LinkedIn', account: 'Cue / personal', channelIcon: 'ti-brand-linkedin',
    status: 'pending_review', metric: '2.4k impr.',
    eq: 4, cq: 5,
    insight: 'Strong CQ signal — CFO-adjacent comments in thread. Compound angle: estimation as financial risk.',
  },
  {
    id: 2, week: 'This week',
    title: 'Ghost article: Estimation debt is killing your margins',
    channel: 'Ghost', account: 'Ghost', channelIcon: 'ti-pencil',
    status: 'measured', metric: '340 reads',
    eq: 4, cq: 4,
    insight: 'Best read-time to date (4.8 min). Opener was a client quote — note pattern.',
  },
  {
    id: 3, week: 'This week',
    title: 'LinkedIn: Scopelabs company page — COSMIC intro post',
    channel: 'LinkedIn', account: 'Company page', channelIcon: 'ti-brand-linkedin',
    status: 'active', metric: '870 impr.',
    eq: 3, cq: 3,
    insight: 'Impressions OK but low engagement depth. Company page audience not warm yet.',
  },
  {
    id: 4, week: 'This week',
    title: 'X: Thread on FP measurement in software projects',
    channel: 'X', account: 'Scopelabs', channelIcon: 'ti-brand-x',
    status: 'active', metric: '210 impr.',
    eq: 2, cq: 2,
    insight: null,
  },
  {
    id: 5, week: 'Last week',
    title: 'Ghost article: The hidden cost of T-shirt sizing',
    channel: 'Ghost', account: 'Ghost', channelIcon: 'ti-pencil',
    status: 'measured', metric: '510 reads · 4.2 min',
    eq: 3, cq: 5,
    insight: 'Highest organic search traffic so far. "T-shirt sizing" is a high-intent keyword.',
  },
  {
    id: 6, week: 'Last week',
    title: 'LinkedIn: "We lost a €40k deal because our estimate was off by 3x"',
    channel: 'LinkedIn', account: 'Cue / personal', channelIcon: 'ti-brand-linkedin',
    status: 'measured', metric: '5.1k impr. · 38 cmt.',
    eq: 5, cq: 4,  // was manually 12 = 3*4 before, now correct 5*4=20
    insight: 'Top-performing post. Loss framing + € amount = highest CQ engagement seen.',
  },
]

const STATUS_CONFIG = {
  active:         { dot: '#1D9E75', label: 'active' },
  pending_review: { dot: '#EF9F27', label: 'pending review' },
  measured:       { dot: '#B4B2A9', label: 'measured' },
  untracked:      { dot: '#D3D1C7', label: 'untracked' },
}

function ActionCard({ action, selected, onClick }) {
  const sc = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.active
  const tas = action.eq * action.cq

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: selected ? '1px solid #1D9E75' : '0.5px solid #E8E6DD',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 5,
        display: 'flex', alignItems: 'flex-start', gap: 10,
        cursor: 'pointer',
      }}
    >
      <TasBadge score={tas} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500, color: '#1a1a1a',
          marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {action.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#888780', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 20,
            border: '0.5px solid #E8E6DD', background: '#faf9f6',
            fontSize: 10,
          }}>
            <i className={`ti ${action.channelIcon}`} style={{ fontSize: 10 }} aria-hidden="true" />
            {action.account}
          </span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
          <span>{sc.label}</span>
          {action.metric && <span style={{ color: '#B4B2A9' }}>{action.metric}</span>}
        </div>
      </div>
    </div>
  )
}

function AnalysisPane({ action }) {
  const weeks = [...new Set(MOCK_ACTIONS.map(a => a.week))]
  const avgTas = (MOCK_ACTIONS.reduce((s, a) => s + a.eq * a.cq, 0) / MOCK_ACTIONS.length).toFixed(1)
  const avgEq  = (MOCK_ACTIONS.reduce((s, a) => s + a.eq, 0) / MOCK_ACTIONS.length).toFixed(1)
  const avgCq  = (MOCK_ACTIONS.reduce((s, a) => s + a.cq, 0) / MOCK_ACTIONS.length).toFixed(1)

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
        marginBottom: 6,
      }}>
        <i className="ti ti-sparkles" style={{ fontSize: 13 }} aria-hidden="true" />
        Run analysis
      </button>
      <div style={{ fontSize: 10, color: '#B4B2A9', textAlign: 'center', marginBottom: 12 }}>
        Last run: 2 days ago
      </div>

      {/* Score summary */}
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

      {/* Selected action insight */}
      {action && action.insight && (
        <>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Selected action
          </div>
          <div style={{
            background: '#faf9f6', border: '0.5px solid #E8E6DD',
            borderRadius: 6, padding: '9px 10px', marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, color: '#1a1a1a', lineHeight: 1.5 }}>{action.insight}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {[['EQ', action.eq], ['CQ', action.cq], ['TAS', action.eq * action.cq]].map(([k, v]) => (
                <span key={k} style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 20,
                  border: '0.5px solid #E8E6DD', color: '#888780',
                }}>
                  {k} {v}
                </span>
              ))}
            </div>
          </div>
          <div style={{ height: '0.5px', background: '#E8E6DD', margin: '0 0 12px' }} />
        </>
      )}

      {/* Insights */}
      {[
        { icon: 'ti-trending-up', label: 'Compounding', title: 'Failure stories outperform frameworks 3:1', note: 'Narrative posts (loss, failure, €) convert at higher CQ than methodology explainers.', tag: 'Test: ratio next sprint' },
        { icon: 'ti-eye-off',     label: 'Blind spot',  title: 'No content targeting finance or procurement buyers', note: 'Highest-CQ readers engage on risk — but the angle is always ops/tech.', tag: 'Reframe 1 piece' },
        { icon: 'ti-antenna',     label: 'Signal',      title: 'Read time increases when article opens with a client quote', note: '3 of 4 pieces with 4+ min read time led with a third-party voice.', tag: 'Test: without quote' },
      ].map(ins => (
        <div key={ins.label} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className={`ti ${ins.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
            {ins.label}
          </div>
          <div style={{ background: '#faf9f6', border: '0.5px solid #E8E6DD', borderRadius: 6, padding: '9px 10px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 3, lineHeight: 1.4 }}>{ins.title}</div>
            <div style={{ fontSize: 11, color: '#888780', lineHeight: 1.5 }}>{ins.note}</div>
            <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 6px', borderRadius: 20, border: '0.5px solid #E8E6DD', color: '#888780', marginTop: 5 }}>{ins.tag}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Actions() {
  const [selected, setSelected] = useState(MOCK_ACTIONS[0])
  const weeks = [...new Set(MOCK_ACTIONS.map(a => a.week))]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {weeks.map(week => (
          <div key={week}>
            <div style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#B4B2A9', marginBottom: 8, marginTop: week === 'This week' ? 0 : 12 }}>
              {week}
            </div>
            {MOCK_ACTIONS.filter(a => a.week === week).map(action => (
              <ActionCard
                key={action.id}
                action={action}
                selected={selected?.id === action.id}
                onClick={() => setSelected(action)}
              />
            ))}
          </div>
        ))}
      </div>

      <AnalysisPane action={selected} />
    </div>
  )
}
