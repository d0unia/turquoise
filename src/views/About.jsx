import { Link } from 'react-router-dom'

const TEAL   = '#1D9E75'
const DARK   = '#1a1a1a'
const MID    = '#555555'
const MUTED  = '#888780'
const BORDER = '#E8E6DD'
const BG     = '#f5f4f0'
const WHITE  = '#ffffff'

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: MUTED,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Pill({ children, teal }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 500,
      background: teal ? '#E1F5EE' : '#F0EFE9',
      color: teal ? '#085041' : MUTED,
      marginRight: 6,
      marginBottom: 6,
    }}>
      {children}
    </span>
  )
}

function Step({ n, title, body }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
      <div style={{
        flexShrink: 0,
        width: 26, height: 26,
        borderRadius: '50%',
        background: '#E1F5EE',
        color: '#085041',
        fontSize: 11, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {n}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: DARK, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>{body}</div>
      </div>
    </div>
  )
}

export default function About() {
  return (
    <div style={{ minHeight: '100vh', background: BG }}>

      {/* top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: BG,
        borderBottom: `0.5px solid ${BORDER}`,
        padding: '0 32px',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src="/turquoise-logo.svg" alt="Turquoise" style={{ width: 22, height: 22 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: DARK }}>Turquoise</span>
        </div>
        <Link
          to="/login"
          style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}
        >
          ← Back to sign in
        </Link>
      </div>

      {/* content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 32px 96px' }}>

        {/* hero */}
        <div style={{ marginBottom: 56 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 600, color: DARK,
            margin: '0 0 12px', lineHeight: 1.25,
          }}>
            Know what's compounding<br />before your next publish
          </h1>
          <p style={{ fontSize: 15, color: MID, lineHeight: 1.7, margin: 0, maxWidth: 500 }}>
            Turquoise tracks every content action you take, scores it against your commercial audience, and surfaces the patterns that actually drive growth. Before you spend another day on content that disappears.
          </p>
        </div>

        {/* the problem */}
        <Section label="The problem">
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: '0 0 14px' }}>
            Most content teams measure reach and engagement. Neither tells you whether the right people are paying attention. You can have a post with 40,000 impressions and zero pipeline impact, and never know why.
          </p>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: 0 }}>
            The other problem is compounding. Some content keeps working for months. Most is forgotten by the next morning. The difference is rarely obvious at publish time, and almost impossible to see without tracking it systematically over time.
          </p>
        </Section>

        {/* how it works */}
        <Section label="How it works">
          <Step
            n="1"
            title="Log every content action"
            body="Each time you publish, comment, send, or appear: log the action in Turquoise. Channel, format, topic, date. Takes under a minute."
          />
          <Step
            n="2"
            title="Score it. No feelings, only KPIs"
            body="Each action gets an Action Score: EQ (Engagement Quotient, 1–5) × CQ (Commercial Quotient, 1–5). Both are anchored to observable criteria: engagement types you can see in platform data, ICP fit you can verify from LinkedIn profiles. Range 1–25. No interpretation required."
          />
          <Step
            n="3"
            title="Claude analyses the patterns"
            body="Over time, Turquoise runs a compound analysis across all your actions. It identifies what's building authority with the right people, what's burning time with the wrong ones, and what to double down on next."
          />
          <Step
            n="4"
            title="Get a content brief, not just data"
            body="The analysis feeds directly into a content brief for your next article, post, or series. Not a report to interpret. A brief to act on."
          />
        </Section>

        {/* the AI layer */}
        <Section label="The AI layer">
          <div style={{
            background: WHITE,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 10,
            padding: '24px 28px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: DARK, marginBottom: 8 }}>
              Why this matters more now
            </div>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: '0 0 14px' }}>
              AI has removed almost all friction from content production. Anyone can publish daily. Volume is no longer a competitive advantage. It's increasingly noise.
            </p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: 0 }}>
              What compounds now is relevance to a specific audience, demonstrated consistently over time. Turquoise is built to measure exactly that, and to use AI to surface what's working before you can see it in pipeline data.
            </p>
          </div>

          <div style={{
            background: WHITE,
            border: `0.5px solid ${BORDER}`,
            borderRadius: 10,
            padding: '24px 28px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: DARK, marginBottom: 16 }}>
              What Claude does inside Turquoise
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Compound analysis', 'Reads your full action history and identifies traction patterns, decay patterns, and audience signal across channels and over time.'],
                ['Content brief generation', 'Translates the analysis into a concrete brief for your next piece: angle, format, channel, ICP hook, and what to avoid.'],
                ['Insight cards', 'Surface non-obvious observations from your data: the post that keeps getting engagement three months later, the topic that never lands with buyers despite high reach.'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 12 }}>
                  <div style={{
                    flexShrink: 0, marginTop: 2,
                    width: 6, height: 6, borderRadius: '50%',
                    background: TEAL,
                  }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: DARK }}>{title}: </span>
                    <span style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* the score */}
        <Section label="Action Score and TAS">
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: '0 0 14px' }}>
            Each piece of content gets an Action Score: EQ × CQ, from 1 to 25. A post with a DM from a named decision-maker at a target account scores 25. A post with 40,000 impressions and no ICP engagement scores 2.
          </p>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, margin: '0 0 16px' }}>
            TAS (Turquoise Attention Score) is the 90-day rolling average of all your Action Scores. This is the number that tells you whether you are compounding. Not how one post performed. Whether the trajectory is real.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
            <Pill teal>TAS trending up: compounding</Pill>
            <Pill>TAS flat: treadmill</Pill>
            <Pill>TAS declining: noise</Pill>
          </div>
        </Section>

        {/* channels */}
        <Section label="What you can track">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
            {['LinkedIn post', 'LinkedIn article', 'Newsletter', 'X / Twitter', 'Podcast appearance', 'Speaking', 'Long-form article', 'Short video', 'Community post'].map(c => (
              <Pill key={c}>{c}</Pill>
            ))}
          </div>
        </Section>

        {/* access */}
        <div style={{
          borderTop: `0.5px solid ${BORDER}`,
          paddingTop: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
            Turquoise is invite-only during its early access period.
          </div>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '8px 18px',
              background: TEAL,
              color: '#fff',
              borderRadius: 6,
              fontSize: 13, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>

        {/* contact */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a
            href="mailto:hello@turquoise.live"
            style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}
          >
            hello@turquoise.live
          </a>
        </div>

      </div>
    </div>
  )
}
