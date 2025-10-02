import { useEffect, useMemo, useState } from 'react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatCircle, CheckCircle, Clock, Package, PencilSimpleLine, Plus, ShieldCheck, X } from '@phosphor-icons/react'
import { Textarea } from '@/components/ui/textarea'
import { useMessaging, useExchangeManager, useNotifications } from '@/hooks'
import type { ClaimRequest } from '@/hooks/useExchangeManager'
import type { ManagedListing } from '@/types/listings'

interface UserProfile {
  id: string
  name: string
  userType: 'donor' | 'collector'
  rewardsBalance?: number
  partnerAccess?: boolean
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

const CATEGORY_OPTIONS = [
  'Electronics',
  'Furniture',
  'Clothing',
  'Books',
  'Kitchen Items',
  'Sports Equipment',
  'Home Decor',
  'Other',
]

const ACTION_OPTIONS: Array<{ value: ManagedListing['actionType']; label: string }> = [
  { value: 'exchange', label: 'Exchange' },
  { value: 'donate', label: 'Donate' },
  { value: 'recycle', label: 'Recycle' },
]

type EditableListingFields = {
  title: string
  description?: string
  category: string
  actionType: ManagedListing['actionType']
  fulfillmentMethod?: ManagedListing['fulfillmentMethod']
  location?: string
  dropOffLocation?: ManagedListing['dropOffLocation']
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
  const {
    getRequestsForItem,
    confirmClaimRequest,
    completeClaimRequest,
    pendingRequestCountByItem,
  } = useExchangeManager()
  const { addNotification } = useNotifications()
  const initialView = variant === 'dashboard' ? 'card' : defaultView
  const [viewMode, setViewMode] = useState<'table' | 'card'>(initialView)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditableListingFields | null>(null)

  const sortedListings = useMemo(() => {
    return [...listings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [listings])

  const activeCount = useMemo(() => sortedListings.filter(listing => listing.status === 'active').length, [sortedListings])

  const selectedListing = useMemo(() => listings.find(listing => listing.id === selectedListingId) ?? null, [listings, selectedListingId])
  const listingRequests = useMemo(() => (selectedListing ? getRequestsForItem(selectedListing.id) : []), [selectedListing, getRequestsForItem])

  useEffect(() => {
    if (selectedListing) {
      setEditForm({
        title: selectedListing.title,
        description: selectedListing.description ?? '',
        category: selectedListing.category,
        actionType: selectedListing.actionType,
        fulfillmentMethod: selectedListing.fulfillmentMethod,
        location: selectedListing.location ?? '',
        dropOffLocation: selectedListing.dropOffLocation,
      })
      setIsEditing(false)
    } else {
      setEditForm(null)
      setIsEditing(false)
    }
  }, [selectedListing])

  const openMessages = (options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => {
    if (onOpenMessages) {
      onOpenMessages(options)
    } else {
      toast.info('Open the message center from the header to continue your conversation.')
    }
  }

  const handleEditFieldChange = (field: keyof EditableListingFields, value: unknown) => {
    setEditForm(prev => {
      if (!prev) return prev
      const next: EditableListingFields = { ...prev }

      if (field === 'title' || field === 'description' || field === 'category' || field === 'location') {
        next[field] = typeof value === 'string' ? value : ''
      }

      if (field === 'actionType') {
        const actionValue = value as ManagedListing['actionType']
        next.actionType = actionValue
        if (actionValue === 'donate') {
          next.fulfillmentMethod = 'dropoff'
        } else if (next.fulfillmentMethod === 'dropoff') {
          next.fulfillmentMethod = 'pickup'
          next.dropOffLocation = undefined
        }
      }

      if (field === 'fulfillmentMethod') {
        const method = value as ManagedListing['fulfillmentMethod'] | undefined
        next.fulfillmentMethod = method
        if (method !== 'dropoff') {
          next.dropOffLocation = undefined
        }
      }

      return next
    })
  }

  const handleDropOffFieldChange = (field: 'name' | 'postcode' | 'address', value: string) => {
    setEditForm(prev => {
      if (!prev) return prev
      const currentLocation = prev.dropOffLocation ?? { name: '', postcode: '', address: '' }
      return {
        ...prev,
        dropOffLocation: {
          ...currentLocation,
          [field]: value,
        },
      }
    })
  }

  const handleCancelEdit = () => {
    if (!selectedListing) {
      setEditForm(null)
      setIsEditing(false)
      return
    }

    setEditForm({
      title: selectedListing.title,
      description: selectedListing.description ?? '',
      category: selectedListing.category,
      actionType: selectedListing.actionType,
      fulfillmentMethod: selectedListing.fulfillmentMethod,
      location: selectedListing.location ?? '',
      dropOffLocation: selectedListing.dropOffLocation,
    })
    setIsEditing(false)
  }

  const handleSaveEdit = () => {
    if (!selectedListing || !editForm) return

    const trimmedTitle = editForm.title.trim()
    if (!trimmedTitle) {
      toast.error('Add a title before saving changes')
      return
    }

    if (!editForm.category) {
      toast.error('Select a category before saving changes')
      return
    }

    const finalFulfillment = editForm.fulfillmentMethod ?? selectedListing.fulfillmentMethod
    const trimmedDescription = (editForm.description ?? '').trim()
    const trimmedLocation = (editForm.location ?? '').trim()
    const updatedListing: Partial<ManagedListing> = {
      title: trimmedTitle,
      description: trimmedDescription,
      category: editForm.category,
      actionType: editForm.actionType,
      fulfillmentMethod: finalFulfillment,
    }

    if (finalFulfillment === 'dropoff') {
      updatedListing.location = undefined
      updatedListing.dropOffLocation = editForm.dropOffLocation ?? selectedListing.dropOffLocation
    } else {
      updatedListing.location = trimmedLocation
      updatedListing.dropOffLocation = undefined
    }

    setListings(prev => prev.map(item => (
      item.id === selectedListing.id
        ? { ...item, ...updatedListing }
        : item
    )))

    setGlobalListings(prev => prev.map(item => (
      item.id === selectedListing.id
        ? { ...item, ...updatedListing }
        : item
    )))

    toast.success('Listing updated successfully')
    setIsEditing(false)
  }

  const isCollector = currentUser?.userType === 'collector'
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
      <p>
        {isCollector
          ? 'You have not added any items to your collection yet.'
          : 'You have not listed any items yet.'}
      </p>
      {onAddNewItem && (
        <Button className="mt-4" onClick={onAddNewItem}>
          <Plus size={16} className="mr-2" />
          {isCollector ? 'Add an item' : 'Add your first item'}
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
          You decide when to hand over each itemâconfirm collection only when the hand-off is complete to release rewards.
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
        const requests = getRequestsForItem(listing.id)
        const pendingRequestsCount = pendingRequestCountByItem[listing.id] ?? 0
        return (
          <Card key={listing.id} className="border-dashed">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{listing.title}</CardTitle>
                  <CardDescription className="capitalize">{listing.category} â¢ {listing.actionType}</CardDescription>
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
                  <p>Estimated value: £{listing.valuation.estimatedValue.toFixed(2)}</p>
                )}
                <p>You confirm the collector before sharing hand-off details.</p>
                <div className="flex items-center justify-between text-xs">
                  {requests.length > 0 ? (
                    <span className="text-muted-foreground">
                      {pendingRequestsCount > 0
                        ? `${pendingRequestsCount} pending request${pendingRequestsCount === 1 ? '' : 's'}`
                        : 'All requests managed'}
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
          {isCollector ? 'Add an item' : 'Add new item'}
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
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle>{selectedListing?.title ?? 'Listing details'}</DialogTitle>
                <DialogDescription>Manage collector requests, update listing details, and mark this listing once collected.</DialogDescription>
              </div>
              {selectedListing && (
                <Button
                  variant={isEditing ? 'ghost' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      handleCancelEdit()
                    } else {
                      setIsEditing(true)
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <X size={14} />
                      Cancel edit
                    </>
                  ) : (
                    <>
                      <PencilSimpleLine size={14} />
                      Edit listing
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedListing ? (
            <div className="space-y-4">
              {isEditing && editForm && (
                <div className="space-y-4 rounded-lg border border-dashed border-primary/40 bg-muted/30 p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Edit listing</p>
                    <p className="text-sm text-muted-foreground">Adjust the summary details collectors see. Changes apply instantly once saved.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editForm.title}
                        onChange={(event) => handleEditFieldChange('title', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-category">Category</Label>
                      <Select
                        value={editForm.category}
                        onValueChange={(value) => handleEditFieldChange('category', value)}
                      >
                        <SelectTrigger id="edit-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.description ?? ''}
                      onChange={(event) => handleEditFieldChange('description', event.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Keep it friendly and clear—highlight any changes since first listing.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Action type</Label>
                      <Select
                        value={editForm.actionType}
                        onValueChange={(value) => handleEditFieldChange('actionType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Hand-off method</Label>
                      <Select
                        value={(editForm.fulfillmentMethod ?? selectedListing.fulfillmentMethod ?? (editForm.actionType === 'donate' ? 'dropoff' : 'pickup')) ?? 'pickup'}
                        onValueChange={(value) => handleEditFieldChange('fulfillmentMethod', value)}
                        disabled={editForm.actionType === 'donate'}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pickup">Pickup</SelectItem>
                          <SelectItem value="dropoff">Partner shop drop-off</SelectItem>
                        </SelectContent>
                      </Select>
                      {editForm.actionType === 'donate' && (
                        <p className="text-xs text-muted-foreground">Donations route through partner shops for verified hand-off.</p>
                      )}
                    </div>
                  </div>
                  {(editForm.fulfillmentMethod ?? selectedListing.fulfillmentMethod) === 'pickup' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-location">Pickup area</Label>
                      <Input
                        id="edit-location"
                        placeholder="e.g., Camden, London NW1"
                        value={editForm.location ?? ''}
                        onChange={(event) => handleEditFieldChange('location', event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Share only broad area information. Exact addresses are exchanged privately.</p>
                    </div>
                  )}
                  {(editForm.fulfillmentMethod ?? selectedListing.fulfillmentMethod) === 'dropoff' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-partner-name">Partner shop name</Label>
                        <Input
                          id="edit-partner-name"
                          value={editForm.dropOffLocation?.name ?? ''}
                          onChange={(event) => handleDropOffFieldChange('name', event.target.value)}
                          placeholder="TruCycle Partner Shop"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-partner-postcode">Postcode</Label>
                        <Input
                          id="edit-partner-postcode"
                          value={editForm.dropOffLocation?.postcode ?? ''}
                          onChange={(event) => handleDropOffFieldChange('postcode', event.target.value)}
                          placeholder="NW1 8AH"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="edit-partner-address">Partner shop address</Label>
                        <Textarea
                          id="edit-partner-address"
                          value={editForm.dropOffLocation?.address ?? ''}
                          onChange={(event) => handleDropOffFieldChange('address', event.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      Save changes
                    </Button>
                  </div>
                </div>
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
                <p className="text-muted-foreground">
                  {selectedListing.description?.trim() || 'No description added yet. Share a few highlights to attract collectors.'}
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Category</p>
                    <p className="capitalize">{selectedListing.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Hand-off location</p>
                    {selectedListing.fulfillmentMethod === 'dropoff' && selectedListing.dropOffLocation ? (
                      <p>{selectedListing.dropOffLocation.name}{selectedListing.dropOffLocation.postcode ? `, ${selectedListing.dropOffLocation.postcode}` : ''}</p>
                    ) : (
                      <p>{selectedListing.location || 'Pickup location to be confirmed in chat'}</p>
                    )}
                  </div>
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





