import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { GlassCard } from '../components/ui/GlassCard'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <GlassCard className="w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold">Verifying your email...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold">Email Verified!</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Your email has been verified successfully.</p>
            <Link to="/login" className="text-primary-600 hover:underline mt-4 inline-block">
              Go to login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold">Verification Failed</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">The verification link is invalid or expired.</p>
            <Link to="/login" className="text-primary-600 hover:underline mt-4 inline-block">
              Go to login
            </Link>
          </>
        )}
      </GlassCard>
    </div>
  )
}
