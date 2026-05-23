const INTEGRATIONS = [
  {
    key: 'metricool',
    label: 'Metricool MCP',
    desc: 'LinkedIn personal + company, X — social analytics',
    icon: 'ti-chart-bar',
    status: 'pending',
    envKey: 'METRICOOL_API_KEY',
  },
  {
    key: 'anthropic',
    label: 'Anthropic API',
    desc: 'Powers the compound analysis engine (analyze.js)',
    icon: 'ti-sparkles',
    status: 'pending',
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    key: 'ghost',
    label: 'Ghost Admin API',
    desc: 'Article + newsletter engagement (sends, opens, clicks, signups)',
    icon: 'ti-pencil',
    status: 'pending',
    envKey: 'GHOST_URL + GHOST_ADMIN_API_KEY',
  },
  {
    key: 'plausible',
    label: 'Plausible Stats API',
    desc: 'Traffic, read time, bounce — all web properties',
    icon: 'ti-brand-google-analytics',
    status: 'pending',
    envKey: 'PLAUSIBLE_API_KEY',
  },
  {
    key: 'search_console',
    label: 'Google Search Console',
    desc: 'Organic keyword data and click-through rates',
    icon: 'ti-search',
    status: 'pending',
    envKey: 'GSC_SERVICE_ACCOUNT_JSON',
  },
]

const STATUS_CONFIG = {
  connected:    { label: 'Connected',     bg: '#E1F5EE', color: '#085041', dot: '#1D9E75' },
  disconnected: { label: 'Disconnected',  bg: '#FCEBEB', color: '#791F1F', dot: '#E24B4A' },
  pending:      { label: 'Not set up',    bg: '#F1EFE8', color: '#5F5E5A', dot: '#B4B2A9' },
}

export default function Secrets() {
  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px' }}>

      <div style={{
        background: '#FAEEDA', border: '0.5px solid #FAC775',
        borderRadius: 8, padding: '10px 14px', marginBottom: 14,
        display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12,
      }}>
        <i className="ti ti-info-circle" style={{ fontSize: 14, color: '#633806', marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
        <div style={{ color: '#633806', lineHeight: 1.5 }}>
          API keys are stored as Netlify environment variables and never exposed to the browser. Set them in your Netlify dashboard under Site settings → Environment variables, then redeploy.
        </div>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #E8E6DD', borderRadius: 8, overflow: 'hidden' }}>
        {INTEGRATIONS.map((intg, i) => {
          const sc = STATUS_CONFIG[intg.status]
          return (
            <div
              key={intg.key}
              style={{
                display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 14,
                borderBottom: i < INTEGRATIONS.length - 1 ? '0.5px solid #E8E6DD' : 'none',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 32, height: 32, borderRadius: 7,
                background: '#faf9f6', border: '0.5px solid #E8E6DD',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className={`ti ${intg.icon}`} style={{ fontSize: 15, color: '#888780' }} aria-hidden="true" />
              </div>

              {/* Label + desc */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>{intg.label}</div>
                <div style={{ fontSize: 11, color: '#888780' }}>{intg.desc}</div>
                <code style={{ fontSize: 10, color: '#B4B2A9', fontFamily: 'monospace', marginTop: 2, display: 'block' }}>
                  {intg.envKey}
                </code>
              </div>

              {/* Status badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10, padding: '3px 8px', borderRadius: 20,
                background: sc.bg, color: sc.color, fontWeight: 500, flexShrink: 0,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                {sc.label}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#B4B2A9', lineHeight: 1.5 }}>
        Once a key is set and the app is redeployed, the status will update to Connected on next health check.
      </div>
    </div>
  )
}
