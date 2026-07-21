import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import api from '../lib/api'
import { Save, User, Lock, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.patch('/auth/profile', { name })
      updateUser(data)
      toast.success('Profile updated')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <GlassCard>
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            value={user?.email || ''}
            disabled
          />
          <Button type="submit" loading={loading} icon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </form>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Security</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={loading} icon={<Lock className="w-4 h-4" />}>
            Change Password
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}
