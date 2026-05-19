import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Mascot from '../components/Mascot.jsx'

export default function Login() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f4f0',
    }}>
      <div style={{
        background: '#fff', border: '0.5px solid #E8E6DD',
        borderRadius: 12, padding: '36px 32px',
        width: 360,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <Mascot size={30} />
          <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>Turquoise</span>
        </div>

        {sent ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 8 }}>
              Check your inbox
            </div>
            <div style={{ fontSize: 13, color: '#888780', lineHeight: 1.6 }}>
              A magic link has been sent to <strong>{email}</strong>. Click it to sign in — no password needed.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>
              Sign in
            </div>
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 20, lineHeight: 1.5 }}>
              Turquoise is invite-only. Enter your email to receive a magic link.
            </div>

            <label style={{ display: 'block', fontSize: 11, color: '#888780', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                display: 'block', width: '100%',
                padding: '8px 10px', fontSize: 13,
                border: '0.5px solid #E8E6DD', borderRadius: 6,
                background: '#faf9f6', color: '#1a1a1a',
                marginBottom: 12, outline: 'none',
              }}
            />

            {error && (
              <div style={{ fontSize: 12, color: '#A32D2D', marginBottom: 10 }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '9px',
                background: loading ? '#9FE1CB' : '#1D9E75',
                color: '#fff', border: 'none', borderRadius: 6,
                fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
