import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import api from '../lib/api'
import { ArrowLeft, GitCommit, Clock } from 'lucide-react'

export default function DeploymentsPage() {
  const { id } = useParams()
  const [deployments, setDeployments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/projects/${id}/deployments`)
      .then(({ data }) => {
        setDeployments(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/projects/${id}`} className="text-gray-500 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Deployments</h1>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading deployments...</div>
      ) : deployments.length === 0 ? (
        <GlassCard className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No deployments yet</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {deployments.map((d) => (
            <GlassCard key={d.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitCommit className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-sm">{d.commitMessage || 'Manual deployment'}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(d.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <Badge variant={d.status === 'SUCCESS' ? 'success' : d.status === 'FAILED' ? 'error' : 'warning'}>
                {d.status}
              </Badge>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
