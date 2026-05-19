import { useState } from 'react'

const CARDS = [
  { icon: 'ti-layout-list', title: 'Log an action', desc: 'Every piece of content you publish is an action. Log it with the channel, date, and a brief description. Cue does this at execution.' },
  { icon: 'ti-stars',       title: 'Understand TAS', desc: 'TAS = EQ × CQ. A score of 20 means high engagement from the right people. Under 8 means revisit the angle or channel.' },
  { icon: 'ti-sparkles',    title: 'Run an analysis', desc: 'Once you have 10+ logged actions, run an analysis to surface what is compounding, what is underperforming, and what to test next.' },
  { icon: 'ti-robot',       title: 'Brief the agent', desc: 'Analysis output feeds Agent 1 directly via the Content brief section. It tells the agent which angle to write next and what to avoid.' },
]

const FAQS = [
  {
    q: 'What counts as a logged action?',
    a: 'Any intentional content output: a LinkedIn post, a Ghost article, an X thread, a newsletter send. Log it at publication, not at drafting.',
  },
  {
    q: 'How is EQ different from CQ?',
    a: 'EQ (Engagement Quotient) measures depth of engagement — from an impression with no interaction (1) to a problem-solving signal like a DM or sales inquiry (5). CQ (Commercial Quotient) measures audience fit — from unknown audience (1) to confirmed buyer-adjacent decision-maker (5). TAS = EQ × CQ, so both need to be high for a piece to score well.',
  },
  {
    q: 'Why do actions go untracked after 30?',
    a: 'Turquoise is a rolling intelligence tool, not an archive. Keeping only the 30 most recent active actions ensures the analysis stays focused on current signals and does not get diluted by old data.',
  },
  {
    q: 'How does the competitive monitor work?',
    a: 'You declare competitor URLs in the Competitive section. Turquoise fetches them weekly via a scheduled job and stores a snapshot diff: title, meta description, headings, and word count. Changes are surfaced in your next analysis run.',
  },
]

export default function Guide() {
  const [open, setOpen] = useState(null)

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 20px' }}>

      {/* Hero */}
      <div style={{
        background: '#fff', border: '0.5px solid #E8E6DD',
        borderRadius: 10, padding: '18px 20px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>
            Getting started with Turquoise
          </h2>
          <p style={{ fontSize: 12, color: '#888780', lineHeight: 1.6, maxWidth: 380 }}>
            Turquoise tracks what you publish, scores how it lands, and surfaces what to do next. Here is how to make it work.
          </p>
        </div>

        {/* Video thumbnail */}
        <div style={{
          width: 128, height: 72,
          background: '#faf9f6', border: '0.5px solid #E8E6DD',
          borderRadius: 8, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 5,
          cursor: 'pointer', flexShrink: 0,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#fff', border: '0.5px solid #E8E6DD',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-player-play" style={{ fontSize: 11, color: '#1a1a1a', marginLeft: 1 }} aria-hidden="true" />
          </div>
          <span style={{ fontSize: 9, color: '#B4B2A9', letterSpacing: '0.04em' }}>2 min intro</span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {CARDS.map(card => (
          <div key={card.title} style={{
            background: '#fff', border: '0.5px solid #E8E6DD',
            borderRadius: 8, padding: '14px 14px',
            cursor: 'default',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: '#faf9f6', border: '0.5px solid #E8E6DD',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 8,
            }}>
              <i className={`ti ${card.icon}`} style={{ fontSize: 14, color: '#888780' }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>{card.title}</div>
            <div style={{ fontSize: 11, color: '#888780', lineHeight: 1.5 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E6DD', borderRadius: 8, overflow: 'hidden' }}>
        {FAQS.map((faq, i) => (
          <div
            key={faq.q}
            style={{ borderBottom: i < FAQS.length - 1 ? '0.5px solid #E8E6DD' : 'none' }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                padding: '11px 14px', gap: 10,
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ flex: 1, fontSize: 12, color: '#1a1a1a' }}>{faq.q}</span>
              <i
                className={`ti ${open === i ? 'ti-chevron-down' : 'ti-chevron-right'}`}
                style={{ fontSize: 13, color: '#B4B2A9', flexShrink: 0 }}
                aria-hidden="true"
              />
            </button>
            {open === i && (
              <div style={{ padding: '0 14px 12px', fontSize: 12, color: '#888780', lineHeight: 1.6 }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
