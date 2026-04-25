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
    <div><label>{label}</label>{children}</div>
  ),
  ColorPicker: () => null,
  MAX_LIBRARY_PHOTOS: 5,
  LIBRARY_PHOTO_ACCEPT: 'image/*',
  COLOR_ITEM_TYPES: ['YARN', 'FABRIC'],
}))

vi.mock('./LibraryItemTypeFields', () => ({
  LibraryItemTypeFields: () => null,
}))

const baseItem: LibraryItem = {
  id: 1,
  itemType: 'KNITTING_NEEDLE',
  name: 'Merino Wool',
  colors: [],
  createdAt: 0,
}

function renderCard(
  overrides: Partial<LibraryItem> = {},
  callbacks: {
    onDelete?: (id: number) => void
    onUpdated?: (updated: LibraryItem) => void
  } = {},
) {
  const onDelete = callbacks.onDelete ?? (vi.fn() as (id: number) => void)
  const onUpdated = callbacks.onUpdated ?? (vi.fn() as (updated: LibraryItem) => void)
  render(
    <LibraryCard
      item={{ ...baseItem, ...overrides }}
      subtitle="1 project"
      onDelete={onDelete}
      onImageUploaded={vi.fn()}
      onUpdated={onUpdated}
    />
  )
  return { onDelete, onUpdated }
}

describe('LibraryCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders item name', () => {
    renderCard()
    expect(screen.getByText('Merino Wool')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    renderCard()
    expect(screen.getByText('1 project')).toBeInTheDocument()
  })

  it('renders color swatches with display names', () => {
    renderCard({ colors: ['Red', 'Blue'] })
    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
  })

  it('shows camera placeholder when no image', () => {
    renderCard()
    expect(screen.getByText('📷')).toBeInTheDocument()
  })

  it('calls onDelete with item id when delete button is clicked', async () => {
    const onDelete = vi.fn()
    renderCard({}, { onDelete })
    await userEvent.click(screen.getByText('×'))
    expect(onDelete).toHaveBeenCalledWith(1)
  })

  it('switches to edit mode when edit button is clicked', async () => {
    renderCard()
    await userEvent.click(screen.getByText('✎'))
    expect(screen.getByText('save')).toBeInTheDocument()
    expect(screen.getByText('cancel')).toBeInTheDocument()
  })

  it('shows the current name in the edit input', async () => {
    renderCard()
    await userEvent.click(screen.getByText('✎'))
    expect(screen.getByDisplayValue('Merino Wool')).toBeInTheDocument()
  })

  it('exits edit mode when cancel is clicked', async () => {
    renderCard()
    await userEvent.click(screen.getByText('✎'))
    await userEvent.click(screen.getByText('cancel'))
    expect(screen.queryByText('save')).not.toBeInTheDocument()
    expect(screen.getByText('✎')).toBeInTheDocument()
  })

  it('calls libraryApi.update and onUpdated when save is clicked', async () => {
    const updatedItem = { ...baseItem, name: 'Updated Name' }
    vi.mocked(libraryApi.update).mockResolvedValue(updatedItem)
    const onUpdated = vi.fn()

    render(
      <LibraryCard
        item={baseItem}
        subtitle=""
        onDelete={vi.fn()}
        onImageUploaded={vi.fn()}
        onUpdated={onUpdated}
      />
    )

    await userEvent.click(screen.getByText('✎'))
    await userEvent.click(screen.getByText('save'))

    expect(libraryApi.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Merino Wool' }),
    )
    expect(onUpdated).toHaveBeenCalledWith(updatedItem)
  })

  it('returns to view mode after a successful save', async () => {
    vi.mocked(libraryApi.update).mockResolvedValue(baseItem)

    renderCard()
    await userEvent.click(screen.getByText('✎'))
    await userEvent.click(screen.getByText('save'))

    expect(screen.queryByText('save')).not.toBeInTheDocument()
    expect(screen.getByText('✎')).toBeInTheDocument()
  })
})
