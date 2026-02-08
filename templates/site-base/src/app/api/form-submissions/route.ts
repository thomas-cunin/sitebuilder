import { NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { formName, data, email, name } = body

    if (!formName || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const payload = await getPayload()

    await payload.create({
      collection: 'form-submissions',
      data: {
        formName,
        data,
        email,
        name,
        status: 'new',
        metadata: {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          referrer: request.headers.get('referer') || 'unknown',
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Form submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    )
  }
}
