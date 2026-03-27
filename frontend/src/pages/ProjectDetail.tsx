import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi, libraryApi } from '../api'
import type { Project, PatternCell, ProjectCategory, ProjectFile, LibraryItem, LibraryItemType } from '../types'

const ITEM_TYPES: LibraryItemType[] = ['YARN', 'FABRIC', 'KNITTING_NEEDLE', 'CROCHET_HOOK']
const TYPE_ICONS: Record<LibraryItemType, string> = {
  YARN: '🧶', FABRIC: '🧵', KNITTING_NEEDLE: '🪡', CROCHET_HOOK: '🪝',
}

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
    }).finally(() => setLoading(false))
  }, [projectId])

  const autoSave = useCallback((updates: object) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const updated = await projectsApi.update(projectId, updates)
      setProject(updated)
    }, 800)
  }, [projectId])

  function handleInfoChange(field: string, value: string) {
    const current = { name, description, notes, tags, recipeText }
    const updated = { ...current, [field]: value }
    if (field === 'name') setName(value)
    if (field === 'description') setDescription(value)
    if (field === 'notes') setNotes(value)
    if (field === 'tags') setTags(value)
    if (field === 'recipeText') setRecipeText(value)
    autoSave(updated)
  }

  function handleCraftDetailChange(key: string, value: string) {
    const updated = { ...craftDetails, [key]: value }
    setCraftDetails(updated)
    autoSave({ craftDetails: JSON.stringify(updated) })
  }

  async function handleDelete() {
    if (!confirm(t('delete_confirm', { name: project?.name }))) return
    await projectsApi.delete(projectId)
    navigate('/')
  }

  if (loading) return <div className="text-center py-20 text-warm-gray">{t('loading')}</div>
  if (!project) return <div className="text-center py-20 text-warm-gray">{t('project_not_found')}</div>

  const isSewing = project.category === 'SEWING'

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'info', label: t('tab_info'), icon: '📝' },
    { id: 'materials', label: t('tab_materials'), icon: '🧶' },
    { id: 'recipe', label: t('tab_recipe'), icon: '📖' },
    ...(!isSewing ? [{ id: 'knit' as Tab, label: project.category === 'KNITTING' ? t('tab_knit') : t('tab_crochet'), icon: '✦' }] : []),
    { id: 'overview', label: t('tab_overview'), icon: '⊞' },
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
          <Field label={t('field_name')}>
            <input className="input" value={name} onChange={e => handleInfoChange('name', e.target.value)} />
          </Field>
          <Field label={t('field_description')}>
            <textarea className="textarea" rows={4} value={description} onChange={e => handleInfoChange('description', e.target.value)} placeholder={t('describe_project')} />
          </Field>
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
        <KnitTab project={project} projectId={projectId} onUpdate={setProject} />
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
  const { t } = useTranslation()
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [filterType, setFilterType] = useState<LibraryItemType | null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [creatingInLib, setCreatingInLib] = useState(false)
  const [newLibType, setNewLibType] = useState<LibraryItemType>('YARN')

  useEffect(() => {
    libraryApi.getAll().then(setLibraryItems)
  }, [])

  const q = search.toLowerCase()
  const filtered = libraryItems.filter(i => {
    if (filterType && i.itemType !== filterType) return false
    if (!q) return true
    return [i.name, i.yarnBrand, i.yarnMaterial, i.needleSizeMm, i.hookSizeMm].some(v => v?.toLowerCase().includes(q))
  })

  const typeLabel = (type: LibraryItemType) => {
    if (type === 'YARN') return t('lib_yarn')
    if (type === 'FABRIC') return t('lib_fabric')
    if (type === 'KNITTING_NEEDLE') return t('lib_knitting_needle')
    if (type === 'CROCHET_HOOK') return t('lib_crochet_hook')
    return type
  }

  const itemSummary = (item: LibraryItem) => {
    if (item.itemType === 'YARN') {
      const parts = [item.yarnBrand, item.yarnMaterial].filter(Boolean).join(', ')
      const amounts = [item.yarnAmountG && `${item.yarnAmountG}g`, item.yarnAmountM && `${item.yarnAmountM}m`].filter(Boolean).join(' / ')
      return [parts, amounts].filter(Boolean).join(' · ')
    }
    if (item.itemType === 'FABRIC')
      return [item.fabricLengthCm && `${item.fabricLengthCm}cm`, item.fabricWidthCm && `${item.fabricWidthCm}cm`].filter(Boolean).join(' × ')
    if (item.itemType === 'KNITTING_NEEDLE')
      return [item.needleSizeMm && `${item.needleSizeMm} mm`, item.circularLengthCm && `${item.circularLengthCm} cm`].filter(Boolean).join(', ')
    if (item.itemType === 'CROCHET_HOOK')
      return item.hookSizeMm ? `${item.hookSizeMm} mm` : ''
    return ''
  }

  async function addFromLibrary(item: LibraryItem) {
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
    setSaving(true)
    try {
      const updated = await projectsApi.addMaterial(projectId, { type, color: '', colorHex: '#C6D8B8', amount, unit })
      onUpdate(updated)
    } finally { setSaving(false) }
  }

  function handleLibItemCreated(item: LibraryItem) {
    setLibraryItems(prev => [item, ...prev])
    setCreatingInLib(false)
  }

  return (
    <div className="space-y-3">
      {project.materials.length === 0 && (
        <p className="text-sm text-warm-gray text-center py-2">{t('no_materials_yet')}</p>
      )}
      {project.materials.map(m => (
        <div key={m.id} className="card flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white shadow-sm flex-shrink-0" style={{ backgroundColor: m.colorHex }} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-800">{m.type}</p>
            {(m.amount || m.unit) && (
              <p className="text-xs text-warm-gray">{m.amount}{m.amount && m.unit ? ` ${m.unit}` : ''}</p>
            )}
          </div>
          <button
            onClick={async () => onUpdate(await projectsApi.deleteMaterial(projectId, m.id))}
            className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none"
          >×</button>
        </div>
      ))}

      {/* Library picker */}
      <div className="card space-y-2.5">
        <h4 className="text-xs font-semibold text-sand-blue-deep uppercase tracking-wider">{t('add_from_library')}</h4>
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === null ? 'bg-sand-blue text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'}`}
          >{t('lib_all')}</button>
          {ITEM_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === type ? 'bg-sand-blue text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'}`}
            >
              <span>{TYPE_ICONS[type]}</span>
              <span>{typeLabel(type)}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="input text-sm py-2 w-full"
          placeholder={t('lib_search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-warm-gray text-center py-3">{t('library_empty')}</p>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                disabled={saving}
                onClick={() => addFromLibrary(item)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-sand-green/20 transition-colors text-left"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-soft-brown/20 flex items-center justify-center flex-shrink-0 text-base">
                    {TYPE_ICONS[item.itemType]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  {itemSummary(item) && <p className="text-xs text-warm-gray truncate">{itemSummary(item)}</p>}
                </div>
                <span className="text-xs text-sand-blue-deep flex-shrink-0">+</span>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-soft-brown/20 pt-2.5">
          {creatingInLib ? (
            <QuickAddLibraryForm
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
                onClick={() => setCreatingInLib(true)}
                className="text-sand-blue-deep underline hover:no-underline font-medium"
              >{t('lib_create_new')}</button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quick Add Library Item (inline from project) ───────────────
function QuickAddLibraryForm({ selectedType, onTypeChange, onCreated, onCancel }: {
  selectedType: LibraryItemType
  onTypeChange: (t: LibraryItemType) => void
  onCreated: (item: LibraryItem) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [yarnBrand, setYarnBrand] = useState('')
  const [yarnMaterial, setYarnMaterial] = useState('')
  const [yarnAmountG, setYarnAmountG] = useState('')
  const [yarnAmountM, setYarnAmountM] = useState('')
  const [fabricLength, setFabricLength] = useState('')
  const [fabricWidth, setFabricWidth] = useState('')
  const [needleSize, setNeedleSize] = useState('')
  const [circularLength, setCircularLength] = useState('')
  const [hookSize, setHookSize] = useState('')

  const typeLabel = (type: LibraryItemType) => {
    if (type === 'YARN') return t('lib_yarn')
    if (type === 'FABRIC') return t('lib_fabric')
    if (type === 'KNITTING_NEEDLE') return t('lib_knitting_needle')
    if (type === 'CROCHET_HOOK') return t('lib_crochet_hook')
    return type
  }

  function autoName() {
    if (selectedType === 'KNITTING_NEEDLE' && needleSize) return `${needleSize} mm strikkepinne`
    if (selectedType === 'CROCHET_HOOK' && hookSize) return `${hookSize} mm heklenål`
    if (selectedType === 'YARN') return [yarnBrand, yarnMaterial].filter(Boolean).join(' ') || 'Garn'
    if (selectedType === 'FABRIC') return 'Stoff'
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const item = await libraryApi.create({
        itemType: selectedType,
        name: name.trim() || autoName(),
        yarnBrand: selectedType === 'YARN' ? yarnBrand || undefined : undefined,
        yarnMaterial: selectedType === 'YARN' ? yarnMaterial || undefined : undefined,
        yarnAmountG: selectedType === 'YARN' && yarnAmountG ? parseInt(yarnAmountG) : undefined,
        yarnAmountM: selectedType === 'YARN' && yarnAmountM ? parseInt(yarnAmountM) : undefined,
        fabricLengthCm: selectedType === 'FABRIC' && fabricLength ? parseInt(fabricLength) : undefined,
        fabricWidthCm: selectedType === 'FABRIC' && fabricWidth ? parseInt(fabricWidth) : undefined,
        needleSizeMm: selectedType === 'KNITTING_NEEDLE' ? needleSize || undefined : undefined,
        circularLengthCm: selectedType === 'KNITTING_NEEDLE' && circularLength ? parseInt(circularLength) : undefined,
        hookSizeMm: selectedType === 'CROCHET_HOOK' ? hookSize || undefined : undefined,
      })
      onCreated(item)
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div className="flex gap-1.5 flex-wrap">
        {ITEM_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange(type)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${selectedType === type ? 'bg-sand-green text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'}`}
          >
            <span>{TYPE_ICONS[type]}</span>
            <span>{typeLabel(type)}</span>
          </button>
        ))}
      </div>
      {selectedType === 'YARN' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('lib_yarn_brand')}>
            <input className="input text-sm py-1.5" value={yarnBrand} onChange={e => setYarnBrand(e.target.value)} placeholder="Sandnes Garn" />
          </Field>
          <Field label={t('lib_yarn_material')}>
            <input className="input text-sm py-1.5" value={yarnMaterial} onChange={e => setYarnMaterial(e.target.value)} placeholder="Ull..." />
          </Field>
          <Field label={t('lib_yarn_amount_g')}>
            <input type="number" className="input text-sm py-1.5" value={yarnAmountG} onChange={e => setYarnAmountG(e.target.value)} placeholder="100" />
          </Field>
          <Field label={t('lib_yarn_amount_m')}>
            <input type="number" className="input text-sm py-1.5" value={yarnAmountM} onChange={e => setYarnAmountM(e.target.value)} placeholder="200" />
          </Field>
        </div>
      )}
      {selectedType === 'FABRIC' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('lib_fabric_length')}>
            <input type="number" className="input text-sm py-1.5" value={fabricLength} onChange={e => setFabricLength(e.target.value)} placeholder="150" />
          </Field>
          <Field label={t('lib_fabric_width')}>
            <input type="number" className="input text-sm py-1.5" value={fabricWidth} onChange={e => setFabricWidth(e.target.value)} placeholder="140" />
          </Field>
        </div>
      )}
      {selectedType === 'KNITTING_NEEDLE' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('lib_needle_size')}>
            <input className="input text-sm py-1.5" value={needleSize} onChange={e => setNeedleSize(e.target.value)} placeholder="4.5" />
          </Field>
          <Field label={t('lib_circular_length')}>
            <input type="number" className="input text-sm py-1.5" value={circularLength} onChange={e => setCircularLength(e.target.value)} placeholder="80" />
          </Field>
        </div>
      )}
      {selectedType === 'CROCHET_HOOK' && (
        <Field label={t('lib_hook_size')}>
          <input className="input text-sm py-1.5" value={hookSize} onChange={e => setHookSize(e.target.value)} placeholder="5.0" />
        </Field>
      )}
      <Field label={`${t('lib_name')} (valgfritt)`}>
        <input className="input text-sm py-1.5" value={name} onChange={e => setName(e.target.value)} placeholder={autoName() || t('lib_name')} />
      </Field>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm flex-1">
          {saving ? t('saving') : t('lib_add_item')}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">{t('cancel')}</button>
      </div>
    </form>
  )
}

// ── Recipe Tab ─────────────────────────────────────────────────
function RecipeTab({ recipeText, files, projectId, onUpdate, onRecipeChange }: {
  recipeText: string; files: ProjectFile[]; projectId: number
  onUpdate: (p: Project) => void; onRecipeChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const updated = await projectsApi.uploadFile(projectId, file)
      onUpdate(updated)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const fileIcon = (ft: string) =>
    ({ image: '🖼️', pdf: '📄', word: '📝', other: '📎' } as Record<string, string>)[ft] ?? '📎'

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
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {files.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-soft-brown/30 rounded-xl">
            <p className="text-sm text-warm-gray">{t('no_files_yet')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => {
              const url = `/api/files/${projectId}/${f.storedName}`
              return (
                <div key={f.id} className="card flex items-center gap-3">
                  {f.fileType === 'image' ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={f.originalName} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    </a>
                  ) : (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-2xl flex-shrink-0">
                      {fileIcon(f.fileType)}
                    </a>
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-800 hover:text-sand-green-dark truncate block">
                      {f.originalName}
                    </a>
                    <p className="text-xs text-warm-gray capitalize">{f.fileType}</p>
                  </div>
                  <button
                    onClick={async () => onUpdate(await projectsApi.deleteFile(projectId, f.id))}
                    className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none flex-shrink-0"
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Knit Tab (Pattern + Counter together) ─────────────────────
function KnitTab({ project, projectId, onUpdate }: {
  project: Project; projectId: number; onUpdate: (p: Project) => void
}) {
  const { t } = useTranslation()
  const hasCounter = !!project.rowCounter
  const hasGrid = !!project.patternGrid
  const sideBySide = hasCounter && hasGrid

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

  const gridWidget = hasGrid && (
    <PatternGridWidget
      rows={project.patternGrid!.rows}
      cols={project.patternGrid!.cols}
      cellDataJson={project.patternGrid!.cellData}
      onSave={async (cells, r, c) =>
        onUpdate(await projectsApi.updatePatternGrid(projectId, {
          rows: r, cols: c, cellData: JSON.stringify(cells)
        }))
      }
    />
  )

  if (sideBySide) {
    return (
      <div className="flex gap-0 items-start min-h-0">
        <div className="flex-1 min-w-0 overflow-x-auto pr-3">
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2 sticky left-0">{t('round_counter')}</h3>
          {counterWidget}
        </div>
        <div className="w-px self-stretch bg-sand-blue/30 flex-shrink-0" />
        <div className="flex-1 min-w-0 overflow-x-auto pl-3">
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2 sticky left-0">{t('pattern_grid')}</h3>
          {gridWidget}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasCounter && (
        <div>
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2">{t('round_counter')}</h3>
          {counterWidget}
        </div>
      )}
      {hasGrid && (
        <div>
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2">{t('pattern_grid')}</h3>
          {gridWidget}
        </div>
      )}
    </div>
  )
}

// ── Overview Tab ───────────────────────────────────────────────
function OverviewTab({ project, name, description, recipeText, craftDetails, projectId }: {
  project: Project; name: string; description: string; recipeText: string
  craftDetails: Record<string, string>; projectId: number
}) {
  const { t } = useTranslation()
  const fileIcon = (ft: string) =>
    ({ image: '🖼️', pdf: '📄', word: '📝', other: '📎' } as Record<string, string>)[ft] ?? '📎'

  async function downloadOverview() {
    const [{ pdf }, { ProjectOverviewPdf }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('./ProjectPdf'),
    ])

    const craftFields = CRAFT_FIELDS_KEYS[project.category] ?? []
    const filledCraftFields = craftFields
      .filter(f => craftDetails[f.key]?.trim())
      .map(f => ({ key: f.key, label: t(f.labelKey as Parameters<typeof t>[0]) }))

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

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={downloadOverview} className="btn-secondary text-sm flex items-center gap-2">
          <span>↓</span> {t('download_overview')}
        </button>
      </div>
      <Section title={t('section_info')}>
        <h3 className="font-semibold text-gray-800 text-base">{name}</h3>
        {description && <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{description}</p>}
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
            <div className="space-y-2">
              {project.materials.map(m => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full shadow-sm border border-white flex-shrink-0" style={{ backgroundColor: m.colorHex }} />
                  <span className="text-sm text-gray-700">
                    {m.type}{m.color ? ` — ${m.color}` : ''}{m.amount ? ` (${m.amount}${m.unit ? ` ${m.unit}` : ''})` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {(recipeText || project.files.length > 0) && (
        <Section title={t('section_recipe')}>
          {project.files.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {project.files.map(f => {
                const url = `/api/files/${projectId}/${f.storedName}`
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

      {project.category !== 'SEWING' && project.patternGrid && (
        <Section title={t('section_pattern_grid')}>
          <PatternGridReadOnly
            rows={project.patternGrid.rows}
            cols={project.patternGrid.cols}
            cellDataJson={project.patternGrid.cellData}
          />
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
  const [spr, setSpr] = useState(counter.stitchesPerRound)
  const [rounds, setRounds] = useState(counter.totalRounds)
  const [checked, setChecked] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(counter.checkedStitches) as number[]) } catch { return new Set() }
  })
  const [configured, setConfigured] = useState(counter.stitchesPerRound > 0 && counter.totalRounds > 0)
  const [editSpr, setEditSpr] = useState(counter.stitchesPerRound || 8)
  const [editRounds, setEditRounds] = useState(counter.totalRounds || 10)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSpr(counter.stitchesPerRound)
    setRounds(counter.totalRounds)
    try { setChecked(new Set(JSON.parse(counter.checkedStitches) as number[])) } catch { setChecked(new Set()) }
    setConfigured(counter.stitchesPerRound > 0 && counter.totalRounds > 0)
    setEditSpr(counter.stitchesPerRound || 8)
    setEditRounds(counter.totalRounds || 10)
  }, [counter.stitchesPerRound, counter.totalRounds, counter.checkedStitches])

  function toggleStitch(idx: number) {
    const next = new Set(checked)
    if (next.has(idx)) next.delete(idx); else next.add(idx)
    setChecked(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onSave(spr, rounds, Array.from(next)), 400)
  }

  function handleConfigure() {
    setSpr(editSpr); setRounds(editRounds)
    const empty = new Set<number>()
    setChecked(empty)
    setConfigured(true)
    onSave(editSpr, editRounds, [])
  }

  function handleReset() {
    const empty = new Set<number>()
    setChecked(empty)
    onSave(spr, rounds, [])
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
    </div>
  )
}

// ── Pattern Grid Widget ────────────────────────────────────────
function PatternGridWidget({ rows: initRows, cols: initCols, cellDataJson, onSave }: {
  rows: number; cols: number; cellDataJson: string
  onSave: (cells: PatternCell[], rows: number, cols: number) => void
}) {
  const { t } = useTranslation()
  const [rows, setRows] = useState(initRows)
  const [cols, setCols] = useState(initCols)
  const [cells, setCells] = useState<PatternCell[]>(() => {
    try { return JSON.parse(cellDataJson) } catch { return [] }
  })
  const [selectedColor, setSelectedColor] = useState('#C6D8B8')
  const [mode, setMode] = useState<'color' | 'erase'>('color')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cellMap = new Map(cells.map(c => [`${c.row},${c.col}`, c]))

  function autoSave(newCells: PatternCell[], r: number, c: number) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onSave(newCells, r, c), 600)
  }

  function handleCell(row: number, col: number) {
    let next: PatternCell[]
    if (mode === 'erase') {
      next = cells.filter(c => !(c.row === row && c.col === col))
    } else {
      next = cells.filter(c => !(c.row === row && c.col === col))
      next.push({ row, col, color: selectedColor, symbol: '' })
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

  return (
    <div className="space-y-3">
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

      <div className="overflow-auto">
        <div
          className="inline-grid gap-px bg-soft-brown/20 border border-soft-brown/20 rounded-lg p-px"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const cell = cellMap.get(`${r},${c}`)
              return (
                <button key={`${r}-${c}`} onClick={() => handleCell(r, c)}
                  className="w-7 h-7 hover:opacity-75 transition-opacity"
                  style={{ backgroundColor: cell?.color ?? '#F5F0E8' }} />
              )
            })
          )}
        </div>
      </div>

      <p className="text-xs text-warm-gray">{t('auto_saving_grid')}</p>
    </div>
  )
}

// ── Read-only Pattern Grid ─────────────────────────────────────
function PatternGridReadOnly({ rows, cols, cellDataJson }: {
  rows: number; cols: number; cellDataJson: string
}) {
  const cells: PatternCell[] = (() => { try { return JSON.parse(cellDataJson) } catch { return [] } })()
  const cellMap = new Map(cells.map(c => [`${c.row},${c.col}`, c]))

  return (
    <div className="overflow-auto">
      <div
        className="inline-grid gap-px bg-soft-brown/20 border border-sand-blue/20 rounded-lg p-px"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const cell = cellMap.get(`${r},${c}`)
            return <div key={`${r}-${c}`} className="w-7 h-7" style={{ backgroundColor: cell?.color ?? '#F5F0E8' }} />
          })
        )}
      </div>
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
