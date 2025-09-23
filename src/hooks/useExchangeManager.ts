import { useCallback, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

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
  const [claimRequests, setClaimRequests] = useKV<ClaimRequest[]>('claim-requests', [])
  const [donorRewards, setDonorRewards] = useKV<Record<string, number>>('donor-rewards', {})
  const [collectedItems, setCollectedItems] = useKV<Record<string, CollectedItemRecord>>('collected-items', {})

  const submitClaimRequest = useCallback((
    payload: Omit<ClaimRequest, 'id' | 'status' | 'createdAt' | 'decisionAt'>,
  ): ClaimRequest | null => {
    const existing = claimRequests.find(
      request =>
        request.itemId === payload.itemId &&
        request.collectorId === payload.collectorId &&
        request.status !== 'completed',
    )

    if (existing) {
      toast.info('You have already requested this item. The donor will review your request shortly.')
      return existing
    }

    const newRequest: ClaimRequest = {
      ...payload,
      id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    setClaimRequests(prev => [...prev, newRequest])
    toast.success('Request sent! The donor will review your interest.')

    window.dispatchEvent(
      new CustomEvent('exchange-claim-requested', {
        detail: { request: newRequest },
      }),
    )

    return newRequest
  }, [claimRequests, setClaimRequests])

  const confirmClaimRequest = useCallback((requestId: string): ClaimRequest | null => {
    const target = claimRequests.find(request => request.id === requestId)
    if (!target) return null

    const decisionTimestamp = new Date().toISOString()

    const updatedRequests = claimRequests.map(request => {
      if (request.id === requestId) {
        return { ...request, status: 'approved', decisionAt: decisionTimestamp }
      }

      if (request.itemId === target.itemId && request.status === 'pending') {
        return { ...request, status: 'declined', decisionAt: decisionTimestamp }
      }

      return request
    })

    setClaimRequests(updatedRequests)

    const approvedRequest = updatedRequests.find(request => request.id === requestId) || null
    if (approvedRequest) {
      toast.success(`${approvedRequest.collectorName} has been approved for this exchange.`)
    }

    return approvedRequest
  }, [claimRequests, setClaimRequests])

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

    toast.success(`Collection confirmed! ${rewardPoints} GreenPoints have been added to your rewards.`)

    window.dispatchEvent(
      new CustomEvent('exchange-collection-confirmed', {
        detail: { request: updatedRequest, rewardPoints },
      }),
    )

    return { request: updatedRequest, rewardPoints }
  }, [claimRequests, setClaimRequests, setCollectedItems, setDonorRewards])

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
