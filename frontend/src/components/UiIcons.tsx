import { FiEdit2, FiPlus, FiX } from 'react-icons/fi'
import { HiEllipsisHorizontal, HiStar } from 'react-icons/hi2'

export function StarIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return <HiStar className={className} aria-hidden />
}

export function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <FiX className={className} aria-hidden />
}

export function EditIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return <FiEdit2 className={className} aria-hidden />
}

export function PlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return <FiPlus className={className} aria-hidden />
}

export function LoadingDotsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return <HiEllipsisHorizontal className={className} aria-hidden />
}
