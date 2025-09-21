import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Clock, Phone, NavigationArrow, Storefront, ArrowRight } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { DROP_OFF_LOCATIONS, type DropOffLocation } from './dropOffLocations'

interface DropOffMapProps {
  onPlanDropOff?: (location: DropOffLocation) => void
  highlightGuidedFlow?: boolean
}

const defaultCoordinateFallback = (index: number) => ({
  x: 40 + (index % 3) * 20,
  y: 35 + Math.floor(index / 3) * 20
})

export function DropOffMap({ onPlanDropOff, highlightGuidedFlow }: DropOffMapProps) {
  const [storedLocations] = useKV<DropOffLocation[]>('dropoff-locations', [])

  const locations = useMemo(() => {
    const merged = new Map<string, DropOffLocation>()
    for (const location of DROP_OFF_LOCATIONS) {
      merged.set(location.id, location)
    }

    for (const location of storedLocations ?? []) {
      merged.set(location.id, {
        ...location,
        coordinates: location.coordinates ?? defaultCoordinateFallback(merged.size)
      })
    }

    return Array.from(merged.values())
  }, [storedLocations])

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
          <MapPin size={32} className="text-primary" />
          <h1 className="text-h1 text-foreground">Drop-off Locations</h1>
          {highlightGuidedFlow && (
            <Badge variant="secondary" className="uppercase tracking-wide">Guided flow</Badge>
          )}
        </div>
        <p className="text-body text-muted-foreground">
          Explore our partner network, confirm a convenient location, and continue to your listing with everything pre-filled.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-h3 flex items-center gap-2">
              <Storefront size={22} className="text-primary" />
              Choose a TruCycle partner
            </CardTitle>
            <CardDescription>
              Tap a location pin to preview opening hours, accepted items, and services. Confirm the partner to continue your donation.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-max">
            Availability verified hourly
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-primary/30 bg-background shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">
                        Interactive map
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click pins to preview details, double-click to select instantly.
                      </p>
                    </div>
                    {activeLocation && (
                      <Badge variant="secondary" className="w-max">
                        {activeLocation.name}
                      </Badge>
                    )}
                  </div>

                  <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent)]">
                    <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'160\' height=\'160\' viewBox=\'0 0 160 160\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 80H160M80 0V160\' stroke=\'%23E5E7EB\' stroke-opacity=\'0.6\' stroke-width=\'1\'/%3E%3C/svg%3E')] opacity-60" />
                    {locations.map((location, index) => (
                      <button
                        type="button"
                        key={location.id}
                        className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 p-2 shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ${
                          activeLocationId === location.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-primary/40 bg-background text-primary hover:border-primary'
                        }`}
                        style={{
                          left: `${location.coordinates?.x ?? defaultCoordinateFallback(index).x}%`,
                          top: `${location.coordinates?.y ?? defaultCoordinateFallback(index).y}%`
                        }}
                        onClick={() => setActiveLocationId(location.id)}
                        onDoubleClick={() => onPlanDropOff?.(location)}
                      >
                        <MapPin size={20} weight={activeLocationId === location.id ? 'fill' : 'regular'} />
                        <span className="absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow group-hover:bg-primary/10">
                          {location.name}
                        </span>
                      </button>
                    ))}
                  </div>

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

              <ScrollArea className="h-[420px] rounded-2xl border border-border/80 bg-background">
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
                        <Button onClick={() => onPlanDropOff?.(location)}>
                          Plan drop-off here
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

      <Card className="border-accent/20 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-h3">How the drop-off flow works</CardTitle>
          <CardDescription>
            Follow these quick steps to finish your donation with a QR hand-off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">1</div>
              <p className="text-body font-medium">Pick a partner location that accepts your item type.</p>
            </div>
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">2</div>
              <p className="text-body font-medium">Continue to the listing form with drop-off details pre-filled.</p>
            </div>
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">3</div>
              <p className="text-body font-medium">Submit your listing to generate a QR code for fast check-in.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
