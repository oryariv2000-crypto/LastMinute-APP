import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { renderWithRouter } from './utils'

import StatsChartsSection from '../components/StatsChartsSection/StatsChartsSection'
import ActiveDealsSection from '../components/ActiveDealsSection/ActiveDealsSection'
import SettingsList from '../components/SettingsList/SettingsList'
import BusinessSettingsList from '../components/BusinessSettingsList/BusinessSettingsList'
import CameraCaptureSection from '../components/CameraCaptureSection/CameraCaptureSection'
import LocationPickerModal from '../components/LocationPickerModal/LocationPickerModal'
import AddressBookModal from '../components/AddressBookModal/AddressBookModal'
import ProfileEditModal from '../components/ProfileEditModal/ProfileEditModal'
import DealEditModal from '../components/DealEditModal/DealEditModal'

const noop = () => {}

const sampleDeal = {
  id: 'd1', title: 'מאפה', original_price: 20, discount_price: 10,
  quantity_total: 8, quantity_left: 5, status: 'active', tags: [],
}

const settingsGroups = [{ id: 'g1', title: 'העדפות', items: [{ id: 'i1', label: 'שפה', type: 'value', value: 'עברית' }] }]

const plain = [
  ['StatsChartsSection', <StatsChartsSection bars={[]} products={[]} barsTitle="הכנסות" />],
  ['SettingsList', <SettingsList groups={settingsGroups} />],
  ['BusinessSettingsList', <BusinessSettingsList groups={settingsGroups} />],
  ['CameraCaptureSection', <CameraCaptureSection onChange={noop} />],
  ['LocationPickerModal', <LocationPickerModal value="תל אביב" onSelect={noop} onClose={noop} />],
  ['AddressBookModal', <AddressBookModal addresses={['רחוב 1']} onSave={noop} onClose={noop} />],
  ['ProfileEditModal', <ProfileEditModal fields={[{ name: 'full_name', label: 'שם' }]} initial={{ full_name: 'דנה' }} onSave={noop} onClose={noop} />],
  ['DealEditModal', <DealEditModal deal={sampleDeal} onSave={noop} onClose={noop} />],
]

const routed = [
  ['ActiveDealsSection', <ActiveDealsSection deals={[]} onEdit={noop} onToggleStatus={noop} onDelete={noop} />],
]

describe('presentational components (wave 2) — smoke render', () => {
  it.each(plain)('%s renders non-empty', (_n, el) => {
    const { container } = render(el)
    expect(container).not.toBeEmptyDOMElement()
  })

  it.each(routed)('%s renders non-empty (with router)', (_n, el) => {
    const { container } = renderWithRouter(el)
    expect(container).not.toBeEmptyDOMElement()
  })
})
