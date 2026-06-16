import { z } from 'zod'

// --- Primitive schemas ---

const projectImageSchema = z.object({
  id: z.number(),
  storedName: z.string(),
  originalName: z.string(),
  section: z.string(),
  materialId: z.number().optional(),
  isMain: z.boolean(),
  projectId: z.number(),
})

const materialSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  itemType: z.string().optional(),
  color: z.string(),
  colorHex: z.string(),
  amount: z.string(),
  unit: z.string(),
  images: z.array(projectImageSchema),
})

const rowCounterSchema = z.object({
  id: z.number(),
  stitchesPerRound: z.number(),
  totalRounds: z.number(),
  checkedStitches: z.string(),
})

const patternGridSchema = z.object({
  id: z.number(),
  rows: z.number(),
  cols: z.number(),
  cellData: z.string(),
})

const projectFileSchema = z.object({
  id: z.number(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  fileType: z.string(),
  uploadedAt: z.number(),
  projectId: z.number(),
})

// --- Exported schemas ---

export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['KNITTING', 'CROCHET', 'SEWING']),
  tags: z.string(),
  coverImages: z.array(projectImageSchema),
  notes: z.string(),
  recipeText: z.string(),
  pinterestBoardUrls: z.array(z.string()),
  craftDetails: z.string(),
  materials: z.array(materialSchema),
  files: z.array(projectFileSchema),
  rowCounter: rowCounterSchema.optional(),
  patternGrids: z.array(patternGridSchema),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  isPublic: z.boolean(),
  userId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const libraryItemSchema = z.object({
  id: z.number(),
  itemType: z.enum(['YARN', 'FABRIC', 'KNITTING_NEEDLE', 'CROCHET_HOOK']),
  name: z.string(),
  images: z
    .array(
      z.object({
        id: z.number(),
        storedName: z.string(),
        originalName: z.string(),
        isMain: z.boolean(),
        libraryItemId: z.number(),
      })
    )
    .optional(),
  colors: z.array(z.string()),
  yarnMaterial: z.string().optional(),
  yarnBrand: z.string().optional(),
  yarnAmountG: z.number().optional(),
  yarnAmountM: z.number().optional(),
  fabricWidthCm: z.number().optional(),
  fabricLengthCm: z.number().optional(),
  needleSizeMm: z.string().optional(),
  circularLengthCm: z.number().optional(),
  hookSizeMm: z.string().optional(),
  createdAt: z.number(),
})

export const friendSchema = z.object({
  friendshipId: z.number(),
  userId: z.string(),
  displayName: z.string().nullable(),
  email: z.string(),
})

export const friendRequestSchema = z.object({
  friendshipId: z.number(),
  requesterId: z.string(),
  requesterDisplayName: z.string().nullable(),
  requesterEmail: z.string(),
  createdAt: z.number(),
})

// --- Validation helper ---
// Uses safeParse so a schema mismatch logs/reports but never breaks the UI.

type SchemaIssue = z.ZodIssue
type SchemaReporter = (context: string, issues: SchemaIssue[]) => void

let reportSchemaMismatch: SchemaReporter = (context, issues) => {
  console.warn(`[API] Schema mismatch for ${context}:`, issues)
}

/** Wire schema drift to an error-reporting backend (e.g. Sentry). Defaults to
 *  console.warn so drift is at least visible in dev. */
export function setSchemaMismatchReporter(reporter: SchemaReporter): void {
  reportSchemaMismatch = reporter
}

export function safeParsed<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    reportSchemaMismatch(context, result.error.issues)
    return data as T
  }
  return result.data
}
