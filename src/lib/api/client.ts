import { kvGet, kvSet, kvDelete } from '@/lib/kvStore'
import { startLoading, finishLoading } from '@/lib/loadingStore'
import type {
  ApiEnvelope,
  ForgetPasswordDto,
  LoginDto,
  LoginResponse,
  RegisterDto,
  RegisterResponse,
  ResendVerificationDto,
  ResetPasswordDto,
  Tokens,
  VerifyDto,
  MeResponse,
  // items
  CreateItemDto,
  SearchItemsResponse,
  CreateItemResponse,
  UpdateItemDto,
  UpdateItemResponse,
  PublicItem,
  MyListedItemsResponse,
  MyCollectedItemsResponse,
  // claims
  CreateClaimDto,
  CreateClaimResponse,
  ApproveClaimResponse,
  CollectItemDto,
  CollectItemResponse,
  // messaging
  DMRoom,
  ListRoomMessagesResponse,
  DMMessageView,
  // shops
  CreateShopDto,
  NearbyShop,
  ShopDto,
  ListMyShopItemsResponse,
  MinimalUser,
  // qr
  QrItemView,
  QrScanAck,
  DropoffInResult,
  ClaimOutResult,
  DropoffScanDto,
  ShopScanDto,
  ImpactMetrics,
} from './types'

export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || ''

const TOKENS_KEY = 'auth.tokens'

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function getTokens(): Promise<Tokens | undefined> {
  return kvGet<Tokens>(TOKENS_KEY)
}

async function setTokens(tokens: Tokens): Promise<void> {
  await kvSet<Tokens>(TOKENS_KEY, tokens)
}

export async function clearTokens(): Promise<void> {
  await kvDelete(TOKENS_KEY)
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
  headers?: Record<string, string>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not set. Add it to your .env file.')
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const headers: Record<string, string> = { ...options.headers }

  if (options.auth) {
    const tokens = await getTokens()
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`
    }
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!isFormData) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  startLoading()
  const res = await fetch(url, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers,
    body: options.body ? (isFormData ? (options.body as any) : JSON.stringify(options.body)) : undefined,
  }).finally(() => {
    // Ensure we always signal completion regardless of success/failure
    finishLoading()
  })

  let payload: any = undefined
  try {
    payload = await res.json()
  } catch {
    // ignore JSON parse error for non-JSON responses
  }

  if (!res.ok) {
    const message = (payload && (payload.message || payload.error || payload.status)) || res.statusText || 'Request failed'
    throw new ApiError(String(message), res.status, payload)
  }

  return payload as T
}

// AUTH ENDPOINTS
export async function authHealth() {
  return request<ApiEnvelope<{ status: string }>>('/auth/health')
}

export async function register(dto: RegisterDto) {
  return request<ApiEnvelope<RegisterResponse>>('/auth/register', {
    method: 'POST',
    body: dto,
  })
}

export async function login(dto: LoginDto) {
  const result = await request<ApiEnvelope<LoginResponse>>('/auth/login', {
    method: 'POST',
    body: dto,
  })
  if (result?.data?.tokens) {
    await setTokens(result.data.tokens)
  }
  return result
}

export async function resendVerification(dto: ResendVerificationDto) {
  return request<ApiEnvelope<null>>('/auth/resend-verification', {
    method: 'POST',
    body: dto,
  })
}

export async function forgetPassword(dto: ForgetPasswordDto) {
  return request<ApiEnvelope<null>>('/auth/forget-password', {
    method: 'POST',
    body: dto,
  })
}

export async function verify(dto: VerifyDto) {
  const result = await request<ApiEnvelope<LoginResponse>>('/auth/verify', {
    method: 'POST',
    body: dto,
  })
  if (result?.data?.tokens) {
    await setTokens(result.data.tokens)
  }
  return result
}

export async function resetPassword(dto: ResetPasswordDto) {
  return request<ApiEnvelope<null>>('/auth/reset-password', {
    method: 'POST',
    body: dto,
  })
}

export async function me() {
  return request<ApiEnvelope<MeResponse>>('/auth/me', {
    method: 'GET',
    auth: true,
  })
}

export const tokens = {
  get: getTokens,
  set: setTokens,
  clear: clearTokens,
}

// Helper: build query string from params
function toQuery(params: Record<string, any> | undefined): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (k === 'limit') {
      const num = Number(v)
      const capped = Number.isFinite(num) ? Math.min(num, 50) : 50
      sp.append(k, String(capped))
    } else if (k === 'lat' || k === 'lng' || k === 'lon' || k === 'latitude' || k === 'longitude') {
      if (typeof v === 'number' && Number.isFinite(v)) {
        sp.append(k, v.toFixed(7))
      } else {
        sp.append(k, String(v))
      }
    } else {
      sp.append(k, String(v))
    }
  })
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

// ITEMS ENDPOINTS
export async function searchItems(params?: {
  lat?: number
  lng?: number
  postcode?: string
  radius?: number
  status?: string
  category?: string
  page?: number
  limit?: number
}) {
  const qs = toQuery(params)
  return request<ApiEnvelope<SearchItemsResponse>>(`/items${qs}`)
}

export async function createItem(dto: CreateItemDto) {
  // IMPORTANT: do NOT include estimated_co2_saved_kg (backend calculates it)
  return request<ApiEnvelope<CreateItemResponse>>('/items', {
    method: 'POST',
    auth: true,
    body: dto,
  })
}

export async function updateItem(id: string, dto: UpdateItemDto) {
  return request<ApiEnvelope<UpdateItemResponse>>(`/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    auth: true,
    body: dto,
  })
}

export async function listMyItems(params?: { status?: string; page?: number; limit?: number }) {
  const qs = toQuery(params)
  return request<ApiEnvelope<MyListedItemsResponse>>(`/items/me/listed${qs}`, { auth: true })
}

export async function getItemById(id: string) {
  return request<ApiEnvelope<PublicItem>>(`/items/${encodeURIComponent(id)}`)
}

export async function listMyCollectedItems(params?: {
  status?: string
  claim_status?: string
  page?: number
  limit?: number
}) {
  const qs = toQuery(params)
  return request<ApiEnvelope<MyCollectedItemsResponse>>(`/items/me/collected${qs}`, { auth: true })
}

// CLAIMS ENDPOINTS
export async function createClaim(dto: CreateClaimDto) {
  return request<ApiEnvelope<CreateClaimResponse>>('/claims', {
    method: 'POST',
    auth: true,
    body: dto,
  })
}

export async function approveClaim(id: string) {
  return request<ApiEnvelope<ApproveClaimResponse>>(`/claims/${id}/approve`, {
    method: 'PATCH',
    auth: true,
  })
}

export async function collectItem(itemId: string, dto?: CollectItemDto) {
  // Request body is required by OpenAPI; send empty object if none
  return request<ApiEnvelope<CollectItemResponse>>(`/items/${itemId}/collect`, {
    method: 'POST',
    auth: true,
    body: dto ?? {},
  })
}

// MESSAGING ENDPOINTS (system/general over HTTP; direct chat via WebSocket later)
export async function createOrFindRoom(otherUserId: string) {
  return request<ApiEnvelope<DMRoom>>('/messages/rooms', {
    method: 'POST',
    auth: true,
    body: { otherUserId },
  })
}

export async function listActiveRooms() {
  return request<ApiEnvelope<DMRoom[]>>('/messages/rooms/active', { auth: true })
}

export async function listRoomMessages(roomId: string, params?: { limit?: number; cursor?: string }) {
  const qs = toQuery(params as any)
  return request<ApiEnvelope<ListRoomMessagesResponse>>(`/messages/rooms/${roomId}/messages${qs}`, { auth: true })
}

export async function sendGeneralMessage(roomId: string, payload: { title?: string; text: string }) {
  return request<ApiEnvelope<DMMessageView>>(`/messages/rooms/${roomId}/messages/general`, {
    method: 'POST',
    auth: true,
    body: payload,
  })
}

export async function sendImageMessage(roomId: string, file: File | Blob, caption?: string) {
  const form = new FormData()
  form.append('image', file)
  if (caption) form.append('caption', caption)
  return request<ApiEnvelope<DMMessageView>>(`/messages/rooms/${roomId}/messages/image`, {
    method: 'POST',
    auth: true,
    body: form,
  })
}

export async function deleteRoom(roomId: string) {
  return request<ApiEnvelope<{ success: boolean }>>(`/messages/rooms/${roomId}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function clearRoomMessages(roomId: string) {
  return request<ApiEnvelope<{ success: boolean }>>(`/messages/rooms/${roomId}/messages`, {
    method: 'DELETE',
    auth: true,
  })
}

// SHOPS ENDPOINTS
export async function shopsNearby(params?: { lon?: number; lat?: number; postcode?: string; radius_m?: number }) {
  const qs = toQuery(params as any)
  return request<ApiEnvelope<NearbyShop[]>>(`/shops/nearby${qs}`)
}

export async function listMyShops() {
  return request<ApiEnvelope<ShopDto[]>>('/shops/me', { auth: true })
}

export async function createShop(dto: CreateShopDto) {
  return request<ApiEnvelope<ShopDto>>('/shops', {
    method: 'POST',
    auth: true,
    body: dto,
  })
}

export async function listPartnerItems(params?: {
  status?: string
  pickup_option?: PickupOption
  category?: string
  created_from?: string
  created_to?: string
  limit?: number
  page?: number
}) {
  const qs = toQuery(params as any)
  return request<ApiEnvelope<ListMyShopItemsResponse>>(`/shops/me/items${qs}`, { auth: true })
}

// PARTNER UPGRADE
export async function upgradeToPartner(dto?: CreateShopDto) {
  // Backend accepts optional CreateShopDto; send empty object when omitted
  return request<ApiEnvelope<{ user: MinimalUser; shop?: ShopDto }>>('/auth/upgrade-to-partner', {
    method: 'POST',
    auth: true,
    body: dto ?? {},
  })
}

// QR ENDPOINTS
export async function qrScan(payload: { qrPayload: string; direction: 'in' | 'out'; shopId?: string; location?: any }) {
  const headers: Record<string, string> = {
    'idempotency-key': (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function')
      ? (crypto as any).randomUUID()
      : `idemp-${Date.now()}`,
  }
  return request<ApiEnvelope<QrScanAck>>('/qr/scan', { method: 'POST', auth: true, body: payload, headers })
}

export async function qrViewItem(itemId: string) {
  return request<ApiEnvelope<QrItemView>>(`/qr/item/${encodeURIComponent(itemId)}/view`, { auth: true })
}

export async function qrDropoffIn(itemId: string, dto?: DropoffScanDto) {
  return request<ApiEnvelope<DropoffInResult>>(`/qr/item/${encodeURIComponent(itemId)}/dropoff-in`, {
    method: 'POST',
    auth: true,
    body: dto ?? {},
  })
}

export async function qrClaimOut(itemId: string, dto?: ShopScanDto) {
  return request<ApiEnvelope<ClaimOutResult>>(`/qr/item/${encodeURIComponent(itemId)}/claim-out`, {
    method: 'POST',
    auth: true,
    body: dto ?? {},
  })
}

// IMPACT ENDPOINTS
export async function getMyImpactMetrics() {
  return request<ApiEnvelope<ImpactMetrics>>('/items/me/impact', { auth: true })
}
