import { HiCamera, HiDocument, HiDocumentText, HiPaperClip, HiPhoto } from 'react-icons/hi2'

export type FileTypeKind = 'image' | 'pdf' | 'word' | 'other'

const ICONS = {
  image: HiPhoto,
  pdf: HiDocumentText,
  word: HiDocument,
  other: HiPaperClip,
} as const

export function resolveFileType(fileType?: string, url?: string): FileTypeKind {
  if (fileType) {
    if (fileType === 'image' || fileType === 'pdf' || fileType === 'word' || fileType === 'other') return fileType
    return 'other'
  }
  if (url) {
    const path = url.split(/[?#]/)[0]
    if (/\.pdf$/i.test(path)) return 'pdf'
    if (/\.(doc|docx)$/i.test(path)) return 'word'
  }
  return 'other'
}

type FileTypeIconProps = {
  fileType?: string
  url?: string
  className?: string
}

export function FileTypeIcon({ fileType, url, className = 'w-5 h-5' }: FileTypeIconProps) {
  const Icon = ICONS[resolveFileType(fileType, url)]
  return <Icon className={className} aria-hidden />
}

export function ImagePlaceholderIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return <HiCamera className={className} aria-hidden />
}
