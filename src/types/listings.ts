import type { ListingClassificationResult } from '@/lib/ai/classifier'
import type { ModerationResult } from '@/lib/ai/moderation'
import type { DropOffLocation } from '@/components/dropOffLocations'

export type ListingStatus = 'active' | 'pending_dropoff' | 'claimed' | 'collected' | 'expired'
export type ListingActionType = 'exchange' | 'donate' | 'recycle'
export type FulfillmentMethod = 'pickup' | 'dropoff'

export interface ListingValuation {
  estimatedValue?: number
  rewardPoints?: number
  recommendedPriceRange?: [number, number]
  confidence?: 'high' | 'medium' | 'low'
  narrative?: string
}

export interface ManagedListing {
  id: string
  title: string
  description?: string
  status: ListingStatus
  category: string
  createdAt: string
  actionType: ListingActionType
  fulfillmentMethod?: FulfillmentMethod
  dropOffLocation?: DropOffLocation | { name: string; postcode: string; address?: string }
  location?: string
  condition?: string
  contactMethod?: string
  photos?: string[]
  valuation?: ListingValuation
  rewardPoints?: number
  // New API fields
  reward?: number
  reward_currency?: string
  co2Impact?: number
  aiClassification?: ListingClassificationResult
  moderation?: ModerationResult
  userId?: string
  userName?: string
  handoverNotes?: string
  preferPartnerSupport?: boolean
  claimId?: string
  claimStatus?: 'pending' | 'approved' | 'declined' | 'completed'
  claimCreatedAt?: string
  claimApprovedAt?: string
  claimCompletedAt?: string
}
