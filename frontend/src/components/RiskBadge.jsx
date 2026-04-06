/**
 * Inline risk badge (Low / Medium / High) with colored dot.
 */
export default function RiskBadge({ level }) {
  const l = (level || 'low').toLowerCase()
  return (
    <span className={`badge ${l}`}>
      <span style={{ fontSize: 7 }}>●</span>
      {l.charAt(0).toUpperCase() + l.slice(1)}
    </span>
  )
}
