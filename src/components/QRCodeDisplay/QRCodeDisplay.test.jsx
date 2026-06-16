import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QRCodeDisplay from './QRCodeDisplay'

describe('QRCodeDisplay', () => {
  it('renders a real scannable QR encoding the order code', () => {
    const { container } = render(
      <QRCodeDisplay value="LM-1234" orderCode="LM-1234" businessName="מאפייה" />,
    )
    // A real QR <svg> is rendered (not the old decorative placeholder).
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.queryByLabelText(/QR placeholder/)).not.toBeInTheDocument()
    // Human-readable code is still shown beneath the QR.
    expect(screen.getByText('LM-1234', { selector: '.qr-display__code-value' })).toBeInTheDocument()
  })

  it('encodes the explicit value when it differs from the displayed code', () => {
    const { container } = render(<QRCodeDisplay value="LM-PAYLOAD" orderCode="LM-1234" />)
    // qrcode.react exposes the encoded payload as the svg title.
    expect(container.querySelector('svg title')).toHaveTextContent('LM-PAYLOAD')
  })

  it('prefers a pre-rendered QR image when imageUrl is provided', () => {
    render(<QRCodeDisplay imageUrl="https://example.com/q.png" orderCode="LM-9" />)
    expect(screen.getByAltText('קוד QR')).toBeInTheDocument()
  })
})
