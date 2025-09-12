import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Shield, 
  CheckCircle, 
  Star, 
  Certificate, 
  Phone, 
  CreditCard,
  MapPin,
  Award
} from '@phosphor-icons/react'

export interface VerificationLevel {
  email: boolean
  phone: boolean
  identity: boolean
  address: boolean
  payment: boolean
  community: boolean // Based on successful exchanges and good ratings
}

export interface VerificationBadgeProps {
  verified: VerificationLevel
  className?: string
  showTooltip?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

// Calculate overall verification status
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
    case 'fully-verified': return 'Fully Verified'
    case 'highly-verified': return 'Highly Verified'
    case 'partially-verified': return 'Verified'
    case 'basic': return 'Basic'
    default: return 'Unverified'
  }
}

export function getVerificationColor(status: string) {
  switch (status) {
    case 'fully-verified': return 'bg-green-100 text-green-800 border-green-200'
    case 'highly-verified': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'partially-verified': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'basic': return 'bg-gray-100 text-gray-600 border-gray-200'
    default: return 'bg-gray-50 text-gray-500 border-gray-100'
  }
}

export function getVerificationIcon(status: string) {
  switch (status) {
    case 'fully-verified': return <Shield size={14} className="text-green-600" />
    case 'highly-verified': return <CheckCircle size={14} className="text-blue-600" />
    case 'partially-verified': return <Star size={14} className="text-amber-600" />
    case 'basic': return <Certificate size={14} className="text-gray-500" />
    default: return null
  }
}

export function VerificationBadge({ 
  verified, 
  className = '', 
  showTooltip = true, 
  variant = 'default' 
}: VerificationBadgeProps) {
  const status = getVerificationStatus(verified)
  const badgeText = getVerificationBadgeText(status)
  const colorClass = getVerificationColor(status)
  const icon = getVerificationIcon(status)

  const verificationDetails = [
    { key: 'email', label: 'Email Verified', icon: <CheckCircle size={12} />, verified: verified.email },
    { key: 'phone', label: 'Phone Verified', icon: <Phone size={12} />, verified: verified.phone },
    { key: 'identity', label: 'Identity Verified', icon: <Certificate size={12} />, verified: verified.identity },
    { key: 'address', label: 'Address Verified', icon: <MapPin size={12} />, verified: verified.address },
    { key: 'payment', label: 'Payment Verified', icon: <CreditCard size={12} />, verified: verified.payment },
    { key: 'community', label: 'Community Verified', icon: <Award size={12} />, verified: verified.community }
  ]

  const completedCount = verificationDetails.filter(item => item.verified).length

  if (variant === 'compact') {
    const badge = (
      <Badge 
        variant="outline" 
        className={`text-xs flex items-center space-x-1 ${colorClass} ${className}`}
      >
        {icon}
        <span>{completedCount}/{verificationDetails.length}</span>
      </Badge>
    )

    if (!showTooltip) return badge

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium text-xs mb-2">{badgeText}</p>
              {verificationDetails.map((item) => (
                <div key={item.key} className="flex items-center space-x-2 text-xs">
                  <span className={item.verified ? 'text-green-600' : 'text-gray-400'}>
                    {item.icon}
                  </span>
                  <span className={item.verified ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                  {item.verified && <span className="text-green-600">✓</span>}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-2 ${className}`}>
        <Badge 
          variant="outline" 
          className={`flex items-center space-x-2 ${colorClass}`}
        >
          {icon}
          <span>{badgeText}</span>
          <span className="text-xs">({completedCount}/{verificationDetails.length})</span>
        </Badge>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {verificationDetails.map((item) => (
            <div key={item.key} className="flex items-center space-x-1">
              <span className={item.verified ? 'text-green-600' : 'text-gray-400'}>
                {item.icon}
              </span>
              <span className={item.verified ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
              {item.verified && <span className="text-green-600 text-xs">✓</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Default variant
  const badge = (
    <Badge 
      variant="outline" 
      className={`flex items-center space-x-1 ${colorClass} ${className}`}
    >
      {icon}
      <span>{badgeText}</span>
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm mb-2">{badgeText} ({completedCount}/{verificationDetails.length})</p>
            {verificationDetails.map((item) => (
              <div key={item.key} className="flex items-center space-x-2 text-sm">
                <span className={item.verified ? 'text-green-600' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span className={item.verified ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
                {item.verified && <span className="text-green-600">✓</span>}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}