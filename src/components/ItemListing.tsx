import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LocationSelector } from '@/components/LocationSelector'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Heart,
  MapPin,
  ArrowsClockwise,
  Clock,
  Package,
  Recycle,
  MagnifyingGlass,
  Leaf,
  PencilSimple,
  CrosshairSimple,
  X,
} from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { useExchangeManager } from '@/hooks'
import { VerificationBadge } from './VerificationBadge'
import type { VerificationLevel } from './verificationBadgeUtils'
import { RatingDisplay } from './RatingSystem'
import { toast } from 'sonner'
import { searchItems } from '@/lib/api'
import BrowseSkeleton from '@/components/skeletons/BrowseSkeleton'

interface UserProfile {
  id: string
  name: string
  userType: 'donor' | 'collector'
  avatar?: string
  partnerAccess?: boolean
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
  onSearchChange?: (query: string) => void
  onSearchSubmit?: () => void
  onOpenMessages?: (options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => void
}

export function ItemListing({ searchQuery, onSearchChange, onSearchSubmit, onOpenMessages }: ItemListingProps) {
  const [currentUser] = useKV<UserProfile | null>('current-user', null)
  
  const [items, setItems] = useState<ListingItem[]>([])
  const [activeItem, setActiveItem] = useState<ListingItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedCondition, setSelectedCondition] = useState('All')
  const [selectedType, setSelectedType] = useState<'All' | ListingItem['actionType']>('All')
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [locationFilter, setLocationFilter] = useKV<{
    lat?: number
    lng?: number
    label?: string
    radiusKm: number
  }>('browse.location', { radiusKm: 10 })
  const {
    submitClaimRequest,
    pendingRequestCountByItem,
    getItemCollectionStatus,
    getRequestsForItem,
  } = useExchangeManager()

  // Load from API; no demo fallback

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const categoryParam = selectedCategory && selectedCategory !== 'All' ? selectedCategory : undefined
        const coordsLat = (locationFilter?.lat ?? (currentUser as any)?.lat ?? (currentUser as any)?.latitude) as number | undefined
        const coordsLng = (locationFilter?.lng ?? (currentUser as any)?.lng ?? (currentUser as any)?.longitude) as number | undefined
        const profilePostcode = currentUser?.postcode && String(currentUser.postcode).trim()
        const params: any = { radius: Math.max(1, Number(locationFilter?.radiusKm) || 10), limit: 20 }
        if (typeof coordsLat === 'number' && typeof coordsLng === 'number') {
          params.lat = coordsLat
          params.lng = coordsLng
        } else if (profilePostcode) {
          params.postcode = profilePostcode
        } else {
          params.postcode = 'IG11 7FR'
        }
        if (categoryParam) params.category = categoryParam

        const result = await searchItems(params)
        const apiItems = (result?.data?.items || []).map((it) => mapPublicItemToListingItem(it))
        if (!cancelled) {
          // Do not use demo data; only API results
          setItems(apiItems)
        }
      } catch (e: any) {
        if (!cancelled) {
          setItems([])
          toast.error(e?.message || 'Failed to load items')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedCategory, currentUser, locationFilter?.lat, locationFilter?.lng, locationFilter?.radiusKm])

  function mapPublicItemToListingItem(it: any): ListingItem {
    const cond = String(it?.condition || '').toLowerCase()
    const condition: ListingItem['condition'] = cond === 'new' || cond === 'like_new' ? 'excellent' : (['good','fair','poor'].includes(cond) ? (cond as any) : 'good')
    const owner = it?.owner || {}
    const verification = owner?.verification || {}
    const ownerVerificationLevel: VerificationLevel = {
      email: Boolean(verification.email_verified),
      phone: false,
      identity: Boolean(verification.identity_verified),
      address: Boolean(verification.address_verified),
      payment: false,
      community: false,
    }
    const photos = Array.isArray(it?.images) ? it.images.map((img: any) => img?.url).filter(Boolean) : []
    // Display distance in miles (backend supplies km)
    const distance = typeof it?.distance_km === 'number'
      ? `${(it.distance_km * 0.621371).toFixed(1)} mi`
      : ''
    const actionType = (it?.pickup_option || 'donate') as ListingItem['actionType']
    return {
      id: String(it?.id || crypto.randomUUID()),
      title: String(it?.title || 'Untitled'),
      description: String(it?.description || ''),
      category: String(it?.category || 'Other'),
      condition,
      location: it?.location?.postcode || '',
      distance,
      actionType,
      photos,
      createdAt: String(it?.created_at || new Date().toISOString()),
      co2Impact: typeof it?.estimated_co2_saved_kg === 'number' ? it.estimated_co2_saved_kg : 0,
      verified: Boolean(verification?.email_verified) || Boolean(verification?.identity_verified) || Boolean(verification?.address_verified),
      ownerId: String(owner?.id || ''),
      ownerName: String(owner?.name || 'User'),
      ownerAvatar: owner?.profile_image || undefined,
      ownerRating: typeof owner?.rating === 'number' ? owner.rating : undefined,
      ownerVerificationLevel,
    }
  }

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
  const activeItemOwnerLabel = activeItem?.actionType === 'donate' ? 'Pickup Shop' : 'Item owner'

  const formatTimeAgo = (createdAt: string) => {
    const created = new Date(createdAt)
    const diffMs = Date.now() - created.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(event.target.value)
  }

  const handleFiltersSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchSubmit?.()
  }


  const handleRequestClaim = async (item: ListingItem) => {
    if (!currentUser) {
      toast.error('Please sign in to request this item')
      return
    }

    if (currentUser.id === item.ownerId) {
      toast.error('You cannot request your own listing')
      return
    }

    const request = await submitClaimRequest({
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

      <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-3 text-h3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MagnifyingGlass size={18} />
            </span>
            <span>Find an Item</span>
          </CardTitle>
          <CardDescription className="text-base">
            Search, filter, and pinpoint the perfect reuse opportunity around you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleFiltersSubmit}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Search furniture, electronics, baby essentials..."
                  className="h-12 w-full rounded-2xl border-border/70 bg-background/80 pl-11 pr-4"
                />
              </div>
            </div>

            {/* Filters row: Category (auto), Condition (auto), Action (auto), Location (fills), Clear (auto) */}
            <div className="grid gap-4 md:[grid-template-columns:auto_auto_auto_1fr_auto]">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</span>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SelectTrigger className="mt-2 w-auto rounded-xl border-border/50 bg-background/80">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Refine results by item type, from electronics to clothing.</TooltipContent>
                  </Tooltip>
                  <SelectContent>
                    {['All', 'Electronics', 'Furniture', 'Clothing', 'Books', 'Sports Equipment', 'Home Decor', 'Other'].map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === 'All' ? 'All categories' : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</span>
                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SelectTrigger className="mt-2 w-auto rounded-xl border-border/50 bg-background/80">
                        <SelectValue placeholder="All conditions" />
                      </SelectTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Filter by item quality to match your refurbishment effort.</TooltipContent>
                  </Tooltip>
                  <SelectContent>
                    {['All', 'excellent', 'good', 'fair', 'poor'].map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === 'All' ? 'All conditions' : option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</span>
                <Select value={selectedType} onValueChange={(value) => setSelectedType(value as typeof selectedType)}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SelectTrigger className="mt-2 w-auto rounded-xl border-border/50 bg-background/80">
                        <SelectValue placeholder="All intents" />
                      </SelectTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Focus on exchanges, donations, or recycling opportunities.</TooltipContent>
                  </Tooltip>
                  <SelectContent>
                    {['All', 'exchange', 'donate', 'recycle'].map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === 'All' ? 'All intents' : option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/50 p-4 shadow-inner min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</span>
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 p-3">
                  <MapPin size={16} className="text-primary" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-medium truncate">
                      {locationFilter?.label || (locationFilter?.lat && locationFilter?.lng ? 'Custom location' : 'Anywhere')}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {(() => {
                        const km = Math.max(1, Number(locationFilter?.radiusKm) || 10)
                        const mi = Math.round(km * 0.621371)
                        return `Radius: ${mi} mi`
                      })()}
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Change location"
                        onClick={() => setLocationDialogOpen(true)}
                      >
                        <PencilSimple size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Change location</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Use my location"
                        onClick={() => {
                          if (!navigator.geolocation) return
                          navigator.geolocation.getCurrentPosition((pos) => {
                            const { latitude, longitude } = pos.coords
                            const preciseLat = Number(latitude.toFixed(7))
                            const preciseLng = Number(longitude.toFixed(7))
                            setLocationFilter((prev) => ({
                              ...prev,
                              lat: preciseLat,
                              lng: preciseLng,
                              label: 'Current location',
                              radiusKm: Math.max(1, Number(prev?.radiusKm) || 10),
                            }))
                          })
                        }}
                      >
                        <CrosshairSimple size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Use my location</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 justify-start px-0 text-xs"
                    onClick={() => setLocationFilter({ radiusKm: 10 })}
                  >
                    Clear location
                  </Button>
                </div>
              </div>

              {/* Clear filters at far right */}
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 rounded-2xl px-4 text-sm font-medium"
                  onClick={() => {
                    setSelectedCategory('All')
                    setSelectedCondition('All')
                    setSelectedType('All')
                  }}
                >
                  <X size={16} className="mr-2" />
                  Clear filters
                </Button>
              </div>
            </div>

            {/* Search button below filters */}
            <div className="flex">
              <Button type="submit" className="h-12 rounded-2xl px-6 text-sm font-semibold md:w-auto w-full">
                <MagnifyingGlass size={16} className="mr-2" />
                Search listings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-6">
            <BrowseSkeleton />
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
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
              <Card
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative flex h-44 w-full items-center justify-center bg-muted">
                  {item.photos.length > 0 ? (
                    <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover object-top" />
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

                <CardContent className="space-y-4 p-5">
                  <div className="space-y-1.5">
                    <h3 className="text-h3 line-clamp-1 text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} />
                          <span className="max-w-[160px] truncate">{item.location}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{item.location}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
                          {item.distance}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Approximate distance from your saved area.</TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="capitalize">
                          {item.category}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Item category</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={`capitalize ${conditionBadgeClass[item.condition]}`}>
                          {item.condition}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Reported condition</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{formatTimeAgo(item.createdAt)}</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Time since listing was published</TooltipContent>
                    </Tooltip>
                    <Badge variant="outline" className="flex items-center gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                      <Leaf size={12} />
                      <span>{item.co2Impact}kg CO₂ saved</span>
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>By {item.ownerName}</span>
                    <span className="inline-flex items-center gap-1">
                      <span>Donor rating</span>
                      {typeof item.ownerRating === 'number' ? (
                        <RatingDisplay rating={item.ownerRating} totalRatings={12} size="sm" showCount={false} />
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" className="flex-1" onClick={() => setActiveItem(item)}>
                      View details
                    </Button>
                    {!isOwner && !collectionStatus?.collected && (
                      <Button className="flex-1" onClick={() => handleRequestClaim(item)}>
                        {requestButtonLabel}
                      </Button>
                    )}
                  </div>

                  {collectionStatus?.collected ? (
                    <div className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
                      <span>Collected on {new Date(collectionStatus.confirmedAt).toLocaleDateString()}</span>
                      <Badge variant="secondary" className="bg-green-600 text-white">
                        Rewarded
                      </Badge>
                    </div>
                  ) : (
                    isOwner
                      ? (
                        (pendingRequests > 0 || itemRequests.length > 0)
                          ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => onOpenMessages?.({ itemId: item.id, initialView: 'requests' })}
                            >
                              {pendingRequests > 0
                                ? `Review ${pendingRequests} interested collector${pendingRequests > 1 ? 's' : ''}`
                                : 'View interested collectors'}
                            </Button>
                          )
                          : null
                      )
                      : null
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
                    <img src={activeItem.photos[0]} alt={activeItem.title} className="w-full h-full object-cover object-top rounded-lg" />
                  ) : (
                    <Package size={64} className="text-muted-foreground" />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {false && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{activeItem.description}</p>
                    </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Category</span><span>{activeItem.category}</span></div>
                      <div className="flex justify-between"><span>Condition</span><span>{activeItem.condition}</span></div>
                      <div className="flex justify-between"><span>Type</span><span>{activeItem.actionType}</span></div>
                      <div className="flex justify-between"><span>Location</span><span>{activeItem.location}</span></div>
                      <div className="flex justify-between"><span>Distance</span><span>{activeItem.distance}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">

                    <div className="space-y-2">
                      <h4 className="font-medium">{activeItemOwnerLabel}</h4>
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary rounded-full overflow-hidden flex items-center justify-center text-primary-foreground">
                            {activeItem.ownerAvatar ? (
                              <img src={activeItem.ownerAvatar} alt={activeItem.ownerName || 'Owner avatar'} className="w-full h-full object-cover" />
                            ) : (
                              activeItem.ownerName?.charAt(0) ?? '?'
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
                          <p className="font-medium">Requests</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activeItemPendingCount > 0
                              ? `${activeItemPendingCount} pending ${activeItemPendingCount > 1 ? 'requests' : 'request'} awaiting your review.`
                              : activeItemRequests.length > 0
                              ? 'No pending decisions. You can review previous requests below.'
                              : 'No requests yet.'}
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
                            ? `Review ${activeItemPendingCount} pending request${activeItemPendingCount > 1 ? 's' : ''}`
                            : activeItemRequests.length > 0
                            ? 'View requests'
                            : 'Manage requests'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleRequestClaim(activeItem)}
                      >
                        {activeItemRequestLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LocationSelector
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        initialValue={{
          lat: locationFilter?.lat,
          lng: locationFilter?.lng,
          label: locationFilter?.label,
          radiusKm: Math.max(1, Number(locationFilter?.radiusKm) || 10),
        }}
        onApply={(val) => setLocationFilter({ ...val })}
      />
    </div>
  )
}

