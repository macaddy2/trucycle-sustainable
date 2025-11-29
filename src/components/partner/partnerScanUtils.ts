export type ScanMode = 'dropoff' | 'pickup'

const PRE_DROPOFF_STATUSES = new Set(['pending_dropoff', 'active'])

export interface PartnerScanStateInput {
  pickupStatus?: string | null
  pickupOption?: string | null
  hasClaimContext: boolean
}

export interface PartnerScanStateResult {
  normalizedStatus: string | null
  dropoffAllowed: boolean
  pickupAllowed: boolean
  actionMode: ScanMode
}

export function normalizeItemStatus(status?: string | null) {
  if (!status) return null
  const normalized = String(status).trim().toLowerCase()
  return normalized || null
}

export function computePartnerScanState({
  pickupStatus,
  pickupOption,
  hasClaimContext,
}: PartnerScanStateInput): PartnerScanStateResult {
  const normalizedStatus = normalizeItemStatus(pickupStatus)
  const normalizedPickupOption = pickupOption ? String(pickupOption).trim().toLowerCase() : null
  const isDonate = normalizedPickupOption === 'donate'
  const isPreDropoffStatus = !normalizedStatus || PRE_DROPOFF_STATUSES.has(normalizedStatus)
  const dropoffAllowed = isDonate && (isPreDropoffStatus || !hasClaimContext)
  const pickupAllowed = normalizedStatus === 'awaiting_collection'
  const actionMode: ScanMode = dropoffAllowed ? 'dropoff' : pickupAllowed ? 'pickup' : 'dropoff'

  return {
    normalizedStatus,
    dropoffAllowed,
    pickupAllowed,
    actionMode,
  }
}
