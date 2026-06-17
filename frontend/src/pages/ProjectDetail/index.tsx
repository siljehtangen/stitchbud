import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { projectsApi } from '../../api'
import type { Project, ProjectCategory } from '../../types'
import { HiLockClosed, HiGlobeAlt } from 'react-icons/hi2'
import { FiArrowLeft, FiTrash2, FiRefreshCw } from 'react-icons/fi'
import { useProjectTabs, type ProjectTab } from '../../hooks/useProjectTabs'
import { ProjectTabBar } from '../../components/ProjectTabBar'
import { categoryLabel } from '../../constants/categories'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useConfirmDialog } from '../../context/ConfirmDialogContext'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { parseCraftDetails } from '../../utils/projectUtils'
import { InfoTab } from './InfoTab'
import { MaterialsTab } from './MaterialsTab'
import { RecipeTab } from './RecipeTab'
import { KnitTab } from './KnitTab'
import { OverviewTab } from './OverviewTab'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const confirmDelete = useConfirmDelete()
  const { confirm } = useConfirmDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [tab, setTab] = useState<ProjectTab>(() => {
    const tabParam = searchParams.get('tab') as ProjectTab | null
    return tabParam ?? 'info'
  })
  const [isPublic, setIsPublic] = useState(false)
  const projectId = Number(id)

  const [textFields, setTextFields] = useState({ name: '', description: '', notes: '', tags: '', recipeText: '' })
  const [pinterestBoardUrls, setPinterestBoardUrls] = useState<string[]>([])
  const textRef = useRef(textFields)

  const [craftDetails, setCraftDetails] = useState<Record<string, string>>({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function setTextField(field: keyof typeof textFields, value: string) {
    const next = { ...textRef.current, [field]: value }
    textRef.current = next
    setTextFields(next)
  }

  useEffect(() => {
    if (Number.isNaN(projectId)) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setLoadError(false)
    projectsApi
      .getOne(projectId)
      .then(p => {
        if (!active) return
        const fields = {
          name: p.name,
          description: p.description,
          notes: p.notes,
          tags: p.tags,
          recipeText: p.recipeText,
        }
        setPinterestBoardUrls(p.pinterestBoardUrls ?? [])
        textRef.current = fields
        setTextFields(fields)
        setIsPublic(p.isPublic ?? false)
        setProject(p)
        setCraftDetails(parseCraftDetails(p.craftDetails))
        setStartDate(
          p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
        )
        setEndDate(p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : '')
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
  }, [projectId, reloadKey])

  const saveSeqRef = useRef(0)
  const autoSave = useDebouncedCallback(async (updates: object) => {
    const seq = ++saveSeqRef.current
    try {
      const updated = await projectsApi.update(projectId, updates)
      if (saveSeqRef.current === seq) {
        setProject(updated)
        showToast(t('changes_saved_toast'))
      }
    } catch {
      showToast(t('save_failed'), 'info')
    }
  }, 800)

  function handlePinterestChange(urls: string[]) {
    setPinterestBoardUrls(urls)
    autoSave({ pinterestBoardUrls: urls })
  }

  function handleInfoChange(field: string, value: string) {
    if (field === 'startDate') {
      setStartDate(value)
      autoSave({ startDate: value ? new Date(value).getTime() : undefined })
      return
    }
    if (field === 'endDate') {
      setEndDate(value)
      autoSave(value ? { endDate: new Date(value).getTime() } : { clearEndDate: true })
      return
    }
    setTextField(field as keyof typeof textFields, value)
    autoSave({ ...textRef.current, [field]: value })
  }

  async function handleDelete() {
    await confirmDelete(
      t('delete_confirm', { name: project?.name }),
      async () => {
        await projectsApi.delete(projectId)
        navigate('/home')
      },
      'project_deleted_toast'
    )
  }

  const tabs = useProjectTabs(project)

  function selectTab(next: ProjectTab) {
    setTab(next)
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        params.set('tab', next)
        return params
      },
      { replace: true }
    )
  }

  useEffect(() => {
    const tabParam = searchParams.get('tab') as ProjectTab | null
    if (tabParam && tabs.some(t => t.id === tabParam)) {
      setTab(tabParam)
    }
  }, [searchParams, tabs])

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

  const isSewing = project.category === 'SEWING'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full border border-[rgb(var(--border-light))] bg-white text-ink hover:bg-cream transition-colors"
          aria-label={t('go_back')}
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-2xl text-ink truncate">{project.name}</h2>
          <span className="text-xs text-warm-gray">{categoryLabel(project.category, t)}</span>
        </div>
        <button
          onClick={async () => {
            const next = !isPublic
            const confirmed = await confirm({
              message: next ? t('change_to_public_confirm') : t('change_to_private_confirm'),
              confirmLabel: next ? t('make_public') : t('make_private'),
              tone: 'neutral',
            })
            if (!confirmed) return
            setIsPublic(next)
            try {
              const updated = await projectsApi.update(projectId, { isPublic: next })
              setProject(updated)
              showToast(t(next ? 'project_made_public_toast' : 'project_made_private_toast'))
            } catch {
              setIsPublic(!next)
              showToast(t('save_failed'), 'info')
            }
          }}
          title={isPublic ? t('project_public') : t('project_private')}
          className="px-1 py-1 text-warm-gray hover:text-ink/80 transition-colors"
          aria-label={isPublic ? t('project_public') : t('project_private')}
        >
          {isPublic ? <HiGlobeAlt className="h-5 w-5" /> : <HiLockClosed className="h-5 w-5" />}
        </button>
        <button
          onClick={handleDelete}
          className="text-sm text-red-400 hover:text-red-600 px-2 py-1 inline-flex items-center gap-1.5"
        >
          <FiTrash2 className="text-base" />
          {t('delete')}
        </button>
      </div>

      <ProjectTabBar tabs={tabs} activeTab={tab} onSelect={selectTab} />

      {tab === 'info' && (
        <InfoTab
          project={project}
          projectId={projectId}
          textFields={{ name: textFields.name, description: textFields.description }}
          startDate={startDate}
          endDate={endDate}
          onInfoChange={handleInfoChange}
          onUpdate={setProject}
        />
      )}

      {tab === 'materials' && <MaterialsTab project={project} projectId={projectId} onUpdate={setProject} />}

      {tab === 'recipe' && (
        <RecipeTab
          recipeText={textFields.recipeText}
          pinterestBoardUrls={pinterestBoardUrls}
          files={project.files}
          projectId={projectId}
          onUpdate={setProject}
          onRecipeChange={v => handleInfoChange('recipeText', v)}
          onPinterestChange={handlePinterestChange}
        />
      )}

      {tab === 'knit' && !isSewing && (
        <KnitTab
          project={project}
          projectId={projectId}
          onUpdate={setProject}
          category={project.category as ProjectCategory}
        />
      )}

      {tab === 'overview' && (
        <OverviewTab
          project={project}
          name={textFields.name}
          description={textFields.description}
          recipeText={textFields.recipeText}
          craftDetails={craftDetails}
        />
      )}
    </div>
  )
}
