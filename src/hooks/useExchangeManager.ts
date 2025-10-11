import { useCallback, useMemo, useState } from 'react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import type { ManagedListing } from '@/types/listings'
import { kvGet, kvSet } from '@/lib/kvStore'
import type { QRCodeData } from '@/components/QRCode'
import { createClaim, approveClaim } from '@/lib/api'

export interface ClaimRequest {
  id: string
  itemId: string
  itemTitle: string
  itemImage?: string
  donorId: string
  donorName: string
  collectorId: string
  collectorName: string
  collectorAvatar?: string
  note?: string
  status: 'pending' | 'approved' | 'declined' | 'completed'
  createdAt: string
  decisionAt?: string
}

interface CollectedItemRecord {
  collected: boolean
  confirmedAt: string
}

interface CompleteRequestResult {
  request: ClaimRequest
  rewardPoints: number
  alreadyCompleted?: boolean
}

export function useExchangeManager() {
  // Stop persisting demo claims/rewards/collections; hold minimal session state only
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([])
  const [donorRewards, setDonorRewards] = useState<Record<string, number>>({})
  const [collectedItems, setCollectedItems] = useState<Record<string, CollectedItemRecord>>({})
  const [userListings, setUserListings] = useKV<ManagedListing[]>('user-listings', [])
  const [globalListings, setGlobalListings] = useKV<ManagedListing[]>('global-listings', [])
  const [, setUserQrCodes] = useKV<QRCodeData[]>('user-qr-codes', [])

  const submitClaimRequest = useCallback(
    async (
      payload: Omit<ClaimRequest, 'id' | 'status' | 'createdAt' | 'decisionAt'>,
    ): Promise<ClaimRequest | null> => {
      try {
        // Call backend to create claim
        const result = await createClaim({ item_id: payload.itemId })
        const data = result?.data
        const newRequest: ClaimRequest = {
          ...payload,
          id: String(data?.id || `claim_${Date.now()}`),
          status: 'pending', // backend uses 'pending_approval'
          createdAt: String(data?.created_at || new Date().toISOString()),
        }

        // Keep lightweight in-session list for UX; do not persist
        setClaimRequests(prev => [...prev, newRequest])

        toast.success('Request sent! The donor will review your request.')

        window.dispatchEvent(
          new CustomEvent('exchange-claim-requested', {
            detail: { request: newRequest },
          }),
        )

        return newRequest
      } catch (e: any) {
        toast.error(e?.message || 'Failed to submit claim')
        return null
      }
    },
    [],
  )

  const createQrCodesForExchange = useCallback(async (
    listing: ManagedListing,
    request: ClaimRequest
  ) => {
    const transactionId = `TC${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const baseMetadata: QRCodeData['metadata'] = {
      category: listing.category || 'general',
      condition: listing.condition || 'good',
      co2Impact: listing.co2Impact ?? 5,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      actionType: listing.actionType || 'donate',
    }

    const dropOffLocation = listing.fulfillmentMethod === 'dropoff' && listing.dropOffLocation
      ? `${listing.dropOffLocation.name}${listing.dropOffLocation.postcode ? `, ${listing.dropOffLocation.postcode}` : ''}`
      : listing.location

    const donorQr: QRCodeData = {
      id: `qr-${Date.now()}-donor`,
      type: 'donor',
      itemId: listing.id,
      itemTitle: listing.title,
      itemDescription: listing.description,
      itemImage: listing.photos?.[0],
      userId: request.donorId,
      userName: request.donorName,
      transactionId,
      dropOffLocation: dropOffLocation || undefined,
      metadata: baseMetadata,
      status: 'active',
    }

    const collectorQr: QRCodeData = {
      ...donorQr,
      id: `qr-${Date.now()}-collector`,
      type: 'collector',
      userId: request.collectorId,
      userName: request.collectorName,
    }

    const existingGlobal = await kvGet<QRCodeData[]>('global-qr-codes') || []
    const filteredGlobal = existingGlobal.filter((qr) => qr.transactionId !== transactionId)
    await kvSet('global-qr-codes', [...filteredGlobal, donorQr, collectorQr])

    setUserQrCodes((previous) => {
      const filtered = previous.filter(
        (qr) => !(qr.transactionId === transactionId && (qr.userId === request.donorId || qr.userId === request.collectorId))
      )
      return [...filtered, donorQr, collectorQr]
    })

    toast.success('QR codes prepared for this exchange', {
      description: 'Both parties can now access the hand-off codes from the QR hub.',
    })
  }, [setUserQrCodes])

  const confirmClaimRequest = useCallback(
    async (requestId: string): Promise<ClaimRequest | null> => {
      // Try to find local record for richer UI context
      const target = claimRequests.find(request => request.id === requestId) || null
      try {
        await approveClaim(requestId)
      } catch (e: any) {
        toast.error(e?.message || 'Failed to approve claim')
        return null
      }

      const decisionTimestamp = new Date().toISOString()
      let approvedRequest: ClaimRequest | null = null

      // Update local in-session list for UX only
      setClaimRequests(prev => prev.map(req => {
        if (req.id === requestId) {
          approvedRequest = { ...req, status: 'approved', decisionAt: decisionTimestamp }
          return approvedRequest
        }
        // For the same item, mark other pending ones as declined locally
        if (target && req.itemId === target.itemId && req.status === 'pending') {
          return { ...req, status: 'declined', decisionAt: decisionTimestamp }
        }
        return req
      }))

      if (approvedRequest) {
        toast.success(`${approvedRequest.collectorName} has been approved for this exchange.`)

        const relatedListing = globalListings.find(listing => listing.id === approvedRequest!.itemId)
          || userListings.find(listing => listing.id === approvedRequest!.itemId)

        if (relatedListing) {
          await createQrCodesForExchange(relatedListing, approvedRequest)
        }
      }

      return approvedRequest
    },
    [claimRequests, globalListings, userListings, createQrCodesForExchange],
  )

  const completeClaimRequest = useCallback((requestId: string, rewardPoints = 25): CompleteRequestResult | null => {
    const target = claimRequests.find(request => request.id === requestId)
    if (!target) return null

    if (target.status === 'completed') {
      return { request: target, rewardPoints: 0, alreadyCompleted: true }
    }

    const updatedRequest: ClaimRequest = {
      ...target,
      status: 'completed',
      decisionAt: new Date().toISOString(),
    }

    setClaimRequests(prev => prev.map(request => request.id === requestId ? updatedRequest : request))

    setCollectedItems(prev => ({
      ...prev,
      [updatedRequest.itemId]: {
        collected: true,
        confirmedAt: updatedRequest.decisionAt!,
      },
    }))

    setDonorRewards(prev => ({
      ...prev,
      [updatedRequest.donorId]: (prev[updatedRequest.donorId] ?? 0) + rewardPoints,
    }))

    setUserListings(prev => prev.map(listing => (
      listing.id === updatedRequest.itemId
        ? { ...listing, status: 'collected' as const }
        : listing
    )))

    setGlobalListings(prev => prev.map(listing => (
      listing.id === updatedRequest.itemId
        ? { ...listing, status: 'collected' as const }
        : listing
    )))

    toast.success(`Collection confirmed! ${rewardPoints} GreenPoints have been added to your rewards.`)

    window.dispatchEvent(
      new CustomEvent('exchange-collection-confirmed', {
        detail: { request: updatedRequest, rewardPoints },
      }),
    )

    return { request: updatedRequest, rewardPoints }
  }, [claimRequests, setClaimRequests, setCollectedItems, setDonorRewards, setGlobalListings, setUserListings])

  const getRequestsForItem = useCallback((itemId: string) => {
    return claimRequests.filter(request => request.itemId === itemId)
  }, [claimRequests])

  const getRequestsForDonor = useCallback((donorId: string) => {
    return claimRequests.filter(request => request.donorId === donorId)
  }, [claimRequests])

  const getClaimRequestById = useCallback((requestId: string) => {
    return claimRequests.find(request => request.id === requestId) ?? null
  }, [claimRequests])

  const getRewardBalance = useCallback((donorId: string) => {
    return donorRewards[donorId] ?? 0
  }, [donorRewards])

  const getItemCollectionStatus = useCallback((itemId: string): CollectedItemRecord | null => {
    return collectedItems[itemId] ?? null
  }, [collectedItems])

  const pendingRequestCountByItem = useMemo(() => {
    return claimRequests.reduce<Record<string, number>>((accumulator, request) => {
      if (request.status === 'pending') {
        accumulator[request.itemId] = (accumulator[request.itemId] ?? 0) + 1
      }
      return accumulator
    }, {})
  }, [claimRequests])

  return {
    claimRequests,
    submitClaimRequest,
    confirmClaimRequest,
    completeClaimRequest,
    getRequestsForItem,
    getRequestsForDonor,
    getClaimRequestById,
    getRewardBalance,
    getItemCollectionStatus,
    pendingRequestCountByItem,
  }
}
