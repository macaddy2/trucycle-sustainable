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

