import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { projectsApi, fileUrl } from '../api'
import type { Project, PatternCell, ProjectCategory, ProjectFile } from '../types'

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  KNITTING: 'Knitting', CROCHET: 'Crochet', SEWING: 'Sewing',
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
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('info')
  const projectId = parseInt(id!)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [recipeText, setRecipeText] = useState('')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    projectsApi.getOne(projectId).then(p => {
      setProject(p)
      setName(p.name)
      setDescription(p.description)
      setNotes(p.notes)
      setTags(p.tags)
      setRecipeText(p.recipeText)
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

  async function handleDelete() {
    if (!confirm(`Delete "${project?.name}"? This cannot be undone.`)) return
    await projectsApi.delete(projectId)
    navigate('/')
  }

  if (loading) return <div className="text-center py-20 text-warm-gray">Loading...</div>
  if (!project) return <div className="text-center py-20 text-warm-gray">Project not found</div>

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'info', label: 'Info', icon: '📝' },
    { id: 'materials', label: 'Materials', icon: '🧶' },
    { id: 'recipe', label: 'Recipe', icon: '📖' },
    { id: 'knit', label: 'Knit', icon: '✦' },
    { id: 'overview', label: 'Overview', icon: '⊞' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 px-2">←</button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 truncate">{project.name}</h2>
          <span className="text-xs text-warm-gray">{CATEGORY_LABELS[project.category]}</span>
        </div>
        <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600 px-2 py-1">Delete</button>
      </div>

      <div className="flex gap-1 bg-sand-blue/20 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-white shadow-sm text-gray-800' : 'text-warm-gray hover:text-gray-700'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-4">
          <Field label="Name">
            <input className="input" value={name} onChange={e => handleInfoChange('name', e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea className="textarea" rows={2} value={description} onChange={e => handleInfoChange('description', e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea className="textarea" rows={5} value={notes} onChange={e => handleInfoChange('notes', e.target.value)} placeholder="Any notes about your project..." />
          </Field>
          <Field label="Tags">
            <input className="input" value={tags} onChange={e => handleInfoChange('tags', e.target.value)} placeholder="winter, gift (comma-separated)" />
          </Field>
          <p className="text-xs text-warm-gray text-right">Auto-saving...</p>
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

      {tab === 'knit' && (
        <KnitTab project={project} projectId={projectId} onUpdate={setProject} />
      )}

      {tab === 'overview' && (
        <OverviewTab
          project={project}
          name={name} description={description} notes={notes} tags={tags} recipeText={recipeText}
          projectId={projectId}
          onUpdate={setProject}
        />
      )}
    </div>
  )
}

// ── Materials Tab ──────────────────────────────────────────────
function MaterialsTab({ project, projectId, onUpdate }: {
  project: Project; projectId: number; onUpdate: (p: Project) => void
}) {
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

  return (
    <div className="space-y-3">
      {project.materials.length === 0 && !adding && (
        <p className="text-sm text-warm-gray text-center py-4">No materials added yet.</p>
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
          <h4 className="font-medium text-sm text-gray-800">Add Material</h4>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type *">
              <input className="input text-sm py-2" value={matType} onChange={e => setMatType(e.target.value)} placeholder="Yarn, Fabric..." />
            </Field>
            <Field label="Color name">
              <input className="input text-sm py-2" value={matColor} onChange={e => setMatColor(e.target.value)} placeholder="Sage green" />
            </Field>
            <Field label="Amount">
              <input className="input text-sm py-2" value={matAmount} onChange={e => setMatAmount(e.target.value)} placeholder="100" />
            </Field>
            <Field label="Unit">
              <select className="select text-sm py-2" value={matUnit} onChange={e => setMatUnit(e.target.value)}>
                <option value="g">g</option>
                <option value="m">m</option>
                <option value="yards">yards</option>
                <option value="skeins">skeins</option>
              </select>
            </Field>
          </div>
          <Field label="Color">
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
            <button type="submit" disabled={saving} className="btn-primary text-sm flex-1">{saving ? 'Adding...' : 'Add'}</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-secondary w-full text-sm">+ Add Material</button>
      )}
    </div>
  )
}

// ── Recipe Tab ─────────────────────────────────────────────────
function RecipeTab({ recipeText, files, projectId, onUpdate, onRecipeChange }: {
  recipeText: string; files: ProjectFile[]; projectId: number
  onUpdate: (p: Project) => void; onRecipeChange: (v: string) => void
}) {
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
      <Field label="Recipe / Pattern Instructions">
        <textarea
          className="textarea"
          rows={10}
          value={recipeText}
          onChange={e => onRecipeChange(e.target.value)}
          placeholder="Write your recipe, pattern instructions, or notes here..."
        />
      </Field>
      <p className="text-xs text-warm-gray text-right -mt-2">Auto-saving...</p>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Attachments</span>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {uploading ? 'Uploading...' : '+ Upload file'}
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
            <p className="text-sm text-warm-gray">No files yet. Upload a PDF, Word doc, or image.</p>
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
  const hasCounter = !!project.rowCounter
  const hasGrid = project.category !== 'SEWING' && !!project.patternGrid
  const sideBySide = hasCounter && hasGrid

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
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2 sticky left-0">Stitch Counter</h3>
          {counterWidget}
        </div>
        <div className="w-px self-stretch bg-sand-blue/30 flex-shrink-0" />
        <div className="flex-1 min-w-0 overflow-x-auto pl-3">
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2 sticky left-0">Pattern Grid</h3>
          {gridWidget}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasCounter && (
        <div>
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2">Stitch Counter</h3>
          {counterWidget}
        </div>
      )}
      {hasGrid && (
        <div>
          <h3 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-2">Pattern Grid</h3>
          {gridWidget}
        </div>
      )}
    </div>
  )
}

// ── Overview Tab ───────────────────────────────────────────────
function OverviewTab({ project, name, description, notes, tags, recipeText, projectId, onUpdate }: {
  project: Project; name: string; description: string; notes: string; tags: string; recipeText: string
  projectId: number; onUpdate: (p: Project) => void
}) {
  const fileIcon = (ft: string) =>
    ({ image: '🖼️', pdf: '📄', word: '📝', other: '📎' } as Record<string, string>)[ft] ?? '📎'

  function downloadOverview() {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const materialsHtml = project.materials.length > 0 ? `
      <section>
        <h2>Materials</h2>
        ${project.materials.map(m => `
          <div class="material">
            <span class="swatch" style="background:${m.colorHex}"></span>
            <span>${esc(m.type)}${m.color ? ` — ${esc(m.color)}` : ''}${m.amount ? ` (${esc(m.amount)} ${esc(m.unit)})` : ''}</span>
          </div>`).join('')}
      </section>` : ''

    const filesHtml = project.files.map(f => {
      const url = fileUrl(projectId, f.storedName)
      return f.fileType === 'image'
        ? `<img src="${url}" alt="${esc(f.originalName)}" class="attachment-img">`
        : `<a href="${url}" class="attachment-link">${esc(f.originalName)}</a>`
    }).join('')

    const recipeHtml = (recipeText || project.files.length > 0) ? `
      <section>
        <h2>Recipe</h2>
        ${filesHtml ? `<div class="attachments">${filesHtml}</div>` : ''}
        ${recipeText ? `<p class="pretext">${esc(recipeText)}</p>` : ''}
      </section>` : ''

    const counterHtml = (() => {
      if (!project.rowCounter) return ''
      const { stitchesPerRound: spr, totalRounds: rounds, checkedStitches } = project.rowCounter
      const checked: Set<number> = (() => { try { return new Set(JSON.parse(checkedStitches) as number[]) } catch { return new Set() } })()
      const total = spr * rounds
      const done = checked.size
      const completedRounds = Array.from({ length: rounds }, (_, r) =>
        Array.from({ length: spr }, (_, s) => r * spr + s).every(i => checked.has(i))
      ).filter(Boolean).length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const rows = Array.from({ length: rounds }, (_, r) => {
        const rowDone = Array.from({ length: spr }, (_, s) => checked.has(r * spr + s)).every(Boolean)
        const cells = Array.from({ length: spr }, (_, s) => {
          const idx = r * spr + s
          return `<td class="${checked.has(idx) ? 'done' : ''}">${checked.has(idx) ? '✓' : ''}</td>`
        }).join('')
        return `<tr><td class="rnum${rowDone ? ' rowdone' : ''}">${r + 1}</td>${cells}</tr>`
      }).join('')
      return `
      <section>
        <h2>Stitch Counter</h2>
        <p class="counter-stats">${completedRounds} / ${rounds} rounds &middot; ${done} / ${total} stitches &middot; ${pct}%</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <table class="stitch-grid"><tbody>${rows}</tbody></table>
      </section>`
    })()

    const gridHtml = (() => {
      if (project.category === 'SEWING' || !project.patternGrid) return ''
      const { rows, cols, cellData } = project.patternGrid
      const cells: PatternCell[] = (() => { try { return JSON.parse(cellData) } catch { return [] } })()
      const cellMap = new Map(cells.map(c => [`${c.row},${c.col}`, c.color]))
      const tableRows = Array.from({ length: rows }, (_, r) =>
        `<tr>${Array.from({ length: cols }, (_, c) =>
          `<td style="background:${cellMap.get(`${r},${c}`) ?? '#F5F0E8'}"></td>`
        ).join('')}</tr>`
      ).join('')
      return `
      <section>
        <h2>Pattern Grid</h2>
        <table class="pattern-grid"><tbody>${tableRows}</tbody></table>
      </section>`
    })()

    const tagList = tags ? tags.split(',').filter(Boolean).map(t =>
      `<span class="tag">${esc(t.trim())}</span>`).join('') : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(name)} — Stitchbook</title>
  <style>
    body{font-family:Georgia,serif;max-width:820px;margin:48px auto;padding:0 24px;color:#333;background:#fff}
    h1{font-size:2em;margin:0 0 4px}
    .meta{color:#888;font-size:.9em;margin-bottom:28px}
    section{margin-bottom:36px}
    h2{font-size:.8em;text-transform:uppercase;letter-spacing:.1em;color:#6FA8BC;border-bottom:1px solid #d6ebf2;padding-bottom:6px;margin-bottom:14px}
    p{line-height:1.7;margin:0 0 10px}
    .pretext{white-space:pre-wrap}
    .tag{display:inline-block;background:#e8f5f8;border-radius:12px;padding:2px 10px;font-size:.78em;margin:2px;color:#555}
    .material{display:flex;align-items:center;gap:10px;margin-bottom:7px;font-size:.95em}
    .swatch{width:16px;height:16px;border-radius:50%;border:1px solid #ccc;flex-shrink:0;display:inline-block}
    .attachments{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
    .attachment-img{max-width:180px;max-height:180px;object-fit:cover;border-radius:8px;border:1px solid #e0e0e0}
    .attachment-link{display:inline-block;padding:6px 14px;background:#f0f6f8;border:1px solid #c8e0ea;border-radius:6px;text-decoration:none;color:#3a6e80;font-size:.9em}
    .counter-stats{font-size:.9em;color:#666;margin-bottom:8px}
    .progress-bar{width:100%;background:#e8e8e8;border-radius:4px;height:8px;margin-bottom:14px}
    .progress-fill{background:#A8CEDA;height:8px;border-radius:4px}
    table.stitch-grid{border-collapse:collapse;font-size:.75em}
    table.stitch-grid td{width:22px;height:22px;text-align:center;border:1px solid #ddd;color:#999}
    table.stitch-grid td.done{background:#BFD8E0;color:#3a6e80;font-weight:bold}
    table.stitch-grid td.rnum{background:none;border:none;text-align:right;padding-right:6px;color:#aaa;width:24px}
    table.stitch-grid td.rnum.rowdone{color:#6FA8BC;font-weight:bold}
    table.pattern-grid{border-collapse:collapse}
    table.pattern-grid td{width:20px;height:20px;border:1px solid rgba(0,0,0,.06)}
    @media print{body{margin:24px}}
  </style>
</head>
<body>
  <h1>${esc(name)}</h1>
  <p class="meta">${esc(CATEGORY_LABELS[project.category])}${tagList ? ' &nbsp;·&nbsp; ' + tagList : ''}</p>
  ${description || notes ? `<section>
    <h2>Info</h2>
    ${description ? `<p>${esc(description)}</p>` : ''}
    ${notes ? `<p class="pretext">${esc(notes)}</p>` : ''}
  </section>` : ''}
  ${materialsHtml}
  ${recipeHtml}
  ${counterHtml}
  ${gridHtml}
  <p style="font-size:.75em;color:#bbb;margin-top:48px;border-top:1px solid #eee;padding-top:12px">Exported from Stitchbook</p>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/[^a-z0-9æøåÆØÅ]/gi, '_')}_stitchbook.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={downloadOverview} className="btn-secondary text-sm flex items-center gap-2">
          <span>↓</span> Download overview
        </button>
      </div>
      <Section title="Info">
        <h3 className="font-semibold text-gray-800 text-base">{name}</h3>
        {description && <p className="text-sm text-warm-gray">{description}</p>}
        {notes && <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{notes}</p>}
        {tags && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {tags.split(',').filter(Boolean).map(t => (
              <span key={t} className="text-xs bg-soft-brown/20 text-warm-gray px-2 py-0.5 rounded-full">{t.trim()}</span>
            ))}
          </div>
        )}
      </Section>

      {project.materials.length > 0 && (
        <Section title="Materials">
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
        </Section>
      )}

      {(recipeText || project.files.length > 0) && (
        <Section title="Recipe">
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
        <Section title="Stitch Counter">
          <StitchCounterReadOnly counter={project.rowCounter} />
        </Section>
      )}

      {project.category !== 'SEWING' && project.patternGrid && (
        <Section title="Pattern Grid">
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
        <p className="text-sm text-warm-gray">Set up your stitch counter to start tracking:</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stitches per round">
            <input type="number" className="input" min={1} max={500}
              value={editSpr} onChange={e => setEditSpr(parseInt(e.target.value) || 1)} />
          </Field>
          <Field label="Total rounds">
            <input type="number" className="input" min={1} max={1000}
              value={editRounds} onChange={e => setEditRounds(parseInt(e.target.value) || 1)} />
          </Field>
        </div>
        <button onClick={handleConfigure} className="btn-primary w-full">Start counting</button>
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
        <span className="text-warm-gray">{completedRounds} / {rounds} rounds · {doneCount} / {totalStitches} stitches</span>
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
          Reset all
        </button>
        <button onClick={() => setConfigured(false)} className="btn-ghost text-xs border border-soft-brown/30 rounded-lg py-1.5 px-3">
          Change setup
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
        >Paint</button>
        <button
          onClick={() => setMode('erase')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${mode === 'erase' ? 'bg-soft-brown text-white' : 'bg-soft-brown/20 text-warm-gray'}`}
        >Erase</button>
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
        <span className="text-warm-gray">Rows</span>
        <input type="number" value={rows} min={1} max={50} onChange={e => setRows(parseInt(e.target.value) || 1)}
          className="input py-1 px-2 text-xs w-14" />
        <span className="text-warm-gray">Cols</span>
        <input type="number" value={cols} min={1} max={50} onChange={e => setCols(parseInt(e.target.value) || 1)}
          className="input py-1 px-2 text-xs w-14" />
        <button onClick={applyResize} className="btn-ghost text-xs py-1 px-2 border border-soft-brown/30 rounded-lg">Apply</button>
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
      <p className="text-xs text-warm-gray">Auto-saving grid...</p>
    </div>
  )
}

// ── Read-only Overview Widgets ─────────────────────────────────
function StitchCounterReadOnly({ counter }: {
  counter: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }
}) {
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
        <span className="text-warm-gray">{completedRounds} / {rounds} rounds · {doneCount} / {totalStitches} stitches</span>
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
