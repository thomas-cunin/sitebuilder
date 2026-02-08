import { Header, Footer } from '@/components/layout'
import { getPayload } from '@/lib/payload'

async function getSettings() {
  try {
    const payload = await getPayload()
    const settings = await payload.findGlobal({ slug: 'settings' })
    return settings
  } catch {
    return null
  }
}

async function getNavigation(location: 'header' | 'footer') {
  try {
    const payload = await getPayload()
    const nav = await payload.find({
      collection: 'navigation',
      where: { location: { equals: location } },
      limit: 1,
    })
    return nav.docs[0]?.items || []
  } catch {
    return []
  }
}

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, headerNav, footerNav] = await Promise.all([
    getSettings(),
    getNavigation('header'),
    getNavigation('footer'),
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        siteName={settings?.site?.name || 'Mon Site'}
        logo={settings?.site?.logo as { url: string; alt: string } | undefined}
        navigation={headerNav}
        ctaButton={
          settings?.navigation?.cta
            ? {
                label: settings.navigation.cta.label,
                link: settings.navigation.cta.link,
              }
            : undefined
        }
      />

      <main className="flex-1">{children}</main>

      <Footer
        siteName={settings?.site?.name || 'Mon Site'}
        logo={settings?.site?.logo as { url: string; alt: string } | undefined}
        navigation={footerNav}
        contact={{
          email: settings?.contact?.email,
          phone: settings?.contact?.phone,
          address: settings?.contact?.address,
        }}
        social={settings?.social?.links}
        copyright={settings?.footer?.copyright}
        showPoweredBy={settings?.footer?.showPoweredBy}
      />
    </div>
  )
}
