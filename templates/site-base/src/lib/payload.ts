import { getPayload as getPayloadClient } from 'payload'
import config from '@payload-config'

/**
 * Get Payload CMS client instance
 * Use this in Server Components and API routes
 */
export async function getPayload() {
  return getPayloadClient({ config })
}

/**
 * Type-safe helper to get payload for use in pages
 */
export type PayloadType = Awaited<ReturnType<typeof getPayload>>
