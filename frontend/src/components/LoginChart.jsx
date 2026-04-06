import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function LoginChart({ daily = [] }) {
  const labels  = daily.map((d) => {
    const date = new Date(d.date)
    return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
  })

  const data = {
    labels,
    datasets: [
      {
        label: 'Successful',
        data: daily.map((d) => d.success || 0),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Failed',
        data: daily.map((d) => d.failure || 0),
        backgroundColor: 'rgba(244,63,94,0.7)',
        borderColor: '#f43f5e',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
          padding: 16,
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
    scales: {
      x: {
        ticks: { color: '#475569', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: '#475569', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        beginAtZero: true,
      },
    },
  }

  return (
    <div style={{ height: 260 }}>
      {daily.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-text">No data yet</div>
        </div>
      ) : (
        <Bar data={data} options={options} />
      )}
    </div>
  )
}
