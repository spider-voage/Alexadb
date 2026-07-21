import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { SkeletonCard } from '../components/ui/Skeleton'
import api from '../lib/api'
import { Plus, FolderOpen, ArrowRight, GitBranch } from 'lucide-react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/projects')
      .then(({ data }) => {
        setProjects(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link to="/projects/new">
          <Button icon={<Plus className="w-4 h-4" />}>New Project</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <GlassCard className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No projects yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">Create your first project to get started</p>
          <Link to="/projects/new">
            <Button icon={<Plus className="w-4 h-4" />}>Create Project</Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <GlassCard key={project.id} className="group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{project.slug}</p>
                </div>
                <Badge variant={project.status === 'DEPLOYED' ? 'success' : 'default'}>
                  {project.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <GitBranch className="w-4 h-4" />
                {project.gitBranch || 'main'}
              </div>
              <Link
                to={`/projects/${project.id}`}
                className="flex items-center gap-1 text-sm text-primary-600 hover:underline"
              >
                View details <ArrowRight className="w-4 h-4" />
              </Link>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
