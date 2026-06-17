import { useRef, useState } from 'react'
import { FiUploadCloud } from 'react-icons/fi'

interface FileDropzoneProps {
  accept: string
  onFile: (file: File) => void
  title: string
  hint?: string
  uploading?: boolean
  uploadingLabel?: string
  disabled?: boolean
}

/**
 * Click-or-drag file upload area. Picks the first dropped/selected file and
 * passes it to `onFile`. Shows a spinner state while `uploading` is true.
 */
export function FileDropzone({ accept, onFile, title, hint, uploading, uploadingLabel, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const blocked = disabled || uploading

  function pick(files: FileList | null) {
    const file = files?.[0]
    if (file) onFile(file)
  }

  function openFileDialog() {
    if (!blocked) inputRef.current?.click()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={blocked}
      aria-busy={uploading}
      onClick={openFileDialog}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openFileDialog()
        }
      }}
      onDragOver={e => {
        if (blocked) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        if (blocked) return
        e.preventDefault()
        setDragging(false)
        pick(e.dataTransfer.files)
      }}
      className={`dropzone ${dragging ? 'dropzone-active' : ''} ${blocked ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      <span className="dropzone-icon">
        {uploading ? (
          <span className="w-5 h-5 border-2 border-sand-green-dark border-t-transparent rounded-full animate-spin" />
        ) : (
          <FiUploadCloud />
        )}
      </span>
      <p className="dropzone-title">{uploading ? (uploadingLabel ?? title) : title}</p>
      {hint && !uploading && <p className="dropzone-hint">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={blocked}
        onChange={e => {
          pick(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
