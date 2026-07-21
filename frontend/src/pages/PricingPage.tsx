import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Check, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for side projects',
    features: ['5 Projects', '2GB Storage', '25GB Bandwidth', 'Community Support'],
  },
  {
    name: 'Starter',
    price: '$8',
    description: 'For growing applications',
    features: ['15 Projects', '20GB Storage', '150GB Bandwidth', 'Email Support', 'Custom Domains'],
    popular: true,
  },
  {
    name: 'Pro',
    price: '$20',
    description: 'For professional developers',
    features: ['50 Projects', '100GB Storage', '1TB Bandwidth', 'Priority Support', 'Team Collaboration', 'Analytics'],
  },
  {
    name: 'Business',
    price: '$50',
    description: 'For teams and businesses',
    features: ['150 Projects', '500GB Storage', 'Unlimited Bandwidth', '24/7 Support', 'SSO', 'Audit Logs'],
  },
]

export default function PricingPage() {
  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">Choose the plan that fits your needs</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <GlassCard
            key={plan.name}
            className={`relative ${plan.popular ? 'border-primary-500/50' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-gray-500 dark:text-gray-400">/mo</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{plan.description}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link to="/register" className="block mt-6">
              <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full" icon={<ArrowRight className="w-4 h-4" />}>
                Get Started
              </Button>
            </Link>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
