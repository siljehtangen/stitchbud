import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PiToolboxFill } from 'react-icons/pi'
import { FaCircleInfo } from 'react-icons/fa6'
import { MdOutlineMenuBook } from 'react-icons/md'
import { BsStars, BsListStars } from 'react-icons/bs'
import type { Project } from '../types'

export type ProjectTab = 'info' | 'materials' | 'recipe' | 'knit' | 'overview'

export function useProjectTabs(project: Project | null) {
  const { t } = useTranslation()
  return useMemo<{ id: ProjectTab; label: string; icon: React.ReactNode }[]>(() => {
    if (!project) return []
    const sewing = project.category === 'SEWING'
    return [
      { id: 'info', label: t('tab_info'), icon: <FaCircleInfo /> },
      { id: 'materials', label: t('tab_materials'), icon: <PiToolboxFill /> },
      { id: 'recipe', label: t('tab_recipe'), icon: <MdOutlineMenuBook /> },
      ...(!sewing
        ? [
            {
              id: 'knit' as ProjectTab,
              label: project.category === 'KNITTING' ? t('tab_knit') : t('tab_crochet'),
              icon: <BsStars />,
            },
          ]
        : []),
      { id: 'overview', label: t('tab_overview'), icon: <BsListStars /> },
    ]
  }, [t, project])
}
