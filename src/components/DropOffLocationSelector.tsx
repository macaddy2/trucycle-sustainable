import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Clock, Phone, NavigationArrow, Storefront, XCircle } from '@phosphor-icons/react'
import { DROP_OFF_LOCATIONS, type DropOffLocation } from './dropOffLocations'

interface DropOffLocationSelectorProps {
  selectedLocation: DropOffLocation | null
  onSelect: (location: DropOffLocation) => void
  onClose: () => void
}

export function DropOffLocationSelector({ selectedLocation, onSelect, onClose }: DropOffLocationSelectorProps) {
  const [activeLocationId, setActiveLocationId] = useState<string>(selectedLocation?.id ?? DROP_OFF_LOCATIONS[0].id)

  useEffect(() => {
    if (selectedLocation) {
      setActiveLocationId(selectedLocation.id)
    }
  }, [selectedLocation])

  const activeLocation = DROP_OFF_LOCATIONS.find(location => location.id === activeLocationId) ?? DROP_OFF_LOCATIONS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm p-4 md:p-10 overflow-y-auto">
      <Card className="w-full max-w-5xl shadow-2xl border-primary/30">
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-h2 flex items-center space-x-2">
              <Storefront size={28} className="text-primary" />
              <span>Select a drop-off partner</span>
            </CardTitle>
            <CardDescription className="mt-2 space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                Step 2 of 3 — Choose a drop-off partner
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

                <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent)]">
                  <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'160\' height=\'160\' viewBox=\'0 0 160 160\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 80H160M80 0V160\' stroke=\'%23E5E7EB\' stroke-opacity=\'0.6\' stroke-width=\'1\'/%3E%3C/svg%3E')] opacity-60" />
                  {DROP_OFF_LOCATIONS.map(location => (
                    <button
                      type="button"
                      key={location.id}
                      className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 p-2 shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ${
                        selectedLocation?.id === location.id || activeLocationId === location.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-primary/40 bg-background text-primary hover:border-primary'
                      }`}
                      style={{ left: `${location.coordinates.x}%`, top: `${location.coordinates.y}%` }}
                      onClick={() => setActiveLocationId(location.id)}
                      onDoubleClick={() => onSelect(location)}
                    >
                      <MapPin size={20} weight={selectedLocation?.id === location.id || activeLocationId === location.id ? 'fill' : 'regular'} />
                      <span className="absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow group-hover:bg-primary/10">
                        {location.name}
                      </span>
                    </button>
                  ))}
                </div>

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
