import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { StatCard } from '../components/ui/StatCard'
import api from '../lib/api'
import { ArrowLeft, Users, Activity, HardDrive, Clock } from 'lucide-react'

export default function AnalyticsPage() {
  const { id } = useParams()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = id ? `/projects/${id}/analytics` : '/analytics'
    api.get(url)
      .then(({ data }) => {
        setAnalytics(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {id && (
          <Link to={`/projects/${id}`} className="text-gray-500 hover:text-primary-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading analytics...</div>
      ) : !analytics ? (
        <GlassCard className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No analytics data available</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Visitors" value={analytics.summary?.totalVisitors || 0} icon={Users} color="primary" />
            <StatCard title="Requests" value={analytics.summary?.totalRequests || 0} icon={Activity} color="accent" />
            <StatCard title="Bandwidth" value={`${(analytics.summary?.totalBandwidth || 0).toFixed(2)} MB`} icon={HardDrive} color="secondary" />
            <StatCard title="Avg Build Time" value={`${analytics.summary?.avgBuildTime || 0}s`} icon={Clock} color="green" />
          </div>

          <GlassCard>
            <h2 className="text-lg font-semibold mb-4">Performance</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
                <p className="text-sm text-gray-500">Avg CPU Usage</p>
                <p className="text-xl font-bold">{analytics.summary?.avgCpuUsage || 0}%</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
                <p className="text-sm text-gray-500">Avg RAM Usage</p>
                <p className="text-xl font-bold">{analytics.summary?.avgRamUsage || 0}%</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
                <p className="text-sm text-gray-500">Error Rate</p>
                <p className="text-xl font-bold">{analytics.summary?.avgErrorRate || 0}%</p>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
