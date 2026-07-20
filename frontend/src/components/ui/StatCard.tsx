import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  color?: string
  delay?: number
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = 'primary', delay = 0 }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    primary: 'from-primary-500/20 to-primary-600/10 text-primary-600 dark:text-primary-400',
    secondary: 'from-secondary-500/20 to-secondary-600/10 text-secondary-600 dark:text-secondary-400',
    accent: 'from-accent-500/20 to-accent-600/10 text-accent-600 dark:text-accent-400',
    green: 'from-green-500/20 to-green-600/10 text-green-600 dark:text-green-400',
    orange: 'from-orange-500/20 to-orange-600/10 text-orange-600 dark:text-orange-400',
    red: 'from-red-500/20 to-red-600/10 text-red-600 dark:text-red-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card rounded-2xl p-6 hover:border-primary-500/30 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}
