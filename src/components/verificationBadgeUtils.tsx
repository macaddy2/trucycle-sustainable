import {
  Shield,
  CheckCircle,
  Star,
  Certificate,
  Phone,
  CreditCard,
  MapPin,
  Award,
} from '@phosphor-icons/react'

export interface VerificationLevel {
  email: boolean
  phone: boolean
  identity: boolean
  address: boolean
  payment: boolean
  community: boolean
}

export const verificationDetailConfig = [
  { key: 'email', label: 'Email Verified', icon: <CheckCircle size={12} /> },
  { key: 'phone', label: 'Phone Verified', icon: <Phone size={12} /> },
  { key: 'identity', label: 'Identity Verified', icon: <Certificate size={12} /> },
  { key: 'address', label: 'Address Verified', icon: <MapPin size={12} /> },
  { key: 'payment', label: 'Payment Verified', icon: <CreditCard size={12} /> },
  { key: 'community', label: 'Community Verified', icon: <Award size={12} /> },
] satisfies Array<{ key: keyof VerificationLevel; label: string; icon: JSX.Element }>

export function getVerificationStatus(verified: VerificationLevel) {
  if (!verified || typeof verified !== 'object') {
    return 'basic'
  }

  const checks = Object.values(verified)
  const completedChecks = checks.filter(Boolean).length
  const totalChecks = checks.length

  if (completedChecks === totalChecks) return 'fully-verified'
  if (completedChecks >= 4) return 'highly-verified'
  if (completedChecks >= 2) return 'partially-verified'
  return 'basic'
}

export function getVerificationBadgeText(status: string) {
  switch (status) {
    case 'fully-verified':
      return 'Fully Verified'
    case 'highly-verified':
      return 'Highly Verified'
    case 'partially-verified':
      return 'Verified'
    case 'basic':
      return 'Basic'
    default:
      return 'Unverified'
  }
}

export function getVerificationColor(status: string) {
  switch (status) {
    case 'fully-verified':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'highly-verified':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'partially-verified':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'basic':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    default:
      return 'bg-gray-50 text-gray-500 border-gray-100'
  }
}

export function getVerificationIcon(status: string) {
  switch (status) {
    case 'fully-verified':
      return <Shield size={14} className="text-green-600" />
    case 'highly-verified':
      return <CheckCircle size={14} className="text-blue-600" />
    case 'partially-verified':
      return <Star size={14} className="text-amber-600" />
    case 'basic':
      return <Certificate size={14} className="text-gray-500" />
    default:
      return null
  }
}
