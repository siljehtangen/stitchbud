import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Project, PatternCell } from '../types'

const accent = '#6FA8BC'

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
  matText: { fontSize: 9.5 },
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
}

export function ProjectOverviewPdf({
  project, name, description, recipeText, filledCraftFields,
  craftDetails, categoryLabel, labels,
}: PdfProps) {
  const hasMaterials = filledCraftFields.length > 0 || project.materials.length > 0
  const hasRecipe = !!recipeText

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
                <Text style={S.matText}>
                  {m.type}{m.color ? ` \u2014 ${m.color}` : ''}{m.amount ? ` (${m.amount}${m.unit ? ` ${m.unit}` : ''})` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {hasRecipe ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>{labels.recipe.toUpperCase()}</Text>
            <Text style={S.body}>{recipeText}</Text>
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
