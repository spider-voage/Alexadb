import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export function GlassCard({ children, className = '', hover = true, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card rounded-2xl p-6 ${
        hover ? 'hover:border-primary-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  )
}
