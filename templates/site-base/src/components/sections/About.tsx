import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

interface AboutProps {
  title?: string
  content?: unknown // Rich text content
  image?: {
    url: string
    alt: string
  }
  imagePosition?: 'left' | 'right'
  stats?: Array<{
    value: string
    label: string
  }>
  cta?: {
    label?: string
    link?: string
  }
}

export function About({
  title,
  content,
  image,
  imagePosition = 'right',
  stats,
  cta,
}: AboutProps) {
  // Simple rich text rendering (can be enhanced with Payload's rich text renderer)
  const renderContent = (richText: unknown): React.ReactNode => {
    if (!richText) return null
    if (typeof richText === 'string') return <p>{richText}</p>
    // For Lexical rich text, we'd use Payload's renderer
    // For now, just show a placeholder if it's an object
    return <div className="prose prose-lg max-w-none">Content will be rendered here</div>
  }

  return (
    <section className="py-section-md bg-white">
      <div className="container mx-auto px-4">
        <div
          className={cn(
            'grid gap-12 items-center',
            image ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'
          )}
        >
          {/* Image */}
          {image && (
            <div
              className={cn(
                'relative aspect-[4/3] rounded-2xl overflow-hidden',
                imagePosition === 'right' && 'lg:order-2'
              )}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div>
            {title && (
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-6">
                {title}
              </h2>
            )}

            <div className="text-gray-600 mb-8">
              {renderContent(content)}
            </div>

            {/* Stats */}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl font-bold text-primary-600">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {cta?.label && cta?.link && (
              <Link
                href={cta.link}
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                {cta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
