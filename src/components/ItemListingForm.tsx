import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Plus, Camera, MapPin, Recycle, Heart, ArrowsClockwise, Truck, Storefront } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { DropOffLocationSelector } from './DropOffLocationSelector'
import type { DropOffLocation } from './dropOffLocations'
import { sendListingSubmissionEmails } from '@/lib/emailAlerts'
import { QRCodeDisplay, type QRCodeData } from './QRCode'
import type { ListingValuation, ManagedListing } from './MyListingsView'

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Clothing',
  'Books',
  'Kitchen Items',
  'Sports Equipment',
  'Home Decor',
  'Other'
]

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent', description: 'Like new, minimal wear' },
  { value: 'good', label: 'Good', description: 'Minor signs of use' },
  { value: 'fair', label: 'Fair', description: 'Noticeable wear but functional' },
  { value: 'poor', label: 'Poor', description: 'Significant wear, may need repair' }
]

const ACTION_TYPES = [
  {
    value: 'exchange',
    icon: ArrowsClockwise,
    label: 'Exchange',
    description: 'Trade with other users'
  },
  {
    value: 'donate',
    icon: Heart,
    label: 'Donate',
    description: 'Give away for free'
  },
  {
    value: 'recycle',
    icon: Recycle,
    label: 'Recycle',
    description: 'Proper disposal/recycling'
  }
]
const CATEGORY_BASE_VALUES: Record<string, number> = {
  Electronics: 240,
  Furniture: 180,
  Clothing: 65,
  Books: 25,
  'Kitchen Items': 55,
  'Sports Equipment': 90,
  'Home Decor': 45,
  Other: 40,
}

const CONDITION_MULTIPLIERS: Record<string, number> = {
  excellent: 1,
  good: 0.75,
  fair: 0.55,
  poor: 0.35,
}

const ACTION_VALUE_MODIFIERS: Record<string, number> = {
  exchange: 1,
  donate: 0.7,
  recycle: 0.45,
}

const ACTION_REWARD_MULTIPLIER: Record<string, number> = {
  exchange: 0.45,
  donate: 0.65,
  recycle: 0.35,
}

type ValuationSummary = (ListingValuation & { narrative: string }) | null

const calculateListingValuation = (
  category: string,
  condition: string,
  actionType: string
): ValuationSummary => {
  if (!category || !condition || !actionType) {
    return null
  }

  const baseValue = CATEGORY_BASE_VALUES[category] ?? 40
  const conditionMultiplier = CONDITION_MULTIPLIERS[condition] ?? 0.5
  const marketModifier = ACTION_VALUE_MODIFIERS[actionType] ?? 0.5
  const rewardMultiplier = ACTION_REWARD_MULTIPLIER[actionType] ?? 0.4

  const estimatedValueRaw = baseValue * conditionMultiplier * marketModifier
  const estimatedValue = Math.max(10, Math.round(estimatedValueRaw / 5) * 5)
  const spread = Math.round(estimatedValue * 0.15)
  const recommendedPriceRange: [number, number] = [
    Math.max(5, estimatedValue - spread),
    estimatedValue + spread,
  ]
  const rewardPoints = Math.max(35, Math.round((estimatedValue / 2) * (1 + rewardMultiplier)))

  const narrative = actionType === 'donate'
    ? 'Donating unlocks priority matching with nearby causes and adds a generosity bonus to your rewards.'
    : actionType === 'exchange'
      ? 'Exchanging keeps value in circulation and balances rewards for both community members.'
      : 'Responsibly recycling protects materials from landfill and awards sustainability points.'

  const confidence: ListingValuation['confidence'] = condition === 'excellent'
    ? 'high'
    : condition === 'good'
      ? 'medium'
      : 'low'

  return {
    estimatedValue,
    recommendedPriceRange,
    rewardPoints,
    confidence,
    narrative,
  }
}

interface ItemListingFormProps {
  onComplete?: (details: ListingCompletionDetails) => void
  prefillFulfillmentMethod?: 'pickup' | 'dropoff' | null
  prefillDropOffLocation?: DropOffLocation | null
  onFulfillmentPrefillHandled?: () => void
  onDropOffPrefillHandled?: () => void
}

export function ItemListingForm({
  onComplete,
  prefillFulfillmentMethod,
  prefillDropOffLocation,
  onFulfillmentPrefillHandled,
  onDropOffPrefillHandled
}: ItemListingFormProps) {
  const [user] = useKV('current-user', null)
  const [, setListings] = useKV<ManagedListing[]>('user-listings', [])
  const [currentStep, setCurrentStep] = useState(1)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    condition: '',
    actionType: '',
    photos: [] as string[],
    location: '',
    contactMethod: 'platform',
    fulfillmentMethod: '' as 'pickup' | 'dropoff' | '',
    dropOffLocation: null as DropOffLocation | null
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDropOffSelector, setShowDropOffSelector] = useState(false)
  const [generatedQRCode, setGeneratedQRCode] = useState<QRCodeData | null>(null)
  const valuationSummary = useMemo(
    () => calculateListingValuation(formData.category, formData.condition, formData.actionType),
    [formData.category, formData.condition, formData.actionType]
  )
  const totalSteps = 5
  const progress = (currentStep / totalSteps) * 100

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = () => {
    // Simulate photo upload - in real app this would handle file selection
    const newPhotoUrl = `/api/placeholder/400/300?random=${Date.now()}`
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, newPhotoUrl]
    }))
    toast.success('Photo added successfully')
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim() !== '' && formData.description.trim() !== ''
      case 2:
        return formData.category !== '' && formData.condition !== ''
      case 3:
        return formData.actionType !== ''
      case 4:
        return formData.fulfillmentMethod !== ''
      case 5:
        return formData.location.trim() !== ''
      default:
        return false
    }
  }

  const handleFulfillmentSelect = useCallback((method: 'pickup' | 'dropoff') => {
    setFormData(prev => ({
      ...prev,
      fulfillmentMethod: method,
      // Reset location details if the method changes
      location:
        method === 'pickup'
          ? (prev.fulfillmentMethod === 'pickup' ? prev.location : '')
          : '',
      dropOffLocation: method === 'pickup' ? null : prev.dropOffLocation
    }))

    if (method === 'dropoff') {
      setShowDropOffSelector(true)
    }
  }, [])

  const handleDropOffSelection = (location: DropOffLocation) => {
    setFormData(prev => ({
      ...prev,
      dropOffLocation: location,
      location: location.address,
      fulfillmentMethod: 'dropoff'
    }))
    setShowDropOffSelector(false)
    toast.success(`Selected ${location.name} for drop-off`)
  }

  useEffect(() => {
    if (!prefillFulfillmentMethod) return

    handleFulfillmentSelect(prefillFulfillmentMethod)
    onFulfillmentPrefillHandled?.()
  }, [prefillFulfillmentMethod, handleFulfillmentSelect, onFulfillmentPrefillHandled])

  useEffect(() => {
    if (!prefillDropOffLocation) return

    setFormData(prev => ({
      ...prev,
      fulfillmentMethod: 'dropoff',
      dropOffLocation: prefillDropOffLocation,
      location: prefillDropOffLocation.address
    }))
    setShowDropOffSelector(false)
    onDropOffPrefillHandled?.()
  }, [prefillDropOffLocation, onDropOffPrefillHandled])

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    } else {
      toast.error('Please fill in all required fields')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to create a listing')
      return
    }

    if (!validateStep(totalSteps)) {
      toast.error('Please complete all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const carbonImpact = formData.actionType === 'recycle' ? 5
        : formData.actionType === 'donate' ? 3
          : 2
      const listingValuation = valuationSummary
        ? {
            estimatedValue: valuationSummary.estimatedValue,
            recommendedPriceRange: valuationSummary.recommendedPriceRange,
            rewardPoints: valuationSummary.rewardPoints,
            confidence: valuationSummary.confidence,
          }
        : undefined
      const rewardPoints = listingValuation?.rewardPoints ?? Math.round(carbonImpact * 8)

      const fulfillmentMethod = formData.fulfillmentMethod || 'pickup'
      const listingStatus: CreatedListing['status'] =
        fulfillmentMethod === 'dropoff' ? 'pending_dropoff' : 'active'

      const newListing: CreatedListing = {
        id: `listing-${Date.now()}`,
        ...formData,
        fulfillmentMethod,
        dropOffLocation: formData.dropOffLocation,
        userId: user.id,
        userName: user.name || 'Anonymous User',
        status: listingStatus,
        createdAt: new Date().toISOString(),
        views: 0,
        interested: [],
        valuation: listingValuation,
        rewardPoints,
        co2Impact: carbonImpact
      }

      // Add to user's listings
      setListings(currentListings => [...currentListings, newListing])

      // Add to global listings for browsing
      const globalListings = await spark.kv.get('global-listings') || []
      await spark.kv.set('global-listings', [...globalListings, newListing])

      // Update user's carbon footprint based on action type
      if (user.carbonFootprint) {
        const updatedUser = {
          ...user,
          carbonFootprint: {
            ...user.carbonFootprint,
            totalSaved: user.carbonFootprint.totalSaved + carbonImpact,
            itemsProcessed: user.carbonFootprint.itemsProcessed + 1
          }
        }
        await spark.kv.set('current-user', updatedUser)
      }

      toast.success('Item listed successfully!')

      const emailResults = await sendListingSubmissionEmails(
        { name: user.name || 'Donor', email: user.email },
        formData.fulfillmentMethod === 'dropoff' ? formData.dropOffLocation ?? null : null,
        {
          id: newListing.id,
          title: newListing.title,
          category: newListing.category,
          description: newListing.description,
          fulfillmentMethod: formData.fulfillmentMethod,
          dropOffLocation: formData.dropOffLocation
        }
      )

      if (emailResults.length > 0) {
        toast.success('Email alerts sent to donor and partner shop')
      } else {
        toast.info('Listing saved. Email alerts could not be sent automatically.')
      }

      const qrCodeData: QRCodeData = {
        id: `qr-${Date.now()}`,
        type: 'donor',
        itemId: newListing.id,
        itemTitle: newListing.title,
        userId: user.id,
        userName: user.name || 'Anonymous User',
        transactionId: `TC${Date.now()}${Math.random().toString(36).slice(-6).toUpperCase()}`,
        dropOffLocation: formData.fulfillmentMethod === 'dropoff' && formData.dropOffLocation
          ? `${formData.dropOffLocation.name}, ${formData.dropOffLocation.postcode}`
          : undefined,
        metadata: {
          category: formData.category,
          condition: formData.condition,
          co2Impact: carbonImpact,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        },
        status: 'active'
      }

      setGeneratedQRCode(qrCodeData)
      setLastCreatedListing(newListing)

      if (fulfillmentMethod === 'dropoff' && formData.dropOffLocation) {
        const emailLog = await spark.kv.get('email-log') || []
        const partnerEmail = `${formData.dropOffLocation.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')}@partner.trucycle`

        const emailEntries = [
          {
            id: `email-${Date.now()}-user`,
            to: user.email,
            subject: `Drop-off scheduled: ${newListing.title}`,
            body: `Hi ${user.name || 'there'},\n\nYour item "${newListing.title}" is scheduled for drop-off at ${formData.dropOffLocation.name}. Present the attached QR code when you arrive.`,
            context: 'dropoff_confirmation',
            createdAt: new Date().toISOString()
          },
          {
            id: `email-${Date.now()}-partner`,
            to: partnerEmail,
            subject: `New TruCycle drop-off from ${user.name || 'TruCycle user'}`,
            body: `${user.name || 'A TruCycle user'} is planning to drop off "${newListing.title}" at your location (${formData.dropOffLocation.address}). Please prepare to scan their QR code upon arrival.`,
            context: 'partner_notification',
            createdAt: new Date().toISOString(),
            locationId: formData.dropOffLocation.id
          }
        ]

        await spark.kv.set('email-log', [...emailLog, ...emailEntries])
        toast.success('Email confirmations sent', {
          description: `We notified you and ${formData.dropOffLocation.name} about this drop-off.`
        })
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        condition: '',
        actionType: '',
        photos: [],
        location: '',
        contactMethod: 'platform',
        fulfillmentMethod: '',
        dropOffLocation: null
      })
      setCurrentStep(1)

    } catch (error) {
      console.error('Failed to create listing', error)
      toast.error('Failed to create listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQRCodeClose = () => {
    if (onComplete && generatedQRCode && lastCreatedListing) {
      onComplete({ listing: lastCreatedListing, qrCode: generatedQRCode })
    }
    setGeneratedQRCode(null)
    setLastCreatedListing(null)
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-h2 flex items-center space-x-2">
            <Plus size={24} className="text-primary" />
            <span>List Your Item</span>
          </CardTitle>
          <CardDescription>
            Please sign in to create a listing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              You need to be signed in to list items on TruCycle
            </p>
            <Button onClick={() => window.location.reload()}>
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {generatedQRCode && (
        <QRCodeDisplay qrData={generatedQRCode} onClose={handleQRCodeClose} />
      )}

      {showDropOffSelector && (
        <DropOffLocationSelector
          selectedLocation={formData.dropOffLocation}
          onSelect={handleDropOffSelection}
          onClose={() => setShowDropOffSelector(false)}
        />
      )}
      <Card>
      <CardHeader>
        <CardTitle className="text-h2 flex items-center space-x-2">
          <Plus size={24} className="text-primary" />
          <span>List Your Item</span>
        </CardTitle>
        <CardDescription>
          Step {currentStep} of {totalSteps}: Help reduce waste by listing your item
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Item Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Vintage Wooden Coffee Table"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your item's condition, size, and any relevant details..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="min-h-[100px] mt-1"
              />
            </div>

            <div>
              <Label>Photos (Optional)</Label>
              <div className="mt-2 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePhotoUpload}
                  className="w-full flex items-center space-x-2"
                >
                  <Camera size={16} />
                  <span>Add Photo</span>
                </Button>
                
                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={photo} 
                          alt={`Photo ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Category & Condition */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Category *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {CATEGORIES.map(category => (
                  <Button
                    key={category}
                    type="button"
                    variant={formData.category === category ? "default" : "outline"}
                    onClick={() => handleInputChange('category', category)}
                    className="h-auto p-3 text-center"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Condition *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {CONDITIONS.map(condition => (
                  <Card 
                    key={condition.value}
                    className={`cursor-pointer transition-colors ${
                      formData.condition === condition.value 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleInputChange('condition', condition.value)}
                  >
                    <CardContent className="p-4">
                      <div className="font-medium">{condition.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {condition.description}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Action Type */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <Label>What would you like to do with this item? *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {ACTION_TYPES.map(action => {
                  const IconComponent = action.icon
                  return (
                    <Card 
                      key={action.value}
                      className={`cursor-pointer transition-colors ${
                        formData.actionType === action.value 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleInputChange('actionType', action.value)}
                    >
                      <CardContent className="p-4 text-center">
                        <IconComponent 
                          size={32} 
                          className={`mx-auto mb-2 ${
                            formData.actionType === action.value 
                              ? 'text-primary' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                        <div className="font-medium">{action.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {action.description}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Fulfilment Method */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <Label>How will the item be handed over? *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Card
                  className={`cursor-pointer transition-colors ${
                    formData.fulfillmentMethod === 'pickup'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleFulfillmentSelect('pickup')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck
                          size={28}
                          className={formData.fulfillmentMethod === 'pickup' ? 'text-primary' : 'text-muted-foreground'}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-lg">Pick up from me</div>
                        <p className="text-sm text-muted-foreground">
                          Share a safe meet-up location for collectors or shop partners to collect your item.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-colors ${
                    formData.fulfillmentMethod === 'dropoff'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleFulfillmentSelect('dropoff')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Storefront
                          size={28}
                          className={formData.fulfillmentMethod === 'dropoff' ? 'text-primary' : 'text-muted-foreground'}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-lg">Drop off at a partner shop</div>
                        <p className="text-sm text-muted-foreground">
                          Choose a TruCycle partner location with convenient hours and services for your donation.
                        </p>
                        {formData.fulfillmentMethod === 'dropoff' && formData.dropOffLocation && (
                          <Badge variant="secondary" className="mt-3">
                            Selected: {formData.dropOffLocation.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Location & Review */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">
                {formData.fulfillmentMethod === 'dropoff' ? 'Preferred Drop-off Location *' : 'Pickup Location *'}
              </Label>
              {formData.fulfillmentMethod === 'dropoff' ? (
                <div className="space-y-2 mt-2">
                  {formData.dropOffLocation ? (
                    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-lg">{formData.dropOffLocation.name}</p>
                          <p className="text-sm text-muted-foreground">{formData.dropOffLocation.address}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowDropOffSelector(true)}>
                          Change
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                        <span>Postcode: {formData.dropOffLocation.postcode}</span>
                        <span>Open: {formData.dropOffLocation.openHours}</span>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setShowDropOffSelector(true)}>
                      <Storefront size={18} className="mr-2" />
                      Browse partner drop-off locations
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin size={16} className="text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="e.g., Camden, London NW1"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {formData.fulfillmentMethod === 'dropoff'
                  ? 'Select a partner location that suits your schedule and item type.'
                  : 'Enter your general area (borough/postcode area only for privacy).'}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="font-medium text-lg">Review your listing details</h3>
                {valuationSummary && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-primary">
                      Est. value £{valuationSummary.estimatedValue.toFixed(2)}
                    </span>
                    <Badge variant="secondary">Reward +{valuationSummary.rewardPoints} pts</Badge>
                    {valuationSummary.confidence && (
                      <Badge variant="outline" className="capitalize">
                        {valuationSummary.confidence} confidence
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Title:</span> {formData.title}</div>
                <div><span className="font-medium">Category:</span> {formData.category}</div>
                <div><span className="font-medium">Condition:</span> {formData.condition}</div>
                <div><span className="font-medium">Action:</span> {formData.actionType}</div>
                <div><span className="font-medium">Hand-off:</span> {formData.fulfillmentMethod === 'dropoff' ? 'Drop off' : 'Pick up'}</div>
                <div>
                  <span className="font-medium">Location:</span>{' '}
                  {formData.fulfillmentMethod === 'dropoff' && formData.dropOffLocation
                    ? `${formData.dropOffLocation.name}, ${formData.dropOffLocation.postcode}`
                    : formData.location}
                </div>
                {formData.photos.length > 0 && (
                  <div><span className="font-medium">Photos:</span> {formData.photos.length} uploaded</div>
                )}
              </div>
              {valuationSummary && (
                <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
                  <div className="rounded-md border border-primary/30 bg-background/60 p-3">
                    <p className="font-semibold text-primary">
                      Suggested exchange window
                    </p>
                    <p className="mt-1">£{valuationSummary.recommendedPriceRange[0].toFixed(2)} – £{valuationSummary.recommendedPriceRange[1].toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border border-primary/30 bg-background/60 p-3">
                    <p className="font-semibold text-primary">Reward preview</p>
                    <p className="mt-1">Earn {valuationSummary.rewardPoints} TruCycle points when the item is collected.</p>
                  </div>
                  <div className="rounded-md border border-primary/30 bg-background/60 p-3">
                    <p className="font-semibold text-primary">Impact insight</p>
                    <p className="mt-1">{valuationSummary.narrative}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          {currentStep < totalSteps ? (
            <Button onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Listing'}
            </Button>
          )}
        </div>
      </CardContent>
      </Card>
    </>
  )
}
