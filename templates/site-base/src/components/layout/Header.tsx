'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'

interface NavigationItem {
  label: string
  type: 'page' | 'external' | 'anchor'
  page?: { slug: string }
  url?: string
  anchor?: string
  openInNewTab?: boolean
  children?: NavigationItem[]
}

interface HeaderProps {
  siteName: string
  logo?: {
    url: string
    alt: string
  }
  navigation?: NavigationItem[]
  ctaButton?: {
    label: string
    link: string
  }
}

function getHref(item: NavigationItem): string {
  if (item.type === 'page' && item.page) {
    return item.page.slug === '/' ? '/' : `/${item.page.slug}`
  }
  if (item.type === 'external' && item.url) {
    return item.url
  }
  if (item.type === 'anchor' && item.anchor) {
    return item.anchor
  }
  return '#'
}

export function Header({ siteName, logo, navigation, ctaButton }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            {logo ? (
              <Image
                src={logo.url}
                alt={logo.alt || siteName}
                width={150}
                height={40}
                className="h-8 md:h-10 w-auto"
              />
            ) : (
              <span className="text-xl font-bold text-gray-900">{siteName}</span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navigation?.map((item, index) => (
              <div key={index} className="relative group">
                <Link
                  href={getHref(item)}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  {item.label}
                </Link>

                {/* Dropdown for children */}
                {item.children && item.children.length > 0 && (
                  <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-2 min-w-[200px]">
                      {item.children.map((child, childIndex) => (
                        <Link
                          key={childIndex}
                          href={getHref(child)}
                          target={child.openInNewTab ? '_blank' : undefined}
                          rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                          className="block px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {ctaButton && (
              <Link
                href={ctaButton.link}
                className="px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                {ctaButton.label}
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300',
            isMenuOpen ? 'max-h-screen pb-6' : 'max-h-0'
          )}
        >
          <nav className="flex flex-col gap-4">
            {navigation?.map((item, index) => (
              <div key={index}>
                <Link
                  href={getHref(item)}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>

                {item.children && item.children.length > 0 && (
                  <div className="pl-4 mt-2 space-y-2">
                    {item.children.map((child, childIndex) => (
                      <Link
                        key={childIndex}
                        href={getHref(child)}
                        target={child.openInNewTab ? '_blank' : undefined}
                        rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                        className="block text-gray-500 hover:text-gray-900"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {ctaButton && (
              <Link
                href={ctaButton.link}
                className="mt-2 px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                {ctaButton.label}
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
