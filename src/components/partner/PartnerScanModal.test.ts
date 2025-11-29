import { describe, expect, it } from 'vitest'
import { computePartnerScanState } from './partnerScanUtils'

describe('computePartnerScanState', () => {
  it('prefers drop-off for donate items in pre-dropoff states', () => {
    const state = computePartnerScanState({
      pickupStatus: 'pending_dropoff',
      pickupOption: 'donate',
      hasClaimContext: false,
    })

    expect(state.actionMode).toBe('dropoff')
    expect(state.dropoffAllowed).toBe(true)
    expect(state.pickupAllowed).toBe(false)
  })

  it('falls back to drop-off when donate items have no claim context', () => {
    const state = computePartnerScanState({
      pickupStatus: 'awaiting_collection',
      pickupOption: 'donate',
      hasClaimContext: false,
    })

    expect(state.actionMode).toBe('dropoff')
    expect(state.dropoffAllowed).toBe(true)
    expect(state.pickupAllowed).toBe(true)
  })

  it('enables pickup only for awaiting collection statuses', () => {
    const state = computePartnerScanState({
      pickupStatus: 'awaiting_collection',
      pickupOption: 'donate',
      hasClaimContext: true,
    })

    expect(state.actionMode).toBe('pickup')
    expect(state.dropoffAllowed).toBe(false)
    expect(state.pickupAllowed).toBe(true)
  })
})
