import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import api from '../lib/api'
import { ArrowLeft, Rocket } from 'lucide-react'

export default function NewProjectPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gitUrl, setGitUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/projects', { name, description, gitUrl })
      navigate(`/projects/${data.id}`)
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <GlassCard>
        <h1 className="text-2xl font-bold mb-6">Create New Project</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Project Name"
            placeholder="my-awesome-app"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Description"
            placeholder="A brief description of your project"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label="Git Repository URL"
            placeholder="https://github.com/username/repo"
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full" icon={<Rocket className="w-4 h-4" />}>
            Create Project
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}
