'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'

interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select'
  placeholder?: string
  required?: boolean
  width?: 'full' | 'half'
  options?: Array<{ label: string; value: string }>
}

interface ContactProps {
  title?: string
  subtitle?: string
  formFields: FormField[]
  submitLabel?: string
  successMessage?: string
  contactInfo?: {
    showInfo?: boolean
    email?: string
    phone?: string
    address?: string
    hours?: string
  }
  showMap?: boolean
  mapUrl?: string
}

export function Contact({
  title,
  subtitle,
  formFields,
  submitLabel = 'Envoyer',
  successMessage = 'Merci pour votre message !',
  contactInfo,
  showMap,
  mapUrl,
}: ContactProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formName: 'contact',
          data,
          email: data.email,
          name: data.name,
        }),
      })
      setIsSuccess(true)
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false)
    }
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
            'max-w-5xl mx-auto',
            contactInfo?.showInfo && 'grid lg:grid-cols-3 gap-12'
          )}
        >
          {/* Contact Info */}
          {contactInfo?.showInfo && (
            <div className="space-y-6">
              {contactInfo.email && (
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Email</div>
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="text-gray-600 hover:text-primary-600"
                    >
                      {contactInfo.email}
                    </a>
                  </div>
                </div>
              )}
              {contactInfo.phone && (
                <div className="flex items-start gap-4">
                  <Phone className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Téléphone</div>
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="text-gray-600 hover:text-primary-600"
                    >
                      {contactInfo.phone}
                    </a>
                  </div>
                </div>
              )}
              {contactInfo.address && (
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Adresse</div>
                    <p className="text-gray-600 whitespace-pre-line">
                      {contactInfo.address}
                    </p>
                  </div>
                </div>
              )}
              {contactInfo.hours && (
                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Horaires</div>
                    <p className="text-gray-600 whitespace-pre-line">
                      {contactInfo.hours}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className={cn(contactInfo?.showInfo && 'lg:col-span-2')}>
            {isSuccess ? (
              <div className="bg-green-50 text-green-700 p-8 rounded-xl text-center">
                {successMessage}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm">
                <div className="grid gap-6">
                  {formFields.map((field, index) => (
                    <div
                      key={index}
                      className={cn(field.width === 'half' && 'md:col-span-1')}
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500"> *</span>}
                      </label>

                      {field.type === 'textarea' ? (
                        <textarea
                          name={field.name}
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          name={field.name}
                          required={field.required}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">{field.placeholder || 'Sélectionner...'}</option>
                          {field.options?.map((option, optIndex) => (
                            <option key={optIndex} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          placeholder={field.placeholder}
                          required={field.required}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 w-full py-3 px-6 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Envoi...' : submitLabel}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Map */}
        {showMap && mapUrl && (
          <div className="mt-12 rounded-xl overflow-hidden">
            <iframe
              src={mapUrl}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </section>
  )
}
