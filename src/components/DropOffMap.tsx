import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Clock, Phone, NavigationArrow, Storefront, ArrowRight, WarningCircle } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { shopsNearby, type NearbyShop } from '@/lib/api'
import type { DropOffLocation } from './dropOffLocations'

interface DropOffMapProps {
  onPlanDropOff?: (location: DropOffLocation) => void
  highlightGuidedFlow?: boolean
}

const defaultCoordinateFallback = (index: number): { lat: number; lng: number } => ({
  lat: 51.541 + (index % 3) * 0.01,
  lng: -0.142 + Math.floor(index / 3) * 0.01
})

function formatDistance(distanceMeters?: number | null): string {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return 'Distance unavailable'
  }
  const miles = distanceMeters / 1609.344
  return `${miles >= 10 ? miles.toFixed(0) : miles.toFixed(1)} mi`
}

function formatOpeningHours(opening?: NearbyShop['opening_hours'] | null): string {
  if (!opening) return 'Hours not available'
  const { days, open_time, close_time } = opening
  const joinedDays = Array.isArray(days) && days.length > 0 ? days.join(' · ') : 'Daily'
  if (!open_time && !close_time) return joinedDays
  if (open_time && close_time) return `${joinedDays} ${open_time} - ${close_time}`
  if (open_time) return `${joinedDays} from ${open_time}`
  if (close_time) return `${joinedDays} until ${close_time}`
  return joinedDays
}

function shopToLocation(shop: NearbyShop, index: number): DropOffLocation {
  const fallback = defaultCoordinateFallback(index)
  const coordinates =
    typeof shop.latitude === 'number' && Number.isFinite(shop.latitude) &&
    typeof shop.longitude === 'number' && Number.isFinite(shop.longitude)
      ? { lat: shop.latitude, lng: shop.longitude }
      : fallback

  const acceptedItems = Array.isArray(shop.acceptable_categories) && shop.acceptable_categories.length > 0
    ? shop.acceptable_categories
    : ['General donations']

  return {
    id: shop.id || `shop-${index}`,
    name: shop.name || 'TruCycle Partner Shop',
    address: shop.address_line || 'Address available upon confirmation',
    postcode: shop.postcode || '—',
    distance: formatDistance(shop.distanceMeters),
    openHours: formatOpeningHours(shop.opening_hours),
    phone: shop.phone_number || 'Contact provided after booking',
    acceptedItems,
    specialServices: shop.active === false ? [] : ['Verified partner'],
    coordinates,
  }
}

const defaultMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

const activeMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [27, 44],
  iconAnchor: [13, 44],
  popupAnchor: [1, -36],
  tooltipAnchor: [18, -30],
  shadowSize: [45, 45],
  shadowAnchor: [13, 44],
})

export function DropOffMap({ onPlanDropOff, highlightGuidedFlow }: DropOffMapProps) {

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [center, map])
  return null
}

  const [remoteLocations, setRemoteLocations] = useState<DropOffLocation[]>([])
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [user] = useKV<{ postcode?: string } | null>('current-user', null)

  useEffect(() => {
    let cancelled = false

    async function loadNearbyShops() {
      setLoadingNearby(true)
      setNearbyError(null)
      try {
        const postcode = user?.postcode?.trim()
        const response = await shopsNearby(postcode ? { postcode } : { postcode: 'SW1A 1AA' })
        const data = Array.isArray((response as any)?.data)
          ? ((response as any).data as NearbyShop[])
          : Array.isArray(response)
            ? (response as NearbyShop[])
            : (((response as any)?.data ?? []) as NearbyShop[])

        if (!cancelled) {
          const mapped = data.map((shop, index) => shopToLocation(shop, index))
          setRemoteLocations(mapped)
          // If there are no live results, do not show local/sample shops.
        }
      } catch (error: any) {
        console.error('Failed to fetch nearby shops', error)
        if (!cancelled) {
          const message = error?.message || 'Unable to load nearby partner shops right now.'
          setNearbyError(message)
        }
      } finally {
        if (!cancelled) {
          setLoadingNearby(false)
        }
      }
    }

    loadNearbyShops()
    return () => {
      cancelled = true
    }
  }, [user?.postcode])

  const locations = useMemo(() => {
    const merged = new Map<string, DropOffLocation>()

    remoteLocations.forEach((location, index) => {
      const normalized = {
        ...location,
        coordinates: location.coordinates ?? defaultCoordinateFallback(index),
      }
      merged.set(normalized.id, normalized)
    })

    return Array.from(merged.values())
  }, [remoteLocations])

  const [activeLocationId, setActiveLocationId] = useState<string | null>(locations[0]?.id ?? null)

  useEffect(() => {
    if (locations.length === 0) {
      setActiveLocationId(null)
      return
    }

    setActiveLocationId(prev => {
      if (prev && locations.some(location => location.id === prev)) {
        return prev
      }
      return locations[0].id
    })
  }, [locations])

  const activeLocation = activeLocationId
    ? locations.find(location => location.id === activeLocationId) ?? locations[0]
    : locations[0]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Storefront size={32} className="text-primary" />
          <h1 className="text-h1 text-foreground">Partner Shops</h1>
          {highlightGuidedFlow && (
            <Badge variant="secondary" className="uppercase tracking-wide">Guided flow</Badge>
          )}
        </div>
        <p className="text-body text-muted-foreground">
          Explore our Partner Shop network, confirm a convenient location, and continue to your listing with everything pre-filled.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-h3 flex items-center gap-2">
              <Storefront size={22} className="text-primary" />
              Choose a TruCycle Partner Shop
            </CardTitle>
            <CardDescription>
              Tap a location pin to preview opening hours, accepted items, and services. Confirm the Partner Shop to continue your donation.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-max">
              Availability verified hourly
            </Badge>
            {loadingNearby && (
              <Badge variant="secondary" className="animate-pulse">
                Refreshing partner network…
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {nearbyError && (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <WarningCircle size={18} />
              <AlertDescription>
                {nearbyError}
              </AlertDescription>
            </Alert>
          )}
          {locations.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MapPin size={28} className="text-muted-foreground" />
              </div>
              <p className="text-body text-muted-foreground">
                We&apos;re onboarding partner shops near you. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-8">
              <div className="space-y-4 md:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-primary/30 bg-background shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">
                        Interactive Partner Shop map
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Select a pin to preview partner details and confirm your preferred shop.
                      </p>
                    </div>
                    {activeLocation && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="w-max">
                          {activeLocation.name}
                        </Badge>
                        {loadingNearby && <Skeleton className="h-5 w-24" />}
                      </div>
                    )}
                  </div>

                  <MapContainer
                    center={[activeLocation?.coordinates.lat ?? 51.5416, activeLocation?.coordinates.lng ?? -0.143]}
                    zoom={15}
                    minZoom={2}
                    maxZoom={19}
                    scrollWheelZoom={true}
                    zoomControl={true}
                    className="h-[360px] w-full"
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {locations.map(location => (
                      <Marker
                        key={location.id}
                        position={[location.coordinates.lat, location.coordinates.lng]}
                        eventHandlers={{
                          click: () => setActiveLocationId(location.id),
                        }}
                        icon={activeLocationId === location.id ? activeMarkerIcon : defaultMarkerIcon}
                      />
                    ))}
                    {activeLocation && (
                      <RecenterMap center={[activeLocation.coordinates.lat, activeLocation.coordinates.lng]} />
                    )}
                  </MapContainer>

                  {activeLocation && (
                    <div className="grid gap-4 border-t border-primary/10 bg-muted/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Storefront size={18} className="text-primary" />
                          {activeLocation.name}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin size={14} />
                          {activeLocation.address}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>Postcode: {activeLocation.postcode}</span>
                          <span>Distance: {activeLocation.distance}</span>
                          <span>Open: {activeLocation.openHours}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:justify-self-end">
                        <Button variant="outline">
                          <NavigationArrow size={16} className="mr-2" />
                          Get directions
                        </Button>
                        <Button onClick={() => onPlanDropOff?.(activeLocation)}>
                          <ArrowRight size={16} className="mr-2" />
                          Use location in listing
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
              <ScrollArea className="h-[420px] rounded-2xl border border-border/80 bg-background md:col-span-3">
                <div className="divide-y">
                  {locations.map(location => (
                    <div
                      key={location.id}
                      className={`p-5 transition hover:bg-muted/60 ${activeLocationId === location.id ? 'bg-muted/80 border-l-4 border-primary/70' : ''}`}
                      onMouseEnter={() => setActiveLocationId(location.id)}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                            {location.name}
                            {activeLocationId === location.id && <Badge variant="secondary">Active</Badge>}
                          </p>
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin size={14} />
                            {location.address}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Postcode: {location.postcode}</span>
                            {location.distance && location.distance !== 'Distance unavailable' ? (
                              <span>{location.distance}</span>
                            ) : (
                              <span>Open: {location.openHours}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-2 text-sm">
                            <Clock size={14} /> {location.openHours}
                          </span>
                          <span className="flex items-center gap-2 text-sm">
                            <Phone size={14} /> {location.phone}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accepted Items</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {location.acceptedItems.map(item => (
                              <Badge key={item} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {location.specialServices.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {location.specialServices.map(service => (
                                <Badge key={service} className="bg-primary/10 text-primary">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="ghost" size="sm" className="justify-start sm:justify-center">
                          <NavigationArrow size={16} className="mr-2" />
                          Get directions
                        </Button>
                        <Button onClick={() => onPlanDropOff?.(location)}>
                          Plan hand-off here
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* <Card className="border-accent/20 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-h3">How the Partner Shop flow works</CardTitle>
          <CardDescription>
            Follow these quick steps to finish your donation with a QR hand-off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">1</div>
              <p className="text-body font-medium">Pick a Partner Shop that accepts your item type.</p>
            </div>
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">2</div>
              <p className="text-body font-medium">Continue to the listing form with Partner Shop details pre-filled.</p>
            </div>
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">3</div>
              <p className="text-body font-medium">Submit your listing to generate a QR code for fast check-in.</p>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}
