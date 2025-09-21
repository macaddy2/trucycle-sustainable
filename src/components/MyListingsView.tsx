import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatCircle, CheckCircle, Clock, Package, Plus, ShieldCheck } from '@phosphor-icons/react'
import { useMessaging } from '@/hooks'

interface UserProfile {
  id: string
  name: string
  userType: 'donor' | 'collector'
  rewardsBalance?: number
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
  status: 'active' | 'claimed' | 'collected' | 'expired'
  category: string
  createdAt: string
  actionType: 'exchange' | 'donate' | 'recycle'
  fulfillmentMethod?: 'pickup' | 'dropoff'
  dropOffLocation?: { name: string; postcode: string }
  valuation?: ListingValuation
  rewardPoints?: number
  co2Impact?: number
}

interface MyListingsViewProps {
  onAddNewItem?: () => void
  defaultView?: 'table' | 'card'
  variant?: 'page' | 'dashboard'
  onOpenMessages?: () => void
}

const statusCopy: Record<ManagedListing['status'], { label: string; tone: 'default' | 'success' | 'warning' | 'outline' }> = {
  active: { label: 'Active', tone: 'outline' },
  claimed: { label: 'Claimed', tone: 'warning' },
  collected: { label: 'Collected', tone: 'success' },
  expired: { label: 'Expired', tone: 'default' },
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
  const { getChatForItem, updateChatStatus } = useMessaging()
  const initialView = variant === 'dashboard' ? 'card' : defaultView
  const [viewMode, setViewMode] = useState<'table' | 'card'>(initialView)

  const sortedListings = useMemo(() => {
    return [...listings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [listings])

  const activeCount = useMemo(() => sortedListings.filter(listing => listing.status === 'active').length, [sortedListings])

  const openMessages = () => {
    if (onOpenMessages) {
      onOpenMessages()
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
                  <Badge variant={status.tone === 'default' ? 'default' : status.tone} className="capitalize">
                    {status.label}
                  </Badge>
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
                    <Button variant="outline" size="sm" onClick={openMessages}>
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
              <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <p>Reward on completion:{' '}
                  {typeof reward === 'number' ? <span className="font-medium text-primary">+{reward} pts</span> : 'Pending'}</p>
                {listing.valuation?.estimatedValue && (
                  <p>Estimated value: £{listing.valuation.estimatedValue.toFixed(2)}</p>
                )}
                <p>You confirm the collector before sharing hand-off details.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {chat ? (
                  <Button variant="outline" size="sm" onClick={openMessages}>
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
  )
}
