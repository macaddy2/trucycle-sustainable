import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getVerificationBadgeText,
  getVerificationColor,
  getVerificationIcon,
  getVerificationStatus,
  verificationDetailConfig,
  type VerificationLevel,
} from './verificationBadgeUtils'

export interface VerificationBadgeProps {
  verified?: VerificationLevel | Partial<VerificationLevel>
  className?: string
  showTooltip?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

export function VerificationBadge({
  verified,
  className = '',
  showTooltip = true,
  variant = 'default' 
}: VerificationBadgeProps) {
  const normalizedVerification: VerificationLevel = {
    email: false,
    identity: false,
    address: false,
    ...(verified ?? {}),
  };
  const status = getVerificationStatus(normalizedVerification)
  const badgeText = getVerificationBadgeText(status)
  const colorClass = getVerificationColor(status)
  const icon = getVerificationIcon(status)
  const verificationDetails = verificationDetailConfig.map(detail => ({
    ...detail,
    verified: normalizedVerification[detail.key],
  }))
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

