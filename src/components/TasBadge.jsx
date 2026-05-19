const styles = {
  wrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: 1,
  },
  number: { fontSize: 13, fontWeight: 500, lineHeight: 1 },
  label:  { fontSize: 8,  fontWeight: 400, opacity: 0.65, letterSpacing: '0.04em' },
}

function tier(score) {
  if (score >= 15) return { background: '#E1F5EE', color: '#085041' }
  if (score >= 8)  return { background: '#FAEEDA', color: '#633806' }
  return             { background: '#F1EFE8', color: '#5F5E5A' }
}

export default function TasBadge({ score }) {
  return (
    <div style={{ ...styles.wrapper, ...tier(score) }}>
      <span style={styles.number}>{score}</span>
      <span style={styles.label}>TAS</span>
    </div>
  )
}
