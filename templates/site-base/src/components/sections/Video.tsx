import { cn } from '@/lib/utils'
import Image from 'next/image'

interface VideoProps {
  title?: string
  subtitle?: string
  videoType?: 'youtube' | 'vimeo' | 'upload'
  youtubeId?: string
  vimeoId?: string
  videoFile?: {
    url: string
  }
  poster?: {
    url: string
    alt: string
  }
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  aspectRatio?: '16/9' | '4/3' | '1/1' | '9/16'
  layout?: 'default' | 'full' | 'withText'
  caption?: string
}

export function Video({
  title,
  subtitle,
  videoType = 'youtube',
  youtubeId,
  vimeoId,
  videoFile,
  poster,
  autoplay = false,
  loop = false,
  muted = false,
  aspectRatio = '16/9',
  layout = 'default',
  caption,
}: VideoProps) {
  const aspectClasses = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
    '9/16': 'aspect-[9/16]',
  }

  const renderVideo = () => {
    if (videoType === 'youtube' && youtubeId) {
      const params = new URLSearchParams()
      if (autoplay) params.set('autoplay', '1')
      if (loop) params.set('loop', '1')
      if (muted) params.set('mute', '1')

      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?${params.toString()}`}
          title={title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      )
    }

    if (videoType === 'vimeo' && vimeoId) {
      const params = new URLSearchParams()
      if (autoplay) params.set('autoplay', '1')
      if (loop) params.set('loop', '1')
      if (muted) params.set('muted', '1')

      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?${params.toString()}`}
          title={title || 'Video'}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      )
    }

    if (videoType === 'upload' && videoFile) {
      return (
        <video
          src={videoFile.url}
          poster={poster?.url}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          controls
          className="absolute inset-0 w-full h-full object-cover"
        />
      )
    }

    // Placeholder when no video is set
    if (poster) {
      return (
        <Image
          src={poster.url}
          alt={poster.alt}
          fill
          className="object-cover"
        />
      )
    }

    return (
      <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
        <p className="text-gray-500">Vidéo non configurée</p>
      </div>
    )
  }

  return (
    <section className="py-section-md bg-white">
      <div
        className={cn(
          'mx-auto px-4',
          layout === 'full' ? 'container-fluid' : 'container'
        )}
      >
        {(title || subtitle) && (
          <div className="text-center mb-8">
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
            layout === 'withText' && 'grid lg:grid-cols-2 gap-12 items-center',
            layout !== 'full' && 'max-w-4xl mx-auto'
          )}
        >
          <div
            className={cn(
              'relative rounded-xl overflow-hidden',
              aspectClasses[aspectRatio],
              layout === 'full' && 'rounded-none'
            )}
          >
            {renderVideo()}
          </div>

          {layout === 'withText' && caption && (
            <div className="prose prose-lg max-w-none">
              <p>{caption}</p>
            </div>
          )}
        </div>

        {layout !== 'withText' && caption && (
          <p className="text-center text-gray-600 mt-4 max-w-2xl mx-auto">
            {caption}
          </p>
        )}
      </div>
    </section>
  )
}
