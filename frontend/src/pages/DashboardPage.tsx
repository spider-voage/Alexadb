import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { StatCard } from '../components/ui/StatCard'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { SkeletonCard } from '../components/ui/Skeleton'
import api from '../lib/api'
import { FolderOpen, Globe, Activity, Rocket, ArrowRight, Plus } from 'lucide-react'
import { Button } from '../components/ui/Button'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(({ data }) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome back, {user?.name || user?.email}</p>
        </div>
        <Link to="/projects/new">
          <Button icon={<Plus className="w-4 h-4" />}>New Project</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Projects" value={stats?.totalProjects || 0} icon={FolderOpen} color="primary" />
          <StatCard title="Active" value={stats?.activeProjects || 0} icon={Rocket} color="green" />
          <StatCard title="Deployments" value={stats?.totalDeployments || 0} icon={Activity} color="accent" />
          <StatCard title="Domains" value={stats?.totalDomains || 0} icon={Globe} color="secondary" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Deployments</h2>
            <Link to="/projects" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {stats?.recentDeployments?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentDeployments.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900">
                  <div>
                    <p className="font-medium text-sm">{d.project?.name}</p>
                    <p className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={d.status === 'SUCCESS' ? 'success' : d.status === 'FAILED' ? 'error' : 'warning'}>
                    {d.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No recent deployments</p>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/projects/new" className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center">
              <Plus className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <p className="text-sm font-medium">New Project</p>
            </Link>
            <Link to="/settings" className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 text-secondary-600" />
              <p className="text-sm font-medium">Settings</p>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
