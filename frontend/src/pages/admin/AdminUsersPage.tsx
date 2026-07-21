import { useEffect, useState } from 'react'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import api from '../../lib/api'
import { Search, Users } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users')
      setUsers(data.users || [])
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading users...</div>
      ) : (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Plan</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Projects</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{u.name || u.email}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="primary">{u.plan}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'error'}>{u.status}</Badge>
                    </td>
                    <td className="py-3 px-4">{u._count?.projects || 0}</td>
                    <td className="py-3 px-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
