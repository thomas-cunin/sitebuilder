import type { Block } from 'payload'

export const Newsletter: Block = {
  slug: 'newsletter',
  labels: {
    singular: 'Newsletter Section',
    plural: 'Newsletter Sections',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'placeholder',
      type: 'text',
      defaultValue: 'Votre adresse email',
    },
    {
      name: 'buttonLabel',
      type: 'text',
      defaultValue: "S'abonner",
    },
    {
      name: 'successMessage',
      type: 'text',
      defaultValue: 'Merci pour votre inscription !',
    },
    {
      name: 'showName',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Also ask for name',
      },
    },
    {
      name: 'gdprText',
      type: 'textarea',
      admin: {
        description: 'Privacy policy / GDPR notice',
      },
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Inline', value: 'inline' },
        { label: 'With Background', value: 'background' },
        { label: 'Card', value: 'card' },
      ],
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_: unknown, siblingData: Record<string, unknown>) =>
          siblingData?.style === 'background',
      },
    },
  ],
}
