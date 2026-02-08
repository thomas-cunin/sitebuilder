import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from '@/lib/payload'
import { SectionRenderer } from '@/components/SectionRenderer'

async function getHomePage() {
  try {
    const payload = await getPayload()
    const pages = await payload.find({
      collection: 'pages',
      where: {
        slug: { equals: '/' },
        status: { equals: 'published' },
      },
      limit: 1,
    })
    return pages.docs[0]
  } catch {
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getHomePage()

  if (!page) {
    return {
      title: 'Accueil',
    }
  }

  return {
    title: page.meta?.title || page.title,
    description: page.meta?.description,
    openGraph: {
      title: page.meta?.title || page.title,
      description: page.meta?.description || undefined,
      images: page.meta?.image ? [(page.meta.image as { url: string }).url] : undefined,
    },
  }
}

export default async function HomePage() {
  const page = await getHomePage()

  if (!page) {
    notFound()
  }

  return (
    <>
      <SectionRenderer sections={page.sections || []} />
    </>
  )
}
