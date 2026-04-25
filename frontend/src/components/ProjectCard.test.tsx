import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectCard from './ProjectCard'
import type { Project } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

vi.mock('../projectOverviewMedia', () => ({
  projectCoverImageUrls: vi.fn(() => []),
}))

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'Test Project',
    description: '',
    category: 'KNITTING',
    tags: '',
    coverImages: [],
    notes: '',
    recipeText: '',
    pinterestBoardUrls: [],
    craftDetails: '',
    materials: [],
    files: [],
    patternGrids: [],
    isPublic: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('ProjectCard', () => {
  it('renders project name', () => {
    render(<ProjectCard project={makeProject({ name: 'My Scarf' })} onClick={vi.fn()} />)
    expect(screen.getByText('My Scarf')).toBeInTheDocument()
  })

  it('renders translated category badge', () => {
    render(<ProjectCard project={makeProject({ category: 'CROCHET' })} onClick={vi.fn()} />)
    expect(screen.getByText('category_crochet')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<ProjectCard project={makeProject({ description: 'A warm hat' })} onClick={vi.fn()} />)
    expect(screen.getByText('A warm hat')).toBeInTheDocument()
  })

  it('omits description element when empty', () => {
    render(<ProjectCard project={makeProject({ description: '' })} onClick={vi.fn()} />)
    expect(screen.queryByText('A warm hat')).not.toBeInTheDocument()
  })

  it('renders up to 3 material type badges and an overflow count', () => {
    const materials = ['Yarn', 'Needle', 'Hook', 'Fabric'].map((type, i) => ({
      id: i + 1, name: type, type, color: '', colorHex: '', amount: '', unit: '', images: [],
    }))
    render(<ProjectCard project={makeProject({ materials })} onClick={vi.fn()} />)
    expect(screen.getByText('Yarn')).toBeInTheDocument()
    expect(screen.getByText('Needle')).toBeInTheDocument()
    expect(screen.getByText('Hook')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.queryByText('Fabric')).not.toBeInTheDocument()
  })

  it('shows progress percentage when row counter is present', () => {
    const project = makeProject({
      rowCounter: {
        id: 1,
        stitchesPerRound: 10,
        totalRounds: 10,
        checkedStitches: JSON.stringify(Array.from({ length: 50 }, (_, i) => i)),
      },
    })
    render(<ProjectCard project={project} onClick={vi.fn()} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows 0% progress when no stitches are checked', () => {
    const project = makeProject({
      rowCounter: {
        id: 1,
        stitchesPerRound: 10,
        totalRounds: 10,
        checkedStitches: '[]',
      },
    })
    render(<ProjectCard project={project} onClick={vi.fn()} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('hides progress bar when no row counter', () => {
    const { container } = render(<ProjectCard project={makeProject()} onClick={vi.fn()} />)
    expect(container.querySelector('.bg-sand-green-dark')).not.toBeInTheDocument()
  })

  it('hides progress bar when totalRounds is 0', () => {
    const project = makeProject({
      rowCounter: { id: 1, stitchesPerRound: 10, totalRounds: 0, checkedStitches: '[]' },
    })
    const { container } = render(<ProjectCard project={project} onClick={vi.fn()} />)
    expect(container.querySelector('.bg-sand-green-dark')).not.toBeInTheDocument()
  })

  it('fires onClick when the card button is clicked', async () => {
    const onClick = vi.fn()
    render(<ProjectCard project={makeProject()} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows icon placeholder when there is no cover image', () => {
    const { container } = render(<ProjectCard project={makeProject()} onClick={vi.fn()} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })
})
