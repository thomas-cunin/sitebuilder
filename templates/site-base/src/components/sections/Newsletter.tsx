'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NewsletterProps {
  title?: string
  description?: string
  placeholder?: string
  buttonLabel?: string
  successMessage?: string
  showName?: boolean
  gdprText?: string
  style?: 'default' | 'inline' | 'background' | 'card'
  backgroundImage?: {
    url: string
    alt: string
  }
}

export function Newsletter({
  title,
  description,
  placeholder = 'Votre adresse email',
  buttonLabel = "S'abonner",
  successMessage = 'Merci pour votre inscription !',
  showName = false,
  gdprText,
  style = 'default',
  backgroundImage,
}: NewsletterProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formName: 'newsletter',
          data: { email, name },
          email,
          name,
        }),
      })
      setIsSuccess(true)
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false)
    }
  }

  const sectionStyles = {
    default: 'bg-gray-50',
    inline: 'bg-white',
    background: 'bg-primary-600 text-white relative',
    card: 'bg-white',
  }

  return (
    <section
      className={cn('py-section-md', sectionStyles[style])}
      style={
        style === 'background' && backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {style === 'background' && (
        <div className="absolute inset-0 bg-primary-600/90" />
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div
          className={cn(
            'max-w-2xl mx-auto text-center',
            style === 'card' && 'bg-gray-50 rounded-2xl p-8 md:p-12'
          )}
        >
          {title && (
            <h2
              className={cn(
                'text-2xl md:text-3xl font-heading font-bold mb-4',
                style === 'background' ? 'text-white' : 'text-gray-900'
              )}
            >
              {title}
            </h2>
          )}

          {description && (
            <p
              className={cn(
                'text-lg mb-6',
                style === 'background' ? 'text-white/90' : 'text-gray-600'
              )}
            >
              {description}
            </p>
          )}

          {isSuccess ? (
            <div
              className={cn(
                'p-4 rounded-lg',
                style === 'background'
                  ? 'bg-white/20 text-white'
                  : 'bg-green-50 text-green-700'
              )}
            >
              {successMessage}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className={cn(
                style === 'inline'
                  ? 'flex gap-4'
                  : 'space-y-4'
              )}
            >
              {showName && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              )}

              <div className={cn(style === 'inline' ? 'flex-1' : 'w-full')}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={placeholder}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'px-8 py-3 font-semibold rounded-lg transition-colors disabled:opacity-50',
                  style === 'background'
                    ? 'bg-white text-primary-700 hover:bg-gray-100'
                    : 'bg-primary-600 text-white hover:bg-primary-700',
                  style !== 'inline' && 'w-full'
                )}
              >
                {isSubmitting ? '...' : buttonLabel}
              </button>
            </form>
          )}

          {gdprText && (
            <p
              className={cn(
                'text-xs mt-4',
                style === 'background' ? 'text-white/70' : 'text-gray-500'
              )}
            >
              {gdprText}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
