import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  Package, 
  MapPin, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  User,
  Shield
} from '@phosphor-icons/react'
import { kvGet, kvSet } from '@/lib/kvStore'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

interface ProfileOnboardingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  mode?: 'onboarding' | 'edit'
}

interface UserProfile {
  id: string
  email: string
  name: string
  userType: 'donor' | 'collector'
  postcode?: string
  area?: string
  district?: string
  serviceArea?: string
  createdAt: string
  onboardingCompleted?: boolean
  addressVerified?: boolean
  addressVerifiedAt?: string
  verificationLevel?: {
    email: boolean
    identity: boolean
    address: boolean
  }
  rewardsBalance?: number
  partnerAccess?: boolean
}

export function ProfileOnboarding({ open, onOpenChange, onComplete, mode = 'onboarding' }: ProfileOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  const [user, setUser] = useKV('current-user', null)
  
  const [profileData, setProfileData] = useState({
    userType: user?.userType ?? '',
    postcode: user?.postcode ?? '',
    motivation: '',
    partnerAccess: Boolean(user?.partnerAccess)
  })

  useEffect(() => {
    if (!open) {
      return
    }

    setCurrentStep(1)
    setProfileData({
      userType: user?.userType ?? '',
      postcode: user?.postcode ?? '',
      motivation: '',
      partnerAccess: Boolean(user?.partnerAccess)
    })
  }, [open, user])

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  const handleNext = () => {
    if (currentStep === 1 && !profileData.userType) {
      toast.error('Please select your profile type')
      return
    }

    if (currentStep === 2) {
      if (!profileData.postcode.trim()) {
        toast.error('Please enter your postcode')
        return
      }

      if (!validatePostcode(profileData.postcode)) {
        toast.error('Enter a valid UK postcode to continue')
        return
      }

      setProfileData((prev) => ({ ...prev, postcode: formatPostcode(prev.postcode) }))
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\d?[A-Z]{2}$/

  const normalizePostcode = (value: string) => value.replace(/\s+/g, '').toUpperCase()
  const formatPostcode = (value: string) => {
    const normalized = normalizePostcode(value)
    if (!normalized) {
      return ''
    }
    if (normalized.length <= 3) {
      return normalized
    }
    return `${normalized.slice(0, normalized.length - 3)} ${normalized.slice(-3)}`
  }

  const handlePostcodeChange = (value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
    const normalized = normalizePostcode(sanitized).slice(0, 8)
    const formatted = formatPostcode(normalized)
    setProfileData((prev) => ({ ...prev, postcode: formatted }))
  }

  const validatePostcode = (postcode: string) => UK_POSTCODE_REGEX.test(normalizePostcode(postcode))

  const deriveAreaDetails = (postcode: string) => {
    const normalized = normalizePostcode(postcode)
    if (!validatePostcode(normalized)) {
      return { area: undefined, district: undefined, serviceArea: undefined }
    }

    const outward = normalized.slice(0, normalized.length - 3)
    const londonPrefixes = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC']
    const isLondon = londonPrefixes.some((prefix) => outward.startsWith(prefix))

    return {
      area: outward,
      district: isLondon ? 'London' : 'United Kingdom',
      serviceArea: isLondon ? 'Greater London' : 'National network'
    }
  }

  const verifyPostcodeDetails = async (postcode: string) => ({
    isValid: validatePostcode(postcode),
    ...deriveAreaDetails(postcode),
  })

  const handleComplete = async () => {
    if (!profileData.postcode || !validatePostcode(profileData.postcode)) {
      toast.error('Enter a valid postcode to finish onboarding')
      return
    }

    setIsLoading(true)

    try {
      const verificationData = await verifyPostcodeDetails(profileData.postcode)

      if (!verificationData.isValid) {
        toast.error('Please enter a valid UK postcode to continue onboarding')
        return
      }

      const formattedPostcode = formatPostcode(profileData.postcode)

      // Update user profile with verified address data
      const updatedUser: UserProfile = {
        ...(user || {}),
        id: user?.id || `user_${Date.now()}`,
        email: user?.email || '',
        name: user?.name || '',
        userType: profileData.userType as 'donor' | 'collector',
        postcode: formattedPostcode,
        area: verificationData.area ?? formattedPostcode.split(' ')[0],
        district: verificationData.district ?? 'United Kingdom',
        serviceArea: verificationData.serviceArea ?? 'National network',
        createdAt: user?.createdAt || new Date().toISOString(),
        onboardingCompleted: true,
        addressVerified: true,
        addressVerifiedAt: new Date().toISOString(),
        verificationLevel: {
          email: true,
          identity: user?.verificationLevel?.identity ?? false,
          address: true,
        },
        rewardsBalance: user?.rewardsBalance ?? 0,
        partnerAccess: Boolean(profileData.partnerAccess)
      }

      // Save to user profiles
      const userProfiles = await kvGet('user-profiles') || {}
      await kvSet('user-profiles', {
        ...userProfiles,
        [updatedUser.id]: updatedUser
      })

      // Initialize user preferences based on profile type
      const initialPreferences = {
        userId: updatedUser.id,
        userType: updatedUser.userType,
        location: {
          postcode: updatedUser.postcode,
          area: updatedUser.area,
          district: updatedUser.district
        },
        notifications: {
          newMatches: true,
          messages: true,
          recommendations: true,
          communityNeeds: updatedUser.userType === 'donor'
        },
        preferences: {
          maxDistance: updatedUser.userType === 'collector' ? 5 : 10, // km
          categories: [], // Will be learned from user behavior
          urgencyLevels: ['high', 'medium', 'low'],
          autoNotifications: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await kvSet(`user-preferences-${updatedUser.id}`, initialPreferences)

      setUser(updatedUser)
      
      // Success message with next steps
      const nextSteps = updatedUser.userType === 'donor' 
        ? 'You can now list items for donation and see community needs in your area!'
        : 'You can now browse available items and receive personalized recommendations!'
      
      toast.success(`Welcome to TruCycle! ${nextSteps}`)
      onOpenChange(false)
      onComplete()
    } catch (error) {
      console.error('Profile setup error:', error)
      toast.error('Failed to complete profile setup. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-h3">Choose Your Profile Type</h3>
              <p className="text-muted-foreground">
                How would you like to participate in TruCycle?
              </p>
            </div>

            <RadioGroup
              value={profileData.userType}
              onValueChange={(value) => setProfileData(prev => ({ ...prev, userType: value }))}
              className="space-y-4"
            >
              <Card className={`cursor-pointer transition-colors ${profileData.userType === 'donor' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}>
                <label htmlFor="donor" className="cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="donor" id="donor" />
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Heart size={20} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">Donor</CardTitle>
                        <CardDescription>I want to give away items I no longer need</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">Donate Items</Badge>
                      <Badge variant="secondary" className="text-xs">Reduce Waste</Badge>
                      <Badge variant="secondary" className="text-xs">Help Community</Badge>
                    </div>
                  </CardContent>
                </label>
              </Card>

              <Card className={`cursor-pointer transition-colors ${profileData.userType === 'collector' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}>
                <label htmlFor="collector" className="cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="collector" id="collector" />
                      <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                        <Package size={20} className="text-accent" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">Collector</CardTitle>
                        <CardDescription>I want to find and collect useful items</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">Find Items</Badge>
                      <Badge variant="secondary" className="text-xs">Save Money</Badge>
                      <Badge variant="secondary" className="text-xs">Upcycle</Badge>
                    </div>
                  </CardContent>
                </label>
              </Card>
            </RadioGroup>

            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Partner shop tools</p>
                <p className="text-xs text-muted-foreground">
                  Toggle this on if you run a partner site and need QR check-in and collection logs.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="partner-access"
                  checked={profileData.partnerAccess}
                  onCheckedChange={(checked) =>
                    setProfileData(prev => ({ ...prev, partnerAccess: Boolean(checked) }))
                  }
                />
                <Label htmlFor="partner-access" className="text-xs text-muted-foreground">
                  I manage a TruCycle partner location
                </Label>
              </div>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground text-center">
                  You can adjust your profile type or partner access later from settings.
                </p>
              </CardContent>
            </Card>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <MapPin size={24} className="text-primary" />
              </div>
              <h3 className="text-h3">Verify Your Location</h3>
              <p className="text-muted-foreground">
                Add your UK postcode so we can tailor nearby listings, partner shops, and community highlights.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  type="text"
                  placeholder="e.g. SW1A 1AA"
                  value={profileData.postcode}
                  onChange={(event) => handlePostcodeChange(event.target.value)}
                  className="text-center text-lg font-medium"
                />
                <p className="text-xs text-muted-foreground text-center">
                  We'll format it for you. Use the postcode that best represents your usual drop-off or pickup area.
                </p>
                {!validatePostcode(profileData.postcode) && profileData.postcode.trim() !== '' && (
                  <p className="text-xs text-destructive text-center">
                    Enter a valid UK postcode to continue.
                  </p>
                )}
              </div>

              <Card className="bg-accent/10">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <Shield size={20} className="text-accent mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Privacy Protected</p>
                      <p className="text-xs text-muted-foreground">
                        Your exact address stays private. Other users only see an approximate area, and full details are
                        shared securely once you confirm a match.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={24} className="text-primary" />
              </div>
              <h3 className="text-h3">You're All Set!</h3>
              <p className="text-muted-foreground">
                Welcome to the TruCycle community
              </p>
            </div>

            <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User size={20} className="text-primary" />
                    <div>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {profileData.userType === 'donor' ? 'Donor' : 'Collector'} • {formatPostcode(profileData.postcode)}
                      </p>
                    </div>
                  </div>
                  {profileData.partnerAccess && (
                    <Badge variant="outline" className="uppercase tracking-wide text-xs">
                      Partner tools enabled
                    </Badge>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">What's next?</h4>
                    {profileData.userType === 'donor' ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Start listing items you no longer need</li>
                        <li>• Connect with collectors in your area</li>
                        <li>• Track your environmental impact</li>
                      </ul>
                    ) : (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Browse available items near you</li>
                        <li>• Claim items you're interested in</li>
                        <li>• Build your collector reputation</li>
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-h2 text-center">
            {mode === 'edit' ? 'Update Profile' : 'Profile Setup'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'edit' ? 'Refresh your details below to keep your profile accurate.' : `Step ${currentStep} of ${totalSteps}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Progress value={progress} className="w-full" />
          
          {renderStepContent()}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <span>{isLoading ? 'Completing...' : 'Complete Setup'}</span>
                <CheckCircle size={16} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

