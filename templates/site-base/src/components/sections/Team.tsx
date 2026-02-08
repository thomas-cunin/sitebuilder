import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Linkedin, Twitter, Mail } from 'lucide-react'

interface TeamMember {
  name: string
  role: string
  bio?: string
  photo?: {
    url: string
    alt: string
  }
  social?: {
    linkedin?: string
    twitter?: string
    email?: string
  }
}

interface TeamProps {
  title?: string
  subtitle?: string
  members: TeamMember[]
  columns?: '2' | '3' | '4'
}

export function Team({
  title,
  subtitle,
  members,
  columns = '4',
}: TeamProps) {
  const gridCols = {
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-2 lg:grid-cols-3',
    '4': 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section className="py-section-md bg-white">
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className={cn('grid gap-8', gridCols[columns])}>
          {members.map((member, index) => (
            <div key={index} className="text-center">
              {member.photo && (
                <div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden mb-4">
                  <Image
                    src={member.photo.url}
                    alt={member.photo.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <h3 className="text-xl font-semibold text-gray-900">
                {member.name}
              </h3>
              <p className="text-primary-600 font-medium mb-2">{member.role}</p>

              {member.bio && (
                <p className="text-gray-600 text-sm mb-4">{member.bio}</p>
              )}

              {member.social && (
                <div className="flex justify-center gap-3">
                  {member.social.linkedin && (
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.twitter && (
                    <a
                      href={member.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {member.social.email && (
                    <a
                      href={`mailto:${member.social.email}`}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
