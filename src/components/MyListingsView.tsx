import { useEffect, useMemo, useState } from 'react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChatCircle, CheckCircle, Clock, MapPin, Package, PencilSimpleLine, Phone, Plus, QrCode, ShieldCheck } from '@phosphor-icons/react'
import { useMessaging, useExchangeManager, useNotifications } from '@/hooks'
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
}


const CLASSIFICATION_TEXT: Record<'exchange' | 'donate' | 'recycle', string> = {
  exchange: 'Free exchange',
  donate: 'Community donation',
  recycle: 'Professional recycling',
}

const statusCopy: Record<ManagedListing['status'], { label: string; tone: 'default' | 'success' | 'warning' | 'outline' }> = {
  active: { label: 'Active', tone: 'outline' },
  pending_dropoff: { label: 'Pending drop-off', tone: 'warning' },
  claimed: { label: 'Claimed', tone: 'warning' },
  collected: { label: 'Collected', tone: 'success' },
  expired: { label: 'Expired', tone: 'default' },
}
const REQUEST_STATUS_BADGE: Record<ClaimRequest['status'], { label: string; variant: 'outline' | 'secondary' | 'destructive' | 'default' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'secondary' },
  declined: { label: 'Declined', variant: 'destructive' },
  completed: { label: 'Collected', variant: 'default' },
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

export function MyListingsView({
  onAddNewItem,
  variant = 'page',
  onOpenMessages,
  onEditListing,
}: MyListingsViewProps) {
  const [currentUser] = useKV<UserProfile | null>('current-user', null)
  const [listings, setListings] = useKV<ManagedListing[]>('user-listings', [])
  const [, setGlobalListings] = useKV<ManagedListing[]>('global-listings', [])
  const { getChatForItem, updateChatStatus, createOrGetChat } = useMessaging()
  const {
    getRequestsForItem,
    confirmClaimRequest,
  } = useExchangeManager()
  const { addNotification } = useNotifications()
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedItemDetails, setSelectedItemDetails] = useState<PublicItem | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const sortedListings = useMemo(() => {
    // Show all items for donors and collectors; order by newest first
    return [...listings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [listings])

  const activeCount = useMemo(() => sortedListings.filter(listing => listing.status === 'active').length, [sortedListings])

  const selectedListing = useMemo(() => listings.find(listing => listing.id === selectedListingId) ?? null, [listings, selectedListingId])
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

  const isCollector = currentUser?.userType === 'collector'
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

    const latitude = typeof detail?.location?.latitude === 'number' ? detail.location.latitude : 51.5072
    const longitude = typeof detail?.location?.longitude === 'number' ? detail.location.longitude : -0.1276

    return {
      id: `${item.id}-dropoff`,
      name: existing?.name || detail?.location?.address_line || 'Partner shop',
      address: existing?.address || detail?.location?.address_line || '',
      postcode: existing?.postcode || detail?.location?.postcode || '',
      distance: existing?.distance || '—',
      openHours: existing?.openHours || 'Hours shared after confirmation',
      phone: existing?.phone || 'Contact provided after booking',
      acceptedItems: Array.isArray(existing?.acceptedItems) ? existing.acceptedItems : [],
      specialServices: Array.isArray(existing?.specialServices) ? existing.specialServices : [],
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
        ? (detail.location?.address_line || selectedListing.location || '')
        : undefined,
      dropOffLocation,
      handoverNotes: selectedListing.handoverNotes,
      preferPartnerSupport: selectedListing.preferPartnerSupport,
      postcode: detail.location?.postcode,
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
  const qrImageUrl = detailItem?.qr_code ?? null
  const galleryImages = detailItem
    ? detailItem.images?.map((img) => img?.url).filter(Boolean) ?? []
    : selectedListing?.photos ?? []
  const detailDescription = detailItem?.description?.trim() || selectedListing?.description?.trim() || 'No description added yet. Share a few highlights to attract collectors.'
  const handoffDisplay = selectedListing?.fulfillmentMethod === 'dropoff'
    ? (selectedListing.dropOffLocation
        ? `${selectedListing.dropOffLocation.name}${selectedListing.dropOffLocation.postcode ? ` — ${selectedListing.dropOffLocation.postcode}` : ''}`
        : detailItem?.location?.address_line || 'Partner location shared after confirmation')
    : (selectedListing?.location || detailItem?.location?.address_line || 'Pickup location to be confirmed in chat')
  const isDonation = selectedListing?.actionType === 'donate'

  const handleOpenConversation = async (request: ClaimRequest) => {
    let room: any = null
    try {
      // Ensure a server-side direct room exists with the collector
      const otherUserId = currentUser?.userType === 'donor' ? request.collectorId : request.donorId
      const roomRes = await createOrFindRoom(otherUserId)
      room = roomRes?.data
      try { await messageSocket.joinRoom(otherUserId) } catch {}
    } catch (e: any) {
      // Non-fatal: still open local chat for UX continuity
      toast.error(e?.message || 'Unable to open conversation room. Opening local chat...')
    }

    // Open or create a local chat and navigate to Messages
    const listing = listings.find((l) => l.id === request.itemId)
    const donorId = currentUser?.userType === 'donor' ? currentUser.id : request.donorId
    const donorName = currentUser?.userType === 'donor' ? (currentUser.name) : request.donorName

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
              co2Impact: typeof it.estimated_co2_saved_kg === 'number' ? it.estimated_co2_saved_kg : undefined,
              aiClassification: undefined,
              moderation: undefined,
              // For collectors, store donor name for table display
              userName: it.owner?.name || undefined,
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
            category: 'Other',
            createdAt: String(it.created_at || new Date().toISOString()),
            actionType: (it.pickup_option || 'donate') as ManagedListing['actionType'],
            fulfillmentMethod: (it.pickup_option === 'donate' ? 'dropoff' : 'pickup'),
            location: it.location?.address_line || it.location?.postcode,
            photos: Array.isArray(it.images) ? it.images.map((img: any) => img?.url).filter(Boolean) : undefined,
            valuation: undefined,
            rewardPoints: undefined,
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
    if (s === 'pending_dropoff') return 'pending_dropoff'
    if (s === 'claimed' || s === 'awaiting_collection') return 'claimed'
    if (s === 'complete' || s === 'recycled') return 'collected'
    if (s === 'active' || !s) return 'active'
    return 'active'
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
      addNotification({
        userId: approved.collectorId,
        type: 'exchange_request',
        title: `${approved.donorName} accepted your request`,
        message: `You're approved to collect "${approved.itemTitle}".`,
        urgency: 'medium',
        read: false,
        metadata: { itemId: approved.itemId, itemTitle: approved.itemTitle }
      })
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
        const status = statusCopy[listing.status]
        const chat = getChatForItem(listing.id)
        const reward = listing.rewardPoints ?? listing.valuation?.rewardPoints
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
              <div className="space-y-1">
                <p className="font-medium">{listing.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{listing.category}</p>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <Badge variant={status.tone === 'default' ? 'default' : status.tone} className="capitalize">
                  {status.label}
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
              {typeof reward === 'number' ? (
                <span className="text-sm font-medium text-primary">+{reward} pts</span>
              ) : (
                <span className="text-xs text-muted-foreground">Pending</span>
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
              {listing.status === 'claimed' && (
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

      <Dialog
        open={showDetailModal && Boolean(selectedListing)}
        onOpenChange={(open) => {
          setShowDetailModal(open)
          if (!open) {
            setSelectedListingId(null)
            setSelectedItemDetails(null)
            setDetailsError(null)
          }
        }}
      >
        <DialogContent className="w-full max-w-6xl lg:max-w-7xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle>{selectedListing?.title ?? 'Listing details'}</DialogTitle>
                <DialogDescription>Review the full listing, manage collector requests, and keep track of hand-offs.</DialogDescription>
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
          </DialogHeader>

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
                  <span>{selectedListing.rewardPoints ?? selectedListing.valuation?.rewardPoints ?? 'Pending'} pts</span>
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
                    <p className="capitalize">{detailItem?.category || selectedListing.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Hand-off location</p>
                    <p>{handoffDisplay}</p>
                  </div>
                </div>
              </div>

              {galleryImages.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Photos</h3>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {galleryImages.map((photo, index) => (
                      <img
                        key={`${photo}-${index}`}
                        src={photo}
                        alt={`${selectedListing.title} photo ${index + 1}`}
                        className="h-32 w-full rounded-md object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              {isDonation && (
                <CollectorRequestsSection
                  requests={listingRequests}
                  getChatForItem={getChatForItem}
                  onApprove={handleApproveRequest}
                  onMarkCollected={handleMarkCollected}
                  onOpenConversation={handleOpenConversation}
                  openMessages={openMessages}
                />
              )}
              </div>
              <aside className="space-y-4">
                <DropOffQrPanel
                  listing={selectedListing}
                  dropOffLocation={dropOffLocationDetail}
                  qrImageUrl={qrImageUrl}
                  isLoading={detailsLoading}
                />
                {!isCollector && (
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
        </DialogContent>
      </Dialog>
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
  const actionCopy = listing.actionType === 'exchange'
    ? 'exchange hand-off'
    : listing.actionType === 'recycle'
      ? 'recycling drop-off'
      : 'donation drop-off'

  const isDonation = listing.actionType === 'donate'
  const heading = 'QR Code'
  return (
    <div className="space-y-4 rounded-lg border bg-background p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <QrCode size={18} />
          {heading}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isDonation
            ? <>Present this code at the partner shop to record your {actionCopy}.</>
            : 'Share this code with the collector to complete the request.'}
        </p>
      </div>

      <div className="flex justify-center">
        {qrImageUrl ? (
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <img
              src={qrImageUrl}
              alt={`${heading} for ${listing.title}`}
              className="h-48 w-48 object-contain"
            />
          </div>
        ) : (
          <div className="flex h-48 w-full max-w-[15rem] items-center justify-center rounded-lg border border-dashed bg-muted/40 p-4 text-center text-xs text-muted-foreground">
            {isLoading ? 'Loading QR code…' : 'QR code becomes available once the listing is confirmed.'}
          </div>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Drop-off location</p>
          {dropOffLocation ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-1 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium leading-tight">{dropOffLocation.name}</p>
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
              {(dropOffLocation.openHours || dropOffLocation.phone) && (
                <div className="space-y-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
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

function CollectorRequestsSection(props: CollectorRequestsSharedProps) {
  const { requests } = props
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Collector requests</h3>
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collectors have requested this item yet.</p>
      ) : (
        <CollectorRequestsList {...props} />
      )}
    </div>
  )
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
