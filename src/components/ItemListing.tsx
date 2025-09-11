import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Heart, MapPin, ArrowsClockwise, Clock, Package } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'

interface ItemListingProps {
  searchQuery: string
}

interface Item {
  id: string
  title: string
  description: string
  category: string
  condition: 'excellent' | 'good' | 'fair' | 'needs-repair'
  location: string
  distance: string
  type: 'exchange' | 'donation' | 'sale'
  photos: string[]
  listedDate: string
  co2Impact: number
  verified: boolean
}

export function ItemListing({ searchQuery }: ItemListingProps) {
  const [items] = useKV<Item[]>('sample-items', [])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedCondition, setSelectedCondition] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  const categories = ['Furniture', 'Electronics', 'Clothing', 'Books', 'Kitchen', 'Sports', 'Garden']
  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'needs-repair', label: 'Needs Repair' }
  ]

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesCondition = selectedCondition === 'all' || item.condition === selectedCondition
    const matchesType = selectedType === 'all' || item.type === selectedType

    return matchesSearch && matchesCategory && matchesCondition && matchesType
  })

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'fair': return 'bg-yellow-100 text-yellow-800'
      case 'needs-repair': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exchange': return <ArrowsClockwise size={16} />
      case 'donation': return <Heart size={16} />
      case 'sale': return <Package size={16} />
      default: return <Package size={16} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exchange': return 'bg-accent text-accent-foreground'
      case 'donation': return 'bg-primary text-primary-foreground'
      case 'sale': return 'bg-secondary text-secondary-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-foreground mb-2">Browse Items</h1>
        <p className="text-body text-muted-foreground">
          Discover sustainable opportunities in your community
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h3">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                {conditions.map(condition => (
                  <SelectItem key={condition.value} value={condition.value}>
                    {condition.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="exchange">Exchange</SelectItem>
                <SelectItem value="donation">Donation</SelectItem>
                <SelectItem value="sale">For Sale</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSelectedCategory('all')
              setSelectedCondition('all')
              setSelectedType('all')
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
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
            <Button>List an Item</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted relative">
                {item.photos.length > 0 ? (
                  <img 
                    src={item.photos[0]} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={48} className="text-muted-foreground" />
                  </div>
                )}
                
                <div className="absolute top-3 left-3 flex space-x-2">
                  <Badge className={getTypeColor(item.type)}>
                    {getTypeIcon(item.type)}
                    <span className="ml-1 capitalize">{item.type}</span>
                  </Badge>
                  {item.verified && (
                    <Badge variant="secondary">✓ Verified</Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-h3 line-clamp-1">{item.title}</h3>
                    <p className="text-small text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getConditionColor(item.condition)}>
                      {item.condition.replace('-', ' ')}
                    </Badge>
                    <div className="flex items-center space-x-1 text-small text-muted-foreground">
                      <MapPin size={14} />
                      <span>{item.distance}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-small text-muted-foreground">
                      <Clock size={14} />
                      <span>{item.listedDate}</span>
                    </div>
                    <div className="text-small text-primary font-medium">
                      -{item.co2Impact}kg CO₂
                    </div>
                  </div>

                  <Button className="w-full">
                    {item.type === 'donation' ? 'Claim' : 
                     item.type === 'exchange' ? 'Exchange' : 'View Details'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}