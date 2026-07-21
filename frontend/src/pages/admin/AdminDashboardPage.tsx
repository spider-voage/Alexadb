import { useEffect, useState } from 'react'
import { GlassCard } from '../../components/ui/GlassCard'
import { StatCard } from '../../components/ui/StatCard'
import api from '../../lib/api'
import { Users, FolderOpen, Rocket, CreditCard, TrendingUp } from 'lucide-react'

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/metrics')
      .then(({ data }) => {
        setMetrics(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {loading ? (
        <div className="text-center py-12">Loading metrics...</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={metrics?.totalUsers || 0} icon={Users} color="primary" />
            <StatCard title="Active Users" value={metrics?.activeUsers || 0} icon={Users} color="green" />
            <StatCard title="Projects" value={metrics?.totalProjects || 0} icon={FolderOpen} color="accent" />
            <StatCard title="Deployments" value={metrics?.totalDeployments || 0} icon={Rocket} color="secondary" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <StatCard title="Total Revenue" value={`$${metrics?.totalRevenue || 0}`} icon={CreditCard} color="green" />
            <StatCard title="Recent Signups (7d)" value={metrics?.recentSignups || 0} icon={TrendingUp} color="primary" />
          </div>
        </>
      )}
    </div>
  )
}
