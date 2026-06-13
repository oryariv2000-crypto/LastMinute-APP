import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DevelopmentNotice from './DevelopmentNotice'

describe('DevelopmentNotice', () => {
  it('renders a badge with the default label', () => {
    render(<DevelopmentNotice variant="badge" />)
    expect(screen.getByText('בפיתוח')).toBeInTheDocument()
  })

  it('renders a badge with a custom label', () => {
    render(<DevelopmentNotice variant="badge" label="בקרוב" />)
    expect(screen.getByText('בקרוב')).toBeInTheDocument()
  })

  it('defaults to the badge variant', () => {
    render(<DevelopmentNotice />)
    expect(screen.getByText('בפיתוח')).toBeInTheDocument()
  })

  it('renders a banner with title and body as a note', () => {
    render(
      <DevelopmentNotice variant="banner" title="תכונה בפיתוח">
        מציין מקום לאינטגרציית תשלום אמיתית
      </DevelopmentNotice>,
    )
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('תכונה בפיתוח')
    expect(note).toHaveTextContent('מציין מקום לאינטגרציית תשלום אמיתית')
  })
})
