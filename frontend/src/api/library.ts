import type { LibraryItem } from '../types'
import { supabase, getUserId, uploadFile, deleteUploadedFile, raiseError } from './client'
import { libraryItemSchema, safeParsed } from './schemas'
import { rowToLibraryItem, type DbLibraryItem } from './mappers'
import { withSignedLibraryMedia, withSignedLibraryItemsMedia } from './media'
import { z } from 'zod'

const LIBRARY_SELECT = '*, library_item_images(*)'

function colorsToColumn(colors?: string[]): string {
  return (colors ?? []).filter(c => c.length > 0).join(',')
}

async function fetchItem(id: number): Promise<LibraryItem> {
  const { data, error } = await supabase.from('library_items').select(LIBRARY_SELECT).eq('id', id).single()
  raiseError(error, 'Library item not found')
  return withSignedLibraryMedia(safeParsed(libraryItemSchema, rowToLibraryItem(data as DbLibraryItem), 'LibraryItem'))
}

interface LibraryFields {
  name?: string
  colors?: string[]
  yarnMaterial?: string
  yarnBrand?: string
  yarnAmountG?: number
  yarnAmountM?: number
  fabricWidthCm?: number
  fabricLengthCm?: number
  needleSizeMm?: string
  circularLengthCm?: number
  hookSizeMm?: string
}

function toColumns(data: LibraryFields): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.colors !== undefined) patch.colors = colorsToColumn(data.colors)
  if (data.yarnMaterial !== undefined) patch.yarn_material = data.yarnMaterial
  if (data.yarnBrand !== undefined) patch.yarn_brand = data.yarnBrand
  if (data.yarnAmountG !== undefined) patch.yarn_amountg = data.yarnAmountG
  if (data.yarnAmountM !== undefined) patch.yarn_amountm = data.yarnAmountM
  if (data.fabricWidthCm !== undefined) patch.fabric_width_cm = data.fabricWidthCm
  if (data.fabricLengthCm !== undefined) patch.fabric_length_cm = data.fabricLengthCm
  if (data.needleSizeMm !== undefined) patch.needle_size_mm = data.needleSizeMm
  if (data.circularLengthCm !== undefined) patch.circular_length_cm = data.circularLengthCm
  if (data.hookSizeMm !== undefined) patch.hook_size_mm = data.hookSizeMm
  return patch
}

export const libraryApi = {
  getAll: async (): Promise<LibraryItem[]> => {
    const { data, error } = await supabase
      .from('library_items')
      .select(LIBRARY_SELECT)
      .order('created_at', { ascending: false })
    raiseError(error, 'Failed to load library')
    const mapped = ((data as DbLibraryItem[]) ?? []).map(rowToLibraryItem)
    const items = safeParsed(z.array(libraryItemSchema), mapped, 'LibraryItem[]')
    return withSignedLibraryItemsMedia(items)
  },

  create: async (data: { itemType: string; name: string } & LibraryFields): Promise<LibraryItem> => {
    const userId = await getUserId()
    const { data: inserted, error } = await supabase
      .from('library_items')
      .insert({ user_id: userId, item_type: data.itemType, ...toColumns(data) })
      .select('id')
      .single()
    raiseError(error, 'Failed to create library item')
    return fetchItem((inserted as { id: number }).id)
  },

  registerLibraryImage: async (id: number, file: File): Promise<LibraryItem> => {
    const publicUrl = await uploadFile(file, `library/${id}`)
    const { error } = await supabase.from('library_item_images').insert({
      library_item_id: id,
      stored_name: publicUrl,
      original_name: file.name,
    })
    raiseError(error, 'Failed to add image')
    return fetchItem(id)
  },

  setLibraryImageMain: async (libraryItemId: number, imageId: number): Promise<LibraryItem> => {
    await supabase.from('library_item_images').update({ is_main: false }).eq('library_item_id', libraryItemId)
    const { error } = await supabase.from('library_item_images').update({ is_main: true }).eq('id', imageId)
    raiseError(error, 'Failed to set main image')
    return fetchItem(libraryItemId)
  },

  deleteLibraryImage: async (libraryItemId: number, imageId: number): Promise<LibraryItem> => {
    const { data: img } = await supabase.from('library_item_images').select('stored_name').eq('id', imageId).single()
    const { error } = await supabase.from('library_item_images').delete().eq('id', imageId)
    raiseError(error, 'Failed to delete image')
    await deleteUploadedFile((img as { stored_name: string } | null)?.stored_name)
    return fetchItem(libraryItemId)
  },

  update: async (id: number, data: LibraryFields): Promise<LibraryItem> => {
    const patch = toColumns(data)
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('library_items').update(patch).eq('id', id)
      raiseError(error, 'Failed to update library item')
    }
    return fetchItem(id)
  },

  delete: async (id: number): Promise<void> => {
    const { data: imgs } = await supabase.from('library_item_images').select('stored_name').eq('library_item_id', id)
    const { error } = await supabase.from('library_items').delete().eq('id', id)
    raiseError(error, 'Failed to delete library item')
    await Promise.all(((imgs as { stored_name: string }[]) ?? []).map(i => deleteUploadedFile(i.stored_name)))
  },
}
