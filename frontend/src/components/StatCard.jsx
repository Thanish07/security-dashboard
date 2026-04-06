import { useEffect, useRef, useState } from 'react'

/**
 * Animated stat card — counts up to the value on mount.
 */
export default function StatCard({ label, value, icon, color = 'blue', sub }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const numVal = typeof value === 'number' ? value : parseInt(value) || 0

  useEffect(() => {
    let start = 0
    const duration = 900
    const step = Math.ceil(numVal / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= numVal) {
        setDisplay(numVal)
        clearInterval(timer)
      } else {
        setDisplay(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [numVal])

  return (
    <div className={`stat-card ${color}`} ref={ref}>
      <div className="stat-top">
        <div className="stat-label">{label}</div>
        <div className={`stat-icon ${color}`}>{icon}</div>
      </div>
      <div className="stat-value">{display.toLocaleString()}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
