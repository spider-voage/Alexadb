import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { GlassCard } from '../components/ui/GlassCard'
import { Lock, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password reset successfully')
      navigate('/login')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">New Password</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Reset Password
          </Button>
        </form>

        <Link to="/login" className="flex items-center justify-center gap-2 mt-6 text-sm text-primary-600 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </GlassCard>
    </div>
  )
}
