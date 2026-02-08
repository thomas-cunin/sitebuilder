import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react'

interface NavigationItem {
  label: string
  type: 'page' | 'external' | 'anchor'
  page?: { slug: string }
  url?: string
  anchor?: string
  openInNewTab?: boolean
}

interface SocialLink {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok'
  url: string
}

interface FooterProps {
  siteName: string
  logo?: {
    url: string
    alt: string
  }
  navigation?: NavigationItem[]
  contact?: {
    email?: string
    phone?: string
    address?: string
  }
  social?: SocialLink[]
  copyright?: string
  showPoweredBy?: boolean
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

function SocialIcon({ platform }: { platform: SocialLink['platform'] }) {
  const icons = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
    tiktok: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
      </svg>
    ),
  }

  const Icon = icons[platform] || Facebook
  return <Icon className="w-5 h-5" />
}

export function Footer({
  siteName,
  logo,
  navigation,
  contact,
  social,
  copyright,
  showPoweredBy = true,
}: FooterProps) {
  const currentYear = new Date().getFullYear()
  const formattedCopyright = copyright?.replace('{year}', String(currentYear)) || `© ${currentYear} ${siteName}. Tous droits réservés.`

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              {logo ? (
                <Image
                  src={logo.url}
                  alt={logo.alt || siteName}
                  width={150}
                  height={40}
                  className="h-8 w-auto brightness-0 invert"
                />
              ) : (
                <span className="text-xl font-bold text-white">{siteName}</span>
              )}
            </Link>

            {contact && (
              <div className="space-y-2 text-sm">
                {contact.email && (
                  <p>
                    <a href={`mailto:${contact.email}`} className="hover:text-white">
                      {contact.email}
                    </a>
                  </p>
                )}
                {contact.phone && (
                  <p>
                    <a href={`tel:${contact.phone}`} className="hover:text-white">
                      {contact.phone}
                    </a>
                  </p>
                )}
                {contact.address && (
                  <p className="whitespace-pre-line">{contact.address}</p>
                )}
              </div>
            )}

            {/* Social Links */}
            {social && social.length > 0 && (
              <div className="flex gap-4 mt-6">
                {social.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={link.platform}
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          {navigation && navigation.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2">
                {navigation.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={getHref(item)}
                      target={item.openInNewTab ? '_blank' : undefined}
                      rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>{formattedCopyright}</p>

            {showPoweredBy && (
              <p className="text-gray-500">
                Propulsé par{' '}
                <a
                  href="https://payloadcms.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300"
                >
                  Payload CMS
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
