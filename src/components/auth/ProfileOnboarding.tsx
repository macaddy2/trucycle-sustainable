import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface ProfileOnboardingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
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
    phone: boolean
    identity: boolean
    address: boolean
    payment: boolean
    community: boolean
  }
}

export function ProfileOnboarding({ open, onOpenChange, onComplete }: ProfileOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  const [user, setUser] = useKV('current-user', null)
  
  const [profileData, setProfileData] = useState({
    userType: '',
    postcode: '',
    motivation: ''
  })

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  const handleNext = () => {
    if (currentStep === 1 && !profileData.userType) {
      toast.error('Please select your profile type')
      return
    }
    
    if (currentStep === 2 && !profileData.postcode) {
      toast.error('Please enter your postcode')
      return
    }

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const validatePostcode = (postcode: string) => {
    // Simple UK postcode validation
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i
    return postcodeRegex.test(postcode.trim())
  }

  const checkLondonPostcode = (postcode: string) => {
    // Simplified London postcode check
    const londonPrefixes = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC']
    const prefix = postcode.trim().toUpperCase().match(/^[A-Z]+/)?.[0]
    return prefix && londonPrefixes.includes(prefix)
  }

  const handleComplete = async () => {
    if (!profileData.postcode || !validatePostcode(profileData.postcode)) {
      toast.error('Please enter a valid postcode')
      return
    }

    if (!checkLondonPostcode(profileData.postcode)) {
      toast.error('Sorry, TruCycle currently only operates in London')
      return
    }

    setIsLoading(true)

    try {
      // Simulate address authentication
      const addressPrompt = spark.llmPrompt`Verify that postcode ${profileData.postcode} is a valid London postcode and provide area information. Return a JSON response with:
      {
        "isValid": true/false,
        "area": "area name",
        "district": "district name", 
        "coordinates": {"lat": number, "lng": number},
        "serviceArea": "zone name"
      }`

      const addressVerification = await spark.llm(addressPrompt, 'gpt-4o-mini', true)
      const verificationData = JSON.parse(addressVerification)

      if (!verificationData.isValid) {
        toast.error('Invalid postcode. Please check and try again.')
        return
      }

      // Update user profile with verified address data
      const updatedUser: UserProfile = {
        ...(user || {}),
        id: user?.id || `user_${Date.now()}`,
        email: user?.email || '',
        name: user?.name || '',
        userType: profileData.userType as 'donor' | 'collector',
        postcode: profileData.postcode.toUpperCase(),
        area: verificationData.area,
        district: verificationData.district,
        serviceArea: verificationData.serviceArea,
        createdAt: user?.createdAt || new Date().toISOString(),
        onboardingCompleted: true,
        addressVerified: true,
        addressVerifiedAt: new Date().toISOString(),
        verificationLevel: {
          email: true,
          phone: false,
          identity: false,
          address: true,
          payment: false,
          community: false
        }
      }

      // Save to user profiles
      const userProfiles = await spark.kv.get('user-profiles') || {}
      await spark.kv.set('user-profiles', {
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

      await spark.kv.set(`user-preferences-${updatedUser.id}`, initialPreferences)

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

            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground text-center">
                  Don't worry - you can always change your profile type later in settings
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
                We need your postcode to confirm you're in our London service area
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  type="text"
                  placeholder="e.g., SW1A 1AA"
                  value={profileData.postcode}
                  onChange={(e) => setProfileData(prev => ({ ...prev, postcode: e.target.value }))}
                  className="text-center text-lg font-medium"
                />
              </div>

              <Card className="bg-accent/10">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <Shield size={20} className="text-accent mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Privacy Protected</p>
                      <p className="text-xs text-muted-foreground">
                        Your exact address is kept private. Only your general area is visible to other users, 
                        and your full address is only shared with verified collectors after a successful match.
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
                        {profileData.userType === 'donor' ? 'Donor' : 'Collector'} • {profileData.postcode}
                      </p>
                    </div>
                  </div>

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
          <DialogTitle className="text-h2 text-center">Profile Setup</DialogTitle>
          <DialogDescription className="text-center">
            Step {currentStep} of {totalSteps}
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