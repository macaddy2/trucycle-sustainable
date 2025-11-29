import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTitle, DrawerClose } from '@/components/ui/drawer'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChatCircle, CheckCircle, Clock, MapPin, Package, PencilSimpleLine, Phone, Plus, QrCode, ShieldCheck, CaretLeft, CaretRight, UserCircle, X } from '@phosphor-icons/react'
import { useMessaging, useExchangeManager } from '@/hooks'
import { listMyItems, listMyCollectedItems, createOrFindRoom, collectItem, getItemById } from '@/lib/api'
import { messageSocket } from '@/lib/messaging/socket'
import ListingsSkeleton from '@/components/skeletons/ListingsSkeleton'
import type { ClaimRequest } from '@/hooks/useExchangeManager'
import type { ManagedListing } from '@/types/listings'
import type { ListingEditDraft } from './ItemListingForm'
import type { PublicItem } from '@/lib/api/types'
import type { DropOffLocation } from './dropOffLocations'

interface UserProfile {
  id: string
  name: string
  userType: 'donor' | 'collector'
  rewardsBalance?: number
  partnerAccess?: boolean
}

interface MyListingsViewProps {
  onAddNewItem?: () => void
  variant?: 'page' | 'dashboard'
  onOpenMessages?: (options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => void
  onEditListing?: (draft: ListingEditDraft) => void
  onDrawerOpenChange?: (open: boolean) => void
}


const CLASSIFICATION_TEXT: Record<'exchange' | 'donate' | 'recycle', string> = {
  exchange: 'Free exchange',
  donate: 'Community donation',
  recycle: 'Professional recycling',
}

const statusCopy: Record<ManagedListing['status'], { label: string; tone: 'default' | 'outline' | 'secondary' | 'destructive' }> = {
  active: { label: 'Active', tone: 'outline' },
  pending_dropoff: { label: 'Pending drop-off', tone: 'secondary' },
  claimed: { label: 'Claimed', tone: 'secondary' },
  collected: { label: 'Collected', tone: 'default' },
  expired: { label: 'Expired', tone: 'destructive' },
}
const REQUEST_STATUS_BADGE: Record<ClaimRequest['status'], { label: string; variant: 'outline' | 'secondary' | 'destructive' | 'default' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'secondary' },
  declined: { label: 'Declined', variant: 'destructive' },
  completed: { label: 'Collected', variant: 'default' },
}

const CLAIM_STATUS_DESCRIPTION: Record<ClaimRequest['status'], string> = {
  pending: 'Your request is waiting for donor approval. We will notify you once they respond.',
  approved: 'Your request has been approved. Coordinate the hand-off with the donor via chat.',
  declined: 'This request was declined. You can browse for other items that might fit your needs.',
  completed: 'Collection is confirmed. Feel free to follow up with the donor if needed.',
}

const formatCategoryDisplay = (value?: string | null) => {
  const normalized = String(value ?? '').trim()
  if (!normalized) return 'Not specified'
  if (normalized.toLowerCase() === 'other') return 'Not specified'
  return normalized
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const formatRelativeTime = (value: string) => {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

type OpeningHoursPayload = {
  days?: string[]
  open_time?: string
  close_time?: string
}

const formatOpeningHoursValue = (opening?: OpeningHoursPayload | string | null): string | null => {
  if (!opening) {
    return null
  }

  if (typeof opening === 'string') {
    const trimmed = opening.trim()
    return trimmed || null
  }

  const { days, open_time, close_time } = opening
  const joinedDays = Array.isArray(days) && days.length > 0 ? days.join(', ') : 'Daily'
  if (open_time && close_time) return `${joinedDays} ${open_time} - ${close_time}`
  if (open_time) return `${joinedDays} from ${open_time}`
  if (close_time) return `${joinedDays} until ${close_time}`
  return joinedDays
}

function isLocationOpen(opening_hours: OpeningHoursPayload | null | undefined): boolean {
  if (!opening_hours || !Array.isArray(opening_hours.days) || opening_hours.days.length === 0) {
    return false
  }
  if (!opening_hours.open_time || !opening_hours.close_time) {
    return false
  }

  const now = new Date()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = dayNames[now.getDay()]
  if (!opening_hours.days.includes(today)) return false

  const parseTime = (value: string) => {
    const [hour = '0', minute = '0'] = value.split(':')
    return { hour: Number(hour), minute: Number(minute) }
  }

  const { hour: openHour, minute: openMinute } = parseTime(opening_hours.open_time)
  const { hour: closeHour, minute: closeMinute } = parseTime(opening_hours.close_time)
  const open = new Date(now)
  open.setHours(openHour, openMinute, 0, 0)
  const close = new Date(now)
  close.setHours(closeHour, closeMinute, 0, 0)

  return now >= open && now <= close
}

export function MyListingsView({
  onAddNewItem,
  variant = 'page',
  onOpenMessages,
  onEditListing,
  onDrawerOpenChange,
}: MyListingsViewProps) {
  const [currentUser] = useKV<UserProfile | null>('current-user', null)
  const [listings, setListings] = useKV<ManagedListing[]>('user-listings', [])
  const [, setGlobalListings] = useKV<ManagedListing[]>('global-listings', [])
  const { getChatForItem, updateChatStatus, createOrGetChat } = useMessaging()
  const {
    getRequestsForItem,
    confirmClaimRequest,
  } = useExchangeManager()
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedItemDetails, setSelectedItemDetails] = useState<PublicItem | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const detailDrawerContentRef = useRef<HTMLDivElement | null>(null)
  const detailDrawerCloseButtonRef = useRef<HTMLButtonElement | null>(null)
  const viewerContentRef = useRef<HTMLDivElement | null>(null)
  const viewerCloseButtonRef = useRef<HTMLButtonElement | null>(null)

  const sortedListings = useMemo(() => {
    // Show all items for donors and collectors; order by newest first
    return [...listings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [listings])

  const activeCount = useMemo(() => sortedListings.filter(listing => listing.status === 'active').length, [sortedListings])

  const selectedListing = useMemo(() => listings.find(listing => listing.id === selectedListingId) ?? null, [listings, selectedListingId])

  useEffect(() => {
    if (showDetailModal) {
      const focusTarget = detailDrawerCloseButtonRef.current ?? detailDrawerContentRef.current
      focusTarget?.focus({ preventScroll: true })
    }
  }, [showDetailModal])

  useEffect(() => {
    if (imageViewerOpen) {
      const focusTarget = viewerCloseButtonRef.current ?? viewerContentRef.current
      focusTarget?.focus({ preventScroll: true })
    }
  }, [imageViewerOpen])
  const listingRequests = useMemo(() => (selectedListing ? getRequestsForItem(selectedListing.id) : []), [selectedListing, getRequestsForItem])

  useEffect(() => {
    if (!showDetailModal || !selectedListingId) {
      return
    }

    let cancelled = false
    setDetailsLoading(true)
    setDetailsError(null)

    getItemById(selectedListingId)
      .then(res => {
        if (cancelled) return
        const item = res?.data ?? null
        setSelectedItemDetails(item)
      })
      .catch((error: any) => {
        if (cancelled) return
        setSelectedItemDetails(null)
        setDetailsError(typeof error?.message === 'string' ? error.message : 'Unable to load item details')
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showDetailModal, selectedListingId])

  const openMessages = (options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => {
    if (onOpenMessages) {
      onOpenMessages(options)
    } else {
      toast.info('Open the message center from the header to continue your conversation.')
    }
  }

  const isCollector = (currentUser && 'userType' in currentUser) ? (currentUser as UserProfile).userType === 'collector' : false
  const addFirstItemLabel = isCollector ? 'Add an item' : 'List or donate your first item'
  const addNewItemLabel = isCollector ? 'Add an item' : 'List or donate new item'
  const heading = variant === 'dashboard'
    ? 'Manage your listings'
    : isCollector
      ? 'My collected items'
      : 'My listed items'
  const description = variant === 'dashboard'
    ? `Track the status of your ${sortedListings.length ? '' : 'future '}donations and exchanges.`
    : isCollector
      ? `Plan pickups and drop-offs for the ${sortedListings.length} item${sortedListings.length === 1 ? '' : 's'} in your care (${activeCount} ready to action).`
      : `You currently have ${sortedListings.length} listing${sortedListings.length === 1 ? '' : 's'} (${activeCount} active).`

  // Mark as collected: donor or collector can finalize after approval
  const handleMarkCollected = async (listingId: string) => {
    const listing = listings.find(item => item.id === listingId)
    if (!listing) return

    if (listing.actionType === 'donate') {
      toast.info('Partner shops confirm donated drop-offs on your behalf.')
      return
    }

    try {
      await collectItem(listingId)

      setListings(prev => prev.map(item => (
        item.id === listingId ? { ...item, status: 'collected' } : item
      )))

      setGlobalListings(prev => prev.map(item => (
        item.id === listingId ? { ...item, status: 'collected' } : item
      )))

      const chat = getChatForItem(listingId)
      if (chat) {
        updateChatStatus(chat.id, 'completed')
      }

      toast.success('Item marked as collected')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to mark item as collected')
    }
  }

  const handleOpenListingDetails = (listingId: string) => {
    setSelectedListingId(listingId)
    setSelectedItemDetails(null)
    setDetailsError(null)
    setShowDetailModal(true)
  }

  const mapConditionForDraft = (value?: string): ListingEditDraft['condition'] => {
    const normal = String(value || '').toLowerCase()
    if (normal === 'excellent' || normal === 'like_new' || normal === 'new') return 'excellent'
    if (normal === 'good') return 'good'
    if (normal === 'poor') return 'poor'
    return 'fair'
  }

  const deriveDropOffLocation = (item: ManagedListing, detail: PublicItem | null): DropOffLocation | null => {
    if (item.fulfillmentMethod !== 'dropoff') return null

    const existing = item.dropOffLocation as any
    if (existing && typeof existing === 'object' && 'coordinates' in existing) {
      return existing as DropOffLocation
    }

    // Use dropoff_location from detail if available
    let dropoff: any = null
    if (detail && 'dropoff_location' in detail && (detail as any).dropoff_location) {
      dropoff = (detail as any).dropoff_location
    }
    const latitude = typeof dropoff?.latitude === 'number' ? dropoff.latitude : 51.5072
    const longitude = typeof dropoff?.longitude === 'number' ? dropoff.longitude : -0.1276
    const rawOpeningHours = dropoff?.opening_hours && typeof dropoff.opening_hours === 'object'
      ? (dropoff.opening_hours as OpeningHoursPayload)
      : null
    const formattedOpenHours = formatOpeningHoursValue(rawOpeningHours ?? dropoff?.opening_hours)
    const resolvedOpenHours = formattedOpenHours && formattedOpenHours.trim()
      ? formattedOpenHours
      : 'Hours shared after confirmation'

    return {
      id: `${item.id}-dropoff`,
      name: dropoff?.name || 'Partner shop',
      address: dropoff?.address || '',
      postcode: dropoff?.postcode || '',
      distance: dropoff?.distance || '—',
      openHours: resolvedOpenHours,
      openingHoursRaw: rawOpeningHours,
      phone: dropoff?.phone_number || 'Contact provided after booking',
      acceptedItems: Array.isArray(existing?.acceptedItems) ? existing.acceptedItems : Array.isArray(dropoff?.acceptedItems) ? dropoff.acceptedItems : [],
      specialServices: Array.isArray(existing?.specialServices) ? existing.specialServices : Array.isArray(dropoff?.specialServices) ? dropoff.specialServices : [],
      coordinates: { lat: latitude, lng: longitude },
    }
  }

  const handleEditInForm = () => {
    if (!selectedListing || !selectedListingId || !onEditListing) {
      toast.error('Select a listing to edit')
      return
    }
    if (isCollector) {
      toast.info('Collectors cannot edit items')
      return
    }
    if (selectedListing.status === 'claimed') {
      toast.info('Claimed items cannot be edited')
      return
    }
    if (selectedListing.status === 'collected') {
      toast.info('Collected items cannot be edited')
      return
    }
    if (detailsLoading) {
      toast.info('Loading item details…')
      return
    }
    const detail = selectedItemDetails
    if (!detail) {
      toast.error('Unable to load item details for editing')
      return
    }

    const actionType = (detail.pickup_option || selectedListing.actionType) as ListingEditDraft['actionType']
    const fulfillmentMethod: ManagedListing['fulfillmentMethod'] = actionType === 'donate' ? 'dropoff' : 'pickup'
    const photosFromDetail = Array.isArray(detail.images) ? detail.images.map(img => img?.url).filter(Boolean) : []
    const dropOffLocation = deriveDropOffLocation(selectedListing, detail)

    const draft: ListingEditDraft = {
      itemId: selectedListingId,
      title: detail.title || selectedListing.title,
      description: detail.description || selectedListing.description || '',
      category: detail.category || selectedListing.category,
      condition: mapConditionForDraft(detail.condition || selectedListing.condition),
      actionType,
      fulfillmentMethod,
      photos: photosFromDetail.length > 0 ? photosFromDetail : selectedListing.photos ?? [],
      location: fulfillmentMethod === 'pickup'
        ? ((detail as any)?.location?.address_line || selectedListing.location || '')
        : undefined,
      dropOffLocation,
      handoverNotes: selectedListing.handoverNotes,
      preferPartnerSupport: selectedListing.preferPartnerSupport,
      postcode: 
        (detail && 'location' in detail && (detail as any).location?.postcode) ||
        (detail && 'dropoff_location' in detail && (detail as any).dropoff_location?.postcode),
    }

    onEditListing(draft)
    setShowDetailModal(false)
    setSelectedListingId(null)
    setSelectedItemDetails(null)
  }

  const detailItem = selectedItemDetails
  const dropOffLocationDetail = useMemo(() => (
    selectedListing ? deriveDropOffLocation(selectedListing, detailItem) : null
  ), [selectedListing, detailItem])
  const dropOffLocationOpeningHoursRaw = useMemo<OpeningHoursPayload | null>(() => {
    if (dropOffLocationDetail?.openingHoursRaw) return dropOffLocationDetail.openingHoursRaw
    if (!detailItem || !('dropoff_location' in detailItem)) return null
    const raw = (detailItem as any).dropoff_location?.opening_hours
    if (!raw || typeof raw !== 'object') return null
    return raw as OpeningHoursPayload
  }, [dropOffLocationDetail, detailItem])
  const isDropOffLocationOpen = dropOffLocationOpeningHoursRaw ? isLocationOpen(dropOffLocationOpeningHoursRaw) : null
  const qrImageUrl = isCollector ? null : detailItem?.qr_code ?? null
  const galleryImages = useMemo(() => {
    const detailImages = detailItem?.images?.map((img) => img?.url).filter(Boolean) ?? []
    const listingPhotos = selectedListing?.photos ?? []
    const images = detailImages.length > 0 ? detailImages : listingPhotos
    return Array.from(new Set(images.filter(Boolean)))
  }, [detailItem, selectedListing])
  useEffect(() => {
    if (galleryImages.length === 0) {
      setActiveImageIndex(0)
      setImageViewerOpen(false)
      return
    }
    if (activeImageIndex >= galleryImages.length) {
      setActiveImageIndex(galleryImages.length - 1)
    }
  }, [galleryImages.length, activeImageIndex])

  const openImageViewer = useCallback((index: number) => {
    if (galleryImages.length === 0) return
    setActiveImageIndex(Math.max(0, Math.min(index, galleryImages.length - 1)))
    setImageViewerOpen(true)
  }, [galleryImages.length])

  const goToPreviousImage = useCallback(() => {
    if (galleryImages.length <= 1) return
    setActiveImageIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length)
  }, [galleryImages.length])

  const goToNextImage = useCallback(() => {
    if (galleryImages.length <= 1) return
    setActiveImageIndex(prev => (prev + 1) % galleryImages.length)
  }, [galleryImages.length])

  useEffect(() => {
    if (!imageViewerOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (galleryImages.length <= 1) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPreviousImage()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToNextImage()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [imageViewerOpen, galleryImages.length, goToNextImage, goToPreviousImage])

  const activeImage = galleryImages[activeImageIndex] ?? null

  const detailDescription = detailItem?.description?.trim() || selectedListing?.description?.trim() || 'No description added yet. Share a few highlights to attract collectors.'
  const handoffDisplay = selectedListing?.fulfillmentMethod === 'dropoff'
    ? (dropOffLocationDetail
      ? `${dropOffLocationDetail.name}${dropOffLocationDetail.postcode ? ` — ${dropOffLocationDetail.postcode}` : ''}`
      : ((detailItem && 'dropoff_location' in detailItem && (detailItem as any).dropoff_location?.address_line) ? (detailItem as any).dropoff_location.address_line : 'Partner location shared after confirmation'))
    : (selectedListing?.location || ((detailItem && 'location' in detailItem && (detailItem as any).location?.address_line) ? (detailItem as any).location.address_line : 'Pickup location to be confirmed in chat'))
  const showCollectorRequests = !isCollector
  const detailOwner = detailItem?.owner

  const collectorRequestForItem = useMemo(() => {
    if (!selectedListing || !isCollector || !currentUser) return null
    const existing = listingRequests.find((request) => request.itemId === selectedListing.id && request.collectorId === (currentUser as UserProfile).id)
    if (existing) return existing
    if (!selectedListing.claimId || !selectedListing.claimStatus) return null
    const donorId = selectedListing.userId || detailOwner?.id
    if (!donorId) return null
    const derived: ClaimRequest = {
      id: selectedListing.claimId,
      itemId: selectedListing.id,
      itemTitle: selectedListing.title,
      itemImage: selectedListing.photos?.[0],
      donorId,
      donorName: selectedListing.userName || detailOwner?.name || 'Donor',
      collectorId: (currentUser as UserProfile).id,
      collectorName: (currentUser as UserProfile).name || 'You',
      collectorAvatar: undefined,
      note: undefined,
      status: selectedListing.claimStatus,
      createdAt: selectedListing.claimCreatedAt || selectedListing.createdAt,
      decisionAt: selectedListing.claimApprovedAt || selectedListing.claimCompletedAt,
    }
    return derived
  }, [selectedListing, isCollector, currentUser, listingRequests, detailOwner])

  const collectorClaimStatus = collectorRequestForItem?.status || selectedListing?.claimStatus
  const canOpenCollectorChat = Boolean(collectorClaimStatus && (collectorClaimStatus === 'approved' || collectorClaimStatus === 'completed'))

  const handleOpenConversation = async (request: ClaimRequest) => {
    let room: any = null
    try {
      // Ensure a server-side direct room exists with the collector
      const otherUserId = (currentUser && (currentUser as UserProfile).userType === 'donor') ? request.collectorId : request.donorId
      const roomRes = await createOrFindRoom(otherUserId)
      room = roomRes?.data
      try { await messageSocket.joinRoom(otherUserId) } catch { }
    } catch (e: any) {
      // Non-fatal: still open local chat for UX continuity
      toast.error(e?.message || 'Unable to open conversation room. Opening local chat...')
    }

    // Open or create a local chat and navigate to Messages
    const listing = listings.find((l) => l.id === request.itemId)
    const donorId = (currentUser && (currentUser as UserProfile).userType === 'donor') ? (currentUser as UserProfile).id : request.donorId
    const donorName = (currentUser && (currentUser as UserProfile).userType === 'donor') ? (currentUser as UserProfile).name : request.donorName

    const chatId = await createOrGetChat(
      request.itemId,
      listing?.title || request.itemTitle,
      listing?.photos?.[0],
      donorId,
      donorName,
      undefined,
      request.collectorId,
      request.collectorName,
      request.collectorAvatar,
      { linkedRequestId: request.id, remoteRoomId: (room as any)?.id },
    )
    // Prefer routing to remote room id in URL if available for faster targeting
    openMessages?.({ chatId: (room as any)?.id || chatId })
  }

  const handleCollectorConversation = () => {
    if (!collectorRequestForItem || !canOpenCollectorChat) return
    void handleOpenConversation(collectorRequestForItem)
  }

  // Load server-backed data for my listed / collected items
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        if (isCollector) {
          const res = await listMyCollectedItems({ limit: 50 })
          const entries = res?.data?.items || []
          const mapped: ManagedListing[] = entries.map((e: any) => {
            const it = e?.item || {}
            // Map to UI status; only final 'complete' maps to collected
            const claimStatus = String(e?.claim_status || '').toLowerCase()
            const statusFromItem = mapServerStatusToClient(it.status)
            const statusForUi: ManagedListing['status'] = claimStatus === 'complete' ? 'collected' : statusFromItem
            const normalizedClaimStatus = mapServerClaimStatus(e?.claim_status)
            // Rewards can be present on either the entry or the item payload depending on backend
            const rawReward = (e?.reward ?? (it as any)?.reward)
            const rawCurrency = (e?.reward_currency ?? (it as any)?.reward_currency)
            return {
              id: String(it.id || crypto.randomUUID()),
              title: String(it.title || 'Untitled'),
              description: String(it.description || ''),
              status: statusForUi,
              category: String(it.category || 'Other'),
              createdAt: String(it.created_at || new Date().toISOString()),
              actionType: (it.pickup_option || 'donate') as ManagedListing['actionType'],
              fulfillmentMethod: (it.pickup_option === 'donate' ? 'dropoff' : 'pickup'),
              location: it.location?.address_line || it.location?.postcode,
              photos: Array.isArray(it.images) ? it.images.map((img: any) => img?.url).filter(Boolean) : undefined,
              valuation: undefined,
              rewardPoints: undefined,
              reward: typeof rawReward === 'number' ? rawReward : undefined,
              reward_currency: typeof rawCurrency === 'string' ? rawCurrency : undefined,
              co2Impact: typeof it.estimated_co2_saved_kg === 'number' ? it.estimated_co2_saved_kg : undefined,
              aiClassification: undefined,
              moderation: undefined,
              // For collectors, store donor name for table display
              userId: it.owner?.id || undefined,
              userName: it.owner?.name || undefined,
              claimId: e?.claim_id ? String(e.claim_id) : undefined,
              claimStatus: normalizedClaimStatus,
              claimCreatedAt: e?.claim_created_at ? String(e.claim_created_at) : undefined,
              claimApprovedAt: e?.claim_approved_at ? String(e.claim_approved_at) : undefined,
              claimCompletedAt: e?.claim_completed_at ? String(e.claim_completed_at) : undefined,
            }
          })
          if (!cancelled) {
            // Deduplicate by id in case API returns multiple records for same item
            const byId = new Map<string, ManagedListing>()
            for (const m of mapped) {
              const existing = byId.get(m.id)
              if (!existing) {
                byId.set(m.id, m)
              } else {
                // Prefer the more recent createdAt if duplicated
                const a = new Date(existing.createdAt).getTime()
                const b = new Date(m.createdAt).getTime()
                byId.set(m.id, b >= a ? m : existing)
              }
            }
            setListings(Array.from(byId.values()))
          }
        } else {
          const res = await listMyItems({ limit: 50 })
          const items = res?.data?.items || []
          const mapped: ManagedListing[] = items.map((it: any) => ({
            id: String(it.id || crypto.randomUUID()),
            title: String(it.title || 'Untitled'),
            description: '',
            status: mapServerStatusToClient(it.status),
            category: String(it.category || 'Other'),
            createdAt: String(it.created_at || new Date().toISOString()),
            actionType: (it.pickup_option || 'donate') as ManagedListing['actionType'],
            fulfillmentMethod: (it.pickup_option === 'donate' ? 'dropoff' : 'pickup'),
            location: it.location?.address_line || it.location?.postcode,
            photos: Array.isArray(it.images) ? it.images.map((img: any) => img?.url).filter(Boolean) : undefined,
            valuation: undefined,
            rewardPoints: undefined,
            reward: typeof (it as any)?.reward === 'number' ? (it as any).reward : undefined,
            reward_currency: typeof (it as any)?.reward_currency === 'string' ? (it as any).reward_currency : undefined,
            co2Impact: typeof it.estimated_co2_saved_kg === 'number' ? it.estimated_co2_saved_kg : undefined,
            aiClassification: undefined,
            moderation: undefined,
          }))
          if (!cancelled) {
            const byId = new Map<string, ManagedListing>()
            for (const m of mapped) byId.set(m.id, m)
            setListings(Array.from(byId.values()))
          }
        }
      } catch (e: any) {
        // Do not use demo/fallback data
        setListings([])
        toast.error(e?.message || 'Failed to load your items')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isCollector, setListings])

  function mapServerStatusToClient(status: unknown): ManagedListing['status'] {
    const s = String(status || '').toLowerCase()
    if (s === 'pending_dropoff' || s === 'pending_drop-off') return 'pending_dropoff'
    if (s === 'claimed' || s === 'awaiting_collection') return 'claimed'
    if (s === 'complete' || s === 'completed' || s === 'recycled') return 'collected'
    if (s === 'expired') return 'expired'
    return 'active'
  }

  function mapServerClaimStatus(status: unknown): ClaimRequest['status'] {
    const s = String(status || '').toLowerCase()
    if (s === 'approved' || s === 'awaiting_collection') return 'approved'
    if (s === 'complete' || s === 'completed') return 'completed'
    if (s === 'rejected' || s === 'declined' || s === 'cancelled') return 'declined'
    return 'pending'
  }

  const handleApproveRequest = async (request: ClaimRequest) => {
    const approved = await confirmClaimRequest(request.id)
    if (!approved) {
      toast.error('Unable to approve this request')
      return
    }

    // Approval should reflect as claimed and remain visible until manual collection
    setListings(prev => prev.map(item => (item.id === approved.itemId ? { ...item, status: 'claimed' } : item)))
    setGlobalListings(prev => prev.map(item => (item.id === approved.itemId ? { ...item, status: 'claimed' } : item)))

    try {
      const chatId = await createOrGetChat(
        approved.itemId,
        approved.itemTitle,
        undefined,
        approved.donorId,
        approved.donorName,
        undefined,
        approved.collectorId,
        approved.collectorName,
        approved.collectorAvatar,
        { linkedRequestId: approved.id }
      )
      // Update chat to reflect arrangement
      updateChatStatus(chatId, 'collection_arranged')
      window.dispatchEvent(new CustomEvent('exchange-claim-approved', {
        detail: { request: approved, chatId }
      }))
      toast.success(`Approved ${approved.collectorName} for "${approved.itemTitle}"`)
      openMessages({ chatId })
    } catch (error) {
      console.error('Failed to create chat for approved request', error)
      toast.error('Request approved but chat could not be started automatically')
    }
  }

  // No handleCompleteRequest; approval triggers collection via API

  if (!currentUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-h3 flex items-center gap-2">
            <ShieldCheck size={20} />
            <span>Manage your listings</span>
          </CardTitle>
          <CardDescription>
            Sign in to review, chat about, and update the items you have listed for the community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">You need an account to access personalised listings.</p>
        </CardContent>
      </Card>
    )
  }

  const EmptyState = (
    <div className="text-center py-12 text-sm text-muted-foreground">
      <Package size={48} className="mx-auto mb-4 text-muted-foreground" />
      <p>
        {isCollector
          ? 'You have not added any items to your collection yet.'
          : 'You have not listed any items yet.'}
      </p>
      {onAddNewItem && (
        <Button className="mt-4" onClick={onAddNewItem}>
          <Plus size={16} className="mr-2" />
          {addFirstItemLabel}
        </Button>
      )}
    </div>
  )

  const TableView = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Listed</TableHead>
          <TableHead>Reward</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedListings.map(listing => {
          const status = statusCopy[listing.status] ?? { label: 'Unknown', tone: 'default' }
          const chat = getChatForItem(listing.id)
          const isCollected = listing.status === 'collected' || listing.claimStatus === 'completed'
          const rewardValue = listing.reward ?? listing.rewardPoints ?? listing.valuation?.rewardPoints
          const rewardCurrency = listing.reward_currency ?? (typeof rewardValue === 'number' ? 'PTS' : undefined)
          const requests = getRequestsForItem(listing.id)
          const approvedRequest = requests.find(r => r.status === 'approved')
          const collectorsBadgeText = isCollector
            ? (listing.userName ? `Donor: ${listing.userName}` : 'Donor')
            : (listing.status === 'collected'
              ? 'Collected'
              : approvedRequest
                ? 'Collector approved'
                : (requests.length > 0
                  ? `${requests.length} collector${requests.length === 1 ? '' : 's'}`
                  : 'Waiting for collectors'))
          const collectorsBadgeVariant: any = listing.status === 'collected'
            ? 'default'
            : (approvedRequest ? 'secondary' : 'outline')
          return (
            <TableRow
              key={listing.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => handleOpenListingDetails(listing.id)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-15 flex-shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/20">
                    {listing.photos?.[0] ? (
                      <img
                        src={listing.photos[0]}
                        alt={`${listing.title} photo`}
                        className="h-full w-full rounded-md object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Package size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{listing.title}</p>
                    {Boolean(String(listing.category || '').trim()) && String(listing.category).trim().toLowerCase() !== 'other' && (
                      <p className="text-xs text-muted-foreground capitalize">{String(listing.category).trim()}</p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant={status?.tone === 'default' ? 'default' : status?.tone ?? 'default'} className="capitalize">
                    {status?.label ?? 'Unknown'}
                  </Badge>
                  {listing.aiClassification && (
                    <p className="text-[11px] text-muted-foreground">
                      {CLASSIFICATION_TEXT[listing.aiClassification.recommendedAction]} ({listing.aiClassification.confidence} confidence)
                    </p>
                  )}
                  {listing.moderation?.status === 'flagged' && (
                    <p className="text-[11px] text-destructive">{listing.moderation.message}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="capitalize">{listing.actionType}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1 text-sm">
                  <Clock size={12} />
                  {formatDate(listing.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                {!isCollected ? (
                  <span className="text-xs text-muted-foreground">Pending</span>
                ) : (
                  typeof rewardValue === 'number' ? (
                    <span className="text-sm font-medium text-primary">+{rewardValue} {rewardCurrency || 'PTS'}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {chat ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      openMessages({ chatId: chat.id })
                    }}
                  >
                    <ChatCircle size={14} className="mr-2" />
                    Open chat
                  </Button>
                ) : (
                  <Badge variant={collectorsBadgeVariant} className="text-xs">{collectorsBadgeText}</Badge>
                )}
                {listing.status === 'claimed' && listing.actionType !== 'donate' && (
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleMarkCollected(listing.id)
                    }}
                  >
                    <CheckCircle size={14} className="mr-2" />
                    Mark collected
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      <TableCaption>
        Approval completes the hand-off. Tap a row to review full listing details.
      </TableCaption>
    </Table>
  )

  const content = loading
    ? <ListingsSkeleton rows={3} />
    : (sortedListings.length === 0
      ? EmptyState
      : TableView)

  if (variant === 'dashboard') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-medium">Your listed items</p>
            <p className="text-sm text-muted-foreground">Select a listing to view full details.</p>
          </div>
          {onAddNewItem && (
            <Button onClick={onAddNewItem}>
              <Plus size={16} className="mr-2" />
              {addNewItemLabel}
            </Button>
          )}
        </div>
        {content}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-h3 flex items-center gap-2">
              <Package size={20} />
              {heading}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {onAddNewItem && (
            <Button onClick={onAddNewItem}>
              <Plus size={16} className="mr-2" />
              {addNewItemLabel}
            </Button>
          )}
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>

      <Sheet
        open={showDetailModal && Boolean(selectedListing)}
        onOpenChange={(open) => {
          setShowDetailModal(open)
          if (typeof onDrawerOpenChange === 'function') onDrawerOpenChange(open)
          if (!open) {
            setSelectedListingId(null)
            setSelectedItemDetails(null)
            setDetailsError(null)
            setImageViewerOpen(false)
            setActiveImageIndex(0)
          }
        }}
      >
        <SheetContent
          side="right"
          ref={detailDrawerContentRef}
          tabIndex={-1}
          aria-label="Listing details"
          className="h-full w-full max-w-6xl overflow-y-auto p-6 sm:max-w-5xl lg:max-w-6xl lg:p-8"
        >
          <div className="relative">
            <SheetClose
              ref={detailDrawerCloseButtonRef}
              className="absolute right-4 top-4 rounded-full bg-muted p-2 text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Close listing details"
            >
              <X size={16} weight="bold" />
            </SheetClose>
            <SheetHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <SheetTitle>{selectedListing?.title ?? 'Listing details'}</SheetTitle>
                  <SheetDescription>Review the full listing, manage collector requests, and keep track of hand-offs.</SheetDescription>
                </div>
                {selectedListing && onEditListing && !isCollector && selectedListing.status !== 'collected' && selectedListing.status !== 'claimed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditInForm}
                    disabled={detailsLoading || !selectedItemDetails}
                    className="flex items-center gap-2"
                  >
                    <PencilSimpleLine size={14} />
                    Edit in listing form
                  </Button>
                )}
              </div>
            </SheetHeader>

            {selectedListing ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="space-y-4">
                  {detailsLoading && (
                    <p className="text-sm text-muted-foreground">Loading latest item details…</p>
                  )}
                  {detailsError && (
                    <p className="text-sm text-destructive">{detailsError}</p>
                  )}

                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div className="rounded-md border p-3 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase">Status</p>
                      <Badge variant="secondary" className="capitalize">{statusCopy[selectedListing.status].label}</Badge>
                    </div>
                    <div className="rounded-md border p-3 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase">Action</p>
                      <span className="capitalize">{selectedListing.actionType}</span>
                    </div>
                    <div className="rounded-md border p-3 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase">Reward</p>
                      {selectedListing.status !== 'collected' && selectedListing.claimStatus !== 'completed' ? (
                        <span className="text-muted-foreground">Pending</span>
                      ) : (
                        <span>
                          {(typeof (selectedListing.reward ?? selectedListing.rewardPoints ?? selectedListing.valuation?.rewardPoints) === 'number')
                            ? `${selectedListing.reward ?? selectedListing.rewardPoints ?? selectedListing.valuation?.rewardPoints} ${selectedListing.reward_currency || 'PTS'}`
                            : 'Pending'}
                        </span>
                      )}
                    </div>
                    <div className="rounded-md border p-3 space-y-1">
                      <p className="text-xs text-muted-foreground uppercase">Listed</p>
                      <span>{formatDate(selectedListing.createdAt)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <h3 className="font-semibold">Listing overview</h3>
                      {selectedListing.co2Impact && (
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <span>Impact</span>
                          <span>-{selectedListing.co2Impact}kg CO₂</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{detailDescription}</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase">Category</p>
                        <p className="capitalize">{formatCategoryDisplay(detailItem?.category || selectedListing.category)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase">Hand-off location</p>
                        <p>{handoffDisplay}</p>
                        {/* Show open/closed status if opening_hours is available in dropOffLocationDetail */}
                        {dropOffLocationDetail?.openHours && (
                          <div className="space-y-1 text-xs mt-1">
                            <span className="flex items-center gap-2">
                              <Clock size={14} />
                              <span>{dropOffLocationDetail.openHours}</span>
                            </span>
                            {dropOffLocationOpeningHoursRaw && (
                              <span className="text-xs text-muted-foreground">
                                {isDropOffLocationOpen ? 'Open now' : 'Closed now'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {galleryImages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Photos</h3>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {galleryImages.map((photo, index) => (
                          <button
                            key={`${photo}-${index}`}
                            type="button"
                            onClick={() => openImageViewer(index)}
                            className="group relative h-32 w-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            <img
                              src={photo}
                              alt={`${selectedListing.title} photo ${index + 1}`}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span className="sr-only">View photo {index + 1}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
                <aside className="space-y-4">
                  {isCollector ? (
                    <DonorInfoPanel
                      donorName={detailOwner?.name || selectedListing.userName}
                      donorAvatar={detailOwner?.profile_image || null}
                      donorVerification={detailOwner?.verification ?? null}
                      claimStatus={collectorClaimStatus}
                      claimApprovedAt={selectedListing.claimApprovedAt ?? null}
                      claimCompletedAt={selectedListing.claimCompletedAt ?? null}
                      canOpenConversation={canOpenCollectorChat}
                      onOpenConversation={handleCollectorConversation}
                    />
                  ) : (
                    <DropOffQrPanel
                      listing={selectedListing}
                      dropOffLocation={dropOffLocationDetail}
                      qrImageUrl={qrImageUrl}
                      isLoading={detailsLoading}
                    />
                  )}
                  {showCollectorRequests && (
                    <CollectorRequestsPanel
                      requests={listingRequests}
                      getChatForItem={getChatForItem}
                      onApprove={handleApproveRequest}
                      onMarkCollected={handleMarkCollected}
                      onOpenConversation={handleOpenConversation}
                      openMessages={openMessages}
                    />
                  )}
                </aside>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a listing to see details.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Drawer open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DrawerContent
          ref={viewerContentRef}
          tabIndex={-1}
          aria-label="Listing image viewer"
          className="max-w-4xl border-none bg-black p-0 text-white shadow-2xl sm:max-w-5xl max-h-[90vh] overflow-hidden [&>button]:text-white [&>button:hover]:text-white"
        >
          <DrawerTitle className="sr-only">Listing image viewer</DrawerTitle>
          <DrawerClose
            ref={viewerCloseButtonRef}
            className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close image viewer"
          >
            <X size={16} weight="bold" />
          </DrawerClose>
          {activeImage ? (
            <div className="flex h-full flex-col">
              <div className="relative flex min-h-[50vh] flex-1 items-center justify-center bg-black">
                <img
                  src={activeImage}
                  alt={`${selectedListing?.title || 'Listing'} photo ${activeImageIndex + 1}`}
                  className="max-h-[80vh] w-full object-contain"
                />
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                      aria-label="View previous photo"
                    >
                      <CaretLeft size={24} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                      aria-label="View next photo"
                    >
                      <CaretRight size={24} weight="bold" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3 text-xs text-white/80">
                <span className="truncate">{selectedListing?.title || 'Listing photo'}</span>
                <span>{`Photo ${activeImageIndex + 1} of ${galleryImages.length}`}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center bg-black text-sm text-white/70">No image selected.</div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}

interface DropOffQrPanelProps {
  listing: ManagedListing
  dropOffLocation: DropOffLocation | null
  qrImageUrl: string | null
  isLoading: boolean
}

function DropOffQrPanel({ listing, dropOffLocation, qrImageUrl, isLoading }: DropOffQrPanelProps) {
  const isDonation = listing.actionType === 'donate'
  const heading = 'QR Delivery'
  return (
    <div className="space-y-6 rounded-2xl border bg-background p-6 shadow-sm">
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <QrCode size={20} />
          {heading}
        </h3>
      </div>

      <div className="grid gap-6 items-start">
        <div className="flex flex-col items-center gap-4">
          {qrImageUrl ? (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <img
                src={qrImageUrl}
                alt={`${heading} for ${listing.title}`}
                className="h-56 w-56 object-contain"
              />
            </div>
          ) : (
            <div className="flex h-56 w-full max-w-[18rem] items-center justify-center rounded-xl border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              {isLoading ? 'Loading QR code…' : 'QR code becomes available once the listing is confirmed.'}
            </div>
          )}
          <Badge variant={isDonation ? 'default' : 'secondary'} className="uppercase tracking-wide">
            {isDonation ? 'Donation drop-off' : 'Pickup hand-off'}
          </Badge>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Drop-off location</p>
            {dropOffLocation ? (
              <div className="mt-2 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-1 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="font-medium leading-tight text-foreground">{dropOffLocation.name}</p>
                    {dropOffLocation.address && (
                      <p className="text-sm leading-snug text-muted-foreground">{dropOffLocation.address}</p>
                    )}
                    {dropOffLocation.postcode && (
                      <p className="text-sm leading-snug text-muted-foreground">{dropOffLocation.postcode}</p>
                    )}
                    {dropOffLocation.distance && (
                      <p className="text-xs leading-snug text-muted-foreground">About {dropOffLocation.distance} away</p>
                    )}
                  </div>
                </div>
                {/* Show open/closed status if opening_hours is available */}
                {dropOffLocation.openHours && (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock size={14} />
                    <span>
                      {/* If openHours is a string, you may need to parse it to use isLocationOpen, otherwise just display it */}
                      {dropOffLocation.openHours}
                    </span>
                  </div>
                )}
                {(dropOffLocation.openHours || dropOffLocation.phone) && (
                  <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                    {dropOffLocation.openHours && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{dropOffLocation.openHours}</span>
                      </div>
                    )}
                    {dropOffLocation.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        <span>{dropOffLocation.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Partner location details will appear once a drop-off slot is confirmed.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

interface DonorInfoPanelProps {
  donorName?: string | null
  donorAvatar?: string | null
  donorVerification?: { email_verified?: boolean; identity_verified?: boolean; address_verified?: boolean } | null
  claimStatus?: ClaimRequest['status']
  claimApprovedAt?: string | null
  claimCompletedAt?: string | null
  canOpenConversation: boolean
  onOpenConversation: () => void
}

function DonorInfoPanel({
  donorName,
  donorAvatar,
  donorVerification,
  claimStatus,
  claimApprovedAt,
  claimCompletedAt,
  canOpenConversation,
  onOpenConversation,
}: DonorInfoPanelProps) {
  const status = claimStatus ?? 'pending'
  const badgeMeta = REQUEST_STATUS_BADGE[status] ?? REQUEST_STATUS_BADGE.pending
  const statusCopy = CLAIM_STATUS_DESCRIPTION[status]
  const verified = Boolean(donorVerification?.identity_verified || donorVerification?.address_verified || donorVerification?.email_verified)
  const approvedDate = claimApprovedAt ? new Date(claimApprovedAt).toLocaleString() : null
  const completedDate = claimCompletedAt ? new Date(claimCompletedAt).toLocaleString() : null

  const chatHelperText = status === 'declined'
    ? 'Messaging is unavailable because this request was declined.'
    : 'Messaging unlocks once the donor approves your request.'

  return (
    <div className="space-y-4 rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={donorAvatar ?? undefined} alt={donorName ?? 'Donor avatar'} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            <UserCircle size={24} />
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase">Donor</p>
          <p className="text-sm font-semibold text-foreground">{donorName || 'Community donor'}</p>
          {verified && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck size={14} />
              <span>Verified donor</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-muted-foreground">Request status</span>
          <Badge variant={badgeMeta.variant} className="text-xs">{badgeMeta.label}</Badge>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{statusCopy}</p>
        {approvedDate && status === 'approved' && (
          <p className="text-xs text-muted-foreground">Approved on {approvedDate}</p>
        )}
        {completedDate && status === 'completed' && (
          <p className="text-xs text-muted-foreground">Completed on {completedDate}</p>
        )}
      </div>

      <div className="space-y-2">
        <Button onClick={onOpenConversation} disabled={!canOpenConversation} className="w-full">
          <ChatCircle size={16} className="mr-2" />
          Open conversation
        </Button>
        {!canOpenConversation && (
          <p className="text-xs text-muted-foreground">{chatHelperText}</p>
        )}
      </div>
    </div>
  )
}

interface CollectorRequestsSharedProps {
  requests: ClaimRequest[]
  getChatForItem: (itemId: string) => ({ id: string } | null | undefined)
  onApprove: (request: ClaimRequest) => void | Promise<void>
  onMarkCollected: (itemId: string) => void | Promise<void>
  onOpenConversation: (request: ClaimRequest) => void | Promise<void>
  openMessages?: (options?: { chatId?: string }) => void
}

function CollectorRequestsPanel(props: CollectorRequestsSharedProps) {
  const { requests } = props
  return (
    <div className="space-y-4 rounded-lg border bg-background p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ChatCircle size={18} />
          Collector requests
        </h3>
        <p className="text-xs text-muted-foreground">
          Review collector interest and continue conversations to arrange the hand-off.
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collectors have requested this item yet.</p>
      ) : (
        <CollectorRequestsList {...props} />
      )}
    </div>
  )
}

function CollectorRequestsList({
  requests,
  getChatForItem,
  onApprove,
  onMarkCollected,
  onOpenConversation,
  openMessages,
}: CollectorRequestsSharedProps) {
  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const requestBadge = REQUEST_STATUS_BADGE[request.status]
        const requestChat = getChatForItem(request.itemId)
        return (
          <div key={request.id} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{request.collectorName}</p>
                <p className="text-xs text-muted-foreground">Requested {formatRelativeTime(request.createdAt)}</p>
              </div>
              <Badge variant={requestBadge.variant} className="capitalize">{requestBadge.label}</Badge>
            </div>
            {request.note && (
              <p className="text-xs text-muted-foreground">{request.note}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {request.status === 'pending' && (
                <Button size="sm" onClick={() => onApprove(request)}>
                  Approve
                </Button>
              )}
              {request.status === 'approved' && (
                <Button size="sm" variant="outline" onClick={() => onMarkCollected(request.itemId)}>
                  Mark collected
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => (requestChat ? openMessages?.({ chatId: requestChat.id }) : onOpenConversation(request))}
              >
                Open Conversation
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}


