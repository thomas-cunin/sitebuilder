import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'

interface Feature {
  icon?: string
  title: string
  description?: string
  link?: string
}

interface FeaturesProps {
  title?: string
  subtitle?: string
  features: Feature[]
  columns?: '2' | '3' | '4'
}

function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null
  const pascalCase = iconName.charAt(0).toUpperCase() + iconName.slice(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (LucideIcons as any)[pascalCase]
  if (!IconComponent) return null
  return <IconComponent className="w-8 h-8" />
}

export function Features({
  title,
  subtitle,
  features,
  columns = '3',
}: FeaturesProps) {
  const gridCols = {
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-2 lg:grid-cols-3',
    '4': 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section className="py-section-md bg-white">
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

        <div className={cn('grid gap-8', gridCols[columns])}>
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {feature.icon && (
                <div className="text-primary-600 mb-4">
                  {getIcon(feature.icon)}
                </div>
              )}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              {feature.description && (
                <p className="text-gray-600">{feature.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
