import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import api from '../lib/api'
import { GitBranch, Globe, ArrowLeft, Rocket, Activity } from 'lucide-react'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/projects/${id}`)
      .then(({ data }) => {
        setProject(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-20">Loading...</div>
  if (!project) return <div className="text-center py-20">Project not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects" className="text-gray-500 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{project.slug}</p>
        </div>
        <Badge variant={project.status === 'DEPLOYED' ? 'success' : 'default'}>{project.status}</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Project Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Branch:</span>
              <span>{project.gitBranch || 'main'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Framework:</span>
              <span>{project.framework}</span>
            </div>
            {project.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-4">{project.description}</p>
            )}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <Link to={`/projects/${id}/deployments`}>
                <Button variant="outline" className="w-full" icon={<Rocket className="w-4 h-4" />}>
                  Deployments
                </Button>
              </Link>
              <Link to={`/projects/${id}/domains`}>
                <Button variant="outline" className="w-full" icon={<Globe className="w-4 h-4" />}>
                  Domains
                </Button>
              </Link>
              <Link to={`/projects/${id}/analytics`}>
                <Button variant="outline" className="w-full" icon={<Activity className="w-4 h-4" />}>
                  Analytics
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
