import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiDownload } from 'react-icons/fi'
import { projectCoverImageUrls, materialImageUrls, uniqueImageUrls } from '../../projectOverviewMedia'
import { COLOR_MAP_BY_HEX, getColorName } from '../../colors'
import type { Project } from '../../types'
import { FileTypeIcon } from '../../components/FileTypeIcon'
import { PatternGridReadOnly } from './PatternGridReadOnly'
import { Section } from './Section'

const CRAFT_FIELDS_KEYS: Record<string, { key: string; labelKey: string }[]> = {
  KNITTING: [
    { key: 'needleSize', labelKey: 'needle_size' },
    { key: 'circularNeedleLength', labelKey: 'circular_needle_length' },
  ],
  CROCHET: [{ key: 'hookSize', labelKey: 'hook_size' }],
  SEWING: [],
}

/** Fetch an image URL and return a JPEG data URI by drawing it through a canvas.
 *  Required for embedding external images in react-pdf v4 browser mode. */
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
        canvas.width = Math.round(img.naturalWidth * scale)
        canvas.height = Math.round(img.naturalHeight * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(blobUrl)
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      } catch (e) {
        URL.revokeObjectURL(blobUrl)
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('img load failed'))
    }
    img.src = blobUrl
  })
}

export function OverviewTab({
  project,
  name,
  description,
  recipeText,
  craftDetails,
  ownerLabel,
}: {
  project: Project
  name: string
  description: string
  recipeText: string
  craftDetails: Record<string, string>
  ownerLabel?: string
}) {
  const { t, i18n } = useTranslation()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  async function downloadOverview() {
    if (exporting) return
    setExporting(true)
    setExportError(null)
    try {
      await doDownloadOverview()
    } catch (e) {
      console.error('PDF export failed', e)
      setExportError(t('export_error'))
    } finally {
      setExporting(false)
    }
  }

  async function doDownloadOverview() {
    const [{ pdf }, { ProjectOverviewPdf }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../ProjectPdf'),
    ])

    const craftFields = CRAFT_FIELDS_KEYS[project.category] ?? []
    const filledCraftFields = craftFields
      .filter(f => craftDetails[f.key]?.trim())
      .map(f => ({ key: f.key, label: t(f.labelKey as Parameters<typeof t>[0]) }))

    const imageUrls = uniqueImageUrls([
      ...projectCoverImageUrls(project),
      ...project.materials.flatMap(m => materialImageUrls(m)),
      ...project.files.filter(f => f.fileType === 'image').map(f => f.storedName),
    ])

    const imageData: Record<string, string> = {}
    await Promise.all(
      imageUrls.map(async url => {
        try {
          imageData[url] = await fetchAsJpegDataUri(url)
        } catch {
          // leave out — img() in ProjectPdf will fall back to the raw URL
        }
      })
    )

    const doc = (
      <ProjectOverviewPdf
        project={project}
        name={name}
        description={description}
        recipeText={recipeText}
        filledCraftFields={filledCraftFields}
        craftDetails={craftDetails}
        categoryLabel={t(`category_${project.category.toLowerCase()}` as Parameters<typeof t>[0])}
        language={i18n.language}
        imageData={imageData}
        ownerLabel={ownerLabel}
        labels={{
          info: t('section_info'),
          materials: t('section_materials'),
          recipe: t('section_recipe'),
          patternGrid: t('section_pattern_grid'),
          gridNumber: n => t('pdf_grid_number', { number: n }),
          gridClipped: (rows, cols) => t('pdf_grid_clipped', { rows, cols }),
          footer: t('pdf_footer'),
          createdBy: t('pdf_created_by'),
        }}
      />
    )

    const blob = await pdf(doc).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/[^a-z0-9æøåÆØÅ]/gi, '_')}_stitchbud.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const craftFields = CRAFT_FIELDS_KEYS[project.category] ?? []
  const filledCraftFields = craftFields.filter(f => craftDetails[f.key]?.trim())
  const hasMaterials = project.materials.length > 0
  const coverUrls = projectCoverImageUrls(project)

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={downloadOverview}
          disabled={exporting}
          className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-60"
        >
          <FiDownload className="text-base" /> {exporting ? t('exporting') : t('download_overview')}
        </button>
        {exportError && <p className="text-xs text-red-500">{exportError}</p>}
      </div>
      <Section title={t('section_info')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-ink text-base">{name}</h3>
            {description && <p className="text-sm text-ink/80 whitespace-pre-wrap mt-1">{description}</p>}
          </div>
          {coverUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap sm:justify-end">
              {coverUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-28 h-28 object-cover rounded-xl flex-shrink-0 shadow-sm"
                  loading="lazy"
                />
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
                  <span className="text-sm text-ink/80">{craftDetails[key]}</span>
                </div>
              ))}
            </div>
          )}
          {hasMaterials && (
            <div className="space-y-4">
              {project.materials.map(m => {
                const colorEntry = m.colorHex ? COLOR_MAP_BY_HEX[m.colorHex] : undefined
                const colorLabel = colorEntry ? getColorName(colorEntry, i18n.language) : m.color
                const imgs = materialImageUrls(m)
                return (
                  <div key={m.id} className="space-y-2">
                    <span className="text-sm text-ink/80 block font-medium">
                      {m.type}
                      {colorLabel ? ` — ${colorLabel}` : ''}
                      {m.amount ? ` (${m.amount}${m.unit ? ` ${m.unit}` : ''})` : ''}
                    </span>
                    {imgs.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {imgs.map((url, i) => (
                          <img
                            key={`${url}-${i}`}
                            src={url}
                            alt=""
                            className="w-28 h-28 object-cover rounded-xl flex-shrink-0 shadow-sm pointer-events-none select-none"
                            loading="lazy"
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
                const url = f.storedName
                return f.fileType === 'image' ? (
                  <a key={f.id} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={f.originalName}
                      className="w-20 h-20 object-cover rounded-xl shadow-sm"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <a
                    key={f.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 card py-2 px-3 text-sm hover:shadow-md"
                  >
                    <FileTypeIcon fileType={f.fileType} />
                    <span className="text-ink/80 max-w-[8rem] truncate">{f.originalName}</span>
                  </a>
                )
              })}
            </div>
          )}
          {recipeText && <p className="text-sm text-ink/80 whitespace-pre-wrap mt-2">{recipeText}</p>}
        </Section>
      )}

      {project.category !== 'SEWING' && project.patternGrids?.length > 0 && (
        <Section title={t('section_pattern_grid')}>
          {project.patternGrids.map((grid, i) => (
            <div key={grid.id} className={i > 0 ? 'mt-4' : ''}>
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
        </Section>
      )}
    </div>
  )
}
