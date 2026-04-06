import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function RiskChart({ users = [] }) {
  const high   = users.filter((u) => u.risk_score >= 60).length
  const medium = users.filter((u) => u.risk_score >= 30 && u.risk_score < 60).length
  const low    = users.filter((u) => u.risk_score < 30).length

  const data = {
    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
    datasets: [
      {
        data: [high, medium, low],
        backgroundColor: [
          'rgba(244,63,94,0.8)',
          'rgba(245,158,11,0.8)',
          'rgba(16,185,129,0.8)',
        ],
        borderColor: [
          '#f43f5e',
          '#f59e0b',
          '#10b981',
        ],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
          padding: 14,
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        padding: 12,
      },
    },
  }

  return (
    <div style={{ height: 260 }}>
      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-text">No users yet</div>
        </div>
      ) : (
        <Doughnut data={data} options={options} />
      )}
    </div>
  )
}
