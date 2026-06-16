import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/** Render a component that uses <Link>/router hooks. */
export function renderWithRouter(ui, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>)
}

/**
 * Matcher for a <Price> element. The shekel sign now lives in its own span, so
 * the symbol and amount are separate text nodes — `getByText('₪15')` no longer
 * matches a single node. This finds the `.price` wrapper whose full text reads
 * e.g. "₪15": `screen.getByText(priceText('₪15'))`.
 */
export function priceText(value) {
  return (_content, el) => !!el && el.classList?.contains('price') && el.textContent === value
}

/** Render with both Router + a fresh React Query client (for data-driven UI). */
export function renderWithProviders(ui, { route = '/' } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}
