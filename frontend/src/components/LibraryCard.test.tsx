import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LibraryCard } from './LibraryCard'
import { libraryApi } from '../api'
import type { LibraryItem } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('../hooks/useConfirmDelete', () => ({
  useConfirmDelete: () => vi.fn(),
}))

vi.mock('../api', () => ({
  libraryApi: {
    update: vi.fn(),
    registerLibraryImage: vi.fn(),
    deleteLibraryImage: vi.fn(),
    setLibraryImageMain: vi.fn(),
  },
}))

vi.mock('../colors', () => ({
  resolveColorDisplay: (name: string) => ({ hex: '#aabbcc', displayName: name }),
}))

vi.mock('./LibraryItemForm', () => ({
  Field: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  ColorPicker: () => null,
  MAX_LIBRARY_PHOTOS: 5,
  LIBRARY_PHOTO_ACCEPT: 'image/*',
  COLOR_ITEM_TYPES: ['YARN', 'FABRIC'],
  TYPE_ICONS: { YARN: 'y', FABRIC: 'f', KNITTING_NEEDLE: 'n', CROCHET_HOOK: 'h' },
}))

vi.mock('./LibraryItemTypeFields', () => ({
  LibraryItemTypeFields: () => null,
}))

const baseItem: LibraryItem = {
  id: 1,
  itemType: 'KNITTING_NEEDLE',
  name: '3.5 mm Knitting Needle',
  needleSizeMm: '3.5',
  colors: [],
  createdAt: 0,
}

function renderCard(
  overrides: Partial<LibraryItem> = {},
  callbacks: {
    onDelete?: (id: number) => void
    onUpdated?: (updated: LibraryItem) => void
  } = {}
) {
  const onDelete = callbacks.onDelete ?? (vi.fn() as (id: number) => void)
  const onUpdated = callbacks.onUpdated ?? (vi.fn() as (updated: LibraryItem) => void)
  render(<LibraryCard item={{ ...baseItem, ...overrides }} onDelete={onDelete} onUpdated={onUpdated} />)
  return { onDelete, onUpdated }
}

describe('LibraryCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders item name', () => {
    renderCard()
    expect(screen.getByText('3.5 mm Knitting Needle')).toBeInTheDocument()
  })

  it('renders item summary as subtitle', () => {
    renderCard()
    expect(screen.getByText('3.5 mm')).toBeInTheDocument()
  })

  it('renders color swatches with display names', () => {
    renderCard({ itemType: 'YARN', name: 'Merino Wool', colors: ['Red', 'Blue'] })
    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
  })

  it('shows placeholder when no image is set', () => {
    renderCard()
    expect(screen.getByTestId('library-card-placeholder')).toBeInTheDocument()
  })

  it('calls onDelete with item id when delete button is clicked', async () => {
    const onDelete = vi.fn()
    renderCard({}, { onDelete })
    await userEvent.click(screen.getByLabelText('delete'))
    expect(onDelete).toHaveBeenCalledWith(1)
  })

  it('opens the edit dialog when the edit button is clicked', async () => {
    renderCard()
    await userEvent.click(screen.getByLabelText('edit'))
    expect(screen.getByText('lib_editing')).toBeInTheDocument()
    expect(screen.getByText('lib_save_changes')).toBeInTheDocument()
    expect(screen.getByText('cancel')).toBeInTheDocument()
  })

  it('pre-fills the name input with the current item name', async () => {
    renderCard()
    await userEvent.click(screen.getByLabelText('edit'))
    expect(screen.getByDisplayValue('3.5 mm Knitting Needle')).toBeInTheDocument()
  })

  it('exits edit mode when cancel is clicked without saving', async () => {
    renderCard()
    await userEvent.click(screen.getByLabelText('edit'))
    await userEvent.click(screen.getByText('cancel'))
    expect(screen.queryByText('lib_save_changes')).not.toBeInTheDocument()
    expect(screen.getByLabelText('edit')).toBeInTheDocument()
  })

  it('calls libraryApi.update with the current name and calls onUpdated', async () => {
    const updatedItem = { ...baseItem, name: 'Updated Name' }
    vi.mocked(libraryApi.update).mockResolvedValue(updatedItem)
    const onUpdated = vi.fn() as (updated: LibraryItem) => void

    renderCard({}, { onUpdated })
    await userEvent.click(screen.getByLabelText('edit'))
    await userEvent.click(screen.getByText('lib_save_changes'))

    expect(libraryApi.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: '3.5 mm Knitting Needle' }))
    expect(onUpdated).toHaveBeenCalledWith(updatedItem)
  })

  it('saves the edited name to the API', async () => {
    vi.mocked(libraryApi.update).mockResolvedValue({ ...baseItem, name: 'New Name' })

    renderCard()
    await userEvent.click(screen.getByLabelText('edit'))
    await userEvent.clear(screen.getByDisplayValue('3.5 mm Knitting Needle'))
    await userEvent.type(screen.getByRole('textbox'), 'New Name')
    await userEvent.click(screen.getByText('lib_save_changes'))

    expect(libraryApi.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'New Name' }))
  })

  it('returns to view mode after a successful save', async () => {
    vi.mocked(libraryApi.update).mockResolvedValue(baseItem)
    renderCard()
    await userEvent.click(screen.getByLabelText('edit'))
    await userEvent.click(screen.getByText('lib_save_changes'))
    expect(screen.queryByText('lib_save_changes')).not.toBeInTheDocument()
    expect(screen.getByLabelText('edit')).toBeInTheDocument()
  })
})
