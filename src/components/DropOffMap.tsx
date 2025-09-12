import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, Phone, NavigationArrow } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'

interface DropOffLocation {
  id: string
  name: string
  address: string
  postcode: string
  distance: string
  openHours: string
  phone: string
  acceptedItems: string[]
  specialServices: string[]
  coordinates: { lat: number; lng: number }
  verified: boolean
}

export function DropOffMap() {
  const [locations] = useKV<DropOffLocation[]>('dropoff-locations', [])

  const getServiceBadgeColor = (service: string) => {
    switch (service.toLowerCase()) {
      case 'electronics recycling': return 'bg-blue-100 text-blue-800'
      case 'furniture collection': return 'bg-green-100 text-green-800'
      case 'large items': return 'bg-purple-100 text-purple-800'
      case 'hazardous waste': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-foreground mb-2 flex items-center space-x-2">
          <MapPin size={32} className="text-primary" />
          <span>Drop-off Locations</span>
        </h1>
        <p className="text-body text-muted-foreground">
          Find partner locations near you for item drop-offs and collections
        </p>
      </div>

      {/* Map Placeholder */}
      <Card>
        <CardContent className="p-0">
          <div className="aspect-video bg-muted relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
              <div className="text-center">
                <MapPin size={48} className="text-primary mx-auto mb-4" />
                <h3 className="text-h3 mb-2">Interactive Map Coming Soon</h3>
                <p className="text-body text-muted-foreground">
                  Browse locations below or use the location finder
                </p>
              </div>
            </div>
            
            {/* Simulated map pins */}
            <div className="absolute top-1/4 left-1/3 w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="absolute top-1/2 right-1/4 w-6 h-6 bg-accent rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="absolute bottom-1/3 left-1/2 w-6 h-6 bg-secondary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location List */}
      {locations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-h3 mb-2">No locations found</h3>
            <p className="text-body text-muted-foreground mb-4">
              We're working on adding partner locations in your area
            </p>
            <Button>Request New Location</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.map((location) => (
            <Card key={location.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-h3 flex items-center space-x-2">
                      <span>{location.name}</span>
                      {location.verified && (
                        <Badge variant="secondary" className="ml-2">✓ Verified</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-1 mt-1">
                      <MapPin size={14} />
                      <span>{location.distance} away</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Address */}
                <div>
                  <p className="text-body">{location.address}</p>
                  <p className="text-small text-muted-foreground">{location.postcode}</p>
                </div>

                {/* Hours and Contact */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-1 text-small text-muted-foreground">
                    <Clock size={14} />
                    <span>{location.openHours}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-small text-muted-foreground">
                    <Phone size={14} />
                    <span>{location.phone}</span>
                  </div>
                </div>

                {/* Accepted Items */}
                <div>
                  <p className="text-small font-medium mb-2">Accepted Items:</p>
                  <div className="flex flex-wrap gap-1">
                    {location.acceptedItems.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Special Services */}
                {location.specialServices.length > 0 && (
                  <div>
                    <p className="text-small font-medium mb-2">Special Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {location.specialServices.map((service, index) => (
                        <Badge 
                          key={index} 
                          className={getServiceBadgeColor(service)}
                        >
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" className="flex-1">
                    <NavigationArrow size={16} className="mr-2" />
                    Directions
                  </Button>
                  <Button className="flex-1">
                    Select Location
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="text-h3">Drop-off Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-small font-bold">
                1
              </div>
              <p className="text-body">
                Select a location that accepts your type of item
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-small font-bold">
                2
              </div>
              <p className="text-body">
                Ensure your item is clean and in the described condition
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-small font-bold">
                3
              </div>
              <p className="text-body">
                Bring your QR code (generated after item is claimed) to the location
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-small font-bold">
                4
              </div>
              <p className="text-body">
                Staff will scan your code and provide a receipt for your environmental impact
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}