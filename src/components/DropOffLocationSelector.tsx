import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Clock, Phone, NavigationArrow, Storefront, XCircle } from '@phosphor-icons/react'
import { DROP_OFF_LOCATIONS, type DropOffLocation } from './dropOffLocations'

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

export function DropOffLocationSelector({ selectedLocation, onSelect, onClose }: DropOffLocationSelectorProps) {
  const RecenterMap = ({ center }: { center: [number, number] }) => {
    const map = useMap()
    useEffect(() => {
      map.setView(center)
    }, [center, map])
    return null
  }

  const [activeLocationId, setActiveLocationId] = useState<string>(selectedLocation?.id ?? DROP_OFF_LOCATIONS[0].id)

  useEffect(() => {
    if (selectedLocation) {
      setActiveLocationId(selectedLocation.id)
    }
  }, [selectedLocation])

  const activeLocation = DROP_OFF_LOCATIONS.find(location => location.id === activeLocationId) ?? DROP_OFF_LOCATIONS[0]

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-background/80 backdrop-blur-sm p-4 md:p-10 overflow-y-auto">
      <Card className="w-full max-w-5xl shadow-2xl border-primary/30">
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-h2 flex items-center space-x-2">
              <Storefront size={28} className="text-primary" />
              <span>Select a drop-off partner</span>
            </CardTitle>
            <CardDescription className="mt-2 space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                Choose a drop-off partner
              </span>
              <span>
                Explore trusted TruCycle partners with real-time availability, amenities, and travel-friendly insights.
              </span>
            </CardDescription>
          </div>
          <Button variant="ghost" onClick={onClose} className="self-end md:self-start">
            <XCircle size={22} className="mr-2" /> Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-primary/30 bg-background shadow-sm">
                <div className="flex flex-col gap-2 border-b border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">
                      Choose a partner on the map
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tap a pin to preview details, then confirm the location for your QR code hand-off.
                    </p>
                  </div>
                  <Badge variant="secondary" className="w-max">
                    Live availability checked hourly
                  </Badge>
                </div>

                <MapContainer
                  center={[activeLocation.coordinates.lat, activeLocation.coordinates.lng]}
                  zoom={12}
                  scrollWheelZoom={false}
                  className="h-[320px] w-full"
                >
                  <TileLayer
                    attribution="&copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {DROP_OFF_LOCATIONS.map(location => {
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
                      >
                        <Popup minWidth={220}>
                          <div className="space-y-2">
                            <p className="font-medium">{location.name}</p>
                            <p className="text-xs text-muted-foreground">{location.address}</p>
                            <Button size="sm" className="w-full" onClick={() => onSelect(location)}>
                              Use this location
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  })}
                  <RecenterMap center={[activeLocation.coordinates.lat, activeLocation.coordinates.lng]} />
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

            <ScrollArea className="h-[420px] rounded-2xl border border-border/80 bg-background">
              <div className="divide-y">
                {DROP_OFF_LOCATIONS.map(location => (
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
