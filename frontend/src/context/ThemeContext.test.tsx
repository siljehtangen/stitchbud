import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'

// jsdom in this project does not expose the full Storage API as a global,
// so we stub localStorage with a real in-memory implementation.
let store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => {
    delete store[k]
  },
  clear: () => {
    store = {}
  },
  length: 0,
  key: (i: number) => Object.keys(store)[i] ?? null,
})

function ThemeDisplay() {
  const { theme } = useTheme()
  return <span data-testid="theme">{theme}</span>
}

function ThemeToggle({ next }: { next: string }) {
  const { setTheme } = useTheme()
  return <button onClick={() => setTheme(next as never)}>Set {next}</button>
}

describe('ThemeContext', () => {
  beforeEach(() => {
    store = {}
    document.body.removeAttribute('data-theme')
  })

  // ──────── initial theme ────────

  it('defaults to beige when localStorage has no saved theme', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme').textContent).toBe('beige')
  })

  it('reads the saved theme from localStorage on mount', () => {
    store['theme'] = 'blue'
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme').textContent).toBe('blue')
  })

  // ──────── setTheme side-effects ────────

  it('updates the rendered theme when setTheme is called', async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
        <ThemeToggle next="green" />
      </ThemeProvider>
    )
    await userEvent.click(screen.getByText('Set green'))
    expect(screen.getByTestId('theme').textContent).toBe('green')
  })

  it('sets data-theme attribute on document.body when theme changes', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle next="lavender" />
      </ThemeProvider>
    )
    await userEvent.click(screen.getByText('Set lavender'))
    expect(document.body.getAttribute('data-theme')).toBe('lavender')
  })

  it('persists the new theme to localStorage when setTheme is called', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle next="blue" />
      </ThemeProvider>
    )
    await userEvent.click(screen.getByText('Set blue'))
    expect(store['theme']).toBe('blue')
  })

  it('sets data-theme on mount from the initial theme', () => {
    store['theme'] = 'green'
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    )
    expect(document.body.getAttribute('data-theme')).toBe('green')
  })

  // ──────── useTheme outside provider ────────

  it('returns the default beige theme when used outside the provider', () => {
    render(<ThemeDisplay />)
    expect(screen.getByTestId('theme').textContent).toBe('beige')
  })
})
