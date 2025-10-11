import { kvGet, kvSet, kvDelete } from '@/lib/kvStore'
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
  MyListedItemsResponse,
  MyCollectedItemsResponse,
  // claims
  CreateClaimDto,
  CreateClaimResponse,
  ApproveClaimResponse,
} from './types'

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '') || ''

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (options.auth) {
    const tokens = await getTokens()
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`
    }
  }

  const res = await fetch(url, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
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
    sp.append(k, String(v))
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

export async function listMyItems(params?: { status?: string; page?: number; limit?: number }) {
  const qs = toQuery(params)
  return request<ApiEnvelope<MyListedItemsResponse>>(`/items/me/listed${qs}`, { auth: true })
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
