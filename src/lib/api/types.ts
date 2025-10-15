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
  roles?: string[]
  role?: string
}

// Auth DTOs from OpenAPI
export interface RegisterDto {
  first_name: string
  last_name: string
  email: string
  password: string
  role?: 'customer' | 'collector' | 'facility' | 'admin' | 'finance' | 'partner'
  shop?: CreateShopDto
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

export interface OpeningHoursDto {
  days?: string[]
  open_time?: string | null
  close_time?: string | null
}

export interface CreateShopDto {
  name: string
  phone_number?: string | null
  address_line: string
  postcode: string
  latitude?: number
  longitude?: number
  opening_hours?: OpeningHoursDto | null
  acceptable_categories?: string[]
}

export interface ShopDto {
  id: string
  name: string
  phone_number?: string | null
  address_line?: string | null
  postcode?: string | null
  latitude?: number | null
  longitude?: number | null
  opening_hours?: OpeningHoursDto | null
  acceptable_categories?: string[]
  active?: boolean
  distanceMeters?: number | null
}

export type NearbyShop = ShopDto

export type PartnerShopSummary = ShopDto

export interface PartnerShopItem {
  id: string
  title?: string
  status?: string
  pickup_option?: PickupOption
  category?: string | null
  created_at?: string
  updated_at?: string
  shop?: { id?: string; name?: string | null } | null
  claim_status?: string | null
  metadata?: Record<string, unknown> | null
}

export interface ListMyShopItemsResponse {
  items: PartnerShopItem[]
  pagination: { page: number; limit: number; total: number; total_pages: number }
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

export interface UpdateItemDto {
  title?: string
  description?: string
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  category?: string
  address_line?: string
  postcode?: string
  images?: CreateItemImageDto[]
  dropoff_location_id?: string
  delivery_preferences?: string
  metadata?: Record<string, unknown>
  size_unit?: SizeUnit
  size_length?: number
  size_breadth?: number
  size_height?: number
  weight_kg?: number
  estimated_co2_saved_kg?: number
  pickup_option?: PickupOption
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

export interface UpdateItemResponse extends CreateItemResponse {
  updated_at?: string
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

// New: collection
export interface CollectItemDto {
  shop_id?: string
}

export interface CollectItemResponse {
  id: string
  status: ClaimStatusApi | 'complete'
  scan_type?: string
  scan_result?: string
  completed_at?: string
  scan_events?: Array<{
    scan_type?: string
    shop_id?: string
    scanned_at?: string
  }>
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

// QR scanning and item view
export interface QrItemView {
  id: string
  status?: string
  pickup_option?: PickupOption
  qr_code?: string | null
  claim?: { id?: string; status?: string; collector_id?: string | null } | null
  scan_events?: Array<{ scan_type?: string; shop_id?: string | null; scanned_at?: string }>
}

export interface QrScanAck {
  accepted: boolean
  duplicate?: boolean
  idempotencyKey?: string
  direction?: 'in' | 'out'
}

export interface DropoffScanDto {
  shop_id: string
  action: 'accept' | 'reject'
  reason?: string
}

export interface ShopScanDto {
  shop_id: string
  notes?: string
}

export interface DropoffInResult {
  scan_result?: string
  scan_type?: string
  item_status?: string
  scanned_at?: string
  scan_events?: Array<{ scan_type?: string; shop_id?: string | null; scanned_at?: string }>
}

export interface ClaimOutResult {
  id?: string
  status?: string
  scan_type?: string
  scan_result?: string
  completed_at?: string
  scan_events?: Array<{ scan_type?: string; shop_id?: string | null; scanned_at?: string }>
}

// Impact metrics
export interface ImpactMonthlyGoal {
  target_kg: number
  achieved_kg: number
  remaining_kg: number
  progress_percent: number
}

export interface ImpactMetrics {
  total_co2_saved_kg: number
  items_exchanged: number
  items_donated: number
  monthly_goal: ImpactMonthlyGoal
}
