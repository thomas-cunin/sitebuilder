import type { Block } from 'payload'

export const FAQ: Block = {
  slug: 'faq',
  labels: {
    singular: 'FAQ Section',
    plural: 'FAQ Sections',
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
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 30,
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
        },
        {
          name: 'answer',
          type: 'richText',
          required: true,
        },
        {
          name: 'category',
          type: 'text',
          admin: {
            description: 'Optional category for grouping',
          },
        },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'accordion',
      options: [
        { label: 'Accordion', value: 'accordion' },
        { label: 'Two Columns', value: 'columns' },
        { label: 'Grouped', value: 'grouped' },
      ],
    },
    {
      name: 'contactCta',
      type: 'group',
      admin: {
        description: 'Optional contact CTA at bottom',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'text',
          type: 'text',
          defaultValue: "Vous n'avez pas trouvé votre réponse ?",
        },
        {
          name: 'buttonLabel',
          type: 'text',
          defaultValue: 'Contactez-nous',
        },
        {
          name: 'buttonLink',
          type: 'text',
        },
      ],
    },
  ],
}
