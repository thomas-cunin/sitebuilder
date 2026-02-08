import {
  Hero,
  Features,
  About,
  Services,
  Testimonials,
  Team,
  Pricing,
  FAQ,
  CTA,
  Contact,
  Stats,
  Gallery,
  Partners,
  Newsletter,
  Content,
  Video,
} from '@/components/sections'

type BlockType =
  | 'hero'
  | 'features'
  | 'about'
  | 'services'
  | 'testimonials'
  | 'team'
  | 'pricing'
  | 'faq'
  | 'cta'
  | 'contact'
  | 'stats'
  | 'gallery'
  | 'partners'
  | 'newsletter'
  | 'content'
  | 'video'

interface Block {
  blockType: BlockType
  id?: string
  [key: string]: unknown
}

interface SectionRendererProps {
  sections: Block[]
}

/**
 * Renders an array of Payload CMS blocks as React components
 * Maps blockType to the corresponding section component
 */
export function SectionRenderer({ sections }: SectionRendererProps) {
  if (!sections || sections.length === 0) return null

  return (
    <>
      {sections.map((section, index) => {
        const key = section.id || `section-${index}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props = section as any

        switch (section.blockType) {
          case 'hero':
            return <Hero key={key} {...props} />
          case 'features':
            return <Features key={key} {...props} />
          case 'about':
            return <About key={key} {...props} />
          case 'services':
            return <Services key={key} {...props} />
          case 'testimonials':
            return <Testimonials key={key} {...props} />
          case 'team':
            return <Team key={key} {...props} />
          case 'pricing':
            return <Pricing key={key} {...props} />
          case 'faq':
            return <FAQ key={key} {...props} />
          case 'cta':
            return <CTA key={key} {...props} />
          case 'contact':
            return <Contact key={key} {...props} />
          case 'stats':
            return <Stats key={key} {...props} />
          case 'gallery':
            return <Gallery key={key} {...props} />
          case 'partners':
            return <Partners key={key} {...props} />
          case 'newsletter':
            return <Newsletter key={key} {...props} />
          case 'content':
            return <Content key={key} {...props} />
          case 'video':
            return <Video key={key} {...props} />
          default:
            console.warn(`Unknown block type: ${section.blockType}`)
            return null
        }
      })}
    </>
  )
}
