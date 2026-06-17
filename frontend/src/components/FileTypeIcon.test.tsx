import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FileTypeIcon, ImagePlaceholderIcon, resolveFileType } from './FileTypeIcon'

describe('resolveFileType', () => {
  it('maps known fileType strings', () => {
    expect(resolveFileType('image')).toBe('image')
    expect(resolveFileType('pdf')).toBe('pdf')
    expect(resolveFileType('word')).toBe('word')
    expect(resolveFileType('other')).toBe('other')
  })

  it('falls back to other for unknown fileType strings', () => {
    expect(resolveFileType('video')).toBe('other')
    expect(resolveFileType('')).toBe('other')
  })

  it('infers type from URL extension', () => {
    expect(resolveFileType(undefined, 'report.pdf')).toBe('pdf')
    expect(resolveFileType(undefined, 'notes.docx')).toBe('word')
    expect(resolveFileType(undefined, 'photo.png')).toBe('other')
  })

  it('handles signed storage URLs with query params', () => {
    expect(
      resolveFileType(undefined, 'https://example.supabase.co/storage/v1/object/sign/bucket/a.pdf?token=abc')
    ).toBe('pdf')
  })
})

describe('FileTypeIcon', () => {
  it('renders an svg icon', () => {
    const { container } = render(<FileTypeIcon fileType="pdf" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

describe('ImagePlaceholderIcon', () => {
  it('renders an svg icon', () => {
    const { container } = render(<ImagePlaceholderIcon />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
