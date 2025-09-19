import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Clock, Phone, NavigationArrow, Storefront, XCircle } from '@phosphor-icons/react'

export interface DropOffLocation {
  id: string
  name: string
  address: string
  postcode: string
  distance: string
  openHours: string
  phone: string
  acceptedItems: string[]
  specialServices: string[]
}

interface DropOffLocationSelectorProps {
  selectedLocation: DropOffLocation | null
  onSelect: (location: DropOffLocation) => void
  onClose: () => void
}

const SAMPLE_LOCATIONS: DropOffLocation[] = [
  {
    id: 'loc-1',
    name: 'Camden Circular Hub',
    address: '145 Camden High Street, London',
    postcode: 'NW1 7JX',
    distance: '0.5 miles',
    openHours: 'Mon-Sat 9:00 - 19:00',
    phone: '020 7946 0123',
    acceptedItems: ['Clothing', 'Books', 'Small Electronics'],
    specialServices: ['Same-day donation receipt', 'Textile recycling bin']
  },
  {
    id: 'loc-2',
    name: 'Greenway Reuse Depot',
    address: '28 Holloway Road, London',
    postcode: 'N7 8JL',
    distance: '1.2 miles',
    openHours: 'Daily 8:00 - 20:00',
    phone: '020 7450 2200',
    acceptedItems: ['Furniture', 'Appliances', 'DIY Tools'],
    specialServices: ['Large item assistance', 'Evening drop-off slots']
  },
  {
    id: 'loc-3',
    name: 'Shoreditch Sharing Space',
    address: '92 Brick Lane, London',
    postcode: 'E1 6RL',
    distance: '2.4 miles',
    openHours: 'Wed-Sun 10:00 - 18:00',
    phone: '020 7301 0099',
    acceptedItems: ['Home Decor', 'Art Supplies', 'Bikes'],
    specialServices: ['Weekend workshops', 'Secure bike storage']
  }
]

export function DropOffLocationSelector({ selectedLocation, onSelect, onClose }: DropOffLocationSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm p-4 md:p-10 overflow-y-auto">
      <Card className="w-full max-w-5xl shadow-2xl border-primary/30">
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-h2 flex items-center space-x-2">
              <Storefront size={28} className="text-primary" />
              <span>Select a drop-off partner</span>
            </CardTitle>
            <CardDescription>
              Choose a trusted TruCycle partner location that best matches your item and travel plans.
            </CardDescription>
          </div>
          <Button variant="ghost" onClick={onClose} className="self-end md:self-start">
            <XCircle size={22} className="mr-2" /> Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="aspect-video bg-muted rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/20" />
            <div className="relative z-10 flex h-full items-center justify-center">
              <div className="text-center max-w-md space-y-2">
                <MapPin size={40} className="mx-auto text-primary" />
                <h3 className="text-h3">Interactive map coming soon</h3>
                <p className="text-sm text-muted-foreground">
                  Explore the featured partner list below to secure your drop-off spot.
                </p>
              </div>
            </div>
            {/* Decorative pins */}
            <div className="absolute top-1/4 left-1/3 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-lg" />
            <div className="absolute bottom-1/4 right-1/4 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-secondary shadow-lg" />
            <div className="absolute top-2/3 right-1/3 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-lg" />
          </div>

          <ScrollArea className="h-[360px] pr-4">
            <div className="grid grid-cols-1 gap-4">
              {SAMPLE_LOCATIONS.map(location => (
                <Card
                  key={location.id}
                  className={`transition-all ${
                    selectedLocation?.id === location.id ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'hover:border-primary/50'
                  }`}
                >
                  <CardContent className="space-y-4 p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold flex items-center gap-2">
                          {location.name}
                          {selectedLocation?.id === location.id && (
                            <Badge variant="secondary">Selected</Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin size={16} />
                          <span>{location.address}</span>
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                          <span>Postcode: {location.postcode}</span>
                          <span>Distance: {location.distance}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground min-w-[180px]">
                        <span className="flex items-center gap-2">
                          <Clock size={16} /> {location.openHours}
                        </span>
                        <span className="flex items-center gap-2">
                          <Phone size={16} /> {location.phone}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Accepted Items
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {location.acceptedItems.map(item => (
                          <Badge key={item} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {location.specialServices.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Amenities & Services
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {location.specialServices.map(service => (
                            <Badge key={service} className="bg-primary/10 text-primary">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-between">
                      <Button variant="ghost" size="sm" className="justify-start md:justify-center">
                        <NavigationArrow size={16} className="mr-2" />
                        Get directions
                      </Button>
                      <Button onClick={() => onSelect(location)}>
                        {selectedLocation?.id === location.id ? 'Keep this location' : 'Select this partner'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
