import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi, fileUrl } from '../api'
import type { Project, PatternCell, ProjectCategory, ProjectFile } from '../types'

const CRAFT_FIELDS_KEYS: Record<string, { key: string; labelKey: string }[]> = {
  KNITTING: [
    { key: 'needleSize', labelKey: 'needle_size' },
    { key: 'circularNeedleLength', labelKey: 'circular_needle_length' },
    { key: 'gauge', labelKey: 'gauge' },
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

  const knitTabLabel = (cat: ProjectCategory) => {
    if (cat === 'KNITTING') return t('tab_knit')
    if (cat === 'CROCHET') return t('tab_crochet')
    return t('tab_sew')
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'info', label: t('tab_info'), icon: '📝' },
    { id: 'materials', label: t('tab_materials'), icon: '🧶' },
    { id: 'recipe', label: t('tab_recipe'), icon: '📖' },
    { id: 'knit', label: knitTabLabel(project.category), icon: project.category === 'SEWING' ? '✂️' : '✦' },
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
        <MaterialsTab
          project={project} projectId={projectId} onUpdate={setProject}
          craftDetails={craftDetails} onCraftDetailChange={handleCraftDetailChange}
        />
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

      {tab === 'knit' && (
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
function MaterialsTab({ project, projectId, onUpdate, craftDetails, onCraftDetailChange }: {
  project: Project; projectId: number; onUpdate: (p: Project) => void
  craftDetails: Record<string, string>; onCraftDetailChange: (key: string, val: string) => void
}) {
  const { t } = useTranslation()
  const [matType, setMatType] = useState('')
  const [matColor, setMatColor] = useState('')
  const [matColorHex, setMatColorHex] = useState('#C6D8B8')
  const [matAmount, setMatAmount] = useState('')
  const [matUnit, setMatUnit] = useState('g')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!matType.trim()) return
    setSaving(true)
    try {
      const updated = await projectsApi.addMaterial(projectId, {
        type: matType.trim(), color: matColor, colorHex: matColorHex, amount: matAmount, unit: matUnit,
      })
      onUpdate(updated)
      setMatType(''); setMatColor(''); setMatColorHex('#C6D8B8'); setMatAmount(''); setMatUnit('g')
      setAdding(false)
    } finally { setSaving(false) }
  }

  const craftFields = CRAFT_FIELDS_KEYS[project.category] ?? []

  return (
    <div className="space-y-3">
      <div className="card space-y-3">
        <h4 className="text-xs font-semibold text-sand-blue-deep uppercase tracking-wider">{t('details_heading')}</h4>
        <div className="grid grid-cols-2 gap-3">
          {craftFields.map(({ key, labelKey }) => (
            <Field key={key} label={t(labelKey as Parameters<typeof t>[0])}>
              <input
                className="input text-sm py-2"
                value={craftDetails[key] ?? ''}
                onChange={e => onCraftDetailChange(key, e.target.value)}
                placeholder={t(labelKey as Parameters<typeof t>[0])}
              />
            </Field>
          ))}
        </div>
      </div>

      {project.materials.length === 0 && !adding && (
        <p className="text-sm text-warm-gray text-center py-4">{t('no_materials_yet')}</p>
      )}
      {project.materials.map(m => (
        <div key={m.id} className="card flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white shadow-sm flex-shrink-0" style={{ backgroundColor: m.colorHex }} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-800">{m.type}</p>
            <p className="text-xs text-warm-gray">
              {m.color}{m.color && m.amount ? ' · ' : ''}{m.amount}{m.amount ? ` ${m.unit}` : ''}
            </p>
          </div>
          <button
            onClick={async () => onUpdate(await projectsApi.deleteMaterial(projectId, m.id))}
            className="text-warm-gray hover:text-red-400 text-xl px-1 leading-none"
          >×</button>
        </div>
      ))}
      {adding ? (
        <form onSubmit={handleAdd} className="card space-y-3">
          <h4 className="font-medium text-sm text-gray-800">{t('add_material_heading')}</h4>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('type_label')}>
              <input className="input text-sm py-2" value={matType} onChange={e => setMatType(e.target.value)} placeholder={t('type_placeholder')} />
            </Field>
            <Field label={t('color_name_label')}>
              <input className="input text-sm py-2" value={matColor} onChange={e => setMatColor(e.target.value)} placeholder={t('color_name_placeholder')} />
            </Field>
            <Field label={t('amount_label')}>
              <input className="input text-sm py-2" value={matAmount} onChange={e => setMatAmount(e.target.value)} placeholder="100" />
            </Field>
            <Field label={t('unit_label')}>
              <select className="select text-sm py-2" value={matUnit} onChange={e => setMatUnit(e.target.value)}>
                <option value="g">{t('unit_g')}</option>
                <option value="m">{t('unit_m')}</option>
                <option value="yards">{t('unit_yards')}</option>
                <option value="skeins">{t('unit_skeins')}</option>
              </select>
            </Field>
          </div>
          <Field label={t('color_label')}>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {PALETTE.map(c => (
                <button key={c} type="button" onClick={() => setMatColorHex(c)}
                  className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${matColorHex === c ? 'border-gray-700 scale-110' : 'border-white shadow-sm'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={matColorHex} onChange={e => setMatColorHex(e.target.value)} className="w-6 h-6 rounded-full cursor-pointer border-0" />
            </div>
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm flex-1">{saving ? t('adding') : t('add')}</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost text-sm">{t('cancel')}</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-secondary w-full text-sm">{t('add_material_btn')}</button>
      )}
    </div>
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
              const url = fileUrl(projectId, f.storedName)
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
  const hasGrid = project.category !== 'SEWING' && !!project.patternGrid
  const sideBySide = hasCounter && hasGrid

  const counterLabel = project.category === 'SEWING' ? t('progress_counter') : t('stitch_counter')
  const gridLabel = t('pattern_grid')

  const counterWidget = hasCounter && (
    <StitchCounterWidget
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
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2 sticky left-0">{counterLabel}</h3>
          {counterWidget}
        </div>
        <div className="w-px self-stretch bg-sand-blue/30 flex-shrink-0" />
        <div className="flex-1 min-w-0 overflow-x-auto pl-3">
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2 sticky left-0">{gridLabel}</h3>
          {gridWidget}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasCounter && (
        <div>
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2">{counterLabel}</h3>
          {counterWidget}
        </div>
      )}
      {hasGrid && (
        <div>
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2">{gridLabel}</h3>
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
          stitchCounter: t('section_stitch_counter'),
          patternGrid: t('section_pattern_grid'),
        }}
      />
    )

    const blob = await pdf(doc).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/[^a-z0-9æøåÆØÅ]/gi, '_')}_stitchbook.pdf`
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
                    {m.type}{m.color ? ` — ${m.color}` : ''}{m.amount ? ` (${m.amount} ${m.unit})` : ''}
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

      {project.rowCounter && (
        <Section title={t('section_stitch_counter')}>
          <StitchCounterReadOnly counter={project.rowCounter} />
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

// ── Stitch Counter Widget ──────────────────────────────────────
function StitchCounterWidget({ counter, onSave }: {
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
          <Field label={t('stitches_per_round')}>
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
        <span className="text-warm-gray">{t('rounds_stitches', { completedRounds, rounds, done: doneCount, total: totalStitches })}</span>
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

  function applyResize() {
    const trimmed = cells.filter(c => c.row < rows && c.col < cols)
    setCells(trimmed)
    onSave(trimmed, rows, cols)
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
        <input type="number" value={rows} min={1} max={50} onChange={e => setRows(parseInt(e.target.value) || 1)}
          className="input py-1 px-2 text-xs w-14" />
        <span className="text-warm-gray">{t('cols_label')}</span>
        <input type="number" value={cols} min={1} max={50} onChange={e => setCols(parseInt(e.target.value) || 1)}
          className="input py-1 px-2 text-xs w-14" />
        <button onClick={applyResize} className="btn-ghost text-xs py-1 px-2 border border-soft-brown/30 rounded-lg">{t('apply')}</button>
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

// ── Read-only Overview Widgets ─────────────────────────────────
function StitchCounterReadOnly({ counter }: {
  counter: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }
}) {
  const { t } = useTranslation()
  const spr = counter.stitchesPerRound
  const rounds = counter.totalRounds
  const checked: Set<number> = (() => {
    try { return new Set(JSON.parse(counter.checkedStitches) as number[]) } catch { return new Set() }
  })()
  const totalStitches = spr * rounds
  const doneCount = checked.size
  const completedRounds = Array.from({ length: rounds }, (_, r) =>
    Array.from({ length: spr }, (_, s) => r * spr + s).every(i => checked.has(i))
  ).filter(Boolean).length
  const progress = totalStitches > 0 ? Math.round((doneCount / totalStitches) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-warm-gray">{t('rounds_stitches', { completedRounds, rounds, done: doneCount, total: totalStitches })}</span>
        <span className="text-warm-gray text-xs">{progress}%</span>
      </div>
      <div className="w-full bg-soft-brown/30 rounded-full h-1.5">
        <div className="bg-sand-blue-medium h-1.5 rounded-full" style={{ width: `${progress}%` }} />
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block">
          {Array.from({ length: rounds }, (_, r) => {
            const rowComplete = Array.from({ length: spr }, (_, s) => checked.has(r * spr + s)).every(Boolean)
            return (
              <div key={r} className="flex items-center gap-1 mb-1">
                <span className={`text-xs w-7 text-right flex-shrink-0 font-mono ${rowComplete ? 'text-sand-blue-deep font-bold' : 'text-warm-gray'}`}>
                  {r + 1}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: spr }, (_, s) => {
                    const idx = r * spr + s
                    const done = checked.has(idx)
                    return (
                      <div
                        key={s}
                        className={`w-7 h-7 rounded border text-xs font-bold flex items-center justify-center ${
                          done
                            ? 'bg-sand-blue border-sand-blue-medium text-gray-700'
                            : 'bg-white border-soft-brown/40 text-transparent'
                        }`}
                      >{done ? '✓' : ''}</div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

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
