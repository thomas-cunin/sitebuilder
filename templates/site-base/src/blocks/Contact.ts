import type { Block } from 'payload'

export const Contact: Block = {
  slug: 'contact',
  labels: {
    singular: 'Contact Section',
    plural: 'Contact Sections',
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
      name: 'formFields',
      type: 'array',
      minRows: 1,
      maxRows: 10,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Field name (used in submissions)',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'type',
          type: 'select',
          defaultValue: 'text',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Phone', value: 'tel' },
            { label: 'Textarea', value: 'textarea' },
            { label: 'Select', value: 'select' },
          ],
        },
        {
          name: 'placeholder',
          type: 'text',
        },
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'width',
          type: 'select',
          defaultValue: 'full',
          options: [
            { label: 'Full Width', value: 'full' },
            { label: 'Half Width', value: 'half' },
          ],
        },
        {
          name: 'options',
          type: 'array',
          admin: {
            condition: (_: unknown, siblingData: Record<string, unknown>) =>
              siblingData?.type === 'select',
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
            },
            {
              name: 'value',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'submitLabel',
      type: 'text',
      defaultValue: 'Envoyer',
    },
    {
      name: 'successMessage',
      type: 'textarea',
      defaultValue: 'Merci pour votre message. Nous vous répondrons rapidement.',
    },
    {
      name: 'contactInfo',
      type: 'group',
      admin: {
        description: 'Contact details displayed alongside form',
      },
      fields: [
        {
          name: 'showInfo',
          type: 'checkbox',
          defaultValue: true,
        },
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
        {
          name: 'hours',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'showMap',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'mapUrl',
      type: 'text',
      admin: {
        description: 'Google Maps embed URL',
        condition: (_: unknown, siblingData: Record<string, unknown>) =>
          siblingData?.showMap === true,
      },
    },
  ],
}
