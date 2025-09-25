import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Heart,
  MapPin,
  ArrowsClockwise,
  Clock,
  Package,
  ChatCircle,
  Recycle,
  Truck,
  Storefront,
  ArrowRight
} from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { useExchangeManager, useMessaging } from '@/hooks'
import { VerificationBadge } from './VerificationBadge'
import type { VerificationLevel } from './verificationBadgeUtils'
import { RatingDisplay } from './RatingSystem'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  name: string
  userType: 'donor' | 'collector'
  avatar?: string
}

export interface ListingItem {
  id: string
  title: string
  description: string
  category: string
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  location: string
  distance: string
  actionType: 'exchange' | 'donate' | 'recycle'
  photos: string[]
  createdAt: string
  co2Impact: number
  verified: boolean
  ownerId: string
  ownerName: string
  ownerAvatar?: string
  ownerRating?: number
  ownerVerificationLevel?: VerificationLevel
}

const sampleItems: ListingItem[] = [
  {
    id: 'item-1',
    title: 'Vintage Oak Dining Table',
    description: 'Solid oak table that seats six. Minor surface wear but structurally excellent.',
    category: 'Furniture',
    condition: 'good',
    location: 'Camden, London',
    distance: '2.3 miles',
    actionType: 'donate',
    photos: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    co2Impact: 45,
    verified: true,
    ownerId: 'owner-1',
    ownerName: 'Sarah Johnson',
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
    ownerRating: 4.8,
    ownerVerificationLevel: {
      email: true,
      phone: true,
      identity: true,
      address: true,
      payment: true,
      community: true,
    },
  },
  {
    id: 'item-2',
    title: 'Dell XPS 13 Laptop',
    description: 'Excellent condition, includes original charger. Perfect for remote work.',
    category: 'Electronics',
    condition: 'excellent',
    location: 'Islington, London',
    distance: '1.8 miles',
    actionType: 'exchange',
    photos: [],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    co2Impact: 120,
    verified: true,
    ownerId: 'owner-2',
    ownerName: 'Michael Chen',
    ownerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    ownerRating: 4.9,
    ownerVerificationLevel: {
      email: true,
      phone: true,
      identity: false,
      address: true,
      payment: true,
      community: true,
    },
  },
  {
    id: 'item-3',
    title: 'Designer Winter Coat',
    description: 'Barely worn winter coat, size medium. Ideal for cold weather.',
    category: 'Clothing',
    condition: 'excellent',
    location: 'Hackney, London',
    distance: '3.1 miles',
    actionType: 'exchange',
    photos: [],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    co2Impact: 18,
    verified: false,
    ownerId: 'owner-3',
    ownerName: 'Emma Thompson',
    ownerRating: 4.2,
    ownerVerificationLevel: {
      email: true,
      phone: false,
      identity: false,
      address: true,
      payment: false,
      community: false,
    },
  },
]

const conditionBadgeClass = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  fair: 'bg-yellow-100 text-yellow-800',
  poor: 'bg-orange-100 text-orange-800',
} as const

const actionBadgeClass = {
  exchange: 'bg-accent text-accent-foreground',
  donate: 'bg-primary text-primary-foreground',
  recycle: 'bg-secondary text-secondary-foreground',
} as const

const actionIcon = {
  exchange: ArrowsClockwise,
  donate: Heart,
  recycle: Recycle,
} as const

interface ItemListingProps {
  searchQuery: string
  onStartDonationFlow?: (method: 'pickup' | 'dropoff') => void
  onOpenMessages?: (options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => void
}

export function ItemListing({ searchQuery, onStartDonationFlow, onOpenMessages }: ItemListingProps) {
  const [currentUser] = useKV<UserProfile | null>('current-user', null)
  const [globalListings] = useKV<ListingItem[]>('global-listings', [])
  const [items, setItems] = useState<ListingItem[]>([])
  const [activeItem, setActiveItem] = useState<ListingItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedCondition, setSelectedCondition] = useState('All')
  const [selectedType, setSelectedType] = useState<'All' | ListingItem['actionType']>('All')
  const { createOrGetChat, getChatForItem } = useMessaging()
  const {
    submitClaimRequest,
    pendingRequestCountByItem,
    getItemCollectionStatus,
    getRequestsForItem,
  } = useExchangeManager()

  useEffect(() => {
    setItems([...sampleItems, ...globalListings])
  }, [globalListings])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchQuery.trim().length === 0
        || item.title.toLowerCase().includes(searchQuery.toLowerCase())
        || item.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = selectedCategory === 'All'
        || item.category.toLowerCase() === selectedCategory.toLowerCase()

      const matchesCondition = selectedCondition === 'All'
        || item.condition === selectedCondition.toLowerCase()

      const matchesType = selectedType === 'All'
        || item.actionType === selectedType

      return matchesSearch && matchesCategory && matchesCondition && matchesType
    })
  }, [items, searchQuery, selectedCategory, selectedCondition, selectedType])

  const activeItemCollectionStatus = useMemo(() => {
    if (!activeItem) return null
    return getItemCollectionStatus(activeItem.id)
  }, [activeItem, getItemCollectionStatus])

  const activeItemRequests = useMemo(() => {
    if (!activeItem) return [] as ReturnType<typeof getRequestsForItem>
    return getRequestsForItem(activeItem.id)
  }, [activeItem, getRequestsForItem])

  const activeItemPendingCount = activeItem ? pendingRequestCountByItem[activeItem.id] ?? 0 : 0
  const activeItemIsOwner = activeItem ? currentUser?.id === activeItem.ownerId : false
  const activeItemRequestLabel = activeItem?.actionType === 'recycle' ? 'Arrange recycling' : 'Request a Claim'

  const formatTimeAgo = (createdAt: string) => {
    const created = new Date(createdAt)
    const diffMs = Date.now() - created.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  const handleContactOwner = async (item: ListingItem) => {
    if (!currentUser) {
      toast.error('Please sign in to contact item owners')
      return
    }

    if (currentUser.id === item.ownerId) {
      toast.error('This is your listing')
      return
    }

    try {
      const chatId = await createOrGetChat(
        item.id,
        item.title,
        item.photos[0],
        item.ownerId,
        item.ownerName,
        item.ownerAvatar,
        currentUser.id,
        currentUser.name,
        currentUser.avatar,
      )

      toast.success(`Opened a chat with ${item.ownerName}`)
      setActiveItem(null)
      onOpenMessages?.({ itemId: item.id, chatId, initialView: 'chats' })
    } catch (error) {
      console.error('Failed to start conversation', error)
      toast.error('Unable to start conversation right now')
    }
  }

  const handleRequestClaim = (item: ListingItem) => {
    if (!currentUser) {
      toast.error('Please sign in to request this item')
      return
    }

    if (currentUser.id === item.ownerId) {
      toast.error('You cannot request your own listing')
      return
    }

    const request = submitClaimRequest({
      itemId: item.id,
      itemTitle: item.title,
      itemImage: item.photos[0],
      donorId: item.ownerId,
      donorName: item.ownerName,
      collectorId: currentUser.id,
      collectorName: currentUser.name,
      collectorAvatar: currentUser.avatar,
    })

    if (request) {
      setActiveItem(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 mb-2">Browse Items</h1>
        <p className="text-body text-muted-foreground">
          Discover sustainable opportunities in your community
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-h3 flex items-center gap-2">
              <ArrowRight size={20} className="text-primary" />
              <span>Start a donation in three easy steps</span>
            </CardTitle>
            <CardDescription className="max-w-2xl">
              Decide how you want to hand over your item, pick a convenient drop-off partner if needed, then submit your
              listing to generate a QR code for a smooth hand-off.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 min-w-[180px]"
              onClick={() => onStartDonationFlow?.('pickup')}
            >
              <Truck size={18} className="mr-2" />
              <span>Arrange a pick up</span>
            </Button>
            <Button
              className="flex-1 min-w-[180px]"
              onClick={() => onStartDonationFlow?.('dropoff')}
            >
              <Storefront size={18} className="mr-2" />
              <span>Drop off at a partner</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-h3">Filters</CardTitle>
          <CardDescription>Refine the marketplace to match what you need</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {['All', 'Electronics', 'Furniture', 'Clothing'].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                {['All', 'excellent', 'good', 'fair', 'poor'].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === 'All' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as typeof selectedType)}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {['All', 'exchange', 'donate', 'recycle'].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === 'All' ? 'All types' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategory('All')
                setSelectedCondition('All')
                setSelectedType('All')
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-h3 mb-2">No items found</h3>
            <p className="text-body text-muted-foreground mb-4">
              Try adjusting your filters or search terms
            </p>
            <Button>List an item</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const Icon = actionIcon[item.actionType]
            const collectionStatus = getItemCollectionStatus(item.id)
            const itemRequests = getRequestsForItem(item.id)
            const pendingRequests = pendingRequestCountByItem[item.id] ?? 0
            const isOwner = currentUser?.id === item.ownerId
            const requestButtonLabel = item.actionType === 'recycle' ? 'Arrange recycling' : 'Request a Claim'

            return (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {item.photos.length > 0 ? (
                    <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={48} className="text-muted-foreground" />
                  )}

                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={actionBadgeClass[item.actionType]}>
                      <Icon size={14} />
                      <span className="ml-1 capitalize">{item.actionType}</span>
                    </Badge>
                    {item.verified && <Badge variant="secondary">Verified</Badge>}
                  </div>

                  <div className="absolute top-3 right-3 flex gap-2">
                    {collectionStatus?.collected && (
                      <Badge variant="secondary" className="bg-green-600 text-white">
                        Collected
                      </Badge>
                    )}
                    {isOwner && pendingRequests > 0 && !collectionStatus?.collected && (
                      <Badge variant="outline" className="bg-background/80 backdrop-blur">
                        {pendingRequests} interested
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-h3 line-clamp-1">{item.title}</h3>
                    <p className="text-small text-muted-foreground line-clamp-2">{item.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-small text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {item.location}
                    </span>
                    <span>{item.distance}</span>
                  </div>

                  <div className="flex items-center justify-between text-small">
                    <Badge variant="outline" className={conditionBadgeClass[item.condition]}>
                      {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                    </Badge>
                    <span className="text-primary font-medium">-{item.co2Impact}kg CO₂</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>By {item.ownerName}</span>
                    <span><Clock size={12} className="inline mr-1" />{formatTimeAgo(item.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setActiveItem(item)}>
                      View details
                    </Button>
                    {currentUser && currentUser.id !== item.ownerId && getChatForItem(item.id) && (
                      <Button variant="ghost" size="icon" onClick={() => handleContactOwner(item)}>
                        <ChatCircle size={16} />
                      </Button>
                    )}
                  </div>

                  {collectionStatus?.collected ? (
                    <div className="flex items-center justify-between text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <span>Collected on {new Date(collectionStatus.confirmedAt).toLocaleDateString()}</span>
                      <Badge variant="secondary" className="bg-green-600 text-white">
                        Rewarded
                      </Badge>
                    </div>
                  ) : (
                    <>
                      {isOwner ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => onOpenMessages?.({ itemId: item.id, initialView: 'requests' })}
                        >
                          {pendingRequests > 0
                            ? `Review ${pendingRequests} interested collector${pendingRequests > 1 ? 's' : ''}`
                            : itemRequests.length > 0
                            ? 'View interested collectors'
                            : 'No requests yet'}
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button variant="outline" className="flex-1" onClick={() => handleContactOwner(item)}>
                            Contact donor
                          </Button>
                          <Button className="flex-1" onClick={() => handleRequestClaim(item)}>
                            {requestButtonLabel}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!activeItem} onOpenChange={() => setActiveItem(null)}>
        <DialogContent className="max-w-2xl">
          {activeItem && (
            <>
              <DialogHeader>
                <DialogTitle>{activeItem.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  {activeItem.photos.length > 0 ? (
                    <img src={activeItem.photos[0]} alt={activeItem.title} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package size={64} className="text-muted-foreground" />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{activeItem.description}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Category</span><span>{activeItem.category}</span></div>
                      <div className="flex justify-between"><span>Condition</span><span>{activeItem.condition}</span></div>
                      <div className="flex justify-between"><span>Type</span><span>{activeItem.actionType}</span></div>
                      <div className="flex justify-between"><span>Location</span><span>{activeItem.location}</span></div>
                      <div className="flex justify-between"><span>Distance</span><span>{activeItem.distance}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Environmental impact</h4>
                      <div className="bg-green-50 p-3 rounded-lg text-sm">
                        <p className="text-green-700 font-medium">-{activeItem.co2Impact}kg CO₂ saved</p>
                        <p className="text-green-600 mt-1">
                          Choosing reuse prevents manufacturing a new item and keeps materials in circulation.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Item owner</h4>
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary rounded-full overflow-hidden flex items-center justify-center text-primary-foreground">
                            {activeItem.ownerAvatar ? (
                              <img src={activeItem.ownerAvatar} alt={activeItem.ownerName} className="w-full h-full object-cover" />
                            ) : (
                              activeItem.ownerName.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{activeItem.ownerName}</p>
                            {activeItem.ownerVerificationLevel && (
                              <VerificationBadge verified={activeItem.ownerVerificationLevel} variant="compact" />
                            )}
                          </div>
                        </div>
                        {activeItem.ownerRating && (
                          <RatingDisplay rating={activeItem.ownerRating} totalRatings={12} size="sm" />
                        )}
                      </div>
                    </div>

                    {activeItemCollectionStatus?.collected ? (
                      <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-700">
                        Item collected on {new Date(activeItemCollectionStatus.confirmedAt).toLocaleDateString()}.
                        Thank you for completing the exchange!
                      </div>
                    ) : activeItemIsOwner ? (
                      <div className="space-y-3">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm">
                          <p className="font-medium">Interested collectors</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activeItemPendingCount > 0
                              ? `${activeItemPendingCount} collector${activeItemPendingCount > 1 ? 's are' : ' is'} waiting for your approval.`
                              : activeItemRequests.length > 0
                              ? 'No pending decisions. You can review previous requests below.'
                              : 'No one has requested this item yet.'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            onOpenMessages?.({ itemId: activeItem.id, initialView: 'requests' })
                            setActiveItem(null)
                          }}
                        >
                          {activeItemPendingCount > 0
                            ? `Review ${activeItemPendingCount} active request${activeItemPendingCount > 1 ? 's' : ''}`
                            : activeItemRequests.length > 0
                            ? 'View interested collectors'
                            : 'Wait for new requests'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleContactOwner(activeItem)}
                        >
                          Contact donor
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => handleRequestClaim(activeItem)}
                        >
                          {activeItemRequestLabel}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
