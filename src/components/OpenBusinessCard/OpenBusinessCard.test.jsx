import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OpenBusinessCard from './OpenBusinessCard'

function renderCard(props) {
  return render(
    <MemoryRouter>
      <OpenBusinessCard {...props} />
    </MemoryRouter>,
  )
}

describe('OpenBusinessCard', () => {
  it('shows a CTA linking to the onboarding flow for non-business users', () => {
    renderCard({ isBusiness: false })
    const link = screen.getByRole('link', { name: /פתיחת חשבון עסקי/ })
    expect(link).toHaveAttribute('href', '/b2c/open-business')
  })

  it('renders nothing for users who already have a business', () => {
    const { container } = renderCard({ isBusiness: true })
    expect(container).toBeEmptyDOMElement()
  })
})
