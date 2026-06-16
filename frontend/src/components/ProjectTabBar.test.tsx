import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectTabBar } from './ProjectTabBar'

const tabs = [
  { id: 'info' as const, label: 'Info', icon: <span>i</span> },
  { id: 'materials' as const, label: 'Materials', icon: <span>m</span> },
]

describe('ProjectTabBar', () => {
  it('renders a tablist with every tab and marks the active one as selected', () => {
    render(<ProjectTabBar tabs={tabs} activeTab="info" onSelect={() => {}} />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Materials' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onSelect with the tab id when a tab is clicked', () => {
    const onSelect = vi.fn()
    render(<ProjectTabBar tabs={tabs} activeTab="info" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Materials' }))

    expect(onSelect).toHaveBeenCalledWith('materials')
  })
})
