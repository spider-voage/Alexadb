import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import api from '../lib/api'
import { ArrowLeft, Globe, Plus, Check, X } from 'lucide-react'

export default function DomainsPage() {
  const { id } = useParams()
  const [domains, setDomains] = useState<any[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/projects/${id}/domains`)
      .then(({ data }) => {
        setDomains(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return
    try {
      const { data } = await api.post(`/projects/${id}/domains`, { name: newDomain })
      setDomains([...domains, data])
      setNewDomain('')
    } catch {
      // handled by interceptor
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/projects/${id}`} className="text-gray-500 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Domains</h1>
      </div>

      <GlassCard>
        <form onSubmit={handleAdd} className="flex gap-3">
          <Input
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" icon={<Plus className="w-4 h-4" />}>Add Domain</Button>
        </form>
      </GlassCard>

      {loading ? (
        <div className="text-center py-12">Loading domains...</div>
      ) : domains.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No domains configured</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <GlassCard key={d.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{d.name}</span>
              </div>
              <Badge variant={d.verified ? 'success' : 'warning'} icon={d.verified ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}>
                {d.verified ? 'Verified' : 'Pending'}
              </Badge>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
