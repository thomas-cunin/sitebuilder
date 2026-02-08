import type { GlobalConfig } from 'payload'

export const Settings: GlobalConfig = {
  slug: 'settings',
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Site Info',
          name: 'site',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              defaultValue: 'Mon Site',
              admin: {
                description: 'Site name displayed in header and SEO',
              },
            },
            {
              name: 'tagline',
              type: 'text',
              admin: {
                description: 'Short description of the site',
              },
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'favicon',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
        {
          label: 'Contact',
          name: 'contact',
          fields: [
            {
              name: 'email',
              type: 'email',
            },
            {
              name: 'phone',
              type: 'text',
            },
            {
              name: 'address',
              type: 'textarea',
            },
          ],
        },
        {
          label: 'Social',
          name: 'social',
          fields: [
            {
              name: 'links',
              type: 'array',
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Facebook', value: 'facebook' },
                    { label: 'Instagram', value: 'instagram' },
                    { label: 'Twitter/X', value: 'twitter' },
                    { label: 'LinkedIn', value: 'linkedin' },
                    { label: 'YouTube', value: 'youtube' },
                    { label: 'TikTok', value: 'tiktok' },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          name: 'seo',
          fields: [
            {
              name: 'defaultTitle',
              type: 'text',
              admin: {
                description: 'Default SEO title suffix',
              },
            },
            {
              name: 'defaultDescription',
              type: 'textarea',
              admin: {
                description: 'Default meta description',
              },
            },
            {
              name: 'defaultImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Default social sharing image',
              },
            },
          ],
        },
        {
          label: 'Footer',
          name: 'footer',
          fields: [
            {
              name: 'copyright',
              type: 'text',
              defaultValue: '© {year} Mon Site. Tous droits réservés.',
              admin: {
                description: 'Use {year} for current year',
              },
            },
            {
              name: 'showPoweredBy',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
      ],
    },
  ],
}
