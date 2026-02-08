import type { Block } from 'payload'

import { Hero } from './Hero'
import { Features } from './Features'
import { About } from './About'
import { Services } from './Services'
import { Testimonials } from './Testimonials'
import { Team } from './Team'
import { Pricing } from './Pricing'
import { FAQ } from './FAQ'
import { CTA } from './CTA'
import { Contact } from './Contact'
import { Stats } from './Stats'
import { Gallery } from './Gallery'
import { Partners } from './Partners'
import { Newsletter } from './Newsletter'
import { Content } from './Content'
import { Video } from './Video'

/**
 * All available section blocks for pages
 * These are used in the Pages collection blocks field
 */
export const blocks: Block[] = [
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
]

/**
 * Block type names for type safety
 */
export const blockTypes = [
  'hero',
  'features',
  'about',
  'services',
  'testimonials',
  'team',
  'pricing',
  'faq',
  'cta',
  'contact',
  'stats',
  'gallery',
  'partners',
  'newsletter',
  'content',
  'video',
] as const

export type BlockType = (typeof blockTypes)[number]

// Export individual blocks
export {
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
}
