import { Link } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <GlassCard className="text-center max-w-md">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/">
          <Button icon={<Home className="w-4 h-4" />}>Go Home</Button>
        </Link>
      </GlassCard>
    </div>
  )
}
