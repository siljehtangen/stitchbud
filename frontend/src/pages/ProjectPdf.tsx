import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import type { Project, PatternCell } from '../types'
import { COLOR_MAP_BY_HEX, getColorName } from '../colors'
import { fileUrl } from '../api'
import { materialImageUrls, projectCoverImageUrls } from '../projectOverviewMedia'

const accent = '#6FA8BC'

const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#333', padding: 48 },
  h1: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  meta: { fontSize: 9, color: '#888', marginBottom: 16 },
  coverImages: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  coverImage: { flex: 1, minWidth: 100, height: 180, objectFit: 'contain', marginRight: 6 },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: accent,
    borderBottomWidth: 1, borderBottomColor: '#d6ebf2', borderBottomStyle: 'solid',
    paddingBottom: 4, marginBottom: 10,
  },
  body: { fontSize: 10, lineHeight: 1.7 },
  craftRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  craftField: { width: '50%', marginBottom: 5 },
  fieldLabel: { fontSize: 7.5, color: '#888', marginBottom: 1 },
  fieldValue: { fontSize: 9.5, color: '#555' },
  matBlock: { marginBottom: 10 },
  matThumbs: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  matImage: { width: 72, height: 72, objectFit: 'cover', marginRight: 6, marginBottom: 6 },
  matText: { fontSize: 9.5 },
  recipeImage: { width: '100%', height: 250, objectFit: 'contain', marginBottom: 8 },
  attachment: { fontSize: 9, color: '#888', marginBottom: 3 },
  attachmentLink: { fontSize: 9, color: '#6FA8BC', marginBottom: 3, textDecoration: 'underline' },
  pCell: { width: 13, height: 13, borderWidth: 0.5, borderColor: '#e0e0e0', borderStyle: 'solid' },
  gridRow: { flexDirection: 'row' },
  clipNote: { fontSize: 8, color: '#999', fontStyle: 'italic', marginTop: 4 },
  footer: { fontSize: 7, color: '#bbb', borderTopWidth: 1, borderTopColor: '#eee', borderTopStyle: 'solid', paddingTop: 8, marginTop: 20 },
})

const MAX_PATTERN_ROWS = 60
const MAX_PATTERN_COLS = 80

export interface PdfLabels {
  info: string
  materials: string
  recipe: string
  patternGrid: string
}

export interface PdfProps {
  project: Project
  name: string
  description: string
  recipeText: string
  filledCraftFields: { key: string; label: string }[]
  craftDetails: Record<string, string>
  projectId: number
  categoryLabel: string
  labels: PdfLabels
  language: string
  /** Pre-fetched base64 data URIs keyed by original URL, to avoid CORS issues at render time */
  imageData: Record<string, string>
}

export function ProjectOverviewPdf({
  project, name, description, recipeText, filledCraftFields,
  craftDetails, projectId, categoryLabel, labels, language, imageData,
}: PdfProps) {
  const hasMaterials = filledCraftFields.length > 0 || project.materials.length > 0
  const hasRecipe = !!recipeText

  const coverUrls = projectCoverImageUrls(project)

  const imageFiles = project.files.filter(f => f.fileType === 'image')
  const nonImageFiles = project.files.filter(f => f.fileType !== 'image')
  const hasFiles = project.files.length > 0

  const img = (url: string) => imageData[url] ?? url

  const gridDatas = (() => {
    if (project.category === 'SEWING' || !project.patternGrids?.length) return []
    return project.patternGrids.map(pg => {
      const cells: PatternCell[] = (() => { try { return JSON.parse(pg.cellData) } catch { return [] } })()
      const cellMap = new Map(cells.map(c => [`${c.row},${c.col}`, c.color]))
      const clippedRows = pg.rows > MAX_PATTERN_ROWS
      const clippedCols = pg.cols > MAX_PATTERN_COLS
      return {
        rows: Math.min(pg.rows, MAX_PATTERN_ROWS),
        cols: Math.min(pg.cols, MAX_PATTERN_COLS),
        cellMap,
        clipped: clippedRows || clippedCols,
      }
    })
  })()

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.h1}>{name}</Text>
        <Text style={S.meta}>{categoryLabel}</Text>

        <View style={S.coverImages}>
          {coverUrls.map((url, i) => (
            <Image key={i} src={img(url)} style={S.coverImage} />
          ))}
        </View>

        {description ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{labels.info.toUpperCase()}</Text>
            <Text style={S.body}>{description}</Text>
          </View>
        ) : null}

        {hasMaterials ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{labels.materials.toUpperCase()}</Text>
            {filledCraftFields.length > 0 && (
              <View style={S.craftRow}>
                {filledCraftFields.map(f => (
                  <View key={f.key} style={S.craftField}>
                    <Text style={S.fieldLabel}>{f.label}</Text>
                    <Text style={S.fieldValue}>{craftDetails[f.key]}</Text>
                  </View>
                ))}
              </View>
            )}
            {project.materials.map(m => {
              const colorEntry = m.colorHex ? COLOR_MAP_BY_HEX[m.colorHex] : undefined
              const colorLabel = colorEntry ? getColorName(colorEntry, language) : m.color
              const matUrls = materialImageUrls(m, projectId)
              return (
                <View key={m.id} style={S.matBlock}>
                  {matUrls.length > 0 && (
                    <View style={S.matThumbs}>
                      {matUrls.map((url, i) => (
                        <Image key={i} src={img(url)} style={S.matImage} />
                      ))}
                    </View>
                  )}
                  <Text style={S.matText}>
                    {m.type}{colorLabel ? ` \u2014 ${colorLabel}` : ''}{m.amount ? ` (${m.amount}${m.unit ? ` ${m.unit}` : ''})` : ''}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : null}

        {(hasRecipe || hasFiles) ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{labels.recipe.toUpperCase()}</Text>
            {hasRecipe && <Text style={S.body}>{recipeText}</Text>}
            {imageFiles.map(f => {
              const url = fileUrl(projectId, f.storedName)
              return <Image key={f.id} src={img(url)} style={S.recipeImage} />
            })}
            {nonImageFiles.map(f => (
              <Link key={f.id} src={fileUrl(projectId, f.storedName)} style={S.attachmentLink}>
                {f.fileType === 'pdf' ? '(PDF) ' : f.fileType === 'word' ? '(Word) ' : ''}{f.originalName}
              </Link>
            ))}
          </View>
        ) : null}

        {gridDatas.length > 0 ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{labels.patternGrid.toUpperCase()}</Text>
            {gridDatas.map((gridData, i) => (
              <View key={i} style={i > 0 ? { marginTop: 8 } : undefined}>
                {gridDatas.length > 1 && (
                  <Text style={S.clipNote}>Grid {i + 1}</Text>
                )}
                {Array.from({ length: gridData.rows }, (_, r) => (
                  <View key={r} style={S.gridRow}>
                    {Array.from({ length: gridData.cols }, (_, c) => (
                      <View
                        key={c}
                        style={[S.pCell, { backgroundColor: gridData.cellMap.get(`${r},${c}`) ?? '#F5F0E8' }]}
                      />
                    ))}
                  </View>
                ))}
                {gridData.clipped && (
                  <Text style={S.clipNote}>Grid clipped to {MAX_PATTERN_ROWS}×{MAX_PATTERN_COLS} for PDF.</Text>
                )}
              </View>
            ))}
          </View>
        ) : null}

        <Text style={S.footer}>Exported from Stitchbud</Text>
      </Page>
    </Document>
  )
}
