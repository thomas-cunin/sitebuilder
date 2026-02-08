import { cn } from '@/lib/utils'
import Link from 'next/link'

interface HeroProps {
  headline: string
  subheadline?: string
  backgroundImage?: {
    url: string
    alt: string
  }
  primaryCta?: {
    label?: string
    link?: string
  }
  secondaryCta?: {
    label?: string
    link?: string
  }
  alignment?: 'left' | 'center' | 'right'
  overlay?: boolean
}

export function Hero({
  headline,
  subheadline,
  backgroundImage,
  primaryCta,
  secondaryCta,
  alignment = 'center',
  overlay = true,
}: HeroProps) {
  return (
    <section
      className={cn(
        'relative min-h-[60vh] flex items-center py-section-lg',
        backgroundImage ? 'text-white' : 'bg-gradient-to-br from-primary-600 to-primary-800 text-white'
      )}
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {backgroundImage && overlay && (
        <div className="absolute inset-0 bg-black/50" />
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div
          className={cn(
            'max-w-4xl',
            alignment === 'center' && 'mx-auto text-center',
            alignment === 'right' && 'ml-auto text-right'
          )}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
            {headline}
          </h1>

          {subheadline && (
            <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              {subheadline}
            </p>
          )}

          {(primaryCta?.label || secondaryCta?.label) && (
            <div
              className={cn(
                'flex flex-wrap gap-4',
                alignment === 'center' && 'justify-center',
                alignment === 'right' && 'justify-end'
              )}
            >
              {primaryCta?.label && primaryCta?.link && (
                <Link
                  href={primaryCta.link}
                  className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {primaryCta.label}
                </Link>
              )}

              {secondaryCta?.label && secondaryCta?.link && (
                <Link
                  href={secondaryCta.link}
                  className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
