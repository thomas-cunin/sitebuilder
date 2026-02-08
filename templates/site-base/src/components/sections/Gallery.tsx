'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { X } from 'lucide-react'

interface GalleryImage {
  image: {
    url: string
    alt: string
  }
  caption?: string
  category?: string
}

interface GalleryProps {
  title?: string
  subtitle?: string
  images: GalleryImage[]
  layout?: 'grid' | 'masonry' | 'carousel'
  columns?: '2' | '3' | '4'
  showFilters?: boolean
  lightbox?: boolean
}

export function Gallery({
  title,
  subtitle,
  images,
  layout = 'grid',
  columns = '3',
  showFilters = false,
  lightbox = true,
}: GalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)

  const categories = showFilters
    ? Array.from(new Set(images.map((img) => img.category).filter(Boolean)))
    : []

  const filteredImages = activeCategory
    ? images.filter((img) => img.category === activeCategory)
    : images

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

        {/* Filters */}
        {showFilters && categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                activeCategory === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              Tous
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category as string)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  activeCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Gallery Grid */}
        <div
          className={cn(
            'grid gap-4',
            layout === 'grid' && gridCols[columns],
            layout === 'masonry' && 'columns-2 lg:columns-3 gap-4',
            layout === 'carousel' && 'flex overflow-x-auto gap-4 snap-x snap-mandatory pb-4'
          )}
        >
          {filteredImages.map((item, index) => (
            <div
              key={index}
              className={cn(
                'relative group cursor-pointer overflow-hidden rounded-lg',
                layout === 'grid' && 'aspect-square',
                layout === 'masonry' && 'break-inside-avoid mb-4',
                layout === 'carousel' && 'flex-shrink-0 w-[300px] aspect-[4/3] snap-center'
              )}
              onClick={() => lightbox && setLightboxImage(item)}
            >
              <Image
                src={item.image.url}
                alt={item.image.alt}
                fill={layout !== 'masonry'}
                width={layout === 'masonry' ? 400 : undefined}
                height={layout === 'masonry' ? 300 : undefined}
                className={cn(
                  'object-cover transition-transform duration-300 group-hover:scale-105',
                  layout !== 'masonry' && 'absolute inset-0'
                )}
              />
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white text-sm">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="relative max-w-4xl max-h-[90vh]">
              <Image
                src={lightboxImage.image.url}
                alt={lightboxImage.image.alt}
                width={1200}
                height={800}
                className="object-contain max-h-[90vh]"
              />
              {lightboxImage.caption && (
                <p className="absolute bottom-0 left-0 right-0 text-white text-center p-4 bg-black/50">
                  {lightboxImage.caption}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
