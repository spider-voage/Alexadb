import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import api from '../../lib/api'
import { Search, FolderOpen, ArrowRight } from 'lucide-react'

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/admin/projects')
      setProjects(data.projects || [])
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const filtered = projects.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projects</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading projects...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <GlassCard key={p.id} className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{p.name}</h3>
                  <Badge variant={p.status === 'DEPLOYED' ? 'success' : 'default'}>{p.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">{p.user?.email} · {p._count?.deployments || 0} deployments</p>
              </div>
              <Link to={`/projects/${p.id}`} className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                View <ArrowRight className="w-4 h-4" />
              </Link>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
