import { useState } from 'react'

const INITIAL_MEMBERS = [
  { id: 1, name: 'Dounia',  email: 'dounia.beghdadi@gmail.com', role: 'admin',  initials: 'DB', joined: 'May 2026' },
  { id: 2, name: 'Cue',     email: 'cue@scopelabs.work',        role: 'member', initials: 'CU', joined: 'May 2026' },
]

const ROLE_COLORS = {
  admin:  { bg: '#E1F5EE', color: '#085041' },
  member: { bg: '#F1EFE8', color: '#5F5E5A' },
}

export default function Members() {
  const [members, setMembers] = useState(INITIAL_MEMBERS)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [sent, setSent] = useState(false)

  function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setInviteEmail('')
    }, 2000)
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px' }}>

      {/* Invite form */}
      <div style={{
        background: '#fff', border: '0.5px solid #E8E6DD',
        borderRadius: 8, padding: '16px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 12 }}>Invite a member</div>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            style={{
              flex: 1, padding: '7px 10px', fontSize: 12,
              border: '0.5px solid #E8E6DD', borderRadius: 6,
              background: '#faf9f6', color: '#1a1a1a',
              outline: 'none',
            }}
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            style={{
              padding: '7px 10px', fontSize: 12,
              border: '0.5px solid #E8E6DD', borderRadius: 6,
              background: '#faf9f6', color: '#1a1a1a',
              cursor: 'pointer',
            }}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" style={{
            padding: '7px 14px', fontSize: 12, fontWeight: 500,
            background: sent ? '#E1F5EE' : '#1D9E75',
            color: sent ? '#085041' : '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            transition: 'background 0.2s',
          }}>
            {sent ? 'Sent' : 'Send invite'}
          </button>
        </form>
        <div style={{ marginTop: 8, fontSize: 11, color: '#B4B2A9' }}>
          Invite-only access. Recipients get a magic link to set their password.
        </div>
      </div>

      {/* Members list */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E6DD', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #E8E6DD', fontSize: 11, color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {members.length} members
        </div>
        {members.map((m, i) => {
          const rc = ROLE_COLORS[m.role]
          return (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 12,
                borderBottom: i < members.length - 1 ? '0.5px solid #E8E6DD' : 'none',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#E1F5EE', color: '#085041',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 500, flexShrink: 0,
              }}>
                {m.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: '#888780' }}>{m.email}</div>
              </div>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 20,
                background: rc.bg, color: rc.color, fontWeight: 500,
              }}>
                {m.role}
              </span>
              <span style={{ fontSize: 11, color: '#B4B2A9' }}>since {m.joined}</span>
            </div>
          )
        })}
      </div>

    </div>
  )
}
