import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import api from '../lib/api'
import { CreditCard, Zap, ArrowRight } from 'lucide-react'

export default function BillingPage() {
  const { user } = useAuthStore()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/payments/history')
      .then(({ data }) => {
        setPayments(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
            <h2 className="text-2xl font-bold">{user?.plan || 'FREE'}</h2>
            {user?.planExpiresAt && (
              <p className="text-sm text-gray-500">Expires: {new Date(user.planExpiresAt).toLocaleDateString()}</p>
            )}
          </div>
          <Zap className="w-10 h-10 text-primary-600" />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold mb-4">Payment History</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : payments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No payment history</p>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm">{p.plan} Plan</p>
                    <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${p.amount}</span>
                  <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'PENDING' ? 'warning' : 'error'}>
                    {p.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
