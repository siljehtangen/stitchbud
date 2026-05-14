import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field } from './Field'

describe('Field', () => {
  it('renders the label text', () => {
    render(
      <Field label="Needle size">
        <input />
      </Field>
    )
    expect(screen.getByText('Needle size')).toBeInTheDocument()
  })

  it('renders children inside the field', () => {
    render(
      <Field label="Color">
        <input data-testid="color-input" />
      </Field>
    )
    expect(screen.getByTestId('color-input')).toBeInTheDocument()
  })

  it('does not render required asterisk by default', () => {
    render(
      <Field label="Name">
        <input />
      </Field>
    )
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('renders required asterisk when required prop is true', () => {
    render(
      <Field label="Name" required>
        <input />
      </Field>
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('applies custom className to the wrapper', () => {
    const { container } = render(
      <Field label="Name" className="mt-4">
        <input />
      </Field>
    )
    expect(container.firstChild).toHaveClass('mt-4')
  })

  it('label is associated with children via wrapper structure', () => {
    render(
      <Field label="Gauge">
        <input />
      </Field>
    )
    const label = screen.getByText('Gauge').closest('label')
    expect(label).toBeInTheDocument()
  })
})
