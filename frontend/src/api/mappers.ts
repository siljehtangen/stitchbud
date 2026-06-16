import type {
  LibraryItem,
  LibraryItemImage,
  Material,
  PatternGrid,
  Project,
  ProjectCategory,
  ProjectFile,
  ProjectImage,
  RowCounter,
} from '../types'

// --- Database row shapes (snake_case, as returned by PostgREST / RPC) ---

export interface DbProjectImage {
  id: number
  project_id: number
  material_id: number | null
  original_name: string | null
  section: string | null
  stored_name: string | null
  is_main: boolean | null
}

export interface DbMaterial {
  id: number
  project_id: number
  name: string | null
  type: string | null
  item_type: string | null
  color: string | null
  color_hex: string | null
  amount: string | null
  unit: string | null
}

export interface DbProjectFile {
  id: number
  project_id: number
  original_name: string | null
  stored_name: string | null
  mime_type: string | null
  file_type: string | null
  uploaded_at: number
}

export interface DbPatternGrid {
  id: number
  project_id: number
  rows: number
  cols: number
  cell_data: string | null
}

export interface DbRowCounter {
  id: number
  project_id: number
  stitches_per_round: number
  total_rounds: number
  checked_stitches: string | null
}

export interface DbProject {
  id: number
  user_id: string | null
  name: string | null
  description: string | null
  category: ProjectCategory
  tags: string | null
  notes: string | null
  recipe_text: string | null
  pinterest_board_urls: string | null
  craft_details: string | null
  start_date: number | null
  end_date: number | null
  is_public: boolean
  created_at: number
  updated_at: number
  materials?: DbMaterial[] | null
  project_images?: DbProjectImage[] | null
  project_files?: DbProjectFile[] | null
  pattern_grids?: DbPatternGrid[] | null
  row_counters?: DbRowCounter[] | DbRowCounter | null
}

export interface DbLibraryItemImage {
  id: number
  library_item_id: number
  original_name: string | null
  stored_name: string | null
  is_main: boolean | null
}

export interface DbLibraryItem {
  id: number
  user_id: string | null
  item_type: LibraryItem['itemType']
  name: string | null
  colors: string | null
  yarn_material: string | null
  yarn_brand: string | null
  yarn_amountg: number | null
  yarn_amountm: number | null
  fabric_width_cm: number | null
  fabric_length_cm: number | null
  needle_size_mm: string | null
  circular_length_cm: number | null
  hook_size_mm: string | null
  created_at: number
  library_item_images?: DbLibraryItemImage[] | null
}

const COVER = 'cover'
const MATERIAL = 'material'

/** The nested-embed select string for a full project (PostgREST). */
export const PROJECT_SELECT = '*, materials(*), project_images(*), project_files(*), pattern_grids(*), row_counters(*)'

/** Parse the JSON-encoded pinterest_board_urls TEXT column into a string array. */
export function parsePinterestUrls(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : []
  } catch {
    return []
  }
}

/** Split the comma-separated colors column into an array (matches StringListConverter). */
export function parseColors(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw.split(',').filter(c => c.length > 0)
}

/** Mirror of the backend detectFileType: classify an attachment for display. */
export function detectFileType(mimeType: string, originalName: string): string {
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.') + 1).toLowerCase() : ''
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') return 'word'
  return 'other'
}

function byId<T extends { id: number }>(a: T, b: T): number {
  return a.id - b.id
}

function toImage(img: DbProjectImage): ProjectImage {
  return {
    id: img.id,
    storedName: img.stored_name ?? '',
    originalName: img.original_name ?? '',
    section: img.section ?? COVER,
    materialId: img.material_id ?? undefined,
    isMain: img.is_main ?? false,
    projectId: img.project_id,
  }
}

function toMaterial(m: DbMaterial, imagesByMaterial: Map<number, ProjectImage[]>): Material {
  return {
    id: m.id,
    name: m.name ?? '',
    type: m.type ?? '',
    itemType: m.item_type ?? undefined,
    color: m.color ?? '',
    colorHex: m.color_hex ?? '#000000',
    amount: m.amount ?? '',
    unit: m.unit ?? 'g',
    images: imagesByMaterial.get(m.id) ?? [],
  }
}

function toFile(f: DbProjectFile): ProjectFile {
  return {
    id: f.id,
    originalName: f.original_name ?? '',
    storedName: f.stored_name ?? '',
    mimeType: f.mime_type ?? '',
    fileType: f.file_type ?? 'other',
    uploadedAt: f.uploaded_at,
    projectId: f.project_id,
  }
}

function toGrid(g: DbPatternGrid): PatternGrid {
  return { id: g.id, rows: g.rows, cols: g.cols, cellData: g.cell_data ?? '[]' }
}

function toRowCounter(rc: DbRowCounter): RowCounter {
  return {
    id: rc.id,
    stitchesPerRound: rc.stitches_per_round,
    totalRounds: rc.total_rounds,
    checkedStitches: rc.checked_stitches ?? '[]',
  }
}

/** Convert a project row (with nested embeds) into the camelCase Project DTO. */
export function rowToProject(row: DbProject): Project {
  const images = (row.project_images ?? []).slice().sort(byId)
  const coverImages = images.filter(i => (i.section ?? COVER) === COVER).map(toImage)

  const imagesByMaterial = new Map<number, ProjectImage[]>()
  for (const img of images) {
    if ((img.section ?? COVER) === MATERIAL && img.material_id != null) {
      const list = imagesByMaterial.get(img.material_id) ?? []
      list.push(toImage(img))
      imagesByMaterial.set(img.material_id, list)
    }
  }

  const rcRaw = Array.isArray(row.row_counters) ? row.row_counters[0] : row.row_counters

  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? '',
    category: row.category,
    tags: row.tags ?? '',
    notes: row.notes ?? '',
    recipeText: row.recipe_text ?? '',
    pinterestBoardUrls: parsePinterestUrls(row.pinterest_board_urls),
    craftDetails: row.craft_details ?? '{}',
    coverImages,
    materials: (row.materials ?? [])
      .slice()
      .sort(byId)
      .map(m => toMaterial(m, imagesByMaterial)),
    files: (row.project_files ?? []).slice().sort(byId).map(toFile),
    rowCounter: rcRaw ? toRowCounter(rcRaw) : undefined,
    patternGrids: (row.pattern_grids ?? []).slice().sort(byId).map(toGrid),
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    isPublic: row.is_public,
    userId: row.user_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toLibraryImage(img: DbLibraryItemImage): LibraryItemImage {
  return {
    id: img.id,
    storedName: img.stored_name ?? '',
    originalName: img.original_name ?? '',
    isMain: img.is_main ?? false,
    libraryItemId: img.library_item_id,
  }
}

/** Convert a library_items row (with nested images) into the LibraryItem DTO. */
export function rowToLibraryItem(row: DbLibraryItem): LibraryItem {
  return {
    id: row.id,
    itemType: row.item_type,
    name: row.name ?? '',
    images: (row.library_item_images ?? []).slice().sort(byId).map(toLibraryImage),
    colors: parseColors(row.colors),
    yarnMaterial: row.yarn_material ?? undefined,
    yarnBrand: row.yarn_brand ?? undefined,
    yarnAmountG: row.yarn_amountg ?? undefined,
    yarnAmountM: row.yarn_amountm ?? undefined,
    fabricWidthCm: row.fabric_width_cm ?? undefined,
    fabricLengthCm: row.fabric_length_cm ?? undefined,
    needleSizeMm: row.needle_size_mm ?? undefined,
    circularLengthCm: row.circular_length_cm ?? undefined,
    hookSizeMm: row.hook_size_mm ?? undefined,
    createdAt: row.created_at,
  }
}
