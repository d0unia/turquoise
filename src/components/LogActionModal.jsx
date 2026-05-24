import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const CHANNELS = [
  { value: 'linkedin_personal', label: 'LinkedIn — personal' },
  { value: 'linkedin_company',  label: 'LinkedIn — company page' },
  { value: 'x',                 label: 'X' },
  { value: 'ghost_article',     label: 'Ghost — article' },
  { value: 'newsletter',        label: 'Newsletter' },
]

export default function LogActionModal({ onClose, onSaved }) {
  const [projects, setProjects]         = useState([])
  const [socialAccounts, setSocialAccounts] = useState([])
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)

  const [form, setForm] = useState({
    title:             '',
    channel:           'linkedin_personal',
    social_account_id: '',
    project_id:        '',
    action_date:       new Date().toISOString().slice(0, 10),
    outcome_draft:     '',   // the published URL — used to fetch + score attention
    notes:             '',
  })

  useEffect(() => {
    async function loadRef() {
      const [{ data: proj }, { data: accounts }] = await Promise.all([
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('social_accounts').select('id, display_name, platform, account_type').eq('is_active', true),
      ])
      setProjects(proj ?? [])
      setSocialAccounts(accounts ?? [])
    }
    loadRef()
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      title:         form.title.trim(),
      channel:       form.channel,
      action_date:   form.action_date,
      outcome_draft: form.outcome_draft.trim() || null,
      notes:         form.notes.trim() || null,
      project_id:        form.project_id        || null,
      social_account_id: form.social_account_id || null,
      // organization_id is enforced by RLS — Supabase injects it from the session
      // EQ/CQ are gone: attention scores (Focus/Intent/AQ) are computed from
      // fetched signals, never entered by hand.
    }

    const { error } = await supabase.from('actions').insert(payload)

    setSaving(false)

    if (error) {
      setError(error.message)
    } else {
      onSaved?.()
      onClose()
    }
  }


  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 10,
          border: '0.5px solid #E8E6DD',
          width: 440, maxHeight: '90vh', overflowY: 'auto',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>Log an action</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888780', fontSize: 18, lineHeight: 1 }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Title */}
          <Field label="Title">
            <input
              required autoFocus
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="LinkedIn: Why COSMIC beats story points…"
              style={inputStyle}
            />
          </Field>

          {/* Channel */}
          <Field label="Channel">
            <select value={form.channel} onChange={e => set('channel', e.target.value)} style={inputStyle}>
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>

          {/* Social account */}
          <Field label="Account">
            <select value={form.social_account_id} onChange={e => set('social_account_id', e.target.value)} style={inputStyle}>
              <option value="">— not specified —</option>
              {socialAccounts.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
            </select>
          </Field>

          {/* Project */}
          <Field label="Project">
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)} style={inputStyle}>
              <option value="">— no project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          {/* Date */}
          <Field label="Publication date">
            <input
              type="date"
              value={form.action_date}
              onChange={e => set('action_date', e.target.value)}
              style={inputStyle}
            />
          </Field>

          {/* Published URL — what Turquoise fetches to score attention */}
          <Field label="Published URL">
            <input
              type="url"
              value={form.outcome_draft}
              onChange={e => set('outcome_draft', e.target.value)}
              placeholder="https://… (the live post / article URL)"
              style={inputStyle}
            />
          </Field>

          <div style={{
            marginBottom: 14, fontSize: 11, color: '#888780', lineHeight: 1.5,
            background: '#faf9f6', border: '0.5px solid #E8E6DD', borderRadius: 6, padding: '8px 10px',
          }}>
            Attention scores (Focus / Intent / AQ) are computed automatically from
            the post's signals — fetch metrics after logging. Nothing to score by hand.
          </div>

          {/* Notes */}
          <Field label="Notes (optional)">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Context, observations, intent…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          {error && (
            <div style={{ fontSize: 12, color: '#A32D2D', marginBottom: 12 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', fontSize: 12, border: '0.5px solid #E8E6DD',
              borderRadius: 6, background: '#fff', color: '#888780', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 500,
              border: 'none', borderRadius: 6,
              background: saving ? '#9FE1CB' : '#1D9E75',
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Saving…' : 'Log action'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#888780', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  display: 'block', width: '100%',
  padding: '7px 10px', fontSize: 12,
  border: '0.5px solid #E8E6DD', borderRadius: 6,
  background: '#faf9f6', color: '#1a1a1a',
  outline: 'none', fontFamily: 'inherit',
}
