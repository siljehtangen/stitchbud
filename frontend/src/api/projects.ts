import type { Project, ProjectCategory } from '../types'
import { normalizeProject } from '../projectOverviewMedia'
import { supabase, getUserId, uploadFile, deleteUploadedFile, canonicalStoredName, raiseError } from './client'
import { projectSchema, safeParsed } from './schemas'
import { rowToProject, detectFileType, PROJECT_SELECT, type DbProject } from './mappers'
import { withSignedProjectMedia, withSignedProjectsMedia } from './media'
import { isSafeHttpUrl } from '../utils/url'
import { z } from 'zod'

const COVER = 'cover'
const MATERIAL = 'material'

async function fetchProject(id: number): Promise<Project> {
  const { data, error } = await supabase.from('projects').select(PROJECT_SELECT).eq('id', id).single()
  raiseError(error, 'Project not found')
  return withSignedProjectMedia(normalizeProject(safeParsed(projectSchema, rowToProject(data as DbProject), 'Project')))
}

type ProjectUpdate = Partial<{
  name: string
  description: string
  tags: string
  notes: string
  recipeText: string
  craftDetails: string
  pinterestBoardUrls: string[]
  startDate: number
  endDate: number
  clearEndDate: boolean
  isPublic: boolean
}>

export const projectsApi = {
  getAll: async (category?: ProjectCategory): Promise<Project[]> => {
    let query = supabase.from('projects').select(PROJECT_SELECT)
    if (category) query = query.eq('category', category)
    const { data, error } = await query.order('updated_at', { ascending: false })
    raiseError(error, 'Failed to load projects')
    const mapped = ((data as DbProject[]) ?? []).map(rowToProject)
    const projects = safeParsed(z.array(projectSchema), mapped, 'Project[]').map(normalizeProject)
    return withSignedProjectsMedia(projects)
  },

  getOne: (id: number): Promise<Project> => fetchProject(id),

  create: async (data: {
    name: string
    startDate: number
    category: ProjectCategory
    description?: string
    tags?: string
  }): Promise<Project> => {
    const userId = await getUserId()
    const { data: inserted, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: data.name,
        category: data.category,
        start_date: data.startDate,
        description: data.description ?? '',
        tags: data.tags ?? '',
        is_public: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      })
      .select('id')
      .single()
    raiseError(error, 'Failed to create project')
    return fetchProject((inserted as { id: number }).id)
  },

  update: async (id: number, data: ProjectUpdate): Promise<Project> => {
    const patch: Record<string, unknown> = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.tags !== undefined) patch.tags = data.tags
    if (data.notes !== undefined) patch.notes = data.notes
    if (data.recipeText !== undefined) patch.recipe_text = data.recipeText
    if (data.craftDetails !== undefined) patch.craft_details = data.craftDetails
    if (data.startDate !== undefined) patch.start_date = data.startDate
    if (data.endDate !== undefined) patch.end_date = data.endDate
    if (data.clearEndDate) patch.end_date = null
    if (data.isPublic !== undefined) patch.is_public = data.isPublic
    if (data.pinterestBoardUrls !== undefined) {
      const sanitized = data.pinterestBoardUrls
        .map(u => u.trim())
        .filter(u => u.length > 0 && isSafeHttpUrl(u))
        .slice(0, 3)
      patch.pinterest_board_urls = JSON.stringify(sanitized)
    }
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('projects').update(patch).eq('id', id)
      raiseError(error, 'Failed to update project')
    }
    return fetchProject(id)
  },

  uploadCoverImage: async (id: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-covers/${id}`)
    const { error } = await supabase.from('project_images').insert({
      project_id: id,
      stored_name: publicUrl,
      original_name: file.name,
      section: COVER,
      material_id: null,
    })
    raiseError(error, 'Failed to add cover image')
    return fetchProject(id)
  },

  setCoverImageMain: async (id: number, imageId: number): Promise<Project> => {
    await supabase
      .from('project_images')
      .update({ is_main: false })
      .eq('project_id', id)
      .eq('section', COVER)
      .is('material_id', null)
    const { error } = await supabase.from('project_images').update({ is_main: true }).eq('id', imageId)
    raiseError(error, 'Failed to set main image')
    return fetchProject(id)
  },

  deleteCoverImage: async (id: number, imageId: number): Promise<Project> => {
    const { data: img } = await supabase.from('project_images').select('stored_name').eq('id', imageId).single()
    const { error } = await supabase.from('project_images').delete().eq('id', imageId)
    raiseError(error, 'Failed to delete cover image')
    await deleteUploadedFile((img as { stored_name: string } | null)?.stored_name)
    return fetchProject(id)
  },

  uploadMaterialImage: async (id: number, materialId: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-materials/${id}/${materialId}`)
    return projectsApi.registerMaterialImageByUrl(id, materialId, publicUrl, file.name)
  },

  registerMaterialImageByUrl: async (
    id: number,
    materialId: number,
    fileUrl: string,
    originalName: string
  ): Promise<Project> => {
    const { error } = await supabase.from('project_images').insert({
      project_id: id,
      stored_name: canonicalStoredName(fileUrl),
      original_name: originalName || 'image',
      section: MATERIAL,
      material_id: materialId,
    })
    raiseError(error, 'Failed to add material image')
    return fetchProject(id)
  },

  setMaterialImageMain: async (id: number, imageId: number): Promise<Project> => {
    const { data: target } = await supabase.from('project_images').select('material_id').eq('id', imageId).single()
    const materialId = (target as { material_id: number | null } | null)?.material_id ?? null
    let unset = supabase.from('project_images').update({ is_main: false }).eq('project_id', id).eq('section', MATERIAL)
    unset = materialId === null ? unset.is('material_id', null) : unset.eq('material_id', materialId)
    await unset
    const { error } = await supabase.from('project_images').update({ is_main: true }).eq('id', imageId)
    raiseError(error, 'Failed to set main image')
    return fetchProject(id)
  },

  deleteMaterialImage: async (id: number, imageId: number): Promise<Project> => {
    const { data: img } = await supabase.from('project_images').select('stored_name').eq('id', imageId).single()
    const { error } = await supabase.from('project_images').delete().eq('id', imageId)
    raiseError(error, 'Failed to delete material image')
    await deleteUploadedFile((img as { stored_name: string } | null)?.stored_name)
    return fetchProject(id)
  },

  delete: async (id: number): Promise<void> => {
    const { data: imgs } = await supabase.from('project_images').select('stored_name').eq('project_id', id)
    const { data: files } = await supabase.from('project_files').select('stored_name').eq('project_id', id)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    raiseError(error, 'Failed to delete project')
    const urls = [
      ...((imgs as { stored_name: string }[]) ?? []).map(i => i.stored_name),
      ...((files as { stored_name: string }[]) ?? []).map(f => f.stored_name),
    ]
    await Promise.all(urls.map(u => deleteUploadedFile(u)))
  },

  addMaterial: async (
    id: number,
    data: {
      name: string
      type: string
      itemType?: string
      color?: string
      colorHex?: string
      amount?: string
      unit?: string
    }
  ): Promise<Project> => {
    const { error } = await supabase.from('materials').insert({
      project_id: id,
      name: data.name,
      type: data.type,
      item_type: data.itemType ?? null,
      color: data.color ?? '',
      color_hex: data.colorHex ?? '#000000',
      amount: data.amount ?? '',
      unit: data.unit ?? 'g',
    })
    raiseError(error, 'Failed to add material')
    return fetchProject(id)
  },

  deleteMaterial: async (id: number, materialId: number): Promise<Project> => {
    const { data: imgs } = await supabase
      .from('project_images')
      .select('stored_name')
      .eq('project_id', id)
      .eq('section', MATERIAL)
      .eq('material_id', materialId)
    await supabase
      .from('project_images')
      .delete()
      .eq('project_id', id)
      .eq('section', MATERIAL)
      .eq('material_id', materialId)
    const { error } = await supabase.from('materials').delete().eq('id', materialId)
    raiseError(error, 'Failed to delete material')
    await Promise.all(((imgs as { stored_name: string }[]) ?? []).map(i => deleteUploadedFile(i.stored_name)))
    return fetchProject(id)
  },

  updateRowCounter: async (
    id: number,
    data: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }
  ): Promise<Project> => {
    const { error } = await supabase.from('row_counters').upsert(
      {
        project_id: id,
        stitches_per_round: data.stitchesPerRound,
        total_rounds: data.totalRounds,
        checked_stitches: data.checkedStitches,
      },
      { onConflict: 'project_id' }
    )
    raiseError(error, 'Failed to update row counter')
    return fetchProject(id)
  },

  createPatternGrid: async (id: number): Promise<Project> => {
    const { error } = await supabase
      .from('pattern_grids')
      .insert({ project_id: id, rows: 10, cols: 10, cell_data: '[]' })
    raiseError(error, 'Failed to create pattern grid')
    return fetchProject(id)
  },

  updatePatternGrid: async (
    id: number,
    gridId: number,
    data: { rows: number; cols: number; cellData: string }
  ): Promise<Project> => {
    if (data.rows < 1 || data.rows > 200 || data.cols < 1 || data.cols > 200) {
      throw new Error('Grid dimensions must be between 1 and 200')
    }
    const { error } = await supabase
      .from('pattern_grids')
      .update({ rows: data.rows, cols: data.cols, cell_data: data.cellData })
      .eq('id', gridId)
      .eq('project_id', id)
    raiseError(error, 'Failed to update pattern grid')
    return fetchProject(id)
  },

  deletePatternGrid: async (id: number, gridId: number): Promise<Project> => {
    const { error } = await supabase.from('pattern_grids').delete().eq('id', gridId).eq('project_id', id)
    raiseError(error, 'Failed to delete pattern grid')
    return fetchProject(id)
  },

  uploadProjectFile: async (id: number, file: File): Promise<Project> => {
    const publicUrl = await uploadFile(file, `project-files/${id}`)
    const mimeType = file.type || 'application/octet-stream'
    const { error } = await supabase.from('project_files').insert({
      project_id: id,
      stored_name: publicUrl,
      original_name: file.name,
      mime_type: mimeType,
      file_type: detectFileType(mimeType, file.name),
    })
    raiseError(error, 'Failed to add file')
    return fetchProject(id)
  },

  deleteFile: async (id: number, fileId: number): Promise<Project> => {
    const { data: file } = await supabase.from('project_files').select('stored_name').eq('id', fileId).single()
    const { error } = await supabase.from('project_files').delete().eq('id', fileId)
    raiseError(error, 'Failed to delete file')
    await deleteUploadedFile((file as { stored_name: string } | null)?.stored_name)
    return fetchProject(id)
  },

  replaceFile: async (id: number, fileId: number, file: File): Promise<Project> => {
    await projectsApi.uploadProjectFile(id, file)
    return projectsApi.deleteFile(id, fileId)
  },
}
