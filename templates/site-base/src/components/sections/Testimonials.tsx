'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Star } from 'lucide-react'

interface Testimonial {
  quote: string
  author: string
  role?: string
  company?: string
  avatar?: {
    url: string
    alt: string
  }
  rating?: number
}

interface TestimonialsProps {
  title?: string
  subtitle?: string
  testimonials: Testimonial[]
  layout?: 'grid' | 'carousel' | 'masonry'
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'w-5 h-5',
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          )}
        />
      ))}
    </div>
  )
}

export function Testimonials({
  title,
  subtitle,
  testimonials,
  layout = 'grid',
}: TestimonialsProps) {
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

        <div
          className={cn(
            layout === 'grid' && 'grid md:grid-cols-2 lg:grid-cols-3 gap-8',
            layout === 'masonry' && 'columns-1 md:columns-2 lg:columns-3 gap-8',
            layout === 'carousel' && 'flex overflow-x-auto gap-8 snap-x snap-mandatory pb-4'
          )}
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={cn(
                'bg-gray-50 rounded-xl p-6',
                layout === 'masonry' && 'break-inside-avoid mb-8',
                layout === 'carousel' && 'flex-shrink-0 w-[350px] snap-center'
              )}
            >
              {testimonial.rating && (
                <RatingStars rating={testimonial.rating} />
              )}

              <blockquote className="text-gray-700 mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-4">
                {testimonial.avatar && (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={testimonial.avatar.url}
                      alt={testimonial.avatar.alt}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.author}
                  </div>
                  {(testimonial.role || testimonial.company) && (
                    <div className="text-sm text-gray-500">
                      {testimonial.role}
                      {testimonial.role && testimonial.company && ' · '}
                      {testimonial.company}
                    </div>
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
