import type { Block } from 'payload'

export const Partners: Block = {
  slug: 'partners',
  labels: {
    singular: 'Partners/Logos Section',
    plural: 'Partners/Logos Sections',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'subtitle',
      type: 'textarea',
    },
    {
      name: 'logos',
      type: 'array',
      minRows: 1,
      maxRows: 20,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'link',
          type: 'text',
        },
      ],
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'default',
      options: [
        { label: 'Default (Grid)', value: 'default' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'Grayscale', value: 'grayscale' },
      ],
    },
    {
      name: 'size',
      type: 'select',
      defaultValue: 'medium',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
    },
  ],
}
