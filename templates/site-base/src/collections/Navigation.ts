import type { CollectionConfig } from 'payload'

const navigationItemFields = [
  {
    name: 'label',
    type: 'text' as const,
    required: true,
  },
  {
    name: 'type',
    type: 'select' as const,
    defaultValue: 'page',
    options: [
      { label: 'Internal Page', value: 'page' },
      { label: 'External URL', value: 'external' },
      { label: 'Anchor Link', value: 'anchor' },
    ],
  },
  {
    name: 'page',
    type: 'relationship' as const,
    relationTo: 'pages' as const,
    admin: {
      condition: (_: unknown, siblingData: Record<string, unknown>) =>
        siblingData?.type === 'page',
    },
  },
  {
    name: 'url',
    type: 'text' as const,
    admin: {
      condition: (_: unknown, siblingData: Record<string, unknown>) =>
        siblingData?.type === 'external',
    },
  },
  {
    name: 'anchor',
    type: 'text' as const,
    admin: {
      description: 'e.g., #contact, #about',
      condition: (_: unknown, siblingData: Record<string, unknown>) =>
        siblingData?.type === 'anchor',
    },
  },
  {
    name: 'openInNewTab',
    type: 'checkbox' as const,
    defaultValue: false,
  },
]

export const Navigation: CollectionConfig = {
  slug: 'navigation',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'location', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Internal name for this navigation',
      },
    },
    {
      name: 'location',
      type: 'select',
      required: true,
      options: [
        { label: 'Header', value: 'header' },
        { label: 'Footer', value: 'footer' },
      ],
      admin: {
        description: 'Where this navigation appears',
      },
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        ...navigationItemFields,
        {
          name: 'children',
          type: 'array',
          admin: {
            description: 'Dropdown menu items',
          },
          fields: navigationItemFields,
        },
      ],
    },
  ],
}
