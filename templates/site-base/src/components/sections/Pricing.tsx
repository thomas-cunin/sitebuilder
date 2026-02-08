import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Check, X } from 'lucide-react'

interface PricingPlan {
  name: string
  description?: string
  price: string
  period?: string
  features: Array<{
    feature: string
    included: boolean
  }>
  cta?: {
    label?: string
    link?: string
  }
  highlighted?: boolean
  badge?: string
}

interface PricingProps {
  title?: string
  subtitle?: string
  plans: PricingPlan[]
}

export function Pricing({ title, subtitle, plans }: PricingProps) {
  return (
    <section className="py-section-md bg-gray-50">
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                'relative bg-white rounded-2xl p-8 shadow-sm',
                plan.highlighted &&
                  'ring-2 ring-primary-600 shadow-lg scale-105'
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-sm font-medium px-4 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                {plan.description && (
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                )}
              </div>

              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-gray-500">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center gap-3 text-sm"
                  >
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        feature.included ? 'text-gray-700' : 'text-gray-400'
                      )}
                    >
                      {feature.feature}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.cta?.label && plan.cta?.link && (
                <Link
                  href={plan.cta.link}
                  className={cn(
                    'block w-full text-center py-3 px-6 rounded-lg font-semibold transition-colors',
                    plan.highlighted
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {plan.cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
