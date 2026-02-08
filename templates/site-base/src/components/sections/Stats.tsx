import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'

interface Stat {
  value: string
  label: string
  description?: string
  icon?: string
}

interface StatsProps {
  title?: string
  subtitle?: string
  stats: Stat[]
  style?: 'default' | 'cards' | 'minimal' | 'background'
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

export function Stats({
  title,
  subtitle,
  stats,
  style = 'default',
  columns = '4',
}: StatsProps) {
  const gridCols = {
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-3',
    '4': 'md:grid-cols-2 lg:grid-cols-4',
  }

  const sectionStyles = {
    default: 'bg-white',
    cards: 'bg-gray-50',
    minimal: 'bg-white',
    background: 'bg-primary-600 text-white',
  }

  return (
    <section className={cn('py-section-md', sectionStyles[style])}>
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2
                className={cn(
                  'text-3xl md:text-4xl font-heading font-bold mb-4',
                  style === 'background' ? 'text-white' : 'text-gray-900'
                )}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={cn(
                  'text-lg max-w-2xl mx-auto',
                  style === 'background' ? 'text-white/90' : 'text-gray-600'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className={cn('grid gap-8', gridCols[columns])}>
          {stats.map((stat, index) => (
            <div
              key={index}
              className={cn(
                'text-center',
                style === 'cards' && 'bg-white p-8 rounded-xl shadow-sm'
              )}
            >
              {stat.icon && (
                <div
                  className={cn(
                    'flex justify-center mb-4',
                    style === 'background' ? 'text-white' : 'text-primary-600'
                  )}
                >
                  {getIcon(stat.icon)}
                </div>
              )}

              <div
                className={cn(
                  'text-4xl md:text-5xl font-bold mb-2',
                  style === 'background' ? 'text-white' : 'text-primary-600'
                )}
              >
                {stat.value}
              </div>

              <div
                className={cn(
                  'text-lg font-medium',
                  style === 'background' ? 'text-white' : 'text-gray-900'
                )}
              >
                {stat.label}
              </div>

              {stat.description && (
                <p
                  className={cn(
                    'text-sm mt-1',
                    style === 'background' ? 'text-white/80' : 'text-gray-500'
                  )}
                >
                  {stat.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
