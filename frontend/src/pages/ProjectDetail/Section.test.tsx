import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Section } from './Section'

describe('Section', () => {
  it('renders the title and children', () => {
    render(
      <Section title="Materials">
        <p>Yarn</p>
      </Section>
    )
    expect(screen.getByRole('heading', { name: 'Materials' })).toBeInTheDocument()
    expect(screen.getByText('Yarn')).toBeInTheDocument()
  })
})
