import type { CollectionConfig } from 'payload'

export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  admin: {
    useAsTitle: 'createdAt',
    defaultColumns: ['formName', 'email', 'createdAt', 'status'],
    description: 'All form submissions from the website',
  },
  access: {
    read: () => true,
    create: () => true, // Allow public submissions
    update: () => true, // Only admins via panel
    delete: () => true, // Only admins via panel
  },
  fields: [
    {
      name: 'formName',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description: 'Name of the form that was submitted',
      },
    },
    {
      name: 'data',
      type: 'json',
      required: true,
      admin: {
        readOnly: true,
        description: 'Form submission data',
      },
    },
    {
      name: 'email',
      type: 'email',
      admin: {
        readOnly: true,
        description: 'Email from submission (if provided)',
      },
    },
    {
      name: 'name',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Name from submission (if provided)',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Read', value: 'read' },
        { label: 'Responded', value: 'responded' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this submission',
      },
    },
    {
      name: 'metadata',
      type: 'group',
      admin: {
        condition: () => false, // Hidden by default
      },
      fields: [
        {
          name: 'ip',
          type: 'text',
        },
        {
          name: 'userAgent',
          type: 'text',
        },
        {
          name: 'referrer',
          type: 'text',
        },
      ],
    },
  ],
}
