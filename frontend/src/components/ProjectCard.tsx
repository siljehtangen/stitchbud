import { memo, useMemo } from 'react'
import { FiChevronRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import type { Project } from '../types'
import { projectCoverImageUrls } from '../projectOverviewMedia'
import { CATEGORY_ICONS, categoryBadgeClass, CATEGORY_ACCENT } from '../constants/categories'

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const { t } = useTranslation()
  const checkedStitches = useMemo(() => {
    try {
      return JSON.parse(project.rowCounter?.checkedStitches || '[]')
    } catch {
      return []
    }
  }, [project.rowCounter?.checkedStitches])
  const progress =
    project.rowCounter && project.rowCounter.totalRounds > 0
      ? Math.round(
          (checkedStitches.length / (project.rowCounter.stitchesPerRound * project.rowCounter.totalRounds)) * 100
        )
      : null
  const cover = projectCoverImageUrls(project)[0]
  const accent = CATEGORY_ACCENT[project.category]

  return (
    <button type="button" onClick={onClick} className="card card-hover w-full text-left group">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-xl leading-tight text-ink truncate">{project.name}</span>
            <span className={categoryBadgeClass(project.category)}>
              <span className="text-[0.9em] leading-none flex items-center">{CATEGORY_ICONS[project.category]}</span>
              {t(`category_${project.category.toLowerCase()}` as const)}
            </span>
          </div>
          {project.description && <p className="text-sm text-warm-gray mt-1 truncate">{project.description}</p>}
          {project.materials.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {project.materials.slice(0, 3).map(m => (
                <span
                  key={m.id}
                  className="px-2 py-0.5 rounded-full bg-soft-brown/20 text-warm-gray text-xs truncate max-w-[120px]"
                >
                  {m.type}
                </span>
              ))}
              {project.materials.length > 3 && (
                <span className="px-2 py-0.5 rounded-full bg-soft-brown/20 text-warm-gray text-xs">
                  +{project.materials.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        {cover ? (
          <img
            src={cover}
            alt={project.name}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-soft-brown/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl text-sand-green-dark">{CATEGORY_ICONS[project.category]}</span>
          </div>
        )}
        <div className="flex-shrink-0 -mr-1">
          <FiChevronRight
            className="w-5 h-5 text-warm-gray/50 group-hover:text-ink/70 group-hover:translate-x-0.5 transition-all"
            aria-hidden
          />
        </div>
      </div>
      {progress !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-warm-gray mb-1">
            <span>
              {t('row_counter', {
                current: checkedStitches.length,
                total: project.rowCounter!.stitchesPerRound * project.rowCounter!.totalRounds,
              })}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-soft-brown/30 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: accent.base }}
            />
          </div>
        </div>
      )}
    </button>
  )
}

export default memo(ProjectCard)
