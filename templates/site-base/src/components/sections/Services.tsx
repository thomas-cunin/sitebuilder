import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import * as LucideIcons from 'lucide-react'

interface Service {
  icon?: string
  title: string
  description?: string
  image?: {
    url: string
    alt: string
  }
  price?: string
  link?: string
}

interface ServicesProps {
  title?: string
  subtitle?: string
  services: Service[]
  layout?: 'grid' | 'list' | 'cards'
}

function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null
  const pascalCase = iconName.charAt(0).toUpperCase() + iconName.slice(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (LucideIcons as any)[pascalCase]
  if (!IconComponent) return null
  return <IconComponent className="w-8 h-8" />
}

export function Services({
  title,
  subtitle,
  services,
  layout = 'grid',
}: ServicesProps) {
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

        <div
          className={cn(
            layout === 'grid' && 'grid md:grid-cols-2 lg:grid-cols-3 gap-8',
            layout === 'list' && 'space-y-6 max-w-4xl mx-auto',
            layout === 'cards' && 'grid md:grid-cols-2 lg:grid-cols-3 gap-8'
          )}
        >
          {services.map((service, index) => (
            <div
              key={index}
              className={cn(
                'bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow',
                layout === 'list' && 'flex items-center gap-6 p-6',
                layout !== 'list' && 'flex flex-col'
              )}
            >
              {service.image && layout !== 'list' && (
                <div className="relative aspect-[16/9]">
                  <Image
                    src={service.image.url}
                    alt={service.image.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className={cn('p-6', layout === 'list' && 'p-0 flex-1')}>
                {service.icon && !service.image && (
                  <div className="text-primary-600 mb-4">
                    {getIcon(service.icon)}
                  </div>
                )}

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>

                {service.description && (
                  <p className="text-gray-600 mb-4">{service.description}</p>
                )}

                <div className="flex items-center justify-between mt-auto">
                  {service.price && (
                    <span className="text-lg font-semibold text-primary-600">
                      {service.price}
                    </span>
                  )}

                  {service.link && (
                    <Link
                      href={service.link}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      En savoir plus →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
