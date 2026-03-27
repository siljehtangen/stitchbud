import { Document, Page, Text, View, StyleSheet, Image as PdfImage } from '@react-pdf/renderer'
import type { Project, PatternCell } from '../types'

const accent = '#6FA8BC'
const accentBg = '#BFD8E0'

const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#333', padding: 48 },
  h1: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  meta: { fontSize: 9, color: '#888', marginBottom: 24 },
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
  matRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  swatch: { width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', borderStyle: 'solid', marginRight: 7 },
  matText: { fontSize: 9.5 },
  imgRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  img: { width: 130, height: 130, marginRight: 8, marginBottom: 8, borderRadius: 5 },
  fileLink: { fontSize: 9, color: '#3a6e80', marginBottom: 3 },
  statsText: { fontSize: 8.5, color: '#666', marginBottom: 5 },
  progressBg: { height: 6, backgroundColor: '#e8e8e8', borderRadius: 3, marginBottom: 10 },
  progressFill: { height: 6, backgroundColor: accentBg, borderRadius: 3 },
  gridRow: { flexDirection: 'row' },
  cell: { width: 13, height: 13, borderWidth: 0.5, borderColor: '#ddd', borderStyle: 'solid', alignItems: 'center', justifyContent: 'center' },
  cellDone: { backgroundColor: accentBg },
  cellTick: { fontSize: 6, color: '#3a6e80', fontFamily: 'Helvetica-Bold' },
  rnum: { width: 18, height: 13, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 2 },
  rnumText: { fontSize: 6, color: '#bbb' },
  rnumDone: { fontSize: 6, color: accent, fontFamily: 'Helvetica-Bold' },
  pCell: { width: 13, height: 13, borderWidth: 0.5, borderColor: '#e0e0e0', borderStyle: 'solid' },
  clipNote: { fontSize: 8, color: '#999', fontStyle: 'italic', marginTop: 4 },
  footer: { fontSize: 7, color: '#bbb', borderTopWidth: 1, borderTopColor: '#eee', borderTopStyle: 'solid', paddingTop: 8, marginTop: 20 },
})

const MAX_GRID_ROWS = 100
const MAX_PATTERN_ROWS = 60
const MAX_PATTERN_COLS = 80

export interface PdfLabels {
  info: string
  materials: string
  recipe: string
  stitchCounter: string
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
}

export function ProjectOverviewPdf({
  project, name, description, recipeText, filledCraftFields,
  craftDetails, projectId, categoryLabel, labels,
}: PdfProps) {
  const hasMaterials = filledCraftFields.length > 0 || project.materials.length > 0
  const imageFiles = project.files.filter(f => f.fileType === 'image')
  const otherFiles = project.files.filter(f => f.fileType !== 'image')
  const hasRecipe = !!recipeText || project.files.length > 0

  const counterSection = (() => {
    if (!project.rowCounter) return null
    const { stitchesPerRound: spr, totalRounds: rounds, checkedStitches } = project.rowCounter
    const checked: Set<number> = (() => {
      try { return new Set(JSON.parse(checkedStitches) as number[]) } catch { return new Set<number>() }
    })()
    const total = spr * rounds
    const done = checked.size
    const completedRounds = Array.from({ length: rounds }, (_, r) =>
      Array.from({ length: spr }, (_, s) => r * spr + s).every(i => checked.has(i))
    ).filter(Boolean).length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    const clipped = rounds > MAX_GRID_ROWS
    return { spr, rounds: Math.min(rounds, MAX_GRID_ROWS), totalRounds: rounds, checked, total, done, completedRounds, pct, clipped }
  })()

  const gridData = (() => {
    if (project.category === 'SEWING' || !project.patternGrid) return null
    const { rows, cols, cellData } = project.patternGrid
    const cells: PatternCell[] = (() => { try { return JSON.parse(cellData) } catch { return [] } })()
    const cellMap = new Map(cells.map(c => [`${c.row},${c.col}`, c.color]))
    const clippedRows = rows > MAX_PATTERN_ROWS
    const clippedCols = cols > MAX_PATTERN_COLS
    return {
      rows: Math.min(rows, MAX_PATTERN_ROWS),
      cols: Math.min(cols, MAX_PATTERN_COLS),
      cellMap,
      clipped: clippedRows || clippedCols,
    }
  })()

  const imgBase = `${window.location.origin}/api/files/${projectId}/`

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.h1}>{name}</Text>
        <Text style={S.meta}>{categoryLabel}</Text>

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
            {project.materials.map(m => (
              <View key={m.id} style={S.matRow}>
                <View style={[S.swatch, { backgroundColor: m.colorHex }]} />
                <Text style={S.matText}>
                  {m.type}{m.color ? ` \u2014 ${m.color}` : ''}{m.amount ? ` (${m.amount} ${m.unit})` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {hasRecipe ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{labels.recipe.toUpperCase()}</Text>
            {imageFiles.length > 0 && (
              <View style={S.imgRow}>
                {imageFiles.map(f => (
                  <PdfImage key={f.id} style={S.img} src={imgBase + f.storedName} />
                ))}
              </View>
            )}
            {otherFiles.map(f => (
              <Text key={f.id} style={S.fileLink}>{f.originalName}</Text>
            ))}
            {recipeText ? <Text style={S.body}>{recipeText}</Text> : null}
          </View>
        ) : null}

        {counterSection ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{labels.stitchCounter.toUpperCase()}</Text>
            <Text style={S.statsText}>
              {counterSection.completedRounds} / {counterSection.totalRounds} rounds
              {' \u00B7 '}{counterSection.done} / {counterSection.total} stitches
              {' \u00B7 '}{counterSection.pct}%
            </Text>
            <View style={S.progressBg}>
              <View style={[S.progressFill, { width: `${counterSection.pct}%` }]} />
            </View>
            {Array.from({ length: counterSection.rounds }, (_, r) => {
              const rowDone = Array.from({ length: counterSection.spr }, (_, s) =>
                counterSection.checked.has(r * counterSection.spr + s)
              ).every(Boolean)
              return (
                <View key={r} style={S.gridRow}>
                  <View style={S.rnum}>
                    <Text style={rowDone ? S.rnumDone : S.rnumText}>{r + 1}</Text>
                  </View>
                  {Array.from({ length: counterSection.spr }, (_, s) => {
                    const isDone = counterSection.checked.has(r * counterSection.spr + s)
                    return (
                      <View key={s} style={isDone ? [S.cell, S.cellDone] : S.cell}>
                        {isDone && <Text style={S.cellTick}>v</Text>}
                      </View>
                    )
                  })}
                </View>
              )
            })}
            {counterSection.clipped && (
              <Text style={S.clipNote}>
                Showing first {MAX_GRID_ROWS} of {counterSection.totalRounds} rounds.
              </Text>
            )}
          </View>
        ) : null}

        {gridData ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{labels.patternGrid.toUpperCase()}</Text>
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
              <Text style={S.clipNote}>Grid clipped to {MAX_PATTERN_ROWS}x{MAX_PATTERN_COLS} for PDF.</Text>
            )}
          </View>
        ) : null}

        <Text style={S.footer}>Exported from Stitchbook</Text>
      </Page>
    </Document>
  )
}
