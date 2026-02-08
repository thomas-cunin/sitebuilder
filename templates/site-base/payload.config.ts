import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
// import { s3Storage } from '@payloadcms/storage-s3'

// Collections
import { Pages } from '@/collections/Pages'
import { Media } from '@/collections/Media'
import { Navigation } from '@/collections/Navigation'
import { Settings } from '@/collections/Settings'
import { FormSubmissions } from '@/collections/FormSubmissions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // Admin panel configuration
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      url: ({ data, locale }) => {
        const slug = data?.slug
        if (slug === '/') return `${process.env.NEXT_PUBLIC_SERVER_URL}/`
        return `${process.env.NEXT_PUBLIC_SERVER_URL}/${slug}`
      },
      collections: ['pages'],
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },

  // Collections
  collections: [Pages, Media, Navigation, FormSubmissions],

  // Globals
  globals: [Settings],

  // Rich text editor
  editor: lexicalEditor(),

  // Database - SQLite for development
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./data/database.db',
    },
  }),

  // Secret for authentication
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-in-production',

  // TypeScript configuration
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload-types.ts'),
  },

  // Upload paths
  upload: {
    limits: {
      fileSize: 5000000, // 5MB
    },
  },

  // Optional: S3 storage for production
  // plugins: [
  //   s3Storage({
  //     collections: {
  //       media: true,
  //     },
  //     bucket: process.env.S3_BUCKET || 'site-media',
  //     config: {
  //       credentials: {
  //         accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  //         secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  //       },
  //       region: process.env.S3_REGION || 'us-east-1',
  //       endpoint: process.env.S3_ENDPOINT,
  //       forcePathStyle: true,
  //     },
  //   }),
  // ],
})
