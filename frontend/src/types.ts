export type ProjectCategory = 'KNITTING' | 'CROCHET' | 'SEWING'

export interface Material {
  id: number
  type: string
  color: string
  colorHex: string
  amount: string
  unit: string
}

export interface RowCounter {
  id: number
  stitchesPerRound: number
  totalRounds: number
  checkedStitches: string
}

export interface PatternGrid {
  id: number
  rows: number
  cols: number
  cellData: string
}

export interface ProjectFile {
  id: number
  originalName: string
  storedName: string
  mimeType: string
  fileType: string
  uploadedAt: number
  projectId: number
}

export interface Project {
  id: number
  name: string
  description: string
  category: ProjectCategory
  tags: string
  imageUrl?: string
  notes: string
  recipeText: string
  craftDetails: string
  materials: Material[]
  files: ProjectFile[]
  rowCounter?: RowCounter
  patternGrid?: PatternGrid
  createdAt: number
  updatedAt: number
}

export interface PatternCell {
  row: number
  col: number
  color: string
  symbol: string
}
