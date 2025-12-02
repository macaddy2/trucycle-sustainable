import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Clock, Phone, NavigationArrow, Storefront, XCircle } from '@phosphor-icons/react'
import type { DropOffLocation } from './dropOffLocations'
import { DROP_OFF_LOCATIONS } from './dropOffLocations'
import { useKV } from '@/hooks/useKV'
import { shopsNearby, type NearbyShop } from '@/lib/api'

interface DropOffLocationSelectorProps {
  selectedLocation: DropOffLocation | null
  onSelect: (location: DropOffLocation) => void
  onClose: () => void
}

const selectorMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

const formatDistance = (distanceMeters?: number | null): string => {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return 'Distance unavailable'
  }
  if (distanceMeters === 0) return 'same Block'
  const miles = distanceMeters / 1609.344
  return `${miles >= 10 ? miles.toFixed(0) : miles.toFixed(1)} mi`
}

const formatOpeningHours = (opening?: NearbyShop['opening_hours'] | null): string => {
  if (!opening) return 'Hours not available'
  const { days, open_time, close_time } = opening
  const joinedDays = Array.isArray(days) && days.length > 0 ? days.join(', ') : 'Daily'
  if (!open_time && !close_time) return joinedDays
  if (open_time && close_time) return `${joinedDays} ${open_time} - ${close_time}`
  if (open_time) return `${joinedDays} from ${open_time}`
  if (close_time) return `${joinedDays} until ${close_time}`
  return joinedDays
}

const shopToLocation = (shop: NearbyShop, index: number): DropOffLocation => {
  const coordinates =
    typeof shop.latitude === 'number' && Number.isFinite(shop.latitude) &&
    typeof shop.longitude === 'number' && Number.isFinite(shop.longitude)
      ? { lat: shop.latitude, lng: shop.longitude }
      : { lat: 51.541 + (index % 3) * 0.01, lng: -0.142 + Math.floor(index / 3) * 0.01 }

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

export function DropOffLocationSelector({ selectedLocation, onSelect, onClose }: DropOffLocationSelectorProps) {
  const RecenterMap = ({ center }: { center: [number, number] }) => {
    const map = useMap()
    useEffect(() => {
      map.setView(center)
    }, [center, map])
    return null
  }

  const [remoteLocations, setRemoteLocations] = useState<DropOffLocation[]>([])
  const [user] = useKV<{ postcode?: string; lat?: number; lng?: number; latitude?: number; longitude?: number } | null>('current-user', null)
  const rawLat = (user as any)?.lat ?? (user as any)?.latitude
  const rawLng = (user as any)?.lng ?? (user as any)?.longitude
  const userLat = typeof rawLat === 'number' ? rawLat : null
  const userLng = typeof rawLng === 'number' ? rawLng : null
  const [activeLocationId, setActiveLocationId] = useState<string | null>(selectedLocation?.id ?? null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const postcode = user?.postcode?.trim()
        const params = postcode
          ? { postcode }
          : (typeof userLat === 'number' && typeof userLng === 'number'
            ? { lat: userLat, lon: userLng }
            : { postcode: 'SW1A 1AA' })
        const res = await shopsNearby(params)
        const data = Array.isArray((res as any)?.data)
          ? ((res as any).data as NearbyShop[])
          : Array.isArray(res)
            ? (res as NearbyShop[])
            : (((res as any)?.data ?? []) as NearbyShop[])
        if (cancelled) return
        const mapped = data.map((s, i) => shopToLocation(s, i))
        const locations = mapped.length > 0 ? mapped : DROP_OFF_LOCATIONS
        setRemoteLocations(locations)
        if (!selectedLocation && locations.length > 0 && !activeLocationId) {
          setActiveLocationId(locations[0].id)
        }
      } catch {
        setRemoteLocations(DROP_OFF_LOCATIONS)
        if (!selectedLocation && !activeLocationId && DROP_OFF_LOCATIONS.length > 0) {
          setActiveLocationId(DROP_OFF_LOCATIONS[0].id)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeLocationId, selectedLocation, user?.postcode, userLat, userLng])

  useEffect(() => {
    if (selectedLocation) {
      setActiveLocationId(selectedLocation.id)
    }
  }, [selectedLocation])

  const activeLocation = useMemo(() => {
    if (activeLocationId) {
      return remoteLocations.find(l => l.id === activeLocationId) ?? remoteLocations[0]
    }
    return remoteLocations[0]
  }, [activeLocationId, remoteLocations])

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-background/80 backdrop-blur-sm p-4 md:p-10 overflow-y-auto pointer-events-none">
      <Card className="w-full max-w-6xl shadow-2xl border-primary/30 pointer-events-auto">
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-h2 flex items-center space-x-2">
              <Storefront size={28} className="text-primary" />
              <span>Select a drop-off partner</span>
            </CardTitle>
          </div>
          <Button variant="ghost" onClick={onClose} className="self-end md:self-start">
            <XCircle size={22} className="mr-2" /> Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-8">
            <div className="space-y-4 md:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-primary/30 bg-background shadow-sm">
                <div className="flex flex-col gap-2 border-b border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">
                      Choose a partner on the map
                    </p>
                  </div>
                  <Badge variant="secondary" className="w-max">
                    Live availability checked hourly
                  </Badge>
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
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {remoteLocations.map(location => {
                    const isSelected = selectedLocation?.id === location.id

                    return (
                      <Marker
                        key={location.id}
                        position={[location.coordinates.lat, location.coordinates.lng]}
                        {...(isSelected ? { icon: selectorMarkerIcon } : {})}
                        eventHandlers={{
                          click: () => setActiveLocationId(location.id),
                          dblclick: () => onSelect(location)
                        }}
                      />
                    )
                  })}
                  {activeLocation && (
                    <RecenterMap center={[activeLocation.coordinates.lat, activeLocation.coordinates.lng]} />
                  )}
                </MapContainer>

                {activeLocation && (
                  <div className="grid gap-4 border-t border-primary/10 bg-muted/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Storefront size={18} className="text-primary" />
                        {activeLocation.name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin size={14} />
                        {activeLocation.address}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Postcode: {activeLocation.postcode}</span>
                        <span>Distance: {activeLocation.distance}</span>
                        <span>Hours: {activeLocation.openHours}</span>
                      </div>
                    </div>
                    <Button className="justify-self-end" onClick={() => onSelect(activeLocation)}>
                      Confirm drop-off here
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <ScrollArea className="h-[420px] rounded-2xl border border-border/80 bg-background md:col-span-3">
              <div className="divide-y">
                {remoteLocations.map(location => (
                  <div
                    key={location.id}
                    className={`p-5 transition hover:bg-muted/60 ${
                      activeLocationId === location.id ? 'bg-muted/80 border-l-4 border-primary/70' : ''
                    }`}
                    onMouseEnter={() => setActiveLocationId(location.id)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-foreground flex items-center gap-2">
                          {location.name}
                          {selectedLocation?.id === location.id && <Badge variant="secondary">Selected</Badge>}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin size={14} />
                          {location.address}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Postcode: {location.postcode}</span>
                          <span>{location.distance}</span>
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
                      <Button onClick={() => onSelect(location)}>
                        {selectedLocation?.id === location.id ? 'Keep this location' : 'Select this partner'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
