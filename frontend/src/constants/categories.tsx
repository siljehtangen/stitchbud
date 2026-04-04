import { GiChopsticks, GiPirateHook, GiSewingMachine } from 'react-icons/gi'
import type { ProjectCategory } from '../types'

export const CATEGORY_ICONS: Record<ProjectCategory, React.ReactNode> = {
  KNITTING: <GiChopsticks className="text-sand-green-dark" />,
  CROCHET: <GiPirateHook className="text-sand-blue-deep" />,
  SEWING: <GiSewingMachine className="text-warm-gray" />,
}
