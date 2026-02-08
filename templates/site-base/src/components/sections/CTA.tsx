import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CTAProps {
  title: string
  description?: string
  primaryButton: {
    label: string
    link: string
  }
  secondaryButton?: {
    label?: string
    link?: string
  }
  backgroundImage?: {
    url: string
    alt: string
  }
  style?: 'default' | 'gradient' | 'image' | 'minimal'
  alignment?: 'left' | 'center'
}

export function CTA({
  title,
  description,
  primaryButton,
  secondaryButton,
  backgroundImage,
  style = 'default',
  alignment = 'center',
}: CTAProps) {
  const bgStyles = {
    default: 'bg-primary-600 text-white',
    gradient: 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white',
    image: 'text-white relative',
    minimal: 'bg-gray-100 text-gray-900',
  }

  return (
    <section
      className={cn('py-section-md', bgStyles[style])}
      style={
        style === 'image' && backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {style === 'image' && <div className="absolute inset-0 bg-black/60" />}

      <div className="container mx-auto px-4 relative z-10">
        <div
          className={cn(
            'max-w-3xl',
            alignment === 'center' && 'mx-auto text-center'
          )}
        >
          <h2
            className={cn(
              'text-3xl md:text-4xl font-heading font-bold mb-4',
              style === 'minimal' ? 'text-gray-900' : 'text-white'
            )}
          >
            {title}
          </h2>

          {description && (
            <p
              className={cn(
                'text-lg mb-8',
                style === 'minimal' ? 'text-gray-600' : 'text-white/90'
              )}
            >
              {description}
            </p>
          )}

          <div
            className={cn(
              'flex flex-wrap gap-4',
              alignment === 'center' && 'justify-center'
            )}
          >
            <Link
              href={primaryButton.link}
              className={cn(
                'inline-flex items-center justify-center px-8 py-3 font-semibold rounded-lg transition-colors',
                style === 'minimal'
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-white text-primary-700 hover:bg-gray-100'
              )}
            >
              {primaryButton.label}
            </Link>

            {secondaryButton?.label && secondaryButton?.link && (
              <Link
                href={secondaryButton.link}
                className={cn(
                  'inline-flex items-center justify-center px-8 py-3 font-semibold rounded-lg border-2 transition-colors',
                  style === 'minimal'
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-white text-white hover:bg-white/10'
                )}
              >
                {secondaryButton.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
