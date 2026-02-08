import { cn } from '@/lib/utils'

interface ContentProps {
  title?: string
  content: unknown // Rich text
  layout?: 'default' | 'narrow' | 'wide' | 'columns'
  alignment?: 'left' | 'center'
  backgroundStyle?: 'none' | 'gray' | 'primary'
}

export function Content({
  title,
  content,
  layout = 'default',
  alignment = 'left',
  backgroundStyle = 'none',
}: ContentProps) {
  const renderContent = (richText: unknown) => {
    if (!richText) return null
    if (typeof richText === 'string') return <p>{richText}</p>
    // For Lexical rich text, we'd use Payload's renderer
    return <div>{JSON.stringify(richText)}</div>
  }

  const bgStyles = {
    none: 'bg-white',
    gray: 'bg-gray-50',
    primary: 'bg-primary-50',
  }

  const maxWidths = {
    default: 'max-w-4xl',
    narrow: 'max-w-2xl',
    wide: 'max-w-6xl',
    columns: 'max-w-6xl',
  }

  return (
    <section className={cn('py-section-md', bgStyles[backgroundStyle])}>
      <div className="container mx-auto px-4">
        <div
          className={cn(
            'mx-auto',
            maxWidths[layout],
            alignment === 'center' && 'text-center'
          )}
        >
          {title && (
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-8">
              {title}
            </h2>
          )}

          <div
            className={cn(
              'prose prose-lg max-w-none',
              layout === 'columns' && 'md:columns-2 gap-8',
              alignment === 'center' && 'prose-headings:text-center'
            )}
          >
            {renderContent(content)}
          </div>
        </div>
      </div>
    </section>
  )
}
