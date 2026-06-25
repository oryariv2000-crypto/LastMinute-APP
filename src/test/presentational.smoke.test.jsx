import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderWithRouter } from './utils'

/* Smoke tests: each presentational component renders without crashing and
   produces non-empty output with minimal props. Behavior is covered elsewhere. */

import Loader from '../components/Loader/Loader'
import EcoImpactStats from '../components/EcoImpactStats/EcoImpactStats'
import QRCodeDisplay from '../components/QRCodeDisplay/QRCodeDisplay'
import PickupInstructions from '../components/PickupInstructions/PickupInstructions'
import RevenueCard from '../components/RevenueCard/RevenueCard'
import DashboardSummary from '../components/DashboardSummary/DashboardSummary'
import ActivityListItem from '../components/ActivityListItem/ActivityListItem'
import UserProfileHeader from '../components/UserProfileHeader/UserProfileHeader'
import BusinessProfileHeader from '../components/BusinessProfileHeader/BusinessProfileHeader'
import PublishActions from '../components/PublishActions/PublishActions'
import ReviewListItem from '../components/ReviewListItem/ReviewListItem'
import ActiveDealCard from '../components/ActiveDealCard/ActiveDealCard'
import NewDealButton from '../components/NewDealButton/NewDealButton'
import BottomNavigationB2B from '../components/BottomNavigation/BottomNavigationB2B'
import OpenBusinessCard from '../components/OpenBusinessCard/OpenBusinessCard'

const noop = () => {}

const plain = [
  ['Loader', <Loader label="טוען" />],
  ['EcoImpactStats', <EcoImpactStats savedKg={4.2} moneySaved={120} co2Kg={10} ordersCount={6} />],
  ['QRCodeDisplay', <QRCodeDisplay value="LM-1" orderCode="LM-1" businessName="עסק" />],
  ['PickupInstructions', <PickupInstructions businessName="עסק" address="רחוב 1" pickupWindow="היום" onGetDirections={noop} onCallStore={noop} />],
  ['RevenueCard', <RevenueCard label="הכנסות" value={1200} />],
  ['DashboardSummary', <DashboardSummary stats={[{ id: 'rev', label: 'הכנסות', value: 100 }]} />],
  ['ActivityListItem', <ActivityListItem title="הזמנה" subtitle="x" timeAgo="עכשיו" amount={10} />],
  ['UserProfileHeader', <UserProfileHeader name="דנה כהן" email="d@l.co" phone="0500000000" memberSince="2024" onEdit={noop} />],
  ['BusinessProfileHeader', <BusinessProfileHeader businessName="ארומה" ownerName="מיכל" address="כתובת" statusLabel="פתוח" onEdit={noop} onToggleOpen={noop} />],
  ['PublishActions', <PublishActions total={50} onCancel={noop} onPublish={noop} />],
  ['ReviewListItem', <ReviewListItem id="1" title="מאפה" price={10} quantity={5} tags={[]} onTitleChange={noop} onQtyChange={noop} onPriceChange={noop} onImageChange={noop} onTagsChange={noop} onRemove={noop} />],
  ['ActiveDealCard', <ActiveDealCard title="מבצע" originalPrice={20} price={10} discountPct={50} quantity={5} onEdit={noop} onToggleStatus={noop} onDelete={noop} />],
]

const routed = [
  ['NewDealButton', <NewDealButton />],
  ['BottomNavigationB2B', <BottomNavigationB2B notifCount={3} />],
  ['OpenBusinessCard', <OpenBusinessCard isBusiness={false} />],
]

describe('presentational components — smoke render', () => {
  it.each(plain)('%s renders non-empty', (_name, el) => {
    const { container } = render(el)
    expect(container).not.toBeEmptyDOMElement()
  })

  it.each(routed)('%s renders non-empty (with router)', (_name, el) => {
    const { container } = renderWithRouter(el)
    expect(container).not.toBeEmptyDOMElement()
  })
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', async () => {
    const { default: ErrorBoundary } = await import('../components/ErrorBoundary')
    render(<ErrorBoundary><p>תוכן תקין</p></ErrorBoundary>)
    expect(screen.getByText('תוכן תקין')).toBeInTheDocument()
  })

  it('shows a fallback when a child throws', async () => {
    const { default: ErrorBoundary } = await import('../components/ErrorBoundary')
    const Boom = () => { throw new Error('boom') }
    // Silence the expected React error log for this render.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByText('משהו השתבש')).toBeInTheDocument()
    spy.mockRestore()
  })
})
