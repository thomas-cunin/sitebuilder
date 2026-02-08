import type { Block } from 'payload'

export const Video: Block = {
  slug: 'video',
  labels: {
    singular: 'Video Section',
    plural: 'Video Sections',
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
      name: 'videoType',
      type: 'select',
      defaultValue: 'youtube',
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
        { label: 'Self-hosted', value: 'upload' },
      ],
    },
    {
      name: 'youtubeId',
      type: 'text',
      admin: {
        description: 'YouTube video ID (e.g., dQw4w9WgXcQ)',
        condition: (_: unknown, siblingData: Record<string, unknown>) =>
          siblingData?.videoType === 'youtube',
      },
    },
    {
      name: 'vimeoId',
      type: 'text',
      admin: {
        description: 'Vimeo video ID',
        condition: (_: unknown, siblingData: Record<string, unknown>) =>
          siblingData?.videoType === 'vimeo',
      },
    },
    {
      name: 'videoFile',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_: unknown, siblingData: Record<string, unknown>) =>
          siblingData?.videoType === 'upload',
      },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Thumbnail/poster image',
      },
    },
    {
      name: 'autoplay',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'loop',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'muted',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'aspectRatio',
      type: 'select',
      defaultValue: '16/9',
      options: [
        { label: '16:9', value: '16/9' },
        { label: '4:3', value: '4/3' },
        { label: '1:1', value: '1/1' },
        { label: '9:16 (Vertical)', value: '9/16' },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Full Width', value: 'full' },
        { label: 'With Text', value: 'withText' },
      ],
    },
    {
      name: 'caption',
      type: 'textarea',
      admin: {
        condition: (_: unknown, siblingData: Record<string, unknown>) =>
          siblingData?.layout === 'withText',
      },
    },
  ],
}
