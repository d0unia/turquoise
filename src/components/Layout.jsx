import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import LogActionModal from './LogActionModal.jsx'

const PROJECTS = ['Scopelabs', 'Prompt Ranks']

const NAV_MAIN = [
  { to: '/actions',     icon: 'ti-layout-list',  label: 'Actions' },
  { to: '/analysis',    icon: 'ti-chart-dots',   label: 'Analysis' },
  { to: '/competitive', icon: 'ti-eye',           label: 'Competitive' },
]

const NAV_AGENTS = [
  { to: '/brief', icon: 'ti-robot', label: 'Content brief' },
]

const NAV_LEARN = [
  { to: '/guide', icon: 'ti-book', label: 'Guide' },
]

const NAV_ADMIN = [
  { to: '/admin/members', icon: 'ti-users', label: 'Members' },
  { to: '/admin/secrets', icon: 'ti-key',   label: 'Secrets' },
]

const PAGE_TITLES = {
  '/actions':          'Actions',
  '/analysis':         'Analysis',
  '/competitive':      'Competitive',
  '/brief':            'Content brief',
  '/guide':            'Guide',
  '/admin/members':    'Members',
  '/admin/secrets':    'Secrets',
}

function SideNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 6px',
        borderRadius: 6,
        fontSize: 13,
        color: isActive ? '#1a1a1a' : '#888780',
        background: isActive ? '#fff' : 'transparent',
        boxShadow: isActive ? '0 0 0 0.5px #E8E6DD' : 'none',
        textDecoration: 'none',
        transition: 'color 0.1s',
      })}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
      {label}
    </NavLink>
  )
}

function NavSection({ label, items }) {
  return (
    <div style={{ padding: '0 8px', marginBottom: 20 }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: '#888780', padding: '0 6px', marginBottom: 3, opacity: 0.8,
      }}>
        {label}
      </div>
      {items.map(item => <SideNavItem key={item.to} {...item} />)}
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const [project, setProject] = useState(0)
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [logOpen, setLogOpen]         = useState(false)
  const title = PAGE_TITLES[location.pathname] ?? ''

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside style={{
        width: 196, minWidth: 196,
        background: '#faf9f6',
        borderRight: '0.5px solid #E8E6DD',
        display: 'flex', flexDirection: 'column',
        padding: '16px 0',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px 20px' }}>
          <img src="/turquoise-logo.svg" alt="Turquoise" style={{ width: 24, height: 24 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.01em' }}>
            Turquoise
          </span>
        </div>

        <NavSection label="Workspace" items={NAV_MAIN} />
        <NavSection label="Agents"    items={NAV_AGENTS} />
        <NavSection label="Learn"     items={NAV_LEARN} />

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '0 8px' }}>
          {/* Project switcher */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <button
              onClick={() => setPickerOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 8px', borderRadius: 6,
                background: '#fff', border: '0.5px solid #E8E6DD',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>Project</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{PROJECTS[project]}</div>
              </div>
              <i className="ti ti-chevron-down" style={{ fontSize: 12, color: '#888780' }} aria-hidden="true" />
            </button>
            {pickerOpen && (
              <div style={{
                position: 'absolute', bottom: '110%', left: 0, right: 0,
                background: '#fff', border: '0.5px solid #E8E6DD', borderRadius: 6,
                overflow: 'hidden', zIndex: 10,
              }}>
                {PROJECTS.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => { setProject(i); setPickerOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 10px', fontSize: 12,
                      color: i === project ? '#1D9E75' : '#1a1a1a',
                      background: i === project ? '#E1F5EE' : 'transparent',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <NavSection label="Admin" items={NAV_ADMIN} />
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 46, background: '#fff',
          borderBottom: '0.5px solid #E8E6DD',
          display: 'flex', alignItems: 'center',
          padding: '0 18px', gap: 10, flexShrink: 0,
        }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{title}</span>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: '#888780',
            padding: '5px 10px', border: '0.5px solid #E8E6DD',
            borderRadius: 6, background: '#fff',
          }}>
            <i className="ti ti-filter" style={{ fontSize: 13 }} aria-hidden="true" /> Filter
          </button>
          <button
            onClick={() => setLogOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 500, color: '#fff',
              padding: '5px 10px', border: 'none',
              borderRadius: 6, background: '#1D9E75', cursor: 'pointer',
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" /> Log action
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      {logOpen && (
        <LogActionModal
          onClose={() => setLogOpen(false)}
          onSaved={() => setLogOpen(false)}
        />
      )}
    </div>
  )
}
