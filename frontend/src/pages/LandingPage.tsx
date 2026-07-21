import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Cloud, Zap, Shield, Globe, ArrowRight, Server } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Deploy your apps with{' '}
            <span className="text-primary-600">AlexaDB</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            The modern cloud hosting platform for developers. Deploy, scale, and manage your applications with ease.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Get Started Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Why choose AlexaDB?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GlassCard>
            <Zap className="w-8 h-8 text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-500 dark:text-gray-400">Deploy in seconds with our optimized build pipeline and global CDN.</p>
          </GlassCard>
          <GlassCard delay={0.1}>
            <Shield className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure by Default</h3>
            <p className="text-gray-500 dark:text-gray-400">SSL certificates, DDoS protection, and automated security updates.</p>
          </GlassCard>
          <GlassCard delay={0.2}>
            <Globe className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Global Edge Network</h3>
            <p className="text-gray-500 dark:text-gray-400">Serve your content from 100+ edge locations worldwide.</p>
          </GlassCard>
          <GlassCard delay={0.3}>
            <Server className="w-8 h-8 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Auto Scaling</h3>
            <p className="text-gray-500 dark:text-gray-400">Scale automatically based on traffic with zero configuration.</p>
          </GlassCard>
          <GlassCard delay={0.4}>
            <Cloud className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Git Integration</h3>
            <p className="text-gray-500 dark:text-gray-400">Connect your GitHub repo and deploy on every push automatically.</p>
          </GlassCard>
          <GlassCard delay={0.5}>
            <Zap className="w-8 h-8 text-red-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Real-time Analytics</h3>
            <p className="text-gray-500 dark:text-gray-400">Monitor traffic, performance, and errors in real-time.</p>
          </GlassCard>
        </div>
      </section>
    </div>
  )
}
