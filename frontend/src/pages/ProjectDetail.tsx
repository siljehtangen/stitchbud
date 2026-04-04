import { useEffect, useState, useCallback, useRef, useMemo, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { useConfirmDialog } from '../context/ConfirmDialogContext'
import { projectsApi, libraryApi, fileUrl } from '../api'
import { libraryItemImagesForProject, materialImageUrls, projectCoverImageUrls, uniqueImageUrls } from '../projectOverviewMedia'
import { COLOR_MAP, COLOR_MAP_BY_HEX, getColorName } from '../colors'
import type { Project, PatternCell, ProjectCategory, ProjectFile, LibraryItem, LibraryItemType } from '../types'
import { PiToolboxFill } from 'react-icons/pi'
import { FaCircleInfo } from 'react-icons/fa6'
import { MdOutlineMenuBook } from 'react-icons/md'
import { BsStars, BsListStars } from 'react-icons/bs'
import { ITEM_TYPES, TYPE_ICONS, LibraryItemForm } from '../components/LibraryItemForm'
import { ColorMultiSelect } from '../components/ColorMultiSelect'
import { itemSummary, typeLabel } from '../utils/libraryUtils'

// Gauge removed; only needle/hook sizes remain per category
const CRAFT_FIELDS_KEYS: Record<string, { key: string; labelKey: string }[]> = {
  KNITTING: [
    { key: 'needleSize', labelKey: 'needle_size' },
    { key: 'circularNeedleLength', labelKey: 'circular_needle_length' },
  ],
  CROCHET: [
    { key: 'hookSize', labelKey: 'hook_size' },
  ],
  SEWING: [],
}

const PALETTE = [
  '#C6D8B8', '#BFD8E0', '#F5F0E8', '#D4C4A8',
  '#8B7355', '#A8C49A', '#9DC4CF', '#E8D5B0',
  '#F28B82', '#FBBC04', '#34A853', '#4285F4',
  '#000000', '#FFFFFF', '#888888', '#CC6699',
]

const STITCH_SYMBOLS = [
  { symbol: 'O',  labelKey: 'stitch_kast' },
  { symbol: '/',  labelKey: 'stitch_fell_hoyre' },
  { symbol: 'Λ',  labelKey: 'stitch_dobbel_felling' },
  { symbol: '\\', labelKey: 'stitch_fell_venstre' },
  { symbol: '□',  labelKey: 'stitch_rett' },
  { symbol: '–',  labelKey: 'stitch_vrang' },
  { symbol: '↪',  labelKey: 'stitch_vridd_okning_hoyre' },
  { symbol: '↩',  labelKey: 'stitch_vridd_okning_venstre' },
]

const GRID_PRESETS = [
  { label: '5×5', rows: 5, cols: 5 },
  { label: '10×10', rows: 10, cols: 10 },
  { label: '10×20', rows: 10, cols: 20 },
  { label: '20×20', rows: 20, cols: 20 },
  { label: '20×40', rows: 20, cols: 40 },
  { label: '30×30', rows: 30, cols: 30 },
  { label: '40×50', rows: 40, cols: 50 },
]

type Tab = 'info' | 'materials' | 'recipe' | 'knit' | 'overview'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('info')
  const projectId = parseInt(id!)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [recipeText, setRecipeText] = useState('')
  const [craftDetails, setCraftDetails] = useState<Record<string, string>>({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const coverImageRef = useRef<HTMLInputElement>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverImageError, setCoverImageError] = useState('')
  const MAX_COVER_IMAGES = 3

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    projectsApi.getOne(projectId).then(p => {
      setProject(p)
      setName(p.name)
      setDescription(p.description)
      setNotes(p.notes)
      setTags(p.tags)
      setRecipeText(p.recipeText)
      try { setCraftDetails(JSON.parse(p.craftDetails || '{}')) } catch { setCraftDetails({}) }
      setStartDate(p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
      setEndDate(p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : '')
    }).finally(() => setLoading(false))
  }, [projectId])

  const autoSave = useCallback((updates: object) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await projectsApi.update(projectId, updates)
        setProject(updated)
      } catch {
        showToast(t('save_failed'), 'info')
      }
    }, 800)
  }, [projectId, showToast, t])

  function handleInfoChange(field: string, value: string) {
    if (field === 'name') setName(value)
    if (field === 'description') setDescription(value)
    if (field === 'notes') setNotes(value)
    if (field === 'tags') setTags(value)
    if (field === 'recipeText') setRecipeText(value)
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
    autoSave({ name, description, notes, tags, recipeText, [field]: value })
  }

  async function handleCoverImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverImageError('')
    setUploadingCover(true)
    try {
      const updated = await projectsApi.uploadCoverImage(projectId, file)
      setProject(updated)
      showToast(t('cover_added_toast'))
    } catch {
      setCoverImageError(t('upload_failed'))
    } finally {
      setUploadingCover(false)
      if (coverImageRef.current) coverImageRef.current.value = ''
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      message: t('delete_confirm', { name: project?.name }),
      confirmLabel: t('delete'),
      tone: 'danger',
    })
    if (!ok) return
    try {
      await projectsApi.delete(projectId)
      navigate('/home')
    } catch {
      showToast(t('delete_failed'), 'info')
    }
  }

  if (loading) return <div className="text-center py-20 text-warm-gray">{t('loading')}</div>
  if (!project) return <div className="text-center py-20 text-warm-gray">{t('project_not_found')}</div>

  const isSewing = project.category === 'SEWING'

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: t('tab_info'), icon: <FaCircleInfo /> },
    { id: 'materials', label: t('tab_materials'), icon: <PiToolboxFill /> },
    { id: 'recipe', label: t('tab_recipe'), icon: <MdOutlineMenuBook /> },
    ...(!isSewing ? [{ id: 'knit' as Tab, label: project.category === 'KNITTING' ? t('tab_knit') : t('tab_crochet'), icon: <BsStars /> }] : []),
    { id: 'overview', label: t('tab_overview'), icon: <BsListStars /> },
  ]

  const categoryLabel = (cat: ProjectCategory) => t(`category_${cat.toLowerCase()}` as const)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 px-2">←</button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 truncate">{project.name}</h2>
          <span className="text-xs text-warm-gray">{categoryLabel(project.category)}</span>
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
          {/* Cover images (up to 3) */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              {(project.coverImages ?? []).map(img => (
                <div key={img.id} className="relative group flex-shrink-0">
                  <img
                    src={img.storedName}
                    alt={img.originalName}
                    className={`w-24 h-24 object-cover rounded-xl border-2 transition-colors ${img.isMain ? 'border-sand-green' : 'border-transparent'}`}
                  />
                  <button
                    onClick={async () => setProject(await projectsApi.setCoverImageMain(projectId, img.id))}
                    className={`absolute top-1 left-1 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors ${img.isMain ? 'bg-sand-green text-white' : 'bg-black/40 text-white hover:bg-sand-green'}`}
                    title={img.isMain ? t('main_image') : t('set_as_main')}
                  >★</button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        message: t('delete_cover_image_confirm'),
                        confirmLabel: t('dialog_btn_remove'),
                        tone: 'danger',
                      })
                      if (!ok) return
                      try {
                        setProject(await projectsApi.deleteCoverImage(projectId, img.id))
                        showToast(t('cover_image_removed_toast'))
                      } catch {
                        showToast(t('upload_failed'), 'info')
                      }
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white text-sm leading-none hidden group-hover:flex items-center justify-center transition-colors"
                    title={t('delete')}
                  >×</button>
                </div>
              ))}
              {(project.coverImages ?? []).length < MAX_COVER_IMAGES && (
                <button
                  onClick={() => coverImageRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-soft-brown/30 hover:border-sand-green transition-colors bg-soft-brown/10 flex flex-col items-center justify-center gap-1 text-warm-gray flex-shrink-0"
                  title={t('upload_cover_image')}
                >
                  <span className="text-xl leading-none">+</span>
                  <span className="text-xs text-center px-1">{uploadingCover ? t('uploading') : t('upload_cover_image')}</span>
                </button>
              )}
            </div>
            {coverImageError && <p className="text-xs text-red-500">{coverImageError}</p>}
            <input ref={coverImageRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleCoverImageUpload} className="hidden" />
          </div>

          <Field label={t('field_name')}>
            <input className="input" value={name} onChange={e => handleInfoChange('name', e.target.value)} />
          </Field>
          <Field label={t('field_description')}>
            <textarea className="textarea" rows={4} value={description} onChange={e => handleInfoChange('description', e.target.value)} placeholder={t('describe_project')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('start_date_label')}>
              <input type="date" className="input" value={startDate} onChange={e => handleInfoChange('startDate', e.target.value)} />
            </Field>
            <Field label={`${t('end_date_label')} (${t('optional')})`}>
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
          recipeText={recipeText}
          files={project.files}
          projectId={projectId}
          onUpdate={setProject}
          onRecipeChange={v => handleInfoChange('recipeText', v)}
        />
      )}

      {tab === 'knit' && !isSewing && (
        <KnitTab project={project} projectId={projectId} onUpdate={setProject} category={project.category} />
      )}

      {tab === 'overview' && (
        <OverviewTab
          project={project}
          name={name} description={description} recipeText={recipeText}
          craftDetails={craftDetails}
          projectId={projectId}
        />
      )}
    </div>
  )
}

// ── Materials Tab ──────────────────────────────────────────────
function MaterialsTab({ project, projectId, onUpdate }: {
  project: Project; projectId: number; onUpdate: (p: Project) => void
}) {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [filterType, setFilterType] = useState<LibraryItemType | null>(null)
  const [filterColors, setFilterColors] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [creatingInLib, setCreatingInLib] = useState(false)
  const [newLibType, setNewLibType] = useState<LibraryItemType>('YARN')
  const [pendingItem, setPendingItem] = useState<LibraryItem | null>(null)

  function libraryItemThumbUrl(item: LibraryItem) {
    const main = item.images?.find(i => i.isMain) ?? item.images?.[0]
    return main?.storedName
  }

  useEffect(() => {
    libraryApi.getAll().then(setLibraryItems)
  }, [])
  const showColorFilter = filterType === null || filterType === 'YARN' || filterType === 'FABRIC'
  const colorableItems = libraryItems.filter(i => i.itemType === 'YARN' || i.itemType === 'FABRIC')
  const availableColors = Array.from(new Set(colorableItems.flatMap(i => i.colors ?? [])))

  const q = search.toLowerCase()
  const filtered = libraryItems.filter(i => {
    if (filterType && i.itemType !== filterType) return false
    if (filterColors.length > 0 && !filterColors.some(c => (i.colors ?? []).includes(c))) return false
    if (!q) return true
    return [i.name, i.yarnBrand, i.yarnMaterial, i.needleSizeMm, i.hookSizeMm].some(v => v?.toLowerCase().includes(q))
  })

  function handleLibraryClick(item: LibraryItem) {
    if (item.itemType === 'YARN' || item.itemType === 'FABRIC') {
      setPendingItem(item)
    } else {
      addFromLibrary(item, '')
    }
  }

  async function addFromLibrary(item: LibraryItem, colorName: string) {
    let type = item.name
    let amount = ''
    let unit = ''
    if (item.itemType === 'YARN') {
      type = [item.yarnBrand, item.yarnMaterial].filter(Boolean).join(' ') || item.name
      if (item.yarnAmountG) { amount = String(item.yarnAmountG); unit = 'g' }
      else if (item.yarnAmountM) { amount = String(item.yarnAmountM); unit = 'm' }
    } else if (item.itemType === 'FABRIC') {
      amount = [item.fabricLengthCm && `${item.fabricLengthCm}cm`, item.fabricWidthCm && `${item.fabricWidthCm}cm`].filter(Boolean).join(' × ')
    } else if (item.itemType === 'KNITTING_NEEDLE') {
      type = item.needleSizeMm ? `${item.needleSizeMm} mm strikkepinne` : item.name
      if (item.circularLengthCm) amount = `${item.circularLengthCm} cm`
    } else if (item.itemType === 'CROCHET_HOOK') {
      type = item.hookSizeMm ? `${item.hookSizeMm} mm heklenål` : item.name
    }
    const colorHex = colorName ? (COLOR_MAP[colorName] ?? '') : ''
    const libImgsRaw = libraryItemImagesForProject(item)
    const seen = new Set<string>()
    const libImgs = libImgsRaw.filter(x => {
      if (!x.storedName || seen.has(x.storedName)) return false
      seen.add(x.storedName)
      return true
    })
    setSaving(true)
    try {
      let updated = await projectsApi.addMaterial(projectId, {
        name: item.name, type, itemType: item.itemType, color: colorName, colorHex, amount, unit,
      })
      const newMat = updated.materials.reduce((a, b) => (a.id > b.id ? a : b))
      if (libImgs.length > 0) {
        // Register first image (becomes main), then the rest in parallel
        updated = await projectsApi.registerMaterialImageByUrl(
          projectId,
          newMat.id,
          libImgs[0].storedName,
          libImgs[0].originalName || 'image',
        )
        if (libImgs.length > 1) {
          await Promise.all(libImgs.slice(1).map(img =>
            projectsApi.registerMaterialImageByUrl(projectId, newMat.id, img.storedName, img.originalName || 'image')
          ))
          updated = await projectsApi.getOne(projectId)
        }
      }
      onUpdate(updated)
      setPendingItem(null)
      showToast(t('material_added_toast'))
    } catch {
      showToast(t('upload_failed'), 'info')
    } finally { setSaving(false) }
  }

  function handleLibItemCreated(item: LibraryItem) {
    setLibraryItems(prev => [item, ...prev])
    setCreatingInLib(false)
    showToast(t('lib_item_created_toast'))
  }

  return (
    <div className="space-y-3">
      {project.materials.length === 0 && (
        <p className="text-sm text-warm-gray text-center py-2">{t('no_materials_yet')}</p>
      )}
      {project.materials.map(m => {
        const mainImg = m.images?.find(img => img.isMain) ?? m.images?.[0]
        const thumbSrc = mainImg?.storedName
        return (
          <div key={m.id} className="card">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 min-h-[3rem]">
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={mainImg?.originalName ?? m.name}
                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0 pointer-events-none select-none"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-soft-brown/20 flex items-center justify-center text-warm-gray flex-shrink-0 text-base pointer-events-none select-none" aria-hidden>
                    {m.itemType ? TYPE_ICONS[m.itemType as LibraryItemType] : '·'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{m.type}</p>
                  {(m.amount || m.unit) && (
                    <p className="text-xs text-warm-gray">{m.amount}{m.amount && m.unit ? ` ${m.unit}` : ''}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    message: t('delete_material_confirm', { name: m.type }),
                    confirmLabel: t('dialog_btn_remove'),
                    tone: 'danger',
                  })
                  if (!ok) return
                  try {
                    onUpdate(await projectsApi.deleteMaterial(projectId, m.id))
                    showToast(t('material_removed_toast'))
                  } catch {
                    showToast(t('upload_failed'), 'info')
                  }
                }}
                className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none flex-shrink-0"
                title={t('delete')}
              >×</button>
            </div>
          </div>
        )
      })}

      {/* Library picker */}
      <div className="card space-y-2.5">
        <h4 className="text-xs font-semibold text-sand-blue-deep uppercase tracking-wider">{t('add_from_library')}</h4>
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => { setFilterType(null); setFilterColors([]) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === null ? 'bg-sand-blue text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'}`}
          >{t('lib_all')}</button>
          {ITEM_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => { setFilterType(filterType === type ? null : type); setFilterColors([]) }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === type ? 'bg-sand-blue text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'}`}
            >
              <span>{TYPE_ICONS[type]}</span>
              <span>{typeLabel(type, t)}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            className="input text-sm py-2 w-1/2 min-w-0"
            placeholder={t('lib_search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {showColorFilter && availableColors.length > 0 && (
            <div className="w-1/2 flex-shrink-0">
              <ColorMultiSelect
                availableColors={availableColors}
                selected={filterColors}
                onChange={setFilterColors}
                language={i18n.language}
                placeholder={t('lib_filter_color')}
                searchPlaceholder={t('lib_color_search_placeholder')}
                noResults={t('lib_color_no_results')}
                clearLabel={t('lib_clear_color_filter')}
              />
            </div>
          )}
        </div>
        {pendingItem && (
          <div className="border border-sand-blue/40 rounded-lg p-3 space-y-2.5 bg-sand-blue/5">
            <div className="flex items-center gap-2">
              {libraryItemThumbUrl(pendingItem) ? (
                <img src={libraryItemThumbUrl(pendingItem)} alt={pendingItem.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-soft-brown/20 flex items-center justify-center flex-shrink-0 text-sm">
                  {TYPE_ICONS[pendingItem.itemType]}
                </div>
              )}
              <p className="text-sm font-medium text-gray-800 flex-1 truncate">{pendingItem.name}</p>
              <button
                type="button"
                onClick={() => setPendingItem(null)}
                className="text-warm-gray hover:text-red-400 text-lg leading-none"
              >×</button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void addFromLibrary(pendingItem, '')}
                className="btn-primary text-sm flex-1"
              >{saving ? t('saving') : t('add_library_to_project')}</button>
              <button type="button" onClick={() => setPendingItem(null)} className="btn-ghost text-sm">{t('cancel')}</button>
            </div>
          </div>
        )}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-warm-gray text-center py-3">{t('library_empty')}</p>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-sand-blue/15 bg-white/60 p-2.5 transition-colors hover:border-sand-green/35 hover:bg-sand-green/10"
              >
                {libraryItemThumbUrl(item) ? (
                  <img src={libraryItemThumbUrl(item)} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-soft-brown/20 text-base">
                    {TYPE_ICONS[item.itemType]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{item.name}</p>
                  {(() => { const s = itemSummary(item); return s ? <p className="truncate text-xs text-warm-gray">{s}</p> : null })()}
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleLibraryClick(item)}
                  className="btn-primary flex-shrink-0 whitespace-nowrap py-2 px-3 text-xs"
                >
                  {t('add_library_to_project')}
                </button>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-soft-brown/20 pt-2.5">
          {creatingInLib ? (
            <LibraryItemForm
              selectedType={newLibType}
              onTypeChange={setNewLibType}
              onCreated={handleLibItemCreated}
              onCancel={() => setCreatingInLib(false)}
            />
          ) : (
            <p className="text-xs text-warm-gray text-center">
              {t('lib_not_found_hint')}{' '}
              <button
                type="button"
                onClick={() => { setNewLibType(filterType ?? 'YARN'); setCreatingInLib(true) }}
                className="text-sand-blue-deep underline hover:no-underline font-medium"
              >{t('lib_create_new')}</button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


// ── File Preview Modal ─────────────────────────────────────────
function FilePreviewModal({ file, projectId, onClose }: {
  file: ProjectFile; projectId: number; onClose: () => void
}) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(1)
  const url = fileUrl(projectId, file.storedName)
  const fileIcon = (ft: string) =>
    ({ image: '🖼️', pdf: '📄', word: '📝', other: '📎' } as Record<string, string>)[ft] ?? '📎'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-3 w-full max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-white text-sm font-medium truncate max-w-xs">{file.originalName}</span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none ml-4 flex-shrink-0"
            title={t('close')}
          >×</button>
        </div>

        {file.fileType === 'image' ? (
          <>
            <div className="overflow-auto rounded-lg w-full flex items-center justify-center" style={{ maxHeight: '75vh' }}>
              <img
                src={url}
                alt={file.originalName}
                style={{
                  display: 'block',
                  maxWidth: zoom === 1 ? '100%' : `${zoom * 100}%`,
                  maxHeight: zoom === 1 ? '72vh' : undefined,
                  width: zoom === 1 ? 'auto' : `${zoom * 100}%`,
                  height: zoom === 1 ? 'auto' : undefined,
                }}
                className="rounded-lg"
              />
            </div>
            <div className="flex items-center gap-1 bg-black/60 rounded-full px-3 py-1.5">
              <button
                onClick={() => setZoom(z => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))}
                className="text-white text-lg w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full"
                title={t('zoom_out')}
              >−</button>
              <button
                onClick={() => setZoom(1)}
                className="text-white text-xs px-2 hover:bg-white/10 rounded-full h-8 min-w-[3rem]"
                title={t('zoom_reset')}
              >{Math.round(zoom * 100)}%</button>
              <button
                onClick={() => setZoom(z => Math.min(4, parseFloat((z + 0.25).toFixed(2))))}
                className="text-white text-lg w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full"
                title={t('zoom_in')}
              >+</button>
            </div>
          </>
        ) : file.fileType === 'pdf' ? (
          <iframe
            src={url}
            title={file.originalName}
            className="w-full rounded-lg bg-white"
            style={{ height: '78vh' }}
          />
        ) : (
          <div className="bg-white rounded-xl p-10 text-center">
            <div className="text-6xl mb-4">{fileIcon(file.fileType)}</div>
            <p className="text-gray-800 font-medium mb-6">{file.originalName}</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
              {t('open_file')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Recipe Tab ─────────────────────────────────────────────────
function RecipeTab({ recipeText, files, projectId, onUpdate, onRecipeChange }: {
  recipeText: string; files: ProjectFile[]; projectId: number
  onUpdate: (p: Project) => void; onRecipeChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [uploading, setUploading] = useState(false)
  const [replacingId, setReplacingId] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)

  const fileIcon = (ft: string) =>
    ({ image: '🖼️', pdf: '📄', word: '📝', other: '📎' } as Record<string, string>)[ft] ?? '📎'

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const updated = await projectsApi.uploadProjectFile(projectId, file)
      onUpdate(updated)
      showToast(t('attachment_added_toast'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || replacingId === null) return
    setUploading(true)
    try {
      const updated = await projectsApi.replaceFile(projectId, replacingId, file)
      onUpdate(updated)
    } finally {
      setUploading(false)
      setReplacingId(null)
      if (replaceRef.current) replaceRef.current.value = ''
    }
  }

  function startReplace(fileId: number) {
    setReplacingId(fileId)
    replaceRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Field label={t('recipe_label')}>
        <textarea
          className="textarea"
          rows={10}
          value={recipeText}
          onChange={e => onRecipeChange(e.target.value)}
          placeholder={t('recipe_placeholder')}
        />
      </Field>
      <p className="text-xs text-warm-gray text-right -mt-2">{t('auto_saving')}</p>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{t('attachments_label')}</span>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {uploading ? t('uploading') : t('upload_file')}
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          <input ref={replaceRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleReplace} className="hidden" />
        </div>

        {files.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-soft-brown/30 rounded-xl">
            <p className="text-sm text-warm-gray">{t('no_files_yet')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => {
              const url = fileUrl(projectId, f.storedName)
              return (
                <div key={f.id} className="card flex items-center gap-3">
                  <button
                    onClick={() => setPreviewFile(f)}
                    className="flex-shrink-0 focus:outline-none"
                    title={t('preview_file')}
                  >
                    {f.fileType === 'image' ? (
                      <img src={url} alt={f.originalName} className="w-12 h-12 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                    ) : (
                      <span className="w-12 h-12 flex items-center justify-center text-2xl hover:opacity-70 transition-opacity">{fileIcon(f.fileType)}</span>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setPreviewFile(f)}
                      className="text-sm font-medium text-gray-800 hover:text-sand-green-dark truncate block text-left w-full"
                    >
                      {f.originalName}
                    </button>
                    <p className="text-xs text-warm-gray capitalize">{f.fileType}</p>
                  </div>
                  <button
                    onClick={() => startReplace(f.id)}
                    disabled={uploading}
                    className="text-warm-gray hover:text-sand-blue-deep text-sm px-1 flex-shrink-0"
                    title={t('replace_file')}
                  >↺</button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        message: t('delete_attachment_confirm', { name: f.originalName }),
                        confirmLabel: t('dialog_btn_remove'),
                        tone: 'danger',
                      })
                      if (!ok) return
                      try {
                        onUpdate(await projectsApi.deleteFile(projectId, f.id))
                        showToast(t('attachment_removed_toast'))
                      } catch {
                        showToast(t('upload_failed'), 'info')
                      }
                    }}
                    className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none flex-shrink-0"
                    title={t('delete')}
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          projectId={projectId}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}

// ── Knit Tab (Pattern + Counter together) ─────────────────────
function KnitTab({ project, projectId, onUpdate, category }: {
  project: Project; projectId: number; onUpdate: (p: Project) => void; category: ProjectCategory
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirmDialog()
  const [activeGridIndex, setActiveGridIndex] = useState(0)

  const hasCounter = !!project.rowCounter
  const grids = project.patternGrids ?? []
  const clampedIndex = Math.min(activeGridIndex, Math.max(0, grids.length - 1))
  const activeGrid = grids[clampedIndex]

  async function handleAddGrid() {
    const updated = await projectsApi.createPatternGrid(projectId)
    onUpdate(updated)
    setActiveGridIndex(updated.patternGrids.length - 1)
    showToast(t('grid_added_toast'))
  }

  async function handleDeleteGrid() {
    if (!activeGrid || grids.length <= 1) return
    const ok = await confirm({
      message: t('delete_grid_confirm'),
      confirmLabel: t('delete'),
      tone: 'danger',
    })
    if (!ok) return
    try {
      const updated = await projectsApi.deletePatternGrid(projectId, activeGrid.id)
      onUpdate(updated)
      setActiveGridIndex(i => Math.min(i, Math.max(0, updated.patternGrids.length - 1)))
      showToast(t('grid_deleted_toast'))
    } catch {
      showToast(t('upload_failed'), 'info')
    }
  }

  const gridHeader = (
    <div className="flex items-center gap-1 mb-2">
      <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide">{t('pattern_grid')}</h3>
      {grids.length > 1 && (
        <>
          <button
            onClick={() => setActiveGridIndex(i => Math.max(0, i - 1))}
            disabled={clampedIndex === 0}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-soft-brown/20 disabled:opacity-30 text-warm-gray text-base leading-none"
          >‹</button>
          <span className="text-xs text-warm-gray tabular-nums">{clampedIndex + 1}/{grids.length}</span>
          <button
            onClick={() => setActiveGridIndex(i => Math.min(grids.length - 1, i + 1))}
            disabled={clampedIndex === grids.length - 1}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-soft-brown/20 disabled:opacity-30 text-warm-gray text-base leading-none"
          >›</button>
        </>
      )}
      <button
        onClick={handleAddGrid}
        className="w-5 h-5 flex items-center justify-center rounded-full bg-sand-green hover:opacity-80 text-gray-700 text-xs font-bold ml-1"
        title={t('add_grid')}
      >+</button>
      {grids.length > 1 && activeGrid && (
        <button
          onClick={handleDeleteGrid}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-soft-brown/20 text-warm-gray text-sm leading-none"
          title={t('delete_grid')}
        >×</button>
      )}
    </div>
  )

  const counterWidget = hasCounter && (
    <RoundCounterWidget
      counter={project.rowCounter!}
      onSave={async (spr, tr, cs) =>
        onUpdate(await projectsApi.updateRowCounter(projectId, {
          stitchesPerRound: spr, totalRounds: tr, checkedStitches: JSON.stringify(cs)
        }))
      }
    />
  )

  const gridWidget = activeGrid && (
    <PatternGridWidget
      key={activeGrid.id}
      rows={activeGrid.rows}
      cols={activeGrid.cols}
      cellDataJson={activeGrid.cellData}
      showSymbols={category === 'KNITTING'}
      onSave={async (cells, r, c) =>
        onUpdate(await projectsApi.updatePatternGrid(projectId, activeGrid.id, {
          rows: r, cols: c, cellData: JSON.stringify(cells)
        }))
      }
    />
  )

  return (
    <div className="space-y-6">
      {hasCounter && (
        <div>
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2">{t('round_counter')}</h3>
          {counterWidget}
        </div>
      )}
      <div>
        {gridHeader}
        {gridWidget}
      </div>
    </div>
  )
}

/** Fetch an image URL and return a JPEG data URI by drawing it through a canvas.
 *  This is the only reliable way to embed external images in react-pdf v4 browser mode. */
async function fetchAsJpegDataUri(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  return new Promise<string>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const MAX = 1600
        const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
        canvas.width  = Math.round(img.naturalWidth  * scale)
        canvas.height = Math.round(img.naturalHeight * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(blobUrl)
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      } catch (e) { URL.revokeObjectURL(blobUrl); reject(e) }
    }
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('img load failed')) }
    img.src = blobUrl
  })
}

// ── Overview Tab ───────────────────────────────────────────────
function OverviewTab({ project, name, description, recipeText, craftDetails, projectId }: {
  project: Project; name: string; description: string; recipeText: string
  craftDetails: Record<string, string>; projectId: number
}) {
  const { t, i18n } = useTranslation()
  const fileIcon = (ft: string) =>
    ({ image: '🖼️', pdf: '📄', word: '📝', other: '📎' } as Record<string, string>)[ft] ?? '📎'

  async function downloadOverview() {
    const [{ pdf }, { ProjectOverviewPdf }, { fileUrl }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('./ProjectPdf'),
      import('../api'),
    ])

    const craftFields = CRAFT_FIELDS_KEYS[project.category] ?? []
    const filledCraftFields = craftFields
      .filter(f => craftDetails[f.key]?.trim())
      .map(f => ({ key: f.key, label: t(f.labelKey as Parameters<typeof t>[0]) }))

    // Collect all image URLs that need to be embedded in the PDF
    const imageUrls = uniqueImageUrls([
      ...projectCoverImageUrls(project),
      ...project.materials.flatMap(materialImageUrls),
      ...project.files
        .filter(f => f.fileType === 'image')
        .map(f => fileUrl(projectId, f.storedName)),
    ])

    // Convert each image to a JPEG data URI via canvas — the only reliable way
    // to embed external images in react-pdf v4 browser mode
    const imageData: Record<string, string> = {}
    await Promise.all(imageUrls.map(async url => {
      try {
        imageData[url] = await fetchAsJpegDataUri(url)
      } catch {
        // leave out — img() in ProjectPdf will fall back to the raw URL
      }
    }))

    const doc = (
      <ProjectOverviewPdf
        project={project}
        name={name}
        description={description}
        recipeText={recipeText}
        filledCraftFields={filledCraftFields}
        craftDetails={craftDetails}
        projectId={projectId}
        categoryLabel={t(`category_${project.category.toLowerCase()}` as Parameters<typeof t>[0])}
        language={i18n.language}
        imageData={imageData}
        labels={{
          info: t('section_info'),
          materials: t('section_materials'),
          recipe: t('section_recipe'),
          patternGrid: t('section_pattern_grid'),
        }}
      />
    )

    const blob = await pdf(doc).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/[^a-z0-9æøåÆØÅ]/gi, '_')}_stitchbud.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const craftFields = CRAFT_FIELDS_KEYS[project.category] ?? []
  const filledCraftFields = craftFields.filter(f => craftDetails[f.key]?.trim())
  const hasMaterials = project.materials.length > 0
  const coverUrls = projectCoverImageUrls(project)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={downloadOverview} className="btn-secondary text-sm flex items-center gap-2">
          <span>↓</span> {t('download_overview')}
        </button>
      </div>
      <Section title={t('section_info')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 text-base">{name}</h3>
            {description && <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{description}</p>}
          </div>
          {coverUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap sm:justify-end">
              {coverUrls.map((url, i) => (
                <img key={i} src={url} alt="" className="w-28 h-28 object-cover rounded-xl flex-shrink-0 shadow-sm" />
              ))}
            </div>
          )}
        </div>
      </Section>

      {(filledCraftFields.length > 0 || hasMaterials) && (
        <Section title={t('section_materials')}>
          {filledCraftFields.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
              {filledCraftFields.map(({ key, labelKey }) => (
                <div key={key}>
                  <span className="text-xs text-warm-gray">{t(labelKey as Parameters<typeof t>[0])}: </span>
                  <span className="text-sm text-gray-700">{craftDetails[key]}</span>
                </div>
              ))}
            </div>
          )}
          {hasMaterials && (
            <div className="space-y-4">
              {project.materials.map(m => {
                const colorEntry = m.colorHex ? COLOR_MAP_BY_HEX[m.colorHex] : undefined
                const colorLabel = colorEntry ? getColorName(colorEntry, i18n.language) : m.color
                const imgs = materialImageUrls(m, projectId)
                return (
                  <div key={m.id} className="space-y-2">
                    <span className="text-sm text-gray-700 block font-medium">
                      {m.type}{colorLabel ? ` — ${colorLabel}` : ''}{m.amount ? ` (${m.amount}${m.unit ? ` ${m.unit}` : ''})` : ''}
                    </span>
                    {imgs.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {imgs.map((url, i) => (
                          <img
                            key={`${url}-${i}`}
                            src={url}
                            alt=""
                            className="w-28 h-28 object-cover rounded-xl flex-shrink-0 shadow-sm pointer-events-none select-none"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      )}

      {(recipeText || project.files.length > 0) && (
        <Section title={t('section_recipe')}>
          {project.files.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {project.files.map(f => {
                const url = fileUrl(projectId, f.storedName)
                return f.fileType === 'image' ? (
                  <a key={f.id} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={f.originalName} className="w-20 h-20 object-cover rounded-xl shadow-sm" />
                  </a>
                ) : (
                  <a key={f.id} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 card py-2 px-3 text-sm hover:shadow-md">
                    <span>{fileIcon(f.fileType)}</span>
                    <span className="text-gray-700 max-w-[8rem] truncate">{f.originalName}</span>
                  </a>
                )
              })}
            </div>
          )}
          {recipeText && <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{recipeText}</p>}
        </Section>
      )}

      {project.category !== 'SEWING' && project.patternGrids?.length > 0 && (
        <Section title={t('section_pattern_grid')}>
          {project.patternGrids.map((grid, i) => (
            <div key={grid.id} className={i > 0 ? 'mt-4' : ''}>
              {project.patternGrids.length > 1 && (
                <p className="text-xs text-warm-gray mb-1">{i + 1}/{project.patternGrids.length}</p>
              )}
              <PatternGridReadOnly rows={grid.rows} cols={grid.cols} cellDataJson={grid.cellData} showSymbols={project.category === 'KNITTING'} />
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

// ── Round Counter Widget ───────────────────────────────────────
function RoundCounterWidget({ counter, onSave }: {
  counter: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }
  onSave: (stitchesPerRound: number, totalRounds: number, checked: number[]) => void
}) {
  const { t } = useTranslation()

  function parseChecked(s: string): Set<number> {
    try { return new Set(JSON.parse(s) as number[]) } catch { return new Set() }
  }

  const [spr, setSpr] = useState(counter.stitchesPerRound)
  const [rounds, setRounds] = useState(counter.totalRounds)
  const [checked, setChecked] = useState<Set<number>>(() => parseChecked(counter.checkedStitches))
  const [configured, setConfigured] = useState(counter.stitchesPerRound > 0 && counter.totalRounds > 0)
  const [editSpr, setEditSpr] = useState(counter.stitchesPerRound || 8)
  const [editRounds, setEditRounds] = useState(counter.totalRounds || 10)

  const checkedRef = useRef(checked)
  const sprRef = useRef(spr)
  const roundsRef = useRef(rounds)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const newSpr = counter.stitchesPerRound
    const newRounds = counter.totalRounds
    setSpr(newSpr); sprRef.current = newSpr
    setRounds(newRounds); roundsRef.current = newRounds
    setConfigured(newSpr > 0 && newRounds > 0)
    setEditSpr(newSpr || 8)
    setEditRounds(newRounds || 10)
  }, [counter.stitchesPerRound, counter.totalRounds])

  function toggleStitch(idx: number) {
    const next = new Set(checkedRef.current)
    if (next.has(idx)) next.delete(idx); else next.add(idx)
    checkedRef.current = next
    setChecked(new Set(next))

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave(sprRef.current, roundsRef.current, Array.from(checkedRef.current))
    }, 800)
  }

  function handleConfigure() {
    const empty = new Set<number>()
    setSpr(editSpr); sprRef.current = editSpr
    setRounds(editRounds); roundsRef.current = editRounds
    checkedRef.current = empty
    setChecked(empty)
    setConfigured(true)
    onSave(editSpr, editRounds, [])
  }

  function handleReset() {
    const empty = new Set<number>()
    checkedRef.current = empty
    setChecked(empty)
    onSave(sprRef.current, roundsRef.current, [])
  }

  if (!configured) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-warm-gray">{t('setup_counter')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('repetitions_per_round')}>
            <input type="number" className="input" min={1} max={500}
              value={editSpr} onChange={e => setEditSpr(parseInt(e.target.value) || 1)} />
          </Field>
          <Field label={t('total_rounds')}>
            <input type="number" className="input" min={1} max={1000}
              value={editRounds} onChange={e => setEditRounds(parseInt(e.target.value) || 1)} />
          </Field>
        </div>
        <button onClick={handleConfigure} className="btn-primary w-full">{t('start_counting')}</button>
      </div>
    )
  }

  const totalStitches = spr * rounds
  const doneCount = checked.size
  const completedRounds = Array.from({ length: rounds }, (_, r) =>
    Array.from({ length: spr }, (_, s) => r * spr + s).every(i => checked.has(i))
  ).filter(Boolean).length
  const progress = totalStitches > 0 ? Math.round((doneCount / totalStitches) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm flex-wrap gap-1">
        <span className="text-warm-gray">{t('rounds_repetitions', { completedRounds, rounds, done: doneCount, total: totalStitches })}</span>
        <span className="text-warm-gray text-xs">{progress}%</span>
      </div>
      <div className="w-full bg-soft-brown/30 rounded-full h-1.5">
        <div className="bg-sand-green-dark h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {Array.from({ length: rounds }, (_, r) => {
            const rowComplete = Array.from({ length: spr }, (_, s) => checked.has(r * spr + s)).every(Boolean)
            return (
              <div key={r} className="flex items-center gap-1 mb-1">
                <span className={`text-xs w-7 text-right flex-shrink-0 font-mono ${rowComplete ? 'text-sand-green-dark font-bold' : 'text-warm-gray'}`}>
                  {r + 1}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: spr }, (_, s) => {
                    const idx = r * spr + s
                    const done = checked.has(idx)
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStitch(idx)}
                        className={`w-7 h-7 rounded border text-xs font-bold transition-all active:scale-95 ${
                          done
                            ? 'bg-sand-green border-sand-green-dark text-gray-700'
                            : 'bg-white border-soft-brown/40 text-transparent hover:border-sand-green hover:bg-sand-green/10'
                        }`}
                      >✓</button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleReset} className="btn-ghost text-xs border border-soft-brown/30 rounded-lg py-1.5 px-3">
          {t('reset_all')}
        </button>
        <button onClick={() => setConfigured(false)} className="btn-ghost text-xs border border-soft-brown/30 rounded-lg py-1.5 px-3">
          {t('change_setup')}
        </button>
      </div>
      <p className="text-xs text-warm-gray">{t('auto_saving')}</p>
    </div>
  )
}

// ── Pattern Grid Widget ────────────────────────────────────────
function PatternGridWidget({ rows: initRows, cols: initCols, cellDataJson, showSymbols = true, onSave }: {
  rows: number; cols: number; cellDataJson: string; showSymbols?: boolean
  onSave: (cells: PatternCell[], rows: number, cols: number) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState(initRows)
  const [cols, setCols] = useState(initCols)
  const [cells, setCells] = useState<PatternCell[]>(() => {
    try { return JSON.parse(cellDataJson) } catch { return [] }
  })
  const [selectedColor, setSelectedColor] = useState('#C6D8B8')
  const [selectedSymbol, setSelectedSymbol] = useState('O')
  const [mode, setMode] = useState<'color' | 'symbol' | 'erase'>('color')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFlush = useRef<(() => void) | null>(null)

  // Flush any pending debounced save on unmount (e.g. navigating away mid-edit)
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      pendingFlush.current?.()
    }
  }, [])

  const cellMap = useMemo(() => new Map(cells.map(c => [`${c.row},${c.col}`, c])), [cells])

  function autoSave(newCells: PatternCell[], r: number, c: number) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    pendingFlush.current = () => onSave(newCells, r, c)
    saveTimer.current = setTimeout(() => {
      onSave(newCells, r, c)
      pendingFlush.current = null
    }, 600)
  }

  function flushAndStopEditing() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    pendingFlush.current?.()
    pendingFlush.current = null
    setEditing(false)
  }

  function handleCell(row: number, col: number) {
    if (!editing) return
    const existing = cellMap.get(`${row},${col}`)
    let next: PatternCell[]
    if (mode === 'erase') {
      next = cells.filter(c => !(c.row === row && c.col === col))
    } else if (mode === 'symbol') {
      next = cells.filter(c => !(c.row === row && c.col === col))
      next.push({ row, col, color: existing?.color ?? '#F5F0E8', symbol: selectedSymbol })
    } else {
      next = cells.filter(c => !(c.row === row && c.col === col))
      next.push({ row, col, color: selectedColor, symbol: existing?.symbol ?? '' })
    }
    setCells(next)
    autoSave(next, rows, cols)
  }

  function applyResize(newRows: number, newCols: number) {
    const trimmed = cells.filter(c => c.row < newRows && c.col < newCols)
    setRows(newRows)
    setCols(newCols)
    setCells(trimmed)
    onSave(trimmed, newRows, newCols)
  }

  const usedSymbols = new Set(cells.map(c => c.symbol).filter(Boolean))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => editing ? flushAndStopEditing() : setEditing(true)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${editing ? 'bg-sand-green text-gray-800' : 'bg-soft-brown/20 text-warm-gray'}`}
        >{editing ? t('done_editing_grid') : t('edit_grid')}</button>
        <p className="text-xs text-warm-gray">{t('auto_saving_grid')}</p>
      </div>

      {editing && (
        <>
          <div className="flex gap-1.5 items-center flex-wrap">
            <button
              onClick={() => setMode('color')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${mode === 'color' ? 'bg-sand-green text-gray-800' : 'bg-soft-brown/20 text-warm-gray'}`}
            >{t('paint')}</button>
            <button
              onClick={() => setMode('erase')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${mode === 'erase' ? 'bg-soft-brown text-white' : 'bg-soft-brown/20 text-warm-gray'}`}
            >{t('erase')}</button>
            <div className="flex gap-1 flex-wrap ml-1">
              {PALETTE.map(c => (
                <button key={c} onClick={() => { setSelectedColor(c); setMode('color') }}
                  className={`w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform ${selectedColor === c && mode === 'color' ? 'border-gray-700 scale-110' : 'border-white shadow-sm'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={selectedColor} onChange={e => { setSelectedColor(e.target.value); setMode('color') }}
                className="w-5 h-5 rounded-full cursor-pointer border-0" />
            </div>
          </div>

          {showSymbols && (
            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-xs text-warm-gray mr-1">{t('stitch_symbols')}:</span>
              {STITCH_SYMBOLS.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => { setSelectedSymbol(s.symbol); setMode('symbol') }}
                  title={t(s.labelKey as Parameters<typeof t>[0])}
                  className={`w-6 h-6 flex items-center justify-center rounded border text-xs font-bold transition-colors
                    ${mode === 'symbol' && selectedSymbol === s.symbol
                      ? 'border-gray-700 bg-sand-green text-gray-800'
                      : 'border-soft-brown/30 bg-soft-brown/10 text-gray-700 hover:bg-sand-blue/20'}`}
                >{s.symbol}</button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center text-xs flex-wrap">
            <span className="text-warm-gray">{t('rows_label')}</span>
            <input type="number" value={rows} min={1} max={100} onChange={e => setRows(parseInt(e.target.value) || 1)}
              className="input py-1 px-2 text-xs w-14" />
            <span className="text-warm-gray">{t('cols_label')}</span>
            <input type="number" value={cols} min={1} max={100} onChange={e => setCols(parseInt(e.target.value) || 1)}
              className="input py-1 px-2 text-xs w-14" />
            <button onClick={() => applyResize(rows, cols)} className="btn-ghost text-xs py-1 px-2 border border-soft-brown/30 rounded-lg">{t('apply')}</button>
          </div>

          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="text-xs text-warm-gray">{t('preset_label')}:</span>
            {GRID_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyResize(p.rows, p.cols)}
                className="px-2 py-0.5 rounded text-xs bg-soft-brown/20 hover:bg-sand-blue/30 text-warm-gray transition-colors"
              >{p.label}</button>
            ))}
          </div>
        </>
      )}

      <GridCanvas
        rows={rows} cols={cols} cells={cells} cellMap={cellMap}
        editing={editing} onCell={handleCell}
        showSymbols={showSymbols} usedSymbols={usedSymbols}
        t={t}
      />
    </div>
  )
}

function GridCanvas({ rows, cols, cells: _cells, cellMap, editing, onCell, showSymbols, usedSymbols, t }: {
  rows: number; cols: number; cells: PatternCell[]; cellMap: Map<string, PatternCell>
  editing: boolean; onCell: (r: number, c: number) => void
  showSymbols: boolean; usedSymbols: Set<string>
  t: (k: Parameters<ReturnType<typeof useTranslation>['t']>[0]) => string
}) {
  const cellPx = cols <= 20 ? 28 : cols <= 35 ? 20 : 14
  return (
    <div className="flex gap-4 items-start">
      <div className="overflow-auto">
        <div
          className="inline-grid gap-px bg-soft-brown/20 border border-soft-brown/20 rounded-lg p-px"
          style={{ gridTemplateColumns: `repeat(${cols}, ${cellPx}px)` }}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const cell = cellMap.get(`${r},${c}`)
              const inner = cell?.symbol && cellPx >= 20
                ? <span className="text-[9px] font-bold leading-none select-none">{cell.symbol}</span>
                : null
              return editing ? (
                <button key={`${r}-${c}`} onClick={() => onCell(r, c)}
                  className="flex items-center justify-center hover:opacity-75 transition-opacity"
                  style={{ backgroundColor: cell?.color ?? '#F5F0E8', width: cellPx, height: cellPx }}
                >{inner}</button>
              ) : (
                <div key={`${r}-${c}`} className="flex items-center justify-center"
                  style={{ backgroundColor: cell?.color ?? '#F5F0E8', width: cellPx, height: cellPx }}
                >{inner}</div>
              )
            })
          )}
        </div>
      </div>

      {showSymbols && (editing || usedSymbols.size > 0) && (
        <div className="flex-shrink-0 space-y-1.5 pt-1">
          <p className="text-xs font-semibold text-warm-gray uppercase tracking-wide">{t('grid_legend')}</p>
          {(editing ? STITCH_SYMBOLS : STITCH_SYMBOLS.filter(s => usedSymbols.has(s.symbol))).map(s => (
            <div key={s.symbol} className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center rounded border text-xs font-bold flex-shrink-0 border-gray-400 bg-soft-brown/20 text-gray-800"
              >{s.symbol}</span>
              <span className="text-xs text-gray-700">
                {t(s.labelKey as Parameters<typeof t>[0])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Read-only Pattern Grid ─────────────────────────────────────
function PatternGridReadOnly({ rows, cols, cellDataJson, showSymbols = true }: {
  rows: number; cols: number; cellDataJson: string; showSymbols?: boolean
}) {
  const { t } = useTranslation()
  const cells: PatternCell[] = (() => { try { return JSON.parse(cellDataJson) } catch { return [] } })()
  const cellMap = new Map(cells.map(c => [`${c.row},${c.col}`, c]))
  const usedSymbols = new Set(cells.map(c => c.symbol).filter(Boolean))
  const legendSymbols = STITCH_SYMBOLS.filter(s => usedSymbols.has(s.symbol))

  return (
    <div className="flex gap-4 items-start">
      <div className="overflow-auto">
        <div
          className="inline-grid gap-px bg-soft-brown/20 border border-sand-blue/20 rounded-lg p-px"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const cell = cellMap.get(`${r},${c}`)
              return (
                <div key={`${r}-${c}`} className="w-7 h-7 flex items-center justify-center"
                  style={{ backgroundColor: cell?.color ?? '#F5F0E8' }}
                >
                  {showSymbols && cell?.symbol && <span className="text-[9px] font-bold leading-none select-none">{cell.symbol}</span>}
                </div>
              )
            })
          )}
        </div>
      </div>

      {showSymbols && legendSymbols.length > 0 && (
        <div className="flex-shrink-0 space-y-1.5 pt-1">
          <p className="text-xs font-semibold text-warm-gray uppercase tracking-wide">{t('grid_legend')}</p>
          {legendSymbols.map(s => (
            <div key={s.symbol} className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center rounded border border-gray-400 bg-soft-brown/20 text-xs font-bold flex-shrink-0 text-gray-800">
                {s.symbol}
              </span>
              <span className="text-xs text-gray-700">{t(s.labelKey as Parameters<typeof t>[0])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <h3 className="text-xs font-semibold text-sand-blue-deep uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}
