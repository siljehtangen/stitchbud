import { useEffect, useState, useRef, useMemo, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { projectsApi } from '../../api'
import type { Project, ProjectCategory } from '../../types'
import { PiToolboxFill } from 'react-icons/pi'
import { FaCircleInfo } from 'react-icons/fa6'
import { MdOutlineMenuBook } from 'react-icons/md'
import { BsStars, BsListStars } from 'react-icons/bs'
import { Field } from '../../components/LibraryItemForm'
import { categoryLabel } from '../../constants/categories'
import { CoverImageGallery } from '../../components/CoverImageGallery'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { MAX_LIBRARY_PHOTOS } from '../../components/LibraryItemForm'
import { MaterialsTab } from './MaterialsTab'
import { RecipeTab } from './RecipeTab'
import { KnitTab } from './KnitTab'
import { OverviewTab } from './OverviewTab'

type Tab = 'info' | 'materials' | 'recipe' | 'knit' | 'overview'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const confirmDelete = useConfirmDelete()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('info')
  const projectId = parseInt(id!)


  const [textFields, setTextFields] = useState({ name: '', description: '', notes: '', tags: '', recipeText: '' })
  const textRef = useRef(textFields)

  const [craftDetails, setCraftDetails] = useState<Record<string, string>>({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const coverImageRef = useRef<HTMLInputElement>(null)
  const [coverState, setCoverState] = useState({ uploading: false, error: '' })

  function setTextField(field: keyof typeof textFields, value: string) {
    const next = { ...textRef.current, [field]: value }
    textRef.current = next
    setTextFields(next)
  }

  useEffect(() => {
    projectsApi.getOne(projectId).then(p => {
      const fields = { name: p.name, description: p.description, notes: p.notes, tags: p.tags, recipeText: p.recipeText }
      textRef.current = fields
      setTextFields(fields)
      setProject(p)
      try { setCraftDetails(JSON.parse(p.craftDetails || '{}')) } catch { setCraftDetails({}) }
      setStartDate(p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
      setEndDate(p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : '')
    }).finally(() => setLoading(false))
  }, [projectId])

  // Sequence counter ensures a slow earlier save never overwrites a newer one
  const saveSeqRef = useRef(0)
  const autoSave = useDebouncedCallback(async (updates: object) => {
    const seq = ++saveSeqRef.current
    try {
      const updated = await projectsApi.update(projectId, updates)
      if (saveSeqRef.current === seq) setProject(updated)
    } catch {
      showToast(t('save_failed'), 'info')
    }
  }, 800)

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

  async function handleCoverImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverState({ uploading: true, error: '' })
    try {
      const updated = await projectsApi.uploadCoverImage(projectId, file)
      setProject(updated)
      showToast(t('cover_added_toast'))
    } catch {
      setCoverState(s => ({ ...s, error: t('upload_failed') }))
    } finally {
      setCoverState(s => ({ ...s, uploading: false }))
      if (coverImageRef.current) coverImageRef.current.value = ''
    }
  }

  async function handleDelete() {
    await confirmDelete(
      t('delete_confirm', { name: project?.name }),
      async () => {
        await projectsApi.delete(projectId)
        navigate('/home')
      },
    )
  }

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

  const isSewing = project.category === 'SEWING'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 px-2" aria-label={t('go_back')}>←</button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 truncate">{project.name}</h2>
          <span className="text-xs text-warm-gray">{categoryLabel(project.category, t)}</span>
        </div>
        <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600 px-2 py-1">{t('delete')}</button>
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
          <div className="space-y-2">
            <CoverImageGallery
              items={(project.coverImages ?? []).map(img => ({ key: img.id, src: img.storedName, name: img.originalName, isMain: img.isMain }))}
              max={MAX_LIBRARY_PHOTOS}
              uploading={coverState.uploading}
              onSetMain={async key => setProject(await projectsApi.setCoverImageMain(projectId, key as number))}
              onRemove={key => confirmDelete(
                t('delete_cover_image_confirm'),
                async () => {
                  setProject(await projectsApi.deleteCoverImage(projectId, key as number))
                  showToast(t('cover_image_removed_toast'))
                },
              )}
              onAdd={() => coverImageRef.current?.click()}
            />
            {coverState.error && <p className="text-xs text-red-500">{coverState.error}</p>}
            <input ref={coverImageRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleCoverImageUpload} className="hidden" />
          </div>

          <Field label={t('field_name')}>
            <input className="input" value={textFields.name} onChange={e => handleInfoChange('name', e.target.value)} />
          </Field>
          <Field label={t('field_description')}>
            <textarea className="textarea" rows={4} value={textFields.description} onChange={e => handleInfoChange('description', e.target.value)} placeholder={t('describe_project')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('start_date_label')}>
              <input type="date" className="input" value={startDate} onChange={e => handleInfoChange('startDate', e.target.value)} />
            </Field>
            <Field label={`${t('end_date_label')}`}>
              <input type="date" className="input" value={endDate} onChange={e => handleInfoChange('endDate', e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-warm-gray text-right">{t('auto_saving')}</p>
        </div>
      )}

      {tab === 'materials' && (
        <MaterialsTab project={project} projectId={projectId} onUpdate={setProject} />
      )}

      {tab === 'recipe' && (
        <RecipeTab
          recipeText={textFields.recipeText}
          files={project.files}
          projectId={projectId}
          onUpdate={setProject}
          onRecipeChange={v => handleInfoChange('recipeText', v)}
        />
      )}

      {tab === 'knit' && !isSewing && (
        <KnitTab project={project} projectId={projectId} onUpdate={setProject} category={project.category as ProjectCategory} />
      )}

      {tab === 'overview' && (
        <OverviewTab
          project={project}
          name={textFields.name} description={textFields.description} recipeText={textFields.recipeText}
          craftDetails={craftDetails}
          projectId={projectId}
        />
      )}
    </div>
  )
}
