import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { friendsApi, fileUrl } from '../../api'
import { parseCraftDetails } from '../../utils/projectUtils'
import type { Project } from '../../types'
import { PiToolboxFill } from 'react-icons/pi'
import { FaCircleInfo } from 'react-icons/fa6'
import { MdOutlineMenuBook } from 'react-icons/md'
import { BsStars, BsListStars } from 'react-icons/bs'
import { categoryLabel } from '../../constants/categories'
import { projectCoverImageUrls, materialImageUrls } from '../../projectOverviewMedia'
import { OverviewTab } from '../ProjectDetail/OverviewTab'
import { PinterestBoardEmbed } from '../ProjectDetail/RecipeTab'
import { PatternGridReadOnly } from '../ProjectDetail/PatternGridReadOnly'
import { fileTypeIcon } from '../../utils/libraryUtils'
import { FilePreviewModal } from '../ProjectDetail/FilePreviewModal'
import type { ProjectFile } from '../../types'

type Tab = 'info' | 'materials' | 'recipe' | 'knit' | 'overview'

export default function FriendProjectDetail() {
  const { friendUserId, projectId } = useParams<{ friendUserId: string; projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const friendName: string | undefined = (location.state as { friendName?: string } | null)?.friendName
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('info')
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)

  const pid = parseInt(projectId!)

  useEffect(() => {
    friendsApi.getFriendProject(friendUserId!, pid)
      .then(setProject)
      .finally(() => setLoading(false))
  }, [friendUserId, pid])

  const craftDetails = useMemo<Record<string, string>>(() => {
    if (!project) return {}
    return parseCraftDetails(project.craftDetails)
  }, [project])

  const tabs = useMemo<{ id: Tab; label: string; icon: React.ReactNode }[]>(() => {
    if (!project) return []
    const sewing = project.category === 'SEWING'
    return [
      { id: 'info', label: t('tab_info'), icon: <FaCircleInfo /> },
      { id: 'materials', label: t('tab_materials'), icon: <PiToolboxFill /> },
      { id: 'recipe', label: t('tab_recipe'), icon: <MdOutlineMenuBook /> },
      ...(!sewing ? [{ id: 'knit' as Tab, label: project.category === 'KNITTING' ? t('tab_knit') : t('tab_crochet'), icon: <BsStars /> }] : []),
      { id: 'overview', label: t('tab_overview'), icon: <BsListStars /> },
    ]
  }, [t, project])

  if (loading) return <div className="text-center py-20 text-warm-gray">{t('loading')}</div>
  if (!project) return <div className="text-center py-20 text-warm-gray">{t('project_not_found')}</div>

  const ownerLabel = friendName ?? project.userId ?? ''
  const coverUrls = projectCoverImageUrls(project)
  const startDateStr = project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : ''
  const endDateStr = project.endDate ? new Date(project.endDate).toISOString().slice(0, 10) : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 px-2" aria-label={t('go_back')}>←</button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 truncate">{project.name}</h2>
          <span className="text-xs text-warm-gray">{categoryLabel(project.category, t)}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          {ownerLabel && <span className="text-xs text-warm-gray truncate max-w-[120px]">{ownerLabel}</span>}
          <span className="text-xs text-warm-gray bg-soft-brown/20 px-2 py-0.5 rounded-lg">{t('friend_project_readonly')}</span>
        </div>
      </div>

      <div className="flex gap-1 bg-sand-blue/20 p-1 rounded-xl">
        {tabs.map(t_ => (
          <button
            key={t_.id}
            onClick={() => setTab(t_.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-xs font-medium transition-colors ${
              tab === t_.id ? 'bg-white shadow-sm text-gray-800' : 'text-warm-gray hover:text-gray-700'
            }`}
          >
            <span>{t_.icon}</span>
            <span>{t_.label}</span>
          </button>
        ))}
      </div>

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
              <p className="text-sm text-gray-800">{project.name}</p>
            </div>
            {project.description && (
              <div>
                <p className="text-xs text-warm-gray mb-0.5">{t('field_description')}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {startDateStr && (
                <div>
                  <p className="text-xs text-warm-gray mb-0.5">{t('start_date_label')}</p>
                  <p className="text-sm text-gray-700">{startDateStr}</p>
                </div>
              )}
              {endDateStr && (
                <div>
                  <p className="text-xs text-warm-gray mb-0.5">{t('end_date_label')}</p>
                  <p className="text-sm text-gray-700">{endDateStr}</p>
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
              const imgs = materialImageUrls(m, pid)
              return (
                <div key={m.id} className="card space-y-2">
                  <p className="text-sm font-medium text-gray-800">
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
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.recipeText}</p>
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
                  const url = fileUrl(pid, f.storedName)
                  return f.fileType === 'image' ? (
                    <button key={f.id} onClick={() => setPreviewFile(f)} className="focus:outline-none">
                      <img src={url} alt={f.originalName} className="w-20 h-20 object-cover rounded-xl shadow-sm" loading="lazy" />
                    </button>
                  ) : (
                    <button
                      key={f.id}
                      onClick={() => setPreviewFile(f)}
                      className="flex items-center gap-2 card py-2 px-3 text-sm hover:shadow-md"
                    >
                      <span>{fileTypeIcon(f.fileType)}</span>
                      <span className="text-gray-700 max-w-[8rem] truncate">{f.originalName}</span>
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
              <p className="text-sm text-gray-700">
                {t('row_counter', {
                  current: (() => {
                    try {
                      const checked = JSON.parse(project.rowCounter.checkedStitches) as number[]
                      return Math.floor(checked.length / project.rowCounter.stitchesPerRound)
                    } catch { return 0 }
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
                    <p className="text-xs text-warm-gray mb-1">{i + 1}/{project.patternGrids.length}</p>
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
          {(!project.rowCounter || project.rowCounter.totalRounds === 0) && (project.patternGrids ?? []).length === 0 && (
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
          projectId={pid}
          ownerLabel={ownerLabel}
        />
      )}

      {previewFile && (
        <FilePreviewModal file={previewFile} projectId={pid} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  )
}
