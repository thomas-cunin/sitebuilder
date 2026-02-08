'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
  question: string
  answer: unknown // Rich text
  category?: string
}

interface FAQProps {
  title?: string
  subtitle?: string
  items: FAQItem[]
  layout?: 'accordion' | 'columns' | 'grouped'
  contactCta?: {
    enabled?: boolean
    text?: string
    buttonLabel?: string
    buttonLink?: string
  }
}

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: unknown
  isOpen: boolean
  onToggle: () => void
}) {
  const renderAnswer = (richText: unknown) => {
    if (!richText) return null
    if (typeof richText === 'string') return <p>{richText}</p>
    return <div className="prose prose-sm max-w-none">{JSON.stringify(richText)}</div>
  }

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-4 text-left"
      >
        <span className="text-lg font-medium text-gray-900">{question}</span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-96 pb-4' : 'max-h-0'
        )}
      >
        <div className="text-gray-600">{renderAnswer(answer)}</div>
      </div>
    </div>
  )
}

export function FAQ({
  title,
  subtitle,
  items,
  layout = 'accordion',
  contactCta,
}: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

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
            'max-w-3xl mx-auto',
            layout === 'columns' && 'max-w-5xl grid md:grid-cols-2 gap-8'
          )}
        >
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {contactCta?.enabled && (
          <div className="text-center mt-12 p-8 bg-gray-50 rounded-xl max-w-2xl mx-auto">
            <p className="text-gray-700 mb-4">{contactCta.text}</p>
            {contactCta.buttonLabel && contactCta.buttonLink && (
              <Link
                href={contactCta.buttonLink}
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                {contactCta.buttonLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
