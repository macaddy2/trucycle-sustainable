import { useMemo, useState } from 'react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatCircle, CheckCircle, Clock, Package, Plus, ShieldCheck } from '@phosphor-icons/react'
import { useMessaging, useExchangeManager, useNotifications } from '@/hooks'
import type { ClaimRequest } from '@/hooks/useExchangeManager'
import type { ListingClassificationResult } from '@/lib/ai/classifier'
import type { ModerationResult } from '@/lib/ai/moderation'

interface UserProfile {
  id: string
  name: string
  userType: 'donor' | 'collector'
  rewardsBalance?: number
  partnerAccess?: boolean
}

export interface ListingValuation {
  estimatedValue?: number
  rewardPoints?: number
  recommendedPriceRange?: [number, number]
  confidence?: 'high' | 'medium' | 'low'
}

export interface ManagedListing {
  id: string
  title: string
  status: 'active' | 'pending_dropoff' | 'claimed' | 'collected' | 'expired'
  category: string
  createdAt: string
  actionType: 'exchange' | 'donate' | 'recycle'
  fulfillmentMethod?: 'pickup' | 'dropoff'
  dropOffLocation?: { name: string; postcode: string }
  valuation?: ListingValuation
  rewardPoints?: number
  co2Impact?: number
  aiClassification?: ListingClassificationResult
  moderation?: ModerationResult
}

interface MyListingsViewProps {
  onAddNewItem?: () => void
  defaultView?: 'table' | 'card'
  variant?: 'page' | 'dashboard'
  onOpenMessages?: (options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => void
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
  defaultView = 'table',
  variant = 'page',
  onOpenMessages,
}: MyListingsViewProps) {
  const [currentUser, setCurrentUser] = useKV<UserProfile | null>('current-user', null)
  const [listings, setListings] = useKV<ManagedListing[]>('user-listings', [])
  const [, setGlobalListings] = useKV<ManagedListing[]>('global-listings', [])
  const { getChatForItem, updateChatStatus, createOrGetChat } = useMessaging()
  const { getRequestsForItem, confirmClaimRequest, completeClaimRequest } = useExchangeManager()
  const { addNotification } = useNotifications()
  const initialView = variant === 'dashboard' ? 'card' : defaultView
  const [viewMode, setViewMode] = useState<'table' | 'card'>(initialView)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const sortedListings = useMemo(() => {
    return [...listings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [listings])

  const activeCount = useMemo(() => sortedListings.filter(listing => listing.status === 'active').length, [sortedListings])

  const selectedListing = useMemo(() => listings.find(listing => listing.id === selectedListingId) ?? null, [listings, selectedListingId])
  const listingRequests = useMemo(() => (selectedListing ? getRequestsForItem(selectedListing.id) : []), [selectedListing, getRequestsForItem])

  const openMessages = (options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => {
    if (onOpenMessages) {
      onOpenMessages(options)
    } else {
      toast.info('Open the message center from the header to continue your conversation.')
    }
  }

  const heading = variant === 'dashboard' ? 'Manage your listings' : 'My listed items'
  const description = variant === 'dashboard'
    ? `Track the status of your ${sortedListings.length ? '' : 'future '}donations and exchanges.`
    : `You currently have ${sortedListings.length} listing${sortedListings.length === 1 ? '' : 's'} (${activeCount} active).`

  const handleMarkCollected = (listingId: string) => {
    const listing = listings.find(item => item.id === listingId)
    if (!listing) return

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

    const reward = listing.rewardPoints ?? listing.valuation?.rewardPoints ?? 25
    setCurrentUser(prev => (
      prev
        ? {
            ...prev,
            rewardsBalance: (prev.rewardsBalance ?? 0) + reward,
          }
        : prev
    ))
    toast.success('Item marked as collected', {
      description: `Great work! ${reward} reward points have been added to your account.`,
    })
  }

  const handleOpenListingDetails = (listingId: string) => {
    setSelectedListingId(listingId)
    setShowDetailModal(true)
  }

  const handleApproveRequest = async (request: ClaimRequest) => {
    const approved = confirmClaimRequest(request.id)
    if (!approved) {
      toast.error('Unable to approve this request')
      return
    }

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

  const handleCompleteRequest = (request: ClaimRequest) => {
    const result = completeClaimRequest(request.id)
    if (!result || result.alreadyCompleted) {
      return
    }

    const chat = getChatForItem(request.itemId)
    if (chat) {
      updateChatStatus(chat.id, 'completed')
    }

    handleMarkCollected(request.itemId)
    addNotification({
      userId: request.collectorId,
      type: 'exchange_request',
      title: 'Collection confirmed',
      message: `The donor confirmed collection for "${request.itemTitle}".`,
      urgency: 'low',
      read: false,
      metadata: { itemId: request.itemId, itemTitle: request.itemTitle }
    })
    if (chat) {
      openMessages({ chatId: chat.id })
    }
    toast.success('Collection confirmed and rewards granted')
  }

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
      <p>You have not listed any items yet.</p>
      {onAddNewItem && (
        <Button className="mt-4" onClick={onAddNewItem}>
          <Plus size={16} className="mr-2" />
          Add your first item
        </Button>
      )}
    </div>
  )

  const TableView = (
    <>
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
            return (
              <TableRow key={listing.id}>
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
                    <Button variant="outline" size="sm" onClick={() => openMessages({ chatId: chat.id })}>
                      <ChatCircle size={14} className="mr-2" />
                      Open chat
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs">Waiting for interest</Badge>
                  )}
                  {listing.status !== 'collected' && (
                    <Button size="sm" onClick={() => handleMarkCollected(listing.id)}>
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
          You decide when to hand over each item—confirm collection only when the hand-off is complete to release rewards.
        </TableCaption>
      </Table>
    </>
  )

  const CardView = (
    <div className="grid gap-4 md:grid-cols-2">
      {sortedListings.map(listing => {
        const status = statusCopy[listing.status]
        const chat = getChatForItem(listing.id)
        const reward = listing.rewardPoints ?? listing.valuation?.rewardPoints
        return (
          <Card key={listing.id} className="border-dashed">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{listing.title}</CardTitle>
                  <CardDescription className="capitalize">{listing.category} • {listing.actionType}</CardDescription>
                </div>
                <Badge variant={status.tone === 'default' ? 'default' : status.tone} className="capitalize">
                  {status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={12} /> Listed {formatDate(listing.createdAt)}</span>
                {listing.fulfillmentMethod && (
                  <span className="capitalize">{listing.fulfillmentMethod} ready</span>
                )}
              </div>
              {(listing.aiClassification || listing.moderation) && (
                <div className="space-y-2 text-xs">
                  {listing.aiClassification && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">
                      <p className="font-semibold text-primary">{CLASSIFICATION_TEXT[listing.aiClassification.recommendedAction]}</p>
                      <p className="text-muted-foreground">{listing.aiClassification.reasoning}</p>
                    </div>
                  )}
                  {listing.moderation && (
                    <div
                      className={
                        listing.moderation.status === 'flagged'
                          ? 'rounded-md border p-3 space-y-1 border-destructive/40 bg-destructive/10 text-destructive'
                          : 'rounded-md border p-3 space-y-1 border-secondary/40 bg-secondary/10'
                      }
                    >
                      <p className="font-semibold">
                        {listing.moderation.status === 'flagged' ? 'Flagged for review' : 'Image check passed'}
                      </p>
                      <p className="text-muted-foreground">{listing.moderation.message}</p>
                      {listing.moderation.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chat ? (
                  <Button variant="outline" size="sm" onClick={() => openMessages({ chatId: chat.id })}>
                    <ChatCircle size={14} className="mr-2" />
                    Continue chat
                  </Button>
                ) : (
                  <Badge variant="outline">Waiting for collector</Badge>
                )}
                {listing.status !== 'collected' && (
                  <Button size="sm" onClick={() => handleMarkCollected(listing.id)}>
                    <CheckCircle size={14} className="mr-2" />
                    Mark collected
                  </Button>
                )}
              </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <p>Reward on completion:{' '} 
                  {typeof reward === 'number' ? <span className="font-medium text-primary">+{reward} pts</span> : 'Pending'}
                </p>
                {listing.valuation?.estimatedValue && (
                  <p>Estimated value: �{listing.valuation.estimatedValue.toFixed(2)}</p>
                )}
                <p>You confirm the collector before sharing hand-off details.</p>
                <div className="flex items-center justify-between text-xs">
                  {requests.length > 0 ? (
                    <span className="text-muted-foreground">
                      {pendingRequests.length > 0 ? `${pendingRequests.length} pending request${pendingRequests.length === 1 ? '' : 's'}` : 'All requests managed'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No collector requests yet</span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleOpenListingDetails(listing.id)}>Details</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {chat ? (
                  <Button variant="outline" size="sm" onClick={() => openMessages({ chatId: chat.id })}>
                    <ChatCircle size={14} className="mr-2" />
                    Continue chat
                  </Button>
                ) : (
                  <Badge variant="outline">Waiting for collector</Badge>
                )}
                {listing.status !== 'collected' && (
                  <Button size="sm" onClick={() => handleMarkCollected(listing.id)}>
                    <CheckCircle size={14} className="mr-2" />
                    Mark collected
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const layoutToggle = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)} className="sm:w-auto">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="card">Card</TabsTrigger>
        </TabsList>
      </Tabs>
      {onAddNewItem && (
        <Button onClick={onAddNewItem}>
          <Plus size={16} className="mr-2" />
          Add New Item
        </Button>
      )}
    </div>
  )

  const content = sortedListings.length === 0
    ? EmptyState
    : viewMode === 'table'
      ? TableView
      : CardView

  if (variant === 'dashboard') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-medium">Switch layouts</p>
            <p className="text-sm text-muted-foreground">
              Quickly glance at status cards or review structured details in the table view.
            </p>
          </div>
          {layoutToggle}
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
          {layoutToggle}
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>

      <Dialog
        open={showDetailModal && Boolean(selectedListing)}
        onOpenChange={(open) => {
          setShowDetailModal(open)
          if (!open) {
            setSelectedListingId(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedListing?.title ?? 'Listing details'}</DialogTitle>
            <DialogDescription>Manage collector requests and mark this listing once collected.</DialogDescription>
          </DialogHeader>

          {selectedListing ? (
            <div className="space-y-4">
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

              <div>
                <h3 className="text-sm font-semibold mb-2">Collector requests</h3>
                {listingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No collectors have requested this item yet.</p>
                ) : (
                  <div className="space-y-3">
                    {listingRequests.map((request) => {
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
                              <Button size="sm" onClick={() => handleApproveRequest(request)}>
                                Approve
                              </Button>
                            )}
                            {request.status === 'approved' && (
                              <Button size="sm" variant="outline" onClick={() => handleCompleteRequest(request)}>
                                Mark collected
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openMessages(requestChat ? { chatId: requestChat.id } : { itemId: request.itemId, initialView: 'requests' })}
                            >
                              View conversation
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a listing to see details.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}





