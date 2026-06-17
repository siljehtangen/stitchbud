import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi'
import { friendsApi } from '../../api'
import { parseCraftDetails } from '../../utils/projectUtils'
import type { Project } from '../../types'
import { categoryLabel } from '../../constants/categories'
import { useProjectTabs, type ProjectTab } from '../../hooks/useProjectTabs'
import { ProjectTabBar } from '../../components/ProjectTabBar'
import { projectCoverImageUrls, materialImageUrls } from '../../projectOverviewMedia'
import { OverviewTab } from '../ProjectDetail/OverviewTab'
import { PinterestBoardEmbed } from '../ProjectDetail/RecipeTab'
import { PatternGridReadOnly } from '../ProjectDetail/PatternGridReadOnly'
import { FileTypeIcon } from '../../components/FileTypeIcon'
import { FilePreviewModal } from '../ProjectDetail/FilePreviewModal'
import type { ProjectFile } from '../../types'

export default function FriendProjectDetail() {
  const { friendUserId, projectId } = useParams<{ friendUserId: string; projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const friendName: string | undefined = (location.state as { friendName?: string } | null)?.friendName
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [tab, setTab] = useState<ProjectTab>('info')
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)

  const [resolvedFriendName, setResolvedFriendName] = useState<string | undefined>(friendName)

  const pid = Number(projectId)

  useEffect(() => {
    if (!friendUserId || Number.isNaN(pid)) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setLoadError(false)
    friendsApi
      .getFriendProject(friendUserId, pid)
      .then(p => {
        if (active) setProject(p)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [friendUserId, pid, reloadKey])

  useEffect(() => {
    if (resolvedFriendName || !friendUserId) return
    let active = true
    friendsApi
      .getFriends()
      .then(friends => {
        if (!active) return
        const match = friends.find(f => f.userId === friendUserId)
        if (match) setResolvedFriendName(match.displayName ?? match.email)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [resolvedFriendName, friendUserId])

  const craftDetails = useMemo<Record<string, string>>(() => {
    if (!project) return {}
    return parseCraftDetails(project.craftDetails)
  }, [project])

  const tabs = useProjectTabs(project)

  if (loading) return <div className="text-center py-20 text-warm-gray">{t('loading')}</div>
  if (loadError)
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-warm-gray">{t('load_failed')}</p>
        <button
          onClick={() => setReloadKey(k => k + 1)}
          className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5"
        >
          <FiRefreshCw className="text-base" />
          {t('retry')}
        </button>
      </div>
    )
  if (!project) return <div className="text-center py-20 text-warm-gray">{t('project_not_found')}</div>

  const ownerLabel = resolvedFriendName ?? ''
  const coverUrls = projectCoverImageUrls(project)
  const startDateStr = project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : ''
  const endDateStr = project.endDate ? new Date(project.endDate).toISOString().slice(0, 10) : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost py-1.5 px-2 inline-flex items-center"
          aria-label={t('go_back')}
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-ink truncate">{project.name}</h2>
          <span className="text-xs text-warm-gray">{categoryLabel(project.category, t)}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          {ownerLabel && <span className="text-xs text-warm-gray truncate max-w-[120px]">{ownerLabel}</span>}
          <span className="text-xs text-warm-gray bg-soft-brown/20 px-2 py-0.5 rounded-lg">
            {t('friend_project_readonly')}
          </span>
        </div>
      </div>

      <ProjectTabBar tabs={tabs} activeTab={tab} onSelect={setTab} />

      {tab === 'info' && (
        <div className="space-y-4">
          {coverUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {coverUrls.map((url, i) => (
                <img key={i} src={url} alt="" className="w-28 h-28 object-cover rounded-xl shadow-sm" loading="lazy" />
              ))}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-warm-gray mb-0.5">{t('field_name')}</p>
              <p className="text-sm text-ink">{project.name}</p>
            </div>
            {project.description && (
              <div>
                <p className="text-xs text-warm-gray mb-0.5">{t('field_description')}</p>
                <p className="text-sm text-ink/80 whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {startDateStr && (
                <div>
                  <p className="text-xs text-warm-gray mb-0.5">{t('start_date_label')}</p>
                  <p className="text-sm text-ink/80">{startDateStr}</p>
                </div>
              )}
              {endDateStr && (
                <div>
                  <p className="text-xs text-warm-gray mb-0.5">{t('end_date_label')}</p>
                  <p className="text-sm text-ink/80">{endDateStr}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'materials' && (
        <div className="space-y-4">
          {project.materials.length === 0 ? (
            <p className="text-sm text-warm-gray">{t('no_materials_yet')}</p>
          ) : (
            project.materials.map(m => {
              const imgs = materialImageUrls(m)
              return (
                <div key={m.id} className="card space-y-2">
                  <p className="text-sm font-medium text-ink">
                    {m.name || m.type}
                    {m.color ? ` — ${m.color}` : ''}
                    {m.amount ? ` (${m.amount}${m.unit ? ` ${m.unit}` : ''})` : ''}
                  </p>
                  {imgs.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {imgs.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-xl" loading="lazy" />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'recipe' && (
        <div className="space-y-4">
          {project.recipeText && (
            <div>
              <p className="text-xs text-warm-gray mb-1">{t('recipe_label')}</p>
              <p className="text-sm text-ink/80 whitespace-pre-wrap">{project.recipeText}</p>
            </div>
          )}
          {project.pinterestBoardUrls && project.pinterestBoardUrls.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-warm-gray">{t('pinterest_label')}</p>
              {project.pinterestBoardUrls.map((url, i) => (
                <div key={i}>
                  <PinterestBoardEmbed url={url} />
                  <p className="text-xs text-warm-gray mt-1">{t('pinterest_hint')}</p>
                </div>
              ))}
            </div>
          )}
          {project.files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-warm-gray">{t('attachments_label')}</p>
              <div className="flex gap-2 flex-wrap">
                {project.files.map(f => {
                  const url = f.storedName
                  return f.fileType === 'image' ? (
                    <button key={f.id} onClick={() => setPreviewFile(f)} className="focus:outline-none">
                      <img
                        src={url}
                        alt={f.originalName}
                        className="w-20 h-20 object-cover rounded-xl shadow-sm"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <button
                      key={f.id}
                      onClick={() => setPreviewFile(f)}
                      className="flex items-center gap-2 card py-2 px-3 text-sm hover:shadow-md"
                    >
                      <FileTypeIcon fileType={f.fileType} />
                      <span className="text-ink/80 max-w-[8rem] truncate">{f.originalName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {!project.recipeText && project.files.length === 0 && project.pinterestBoardUrls?.length === 0 && (
            <p className="text-sm text-warm-gray">{t('no_recipe_yet')}</p>
          )}
        </div>
      )}

      {tab === 'knit' && project.category !== 'SEWING' && (
        <div className="space-y-6">
          {project.rowCounter && project.rowCounter.totalRounds > 0 && (
            <div className="card space-y-1">
              <p className="text-xs text-warm-gray uppercase tracking-wide font-semibold">{t('round_counter')}</p>
              <p className="text-sm text-ink/80">
                {t('row_counter', {
                  current: (() => {
                    if (project.rowCounter.stitchesPerRound <= 0) return 0
                    try {
                      const checked = JSON.parse(project.rowCounter.checkedStitches) as number[]
                      return Math.floor(checked.length / project.rowCounter.stitchesPerRound)
                    } catch {
                      return 0
                    }
                  })(),
                  total: project.rowCounter.totalRounds,
                })}
              </p>
            </div>
          )}
          {(project.patternGrids ?? []).length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-warm-gray uppercase tracking-wide font-semibold">{t('pattern_grid')}</p>
              {project.patternGrids.map((grid, i) => (
                <div key={grid.id}>
                  {project.patternGrids.length > 1 && (
                    <p className="text-xs text-warm-gray mb-1">
                      {i + 1}/{project.patternGrids.length}
                    </p>
                  )}
                  <PatternGridReadOnly
                    rows={grid.rows}
                    cols={grid.cols}
                    cellDataJson={grid.cellData}
                    showSymbols={project.category === 'KNITTING'}
                  />
                </div>
              ))}
            </div>
          )}
          {(!project.rowCounter || project.rowCounter.totalRounds === 0) &&
            (project.patternGrids ?? []).length === 0 && (
              <p className="text-sm text-warm-gray">{t('no_knit_content_yet')}</p>
            )}
        </div>
      )}

      {tab === 'overview' && (
        <OverviewTab
          project={project}
          name={project.name}
          description={project.description}
          recipeText={project.recipeText}
          craftDetails={craftDetails}
          ownerLabel={ownerLabel}
        />
      )}

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}
