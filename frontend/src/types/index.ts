export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: string
  plan: string
}

export interface Project {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  framework: string
  sourceType: string
  gitUrl: string | null
  gitBranch: string
  buildCommand: string
  outputDir: string
  storageUsed: number
  bandwidthUsed: number
  createdAt: string
  updatedAt: string
  deployments?: Deployment[]
  domains?: Domain[]
  envVars?: EnvVar[]
  files?: FileItem[]
  analytics?: Analytics[]
}

export interface Deployment {
  id: string
  projectId: string
  status: string
  commitMessage: string | null
  commitSha: string | null
  buildLog: string | null
  buildTime: number | null
  errorMessage: string | null
  previewUrl: string | null
  createdAt: string
  completedAt: string | null
}

export interface Domain {
  id: string
  projectId: string
  name: string
  type: string
  sslEnabled: boolean
  verified: boolean
  createdAt: string
}

export interface EnvVar {
  id: string
  projectId: string
  key: string
  createdAt: string
}

export interface FileItem {
  id: string
  projectId: string
  name: string
  path: string
  size: number
  mimeType: string | null
  isFolder: boolean
  createdAt: string
}

export interface Analytics {
  id: string
  projectId: string
  date: string
  visitors: number
  requests: number
  bandwidth: number
  cpuUsage: number
  ramUsage: number
  buildTime: number
  errorRate: number
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  provider: string
  plan: string | null
  createdAt: string
}

export interface PlanInfo {
  name: string
  price: number | null
  projects: number
  storage: string
  bandwidth: string
  features: string[]
}

export const PLANS: Record<string, PlanInfo> = {
  FREE: {
    name: 'Free',
    price: 0,
    projects: 5,
    storage: '2 GB',
    bandwidth: '25 GB',
    features: [
      'Maximum 5 Projects',
      '2 GB Storage',
      '25 GB Bandwidth',
      'Community Support',
      'AlexaDB Subdomain',
      'Basic Analytics',
    ],
  },
  STARTER: {
    name: 'Starter',
    price: 8,
    projects: 15,
    storage: '20 GB',
    bandwidth: '150 GB',
    features: [
      '15 Projects',
      '20 GB Storage',
      '150 GB Bandwidth',
      'Custom Domains',
      'SSL Certificates',
      'Faster Builds',
      'Email Support',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 20,
    projects: 50,
    storage: '100 GB',
    bandwidth: '1 TB',
    features: [
      '50 Projects',
      '100 GB Storage',
      '1 TB Bandwidth',
      'Team Collaboration',
      'Priority Builds',
      'Advanced Analytics',
      'Priority Support',
    ],
  },
  BUSINESS: {
    name: 'Business',
    price: 50,
    projects: 150,
    storage: '500 GB',
    bandwidth: 'Unlimited',
    features: [
      '150 Projects',
      '500 GB Storage',
      'Unlimited Bandwidth',
      'Team Management',
      'API Access',
      'Dedicated Resources',
      'Advanced Monitoring',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,
    projects: Infinity,
    storage: 'Unlimited',
    bandwidth: 'Unlimited',
    features: [
      'Unlimited Projects',
      'Unlimited Storage',
      'Unlimited Bandwidth',
      'Dedicated Infrastructure',
      'SSO',
      'SLA',
      'Premium Support',
      'Custom Integrations',
    ],
  },
}
