export interface DropOffLocation {
  id: string
  name: string
  address: string
  postcode: string
  distance: string
  openHours: string
  phone: string
  contactEmail?: string
  acceptedItems: string[]
  specialServices: string[]
  coordinates: { lat: number; lng: number }
}

export const DROP_OFF_LOCATIONS: DropOffLocation[] = [
  {
    id: 'loc-1',
    name: 'Camden Circular Hub',
    address: '145 Camden High Street, London',
    postcode: 'NW1 7JX',
    distance: '0.5 miles',
    openHours: 'Mon-Sat 9:00 - 19:00',
    phone: '020 7946 0123',
    contactEmail: 'hello@camdencircularhub.uk',
    acceptedItems: ['Clothing', 'Books', 'Small Electronics'],
    specialServices: ['Same-day donation receipt', 'Textile recycling bin'],
    coordinates: { lat: 51.5416, lng: -0.143 }
  },
  {
    id: 'loc-2',
    name: 'Greenway Reuse Depot',
    address: '28 Holloway Road, London',
    postcode: 'N7 8JL',
    distance: '1.2 miles',
    openHours: 'Daily 8:00 - 20:00',
    phone: '020 7450 2200',
    contactEmail: 'care@greenwayreuse.org',
    acceptedItems: ['Furniture', 'Appliances', 'DIY Tools'],
    specialServices: ['Large item assistance', 'Evening drop-off slots'],
    coordinates: { lat: 51.5521, lng: -0.1139 }
  },
  {
    id: 'loc-3',
    name: 'Shoreditch Sharing Space',
    address: '92 Brick Lane, London',
    postcode: 'E1 6RL',
    distance: '2.4 miles',
    openHours: 'Wed-Sun 10:00 - 18:00',
    phone: '020 7301 0099',
    contactEmail: 'team@shoreditchsharing.co.uk',
    acceptedItems: ['Home Decor', 'Art Supplies', 'Bikes'],
    specialServices: ['Weekend workshops', 'Secure bike storage'],
    coordinates: { lat: 51.521, lng: -0.0713 }
  }
]
