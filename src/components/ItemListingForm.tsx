import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Plus, Camera, MapPin, Recycle, Heart, ArrowsClockwise, Storefront, X } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
// Removed demo local KV persistence
import { DropOffLocationSelector } from './DropOffLocationSelector'
import type { DropOffLocation } from './dropOffLocations'
import { sendListingSubmissionEmails } from '@/lib/emailAlerts'
import { CATEGORIES } from '@/lib/categories'
import { classifyListing, type ListingClassificationResult } from '@/lib/ai/classifier'
import { moderateImages, type ModerationResult } from '@/lib/ai/moderation'
import { QRCodeDisplay, type QRCodeData } from './QRCode'
import type { ListingValuation, ManagedListing } from '@/types/listings'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
import { createItem, updateItem } from '@/lib/api'
import { LocationSelector } from '@/components/LocationSelector'

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent', description: 'Like new, minimal wear' },
  { value: 'good', label: 'Good', description: 'Minor signs of use' },
  { value: 'fair', label: 'Fair', description: 'Noticeable wear but functional' },
  { value: 'poor', label: 'Poor', description: 'Significant wear, may need repair' }
]

const INTENT_CONFIG: Record<'exchange' | 'donate' | 'recycle', { title: string; description: string; accent: string; icon: ReactNode }> = {
  exchange: {
    title: 'Exchange with neighbours',
    description: 'Great for high-value items you would like to share or swap securely with messaging and QR codes.',
    accent: 'from-blue-500/20 via-blue-500/10 to-transparent',
    icon: <ArrowsClockwise size={20} className="text-blue-600" />,
  },
  donate: {
    title: 'Donate to the community',
    description: 'Perfect for items that still have plenty of life left. We will guide you to a trusted partner hub.',
    accent: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    icon: <Heart size={20} className="text-emerald-600" />,
  },
  recycle: {
    title: 'Recycle responsibly',
    description: 'Direct broken or end-of-life items to our certified recycling partners for safe processing.',
    accent: 'from-amber-500/20 via-amber-500/10 to-transparent',
    icon: <Recycle size={20} className="text-amber-600" />,
  },
}

const DEFAULT_CATEGORY_BY_INTENT: Record<'exchange' | 'donate' | 'recycle', typeof CATEGORIES[number]> = {
  donate: 'Home Decor',
  exchange: 'Furniture',
  recycle: 'Electronics',
}

const DEFAULT_CONDITION_BY_INTENT: Record<'exchange' | 'donate' | 'recycle', (typeof CONDITIONS)[number]['value']> = {
  donate: 'good',
  exchange: 'good',
  recycle: 'fair',
}

const CLASSIFICATION_LABELS: Record<'exchange' | 'donate' | 'recycle', string> = {
  exchange: 'Free exchange',
  donate: 'Community donation',
  recycle: 'Professional recycling',
}

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

type CreatedListing = ManagedListing & {
  userId: string
  userName: string
  views: number
  interested: string[]
}

export type ListingCompletionDetails = {
  listing: CreatedListing
  qrCode: QRCodeData
}

async function reverseGeocodePostcode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'json')
    url.searchParams.set('lat', lat.toFixed(7))
    url.searchParams.set('lon', lng.toFixed(7))
    url.searchParams.set('zoom', '18')
    url.searchParams.set('addressdetails', '1')
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    const data = await res.json()
    const pc = data?.address?.postcode as string | undefined
    return pc
  } catch {
    return undefined
  }
}

export interface ListingEditDraft {
  itemId: string
  title: string
  description?: string
  category: string
  condition?: 'excellent' | 'good' | 'fair' | 'poor'
  actionType: 'exchange' | 'donate' | 'recycle'
  fulfillmentMethod?: 'pickup' | 'dropoff'
  photos?: string[]
  location?: string
  dropOffLocation?: DropOffLocation | null
  handoverNotes?: string
  preferPartnerSupport?: boolean
  postcode?: string
}

export interface ItemListingFormProps {
  onComplete?: (details: ListingCompletionDetails) => void
  prefillFulfillmentMethod?: 'pickup' | 'dropoff' | null
  prefillDropOffLocation?: DropOffLocation | null
  onFulfillmentPrefillHandled?: () => void
  onDropOffPrefillHandled?: () => void
  initialIntent?: 'exchange' | 'donate' | 'recycle' | null
  onIntentHandled?: () => void
  editingListing?: ListingEditDraft | null
  onEditingHandled?: () => void
}

export function ItemListingForm({
  onComplete,
  prefillFulfillmentMethod,
  prefillDropOffLocation,
  onFulfillmentPrefillHandled,
  onDropOffPrefillHandled,
  initialIntent,
  onIntentHandled,
  editingListing,
  onEditingHandled
}: ItemListingFormProps) {
  const [user] = useKV('current-user', null)
  // Removed local demo listings persistence
  const [currentStep, setCurrentStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formContainerRef = useRef<HTMLDivElement>(null)
  const defaultQuickStartIntent: 'exchange' | 'donate' | 'recycle' = useMemo(() => {
    if (initialIntent) {
      return initialIntent
    }
    return 'exchange'
  }, [initialIntent])
  const [quickStartIntent, setQuickStartIntent] = useState<'exchange' | 'donate' | 'recycle'>(defaultQuickStartIntent)
  const [showQuickStart, setShowQuickStart] = useState(true)
  const [browseLocation] = useKV<{ lat?: number; lng?: number; label?: string; radiusKm?: number }>('browse.location', { radiusKm: 10 })

  useEffect(() => {
    if (!formContainerRef.current) {
      return
    }

    formContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const firstField = formContainerRef.current.querySelector<HTMLElement>('input, textarea, select')
    if (
      firstField instanceof HTMLInputElement ||
      firstField instanceof HTMLTextAreaElement ||
      firstField instanceof HTMLSelectElement
    ) {
      firstField.focus()
    }
  }, [])

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: DEFAULT_CATEGORY_BY_INTENT[defaultQuickStartIntent] ?? '',
    condition: DEFAULT_CONDITION_BY_INTENT[defaultQuickStartIntent] ?? '',
    actionType: defaultQuickStartIntent,
    photos: [] as string[],
    location: '',
    contactMethod: 'platform',
    fulfillmentMethod: 'pickup' as 'pickup' | 'dropoff' | '',
    dropOffLocation: null as DropOffLocation | null,
    handoverNotes: '',
    preferPartnerSupport: defaultQuickStartIntent === 'donate'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDropOffSelector, setShowDropOffSelector] = useState(false)
  const [showPickupLocationSelector, setShowPickupLocationSelector] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<{ lat?: number; lng?: number; label?: string; postcode?: string } | null>(null)
  const [generatedQRCode, setGeneratedQRCode] = useState<QRCodeData | null>(null)
  const [lastCreatedListing, setLastCreatedListing] = useState<CreatedListing | null>(null)
  const [editingListingId, setEditingListingId] = useState<string | null>(null)
  const [classificationResult, setClassificationResult] = useState<ListingClassificationResult | null>(null)
  const [classificationLoading, setClassificationLoading] = useState(false)
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null)
  const [moderationLoading, setModerationLoading] = useState(false)
  // We defer actual Cloudinary upload until submit; photos hold data URLs for preview
  const valuationSummary = useMemo(
    () => calculateListingValuation(formData.category, formData.condition, formData.actionType),
    [formData.category, formData.condition, formData.actionType]
  )
  const estimatedCarbonImpact = useMemo(() => {
    if (!formData.actionType) {
      return null
    }

    if (formData.actionType === 'recycle') {
      return 5
    }

    if (formData.actionType === 'donate') {
      return 3
    }

    return 2
  }, [formData.actionType])
  // Enforce view state: Donate uses drop-off; others show pickup only
  const effectiveFulfillmentMethod: 'pickup' | 'dropoff' =
    formData.actionType === 'donate' ? 'dropoff' : 'pickup'
  const defaultPickupAddress = useMemo(() => {
    if (!user) {
      return ''
    }

    const parts = [user.area, user.district, user.postcode].filter((segment): segment is string => Boolean(segment))
    return parts.join(', ')
  }, [user])

  useEffect(() => {
    if (!editingListing) {
      return
    }

    const actionType = editingListing.actionType
    const method: 'pickup' | 'dropoff' = editingListing.fulfillmentMethod
      ? editingListing.fulfillmentMethod
      : actionType === 'donate'
        ? 'dropoff'
        : 'pickup'

    const normalizeCondition = (value?: string): 'excellent' | 'good' | 'fair' | 'poor' => {
      const normal = String(value || '').toLowerCase()
      if (normal === 'excellent' || normal === 'like_new' || normal === 'new') return 'excellent'
      if (normal === 'good') return 'good'
      if (normal === 'poor') return 'poor'
      return 'fair'
    }

    setQuickStartIntent(actionType)
    setShowQuickStart(false)
    setFormData({
      title: editingListing.title ?? '',
      description: editingListing.description ?? '',
      category: editingListing.category || DEFAULT_CATEGORY_BY_INTENT[actionType],
      condition: normalizeCondition(editingListing.condition),
      actionType,
      photos: editingListing.photos ?? [],
      location: method === 'pickup' ? (editingListing.location ?? '') : '',
      contactMethod: 'platform',
      fulfillmentMethod: method,
      dropOffLocation: method === 'dropoff' ? editingListing.dropOffLocation ?? null : null,
      handoverNotes: editingListing.handoverNotes ?? '',
      preferPartnerSupport:
        typeof editingListing.preferPartnerSupport === 'boolean'
          ? editingListing.preferPartnerSupport
          : actionType === 'donate'
    })

    if (method === 'pickup') {
      setPickupLocation({
        label: editingListing.location ?? '',
        postcode: editingListing.postcode,
      })
    } else {
      setPickupLocation(null)
    }

    setEditingListingId(editingListing.itemId)
    setCurrentStep(1)
    setGeneratedQRCode(null)
    setLastCreatedListing(null)
    onEditingHandled?.()
  }, [editingListing, onEditingHandled])
  const totalSteps = 2
  const progress = (currentStep / totalSteps) * 100
  const { title, description, category, condition, photos } = formData
  useEffect(() => {
    if (!title && !description) {
      setClassificationResult(null);
      return;
    }
    let cancelled = false;
    setClassificationLoading(true);
    classifyListing({
      title,
      description,
      category,
      condition: condition || 'unspecified',
    })
      .then((result) => {
        if (!cancelled) {
          setClassificationResult(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClassificationResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setClassificationLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [title, description, category, condition]);

  useEffect(() => {
    const descriptors = photos.length > 0
      ? photos
      : [description || title || ''];
    if (!descriptors.some(Boolean)) {
      setModerationResult(null);
      return;
    }
    let cancelled = false;
    setModerationLoading(true);
    moderateImages(descriptors)
      .then((result) => {
        if (!cancelled) {
          setModerationResult(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModerationResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModerationLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [photos, description, title]);


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    try {
      const upload = await uploadImageToCloudinary(file, { alt: formData.title || 'listing-image' })
      setFormData(prev => ({ ...prev, photos: [...prev.photos, upload.secureUrl] }))
      toast.success('Photo uploaded')
    } catch (err: any) {
      console.error('Cloudinary upload failed', err)
      toast.error('Upload failed. Check Cloudinary preset and env.')
    }
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
  }

  const handleUseDefaultPickup = useCallback(() => {
    if (!defaultPickupAddress) {
      toast.info('Add your pickup area in your profile to use this shortcut.')
      return
    }

    setFormData(prev => ({
      ...prev,
      fulfillmentMethod: 'pickup',
      location: defaultPickupAddress,
    }))
    toast.success('Pickup area updated from your saved profile details')
  }, [defaultPickupAddress])

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          formData.title.trim() !== '' &&
          formData.description.trim() !== '' &&
          formData.photos.length > 0 &&
          Boolean(formData.category) &&
          Boolean(formData.condition)
        )
      case 2: {
        const effectiveMethod = effectiveFulfillmentMethod
        if (effectiveMethod === 'dropoff') {
          return Boolean(formData.dropOffLocation)
        }
        return formData.location.trim() !== ''
      }
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
  }, [])

  // Prefill pickup address from Browse location, if present and using pickup flow
  useEffect(() => {
    if (effectiveFulfillmentMethod !== 'pickup') return
    if (!browseLocation?.lat || !browseLocation?.lng) return
    if (pickupLocation) return

    const label = browseLocation.label || ''
    setPickupLocation({ lat: browseLocation.lat, lng: browseLocation.lng, label })
    if (!formData.location && label) {
      setFormData(prev => ({ ...prev, location: label }))
    }
    reverseGeocodePostcode(browseLocation.lat, browseLocation.lng).then((pc) => {
      setPickupLocation(prev => ({ ...(prev || {}), postcode: pc }))
    })
  }, [browseLocation?.lat, browseLocation?.lng, browseLocation?.label, effectiveFulfillmentMethod, formData.location, pickupLocation])

  const handleQuickStartIntentSelect = useCallback((intent: 'exchange' | 'donate' | 'recycle') => {
    if (intent === 'recycle') {
      toast.info('Recycle is coming soon')
      return
    }
    setQuickStartIntent(intent)
    setCurrentStep(1)
    setFormData(prev => ({
      ...prev,
      actionType: intent,
      category: DEFAULT_CATEGORY_BY_INTENT[intent],
      condition: DEFAULT_CONDITION_BY_INTENT[intent],
      preferPartnerSupport: intent === 'donate' ? true : prev.preferPartnerSupport,
      handoverNotes: prev.handoverNotes,
      location: intent === 'exchange' && defaultPickupAddress ? defaultPickupAddress : prev.location,
    }))

    const nextFulfillment: 'pickup' | 'dropoff' = intent === 'donate' ? 'dropoff' : 'pickup'
    handleFulfillmentSelect(nextFulfillment)
    if (intent === 'donate') {
      setShowDropOffSelector(true)
    }
  }, [handleFulfillmentSelect, defaultPickupAddress])

  const scrollToDetailCard = useCallback(() => {
    document.getElementById('listing-form-steps')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    if (!initialIntent) {
      return
    }

    if (editingListingId) {
      onIntentHandled?.()
      return
    }

    setQuickStartIntent(initialIntent)
    const defaultMethod: 'pickup' | 'dropoff' = initialIntent === 'donate' ? 'dropoff' : 'pickup'
    setCurrentStep(1)
    setFormData(prev => ({
      ...prev,
      actionType: initialIntent,
      category: DEFAULT_CATEGORY_BY_INTENT[initialIntent],
      condition: DEFAULT_CONDITION_BY_INTENT[initialIntent],
      location: initialIntent === 'exchange' && defaultPickupAddress ? defaultPickupAddress : prev.location,
    }))
    handleFulfillmentSelect(defaultMethod)
    onIntentHandled?.()
  }, [initialIntent, handleFulfillmentSelect, onIntentHandled, defaultPickupAddress, editingListingId])

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
    if (editingListingId) {
      onFulfillmentPrefillHandled?.()
      return
    }

    handleFulfillmentSelect(prefillFulfillmentMethod)
    onFulfillmentPrefillHandled?.()
  }, [prefillFulfillmentMethod, handleFulfillmentSelect, onFulfillmentPrefillHandled, editingListingId])

  useEffect(() => {
    if (!prefillDropOffLocation) return
    if (editingListingId) {
      onDropOffPrefillHandled?.()
      return
    }

    setFormData(prev => ({
      ...prev,
      fulfillmentMethod: 'dropoff',
      dropOffLocation: prefillDropOffLocation,
      location: prefillDropOffLocation.address
    }))
    setShowDropOffSelector(false)
    onDropOffPrefillHandled?.()
  }, [prefillDropOffLocation, onDropOffPrefillHandled, editingListingId])

  // No forced fulfillment changes by action type

  useEffect(() => {
    const effectiveMethod = effectiveFulfillmentMethod
    if (currentStep === 2 && effectiveMethod === 'dropoff' && !formData.dropOffLocation) {
      setShowDropOffSelector(true)
    }
  }, [currentStep, formData.dropOffLocation, effectiveFulfillmentMethod])

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    } else {
      if (currentStep === 1 && formData.photos.length === 0) {
        toast.error('Add at least one photo to continue')
      } else {
        toast.error('Please fill in all required fields')
      }
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
      const isEditingExistingListing = Boolean(editingListingId)
      const carbonImpact = estimatedCarbonImpact ?? 2
      const listingValuation = valuationSummary
        ? {
            estimatedValue: valuationSummary.estimatedValue,
            recommendedPriceRange: valuationSummary.recommendedPriceRange,
            rewardPoints: valuationSummary.rewardPoints,
            confidence: valuationSummary.confidence,
          }
        : undefined
      const rewardPoints = listingValuation?.rewardPoints ?? Math.round(carbonImpact * 8)

      const fulfillmentMethod: 'pickup' | 'dropoff' =
        formData.actionType === 'donate' ? 'dropoff' : 'pickup'
      let classification = classificationResult
      if (!classification) {
        classification = await classifyListing({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          condition: formData.condition || 'unspecified',
        })
        setClassificationResult(classification)
      }

      let moderation = moderationResult
      if (!moderation) {
        const descriptors = formData.photos.length > 0
          ? formData.photos
          : [formData.description || formData.title || ''];
        moderation = await moderateImages(descriptors)
        setModerationResult(moderation)
      }

      // Ensure photos are uploaded to Cloudinary (unsigned). If a photo is already a URL, keep it.
      const uploadedPhotoUrls: string[] = []
      for (const p of formData.photos) {
        if (/^https?:\/\//i.test(p)) {
          uploadedPhotoUrls.push(p)
        } else {
          // p is a data URL; Cloudinary accepts data URLs as file param
          const up = await uploadImageToCloudinary(p, { alt: formData.title || 'listing-image' })
          uploadedPhotoUrls.push(up.secureUrl)
        }
      }

      // Build API payload (do not send estimated_co2_saved_kg)
      const conditionMap: Record<string, 'new' | 'like_new' | 'good' | 'fair' | 'poor'> = {
        excellent: 'like_new',
        good: 'good',
        fair: 'fair',
        poor: 'poor',
      }

      const isDropoff = fulfillmentMethod === 'dropoff'
      const addressLine = isDropoff
        ? (formData.dropOffLocation?.address || formData.location || '')
        : (formData.location || '')

      // Derive postcode (required by API)
      const explicitPostcode = isDropoff
        ? (formData.dropOffLocation?.postcode || '')
        : (pickupLocation?.postcode || user?.postcode || '')

      const postcode = explicitPostcode || extractPostcode(addressLine)
      if (!postcode) {
        toast.error('Please include a valid postcode (e.g. in your address or profile).')
        setIsSubmitting(false)
        return
      }

      const images = uploadedPhotoUrls.map((url) => ({ url }))

      // Helper to validate UUIDs (backend expects UUID for dropoff_location_id)
      const isUuid = (value?: string | null) =>
        typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

      const basePayload = {
        title: formData.title,
        description: formData.description || undefined,
        condition: conditionMap[formData.condition as keyof typeof conditionMap] || 'good',
        category: formData.category,
        address_line: addressLine,
        postcode,
        images: images.length ? images : undefined,
        // Only include a valid UUID for dropoff_location_id; otherwise omit to avoid backend errors
        dropoff_location_id: isDropoff && isUuid(formData.dropOffLocation?.id) ? formData.dropOffLocation?.id : undefined,
        delivery_preferences: formData.handoverNotes || undefined,
        metadata: undefined,
        size_unit: 'm' as const,
        size_length: 0,
        size_breadth: 0,
        size_height: 0,
        weight_kg: 0,
      }

      const response = isEditingExistingListing
        // For updates, do NOT send pickup_option (backend rejects it in UpdateItemDto)
        ? await updateItem(editingListingId!, basePayload)
        // For creates, pickup_option is required
        : await createItem({ ...basePayload, pickup_option: formData.actionType })

      const server = response?.data
      const listingId = String(server?.id || editingListingId || `listing-${Date.now()}`)
      const newListing: CreatedListing = {
        id: listingId,
        ...formData,
        fulfillmentMethod,
        dropOffLocation: formData.dropOffLocation,
        userId: user.id,
        userName: user.name || 'Anonymous User',
        status: mapServerStatusToClient(server?.status) as CreatedListing['status'],
        createdAt: String(server?.created_at || new Date().toISOString()),
        views: 0,
        interested: [],
        valuation: listingValuation,
        rewardPoints,
        moderation,
        aiClassification: classification,
        co2Impact: typeof server?.estimated_co2_saved_kg === 'number' ? server!.estimated_co2_saved_kg! : carbonImpact,
        photos: uploadedPhotoUrls,
      }

      // Do not persist to local demo stores; rely on API-driven views

      toast.success(isEditingExistingListing ? 'Listing updated successfully!' : 'Item listed successfully!')

      if (!isEditingExistingListing) {
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
      }

      const qrCodeData: QRCodeData = {
        id: `qr-${Date.now()}`,
        type: 'donor',
        itemId: newListing.id,
        itemTitle: newListing.title,
        itemDescription: newListing.description,
        itemImage: newListing.photos?.[0],
        userId: user.id,
        userName: user.name || 'Anonymous User',
        transactionId: listingId,
        dropOffLocation: formData.fulfillmentMethod === 'dropoff' && formData.dropOffLocation
          ? `${formData.dropOffLocation.name}, ${formData.dropOffLocation.postcode}`
          : undefined,
        metadata: {
          category: formData.category,
          condition: formData.condition,
          co2Impact: carbonImpact,
          createdAt: server?.created_at || new Date().toISOString(),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          actionType: formData.actionType || 'donate'
        },
        status: 'active',
        qrImageUrl: server?.qr_code || undefined
      }

      setGeneratedQRCode(qrCodeData)
      setLastCreatedListing(newListing)

      setEditingListingId(null)

      // Photos now point to permanent Cloudinary URLs

      // Partner/shop email logging previously wrote to local demo KV; removed

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: DEFAULT_CATEGORY_BY_INTENT[quickStartIntent] ?? '',
        condition: DEFAULT_CONDITION_BY_INTENT[quickStartIntent] ?? '',
        actionType: quickStartIntent,
        photos: [],
        location: '',
        contactMethod: 'platform',
        fulfillmentMethod: (quickStartIntent === 'donate' ? 'dropoff' : 'pickup'),
        dropOffLocation: null,
        handoverNotes: '',
        preferPartnerSupport: quickStartIntent === 'donate'
      })
      setCurrentStep(1)

    } catch (error) {
      console.error('Failed to create listing', error)
      toast.error('Failed to create listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function mapServerStatusToClient(status?: string): CreatedListing['status'] {
    const s = String(status || '').toLowerCase()
    if (s === 'pending_dropoff') return 'pending_dropoff'
    if (s === 'claimed' || s === 'awaiting_collection') return 'claimed'
    if (s === 'complete' || s === 'recycled') return 'collected'
    if (s === 'active' || !s) return 'active'
    return 'active'
  }

  function extractPostcode(text?: string): string {
    if (!text) return ''
    // Very light UK postcode pattern (not exhaustive), case-insensitive
    const m = text.toUpperCase().match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/)
    return m ? m[0].replace(/\s+/, ' ') : ''
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
      {showPickupLocationSelector && (
        <LocationSelector
          open={showPickupLocationSelector}
          onOpenChange={setShowPickupLocationSelector}
          initialValue={{
            lat: pickupLocation?.lat,
            lng: pickupLocation?.lng,
            label: pickupLocation?.label || formData.location || '',
            radiusKm: 5,
          }}
          onApply={async (val) => {
            // Resolve postcode via reverse geocode
            const lat = typeof val.lat === 'number' ? Number(val.lat.toFixed(7)) : val.lat
            const lng = typeof val.lng === 'number' ? Number(val.lng.toFixed(7)) : val.lng
            const pc = await reverseGeocodePostcode(lat, lng)
            setPickupLocation({ lat, lng, label: val.label, postcode: pc })
            if (val.label) {
              setFormData(prev => ({ ...prev, location: val.label }))
            }
          }}
        />
      )}
      <div ref={formContainerRef} id="listing-form-start" className="space-y-8">
        {/* Quick Start Modal */}
        <Dialog open={showQuickStart} onOpenChange={setShowQuickStart}>
          <DialogContent className="max-w-4xl sm:max-w-4xl md:max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                <Badge variant="secondary" className="uppercase tracking-widest text-xs mr-2">Quick start</Badge>
                Let&apos;s set up your next listing
              </DialogTitle>
              <DialogDescription>
                Choose what you&apos;d like to do. Exchange uses your saved address by default; donations require selecting a drop-off partner.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {(['exchange','donate','recycle'] as const).map((intentKey) => {
                  const config = INTENT_CONFIG[intentKey]
                  const isSelected = quickStartIntent === intentKey
                  const isDisabled = intentKey === 'recycle'
                  return (
                    <button
                      key={intentKey}
                      type="button"
                      onClick={() => !isDisabled && handleQuickStartIntentSelect(intentKey)}
                      disabled={isDisabled}
                      className={`relative overflow-hidden rounded-2xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${isSelected ? 'border-primary shadow-lg' : 'border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md'} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <span className={`pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${config.accent}`} aria-hidden="true" />
                      <div className="flex items-center gap-3 text-primary">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background/75 shadow-inner">
                          {config.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{config.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
                        {isDisabled ? 'Coming soon' : isSelected ? 'Selected' : 'Use this focus'}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Fulfillment options removed in quick start modal */}

              {/* Notes removed in quick start modal */}

              <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={() => { setShowQuickStart(false); scrollToDetailCard() }}>
                  Continue to detailed form
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <section className="hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-primary/5 to-emerald-500/10 p-8 shadow-lg">
          <div className="space-y-8">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit uppercase tracking-widest text-xs">Quick start</Badge>
              <h2 className="text-h3 font-semibold text-foreground">Let&apos;s set up your next listing</h2>
              <p className="text-sm text-muted-foreground">
                Choose what you&apos;d like to do. We&apos;ll carry this into the detailed form below.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(INTENT_CONFIG).map(([value, config]) => {
                const intentValue = value as 'exchange' | 'donate' | 'recycle'
                const isSelected = quickStartIntent === intentValue
                const isDisabled = intentValue === 'recycle'
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => !isDisabled && handleQuickStartIntentSelect(intentValue)}
                    disabled={isDisabled}
                    className={`relative overflow-hidden rounded-2xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${isSelected ? 'border-primary shadow-lg' : 'border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md'} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${config.accent}`}
                      aria-hidden="true"
                    />
                    <div className="flex items-center gap-3 text-primary">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background/75 shadow-inner">
                        {config.icon}
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{config.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
                      {isDisabled ? 'Coming soon' : isSelected ? 'Selected' : 'Use this focus'}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Fulfillment options removed in quick actions section */}

            {/* Notes removed in quick actions section */}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Ready to dive deeper? The form below is now tuned to your quick start selections.
              </p>
              <Button type="button" variant="secondary" onClick={scrollToDetailCard} className="sm:w-auto">
                Continue to detailed form
              </Button>
            </div>
          </div>
        </section>

        <Card id="listing-form-steps">
          <CardHeader>
            <CardTitle className="text-h2 flex items-center space-x-2">
              <Plus size={24} className="text-primary" />
              <span>List Your Item</span>
            </CardTitle>
            <CardDescription>
              Step {currentStep} of {totalSteps}: Help reduce waste by listing your item
            </CardDescription>
            <div className="mt-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span><span className="font-semibold">Action:</span> {formData.actionType === 'donate' ? 'Donate' : 'Exchange'}</span>
                <span><span className="font-semibold">Category:</span> {formData.category || 'Not set'}</span>
                {formData.actionType === 'donate' && formData.dropOffLocation && (
                  <span>
                    <span className="font-semibold">Drop-off:</span> {formData.dropOffLocation.name} — {formData.dropOffLocation.address}
                  </span>
                )}
              </div>
            </div>
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
              <Label>Photos *</Label>
              <div className="mt-2 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelection}
                  className="hidden"
                />
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
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Merge Step 2: Category & Condition here */}
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
              </div>
            )}


        {/* Step 2 merged into Step 1; Step 3 removed */}

        {/* Step 2: Hand-off & Location */}
        {currentStep === 2 && (
          <div className="space-y-4">
              {/* Removed hand-off choice UI — Exchange shows pickup only, Donate uses partner shop */}

            <div>
              <Label htmlFor="location">
                {effectiveFulfillmentMethod === 'dropoff' ? 'Partner shop selection *' : 'Pickup area *'}
              </Label>
              {effectiveFulfillmentMethod === 'dropoff' ? (
                <div className="space-y-2 mt-2">
                  {formData.dropOffLocation ? (
                    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                      <div className="flex items-start justify-between gap-3">
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
                      Browse partner shops
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="mt-0.5 text-primary" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {pickupLocation?.label || formData.location || 'No place selected'}
                        </div>
                        {pickupLocation?.postcode && (
                          <div className="text-xs text-muted-foreground">Postcode: {pickupLocation.postcode}</div>
                        )}
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowPickupLocationSelector(true)}>
                        Change
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowPickupLocationSelector(true)}>
                      <MapPin size={16} className="mr-2" /> Select on map
                    </Button>
                    {defaultPickupAddress && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleUseDefaultPickup}>
                        My default pickup address
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Address statement will be saved as address_line and postcode for your listing. Exact details are only shared after approval.
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {effectiveFulfillmentMethod === 'dropoff'
                  ? 'Choose a TruCycle Partner Shop to manage the hand-off securely.'
                  : 'Enter a general area only—exact addresses are shared privately after approval.'}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="font-medium text-lg">Review your listing details</h3>
                {valuationSummary && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">Reward +{valuationSummary.rewardPoints} pts</Badge>
                    {estimatedCarbonImpact !== null && (
                      <Badge variant="outline" className="capitalize">-{estimatedCarbonImpact}kg CO2</Badge>
                    )}
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
                <div><span className="font-medium">Hand-off:</span> {effectiveFulfillmentMethod === 'dropoff' ? 'Partner shop drop-off' : 'Pickup'}</div>
                <div>
                  <span className="font-medium">Location:</span>{' '}
                  {effectiveFulfillmentMethod === 'dropoff' && formData.dropOffLocation
                    ? `${formData.dropOffLocation.name}, ${formData.dropOffLocation.postcode}`
                    : formData.location}
                </div>
                {estimatedCarbonImpact !== null && (
                  <div><span className="font-medium">Estimated CO2 impact:</span> -{estimatedCarbonImpact}kg saved</div>
                )}
                {formData.photos.length > 0 && (
                  <div><span className="font-medium">Photos:</span> {formData.photos.length} uploaded</div>
                )}
              </div>
              {false && (
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
                    {estimatedCarbonImpact !== null && (
                      <p className="mt-2 text-foreground font-medium">Approx. -{estimatedCarbonImpact}kg CO2 saved</p>
                    )}
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
              {isSubmitting
                ? (editingListingId ? 'Updating...' : 'Creating...')
                : (editingListingId ? 'Update Listing' : 'Create Listing')}
            </Button>
          )}
        </div>
        {(classificationLoading || classificationResult || moderationLoading || moderationResult) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(classificationLoading || classificationResult) && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-primary">AI category guidance</p>
                {classificationLoading ? (
                  <p className="text-xs text-muted-foreground">Analysing your listing details.</p>
                ) : classificationResult ? (
                  <>
                    <Badge variant="outline" className="uppercase tracking-wide">
                      {CLASSIFICATION_LABELS[classificationResult.recommendedAction]}
                    </Badge>
                    <p className="text-sm">{classificationResult.reasoning}</p>
                    {classificationResult.highlights.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                        {classificationResult.highlights.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Provide more detail to receive tailored recommendations.</p>
                )}
              </div>
            )}
            {(moderationLoading || moderationResult) && (
              <div className={`rounded-lg border p-4 space-y-2 ${moderationResult?.status === 'flagged' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'bg-muted/40'}`}>
                <p className="text-sm font-semibold">Image safety check</p>
                {moderationLoading ? (
                  <p className="text-xs text-muted-foreground">Reviewing photos for safety.</p>
                ) : moderationResult ? (
                  <>
                    <p className="text-sm">{moderationResult.message}</p>
                    {moderationResult.labels.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {moderationResult.labels.map((label) => (
                          <Badge key={label} variant="outline">{label}</Badge>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Add a photo or description to run an automated safety check.</p>
                )}
              </div>
            )}
          </div>
        )}
        
          </CardContent>
        </Card>
      </div>
    </>
  )
}


