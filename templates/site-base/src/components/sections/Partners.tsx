import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Partner {
  name: string
  logo: {
    url: string
    alt: string
  }
  link?: string
}

interface PartnersProps {
  title?: string
  subtitle?: string
  logos: Partner[]
  style?: 'default' | 'carousel' | 'grayscale'
  size?: 'small' | 'medium' | 'large'
}

export function Partners({
  title,
  subtitle,
  logos,
  style = 'default',
  size = 'medium',
}: PartnersProps) {
  const logoSizes = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16',
  }

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
            style === 'carousel'
              ? 'flex overflow-x-auto gap-12 snap-x snap-mandatory pb-4'
              : 'flex flex-wrap justify-center items-center gap-8 md:gap-12'
          )}
        >
          {logos.map((partner, index) => {
            const LogoElement = (
              <div
                className={cn(
                  'flex items-center justify-center',
                  style === 'carousel' && 'flex-shrink-0 snap-center'
                )}
              >
                <Image
                  src={partner.logo.url}
                  alt={partner.logo.alt || partner.name}
                  width={200}
                  height={80}
                  className={cn(
                    'w-auto object-contain transition-all',
                    logoSizes[size],
                    style === 'grayscale' && 'grayscale hover:grayscale-0',
                    'opacity-60 hover:opacity-100'
                  )}
                />
              </div>
            )

            if (partner.link) {
              return (
                <a
                  key={index}
                  href={partner.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={partner.name}
                >
                  {LogoElement}
                </a>
              )
            }

            return <div key={index}>{LogoElement}</div>
          })}
        </div>
      </div>
    </section>
  )
}
