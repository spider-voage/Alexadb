import { useEffect, useState } from 'react'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import api from '../../lib/api'
import { FileText, Clock } from 'lucide-react'

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/admin/audit-logs')
      setLogs(data.logs || [])
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>

      {loading ? (
        <div className="text-center py-12">Loading logs...</div>
      ) : logs.length === 0 ? (
        <GlassCard className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <GlassCard key={log.id} className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{log.action}</span>
                  <Badge variant="info" className="text-xs">{log.entityType}</Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{log.user?.email || 'System'}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <Clock className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
