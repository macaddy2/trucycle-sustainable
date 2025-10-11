export type ApiStatus = 'success' | 'error' | string

export interface ApiEnvelope<T = unknown> {
  status: ApiStatus
  message?: string
  data: T
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

export interface MinimalUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  status?: string
}

// Auth DTOs from OpenAPI
export interface RegisterDto {
  first_name: string
  last_name: string
  email: string
  password: string
  role?: 'customer' | 'collector' | 'facility' | 'admin' | 'finance' | 'partner'
}

export interface LoginDto {
  email: string
  password: string
}

export interface ResendVerificationDto {
  email: string
}

export interface ForgetPasswordDto {
  email: string
}

export interface VerifyDto {
  token: string
}

export interface ResetPasswordDto {
  token: string
  new_password: string
}

export interface MeResponse {
  user: MinimalUser
}

export interface LoginResponse {
  user: MinimalUser
  tokens: Tokens
}

export interface RegisterResponse {
  user: MinimalUser & { status?: string }
}

// Item-related types
export type PickupOption = 'donate' | 'exchange' | 'recycle'

export interface CreateItemImageDto {
  url: string
  altText?: string | null
}

export type SizeUnit = 'm' | 'inch' | 'ft'

export interface CreateItemDto {
  title: string
  description?: string
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  category: string
  address_line: string
  postcode: string
  images?: CreateItemImageDto[]
  pickup_option: PickupOption
  dropoff_location_id?: string
  delivery_preferences?: string
  metadata?: Record<string, unknown>
  size_unit: SizeUnit
  size_length: number
  size_breadth: number
  size_height: number
  weight_kg: number
  // IMPORTANT: Intentionally omit estimated_co2_saved_kg (backend computes it)
}

export interface PublicItemOwner {
  id: string
  name?: string | null
  profile_image?: string | null
  verification?: {
    email_verified?: boolean
    identity_verified?: boolean
    address_verified?: boolean
  }
  rating?: number
  reviews_count?: number
}

export interface PublicItemImage {
  url: string
  altText?: string | null
}

export interface PublicItem {
  id: string
  title: string
  status?: string
  pickup_option?: PickupOption
  images?: PublicItemImage[]
  estimated_co2_saved_kg?: number
  owner?: PublicItemOwner
  created_at: string
  distance_km?: number
  category?: string
  description?: string
  condition?: string
  qr_code?: string | null
}

export interface SearchItemsResponse {
  search_origin?: { lat: number; lng: number; radius_km: number }
  items: PublicItem[]
}

export interface CreateItemResponse {
  id: string
  title: string
  status: string
  pickup_option: PickupOption
  estimated_co2_saved_kg?: number
  location?: {
    address_line?: string
    postcode?: string
    latitude?: number
    longitude?: number
  }
  qr_code?: string | null
  created_at?: string
}

export interface MyListedItem {
  id: string
  title: string
  status: string
  pickup_option?: PickupOption
  qr_code?: string | null
  images?: PublicItemImage[]
  estimated_co2_saved_kg?: number
  metadata?: Record<string, unknown> | null
  location?: {
    address_line?: string
    postcode?: string
    latitude?: number
    longitude?: number
  }
  created_at: string
  claim?: MyListedItemClaim | null
}

export interface MyListedItemsResponse {
  items: MyListedItem[]
  pagination: { page: number; limit: number; total: number; total_pages: number }
}

export interface MyCollectedItemEntry {
  claim_id: string
  claim_status: string
  claim_created_at?: string
  claim_approved_at?: string
  claim_completed_at?: string
  item: PublicItem & {
    location?: { address_line?: string; postcode?: string; latitude?: number; longitude?: number }
    owner?: { id: string; name?: string | null; profile_image?: string | null }
  }
}

export interface MyCollectedItemsResponse {
  items: MyCollectedItemEntry[]
  pagination: { page: number; limit: number; total: number; total_pages: number }
}

// Claims
export type ClaimStatusApi =
  | 'pending_approval'
  | 'approved'
  | 'complete'
  | 'rejected'
  | 'cancelled'

export interface ClaimCollectorSummary {
  id: string
  name?: string | null
  profile_image?: string | null
}

export interface MyListedItemClaim {
  id: string
  status: ClaimStatusApi
  approved_at?: string | null
  completed_at?: string | null
  collector: ClaimCollectorSummary
}

export interface CreateClaimDto {
  item_id: string
}

export interface CreateClaimResponse {
  id: string
  item_id: string
  collector_id?: string
  status: ClaimStatusApi
  created_at?: string
}

export interface ApproveClaimResponse {
  id: string
  status: ClaimStatusApi
  approved_at?: string
}

// Messaging (HTTP endpoints for system/general + room management)
export interface DMParticipant {
  id: string
  firstName?: string | null
  lastName?: string | null
  profileImageUrl?: string | null
  online?: boolean
}

export interface DMMessageView {
  id: string
  roomId: string
  direction: 'incoming' | 'outgoing' | 'general' | string
  category: 'direct' | 'general' | string
  imageUrl?: string | null
  caption?: string | null
  text?: string | null
  createdAt: string
  sender: DMParticipant
}

export interface DMRoom {
  id: string
  participants: DMParticipant[]
  lastMessage?: DMMessageView
  createdAt?: string
  updatedAt?: string
}

export interface ListRoomMessagesResponse {
  messages: DMMessageView[]
  nextCursor?: string | null
}
