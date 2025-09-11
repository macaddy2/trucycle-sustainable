import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Heart, MapPin, ArrowsClockwise, Clock, Package, ChatCircle } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { useMessaging } from '@/hooks'
import { InlineMessage } from './messaging'
import { toast } from 'sonner'

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
  ownerId: string
  ownerName: string
  ownerAvatar?: string
}

export function ItemListing({ searchQuery }: ItemListingProps) {
  const [currentUser] = useKV('current-user', null)
  const [items, setItems] = useKV<Item[]>('sample-items', [])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedCondition, setSelectedCondition] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  
  const { createOrGetChat, getChatForItem } = useMessaging()

  // Initialize sample items if empty
  if (items.length === 0) {
    const sampleItems: Item[] = [
      {
        id: 'item_1',
        title: 'Vintage Oak Dining Table',
        description: 'Beautiful solid oak dining table, seats 6 people comfortably. Some minor scratches but structurally sound.',
        category: 'Furniture',
        condition: 'good',
        location: 'Camden, London',
        distance: '2.3 miles',
        type: 'donation',
        photos: [],
        listedDate: '2 days ago',
        co2Impact: 45,
        verified: true,
        ownerId: 'user_donor_1',
        ownerName: 'Sarah Johnson',
        ownerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
      },
      {
        id: 'item_2',
        title: 'Working Laptop - Dell XPS 13',
        description: 'Dell XPS 13 in excellent condition. Perfect for students or remote work. Includes charger.',
        category: 'Electronics',
        condition: 'excellent',
        location: 'Islington, London',
        distance: '1.8 miles',
        type: 'exchange',
        photos: [],
        listedDate: '1 day ago',
        co2Impact: 120,
        verified: true,
        ownerId: 'user_donor_2',
        ownerName: 'Michael Chen',
        ownerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
      },
      {
        id: 'item_3',
        title: 'Designer Winter Coat',
        description: 'Barely worn designer winter coat, size Medium. Perfect for the upcoming season.',
        category: 'Clothing',
        condition: 'excellent',
        location: 'Hackney, London',
        distance: '3.1 miles',
        type: 'sale',
        photos: [],
        listedDate: '5 hours ago',
        co2Impact: 15,
        verified: false,
        ownerId: 'user_donor_3',
        ownerName: 'Emma Thompson',
        ownerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
      }
    ]
    setItems(sampleItems)
  }

  const handleClaimItem = async (item: Item) => {
    if (!currentUser) {
      toast.error('Please sign in to claim items')
      return
    }

    if (currentUser.id === item.ownerId) {
      toast.error('You cannot claim your own item')
      return
    }

    try {
      const chatId = await createOrGetChat(
        item.id,
        item.title,
        item.photos[0],
        item.ownerId,
        item.ownerName,
        item.ownerAvatar,
        currentUser.id,
        currentUser.name,
        currentUser.avatar
      )

      toast.success(`Item claimed! You can now message ${item.ownerName} about pickup details.`)
      setSelectedItem(null)
    } catch (error) {
      toast.error('Failed to claim item. Please try again.')
    }
  }

  const handleStartChat = async (item: Item) => {
    if (!currentUser) {
      toast.error('Please sign in to contact the owner')
      return
    }

    try {
      const chatId = await createOrGetChat(
        item.id,
        item.title,
        item.photos[0],
        item.ownerId,
        item.ownerName,
        item.ownerAvatar,
        currentUser.id,
        currentUser.name,
        currentUser.avatar
      )

      setSelectedItem(null)
    } catch (error) {
      toast.error('Failed to start conversation. Please try again.')
    }
  }

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

                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setSelectedItem(item)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                    
                    {currentUser && currentUser.id !== item.ownerId && (
                      <Button 
                        className="flex-1"
                        onClick={() => handleClaimItem(item)}
                      >
                        {item.type === 'donation' ? 'Claim' : 
                         item.type === 'exchange' ? 'Exchange' : 'Contact'}
                      </Button>
                    )}

                    {currentUser && currentUser.id !== item.ownerId && getChatForItem(item.id) && (
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={() => handleStartChat(item)}
                      >
                        <ChatCircle size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Item Details Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedItem.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                {selectedItem.photos.length > 0 ? (
                  <img 
                    src={selectedItem.photos[0]} 
                    alt={selectedItem.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Package size={64} className="text-muted-foreground" />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-muted-foreground">{selectedItem.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span>{selectedItem.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition:</span>
                      <Badge variant="outline" className={getConditionColor(selectedItem.condition)}>
                        {selectedItem.condition.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge className={getTypeColor(selectedItem.type)}>
                        {selectedItem.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{selectedItem.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance:</span>
                      <span>{selectedItem.distance}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Environmental Impact</h4>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-700 font-medium">
                        -{selectedItem.co2Impact}kg CO₂ saved
                      </p>
                      <p className="text-small text-green-600 mt-1">
                        By choosing this item, you're helping reduce carbon emissions
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Item Owner</h4>
                    <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        {selectedItem.ownerAvatar ? (
                          <img 
                            src={selectedItem.ownerAvatar} 
                            alt={selectedItem.ownerName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-primary-foreground font-medium">
                            {selectedItem.ownerName[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{selectedItem.ownerName}</p>
                        <p className="text-small text-muted-foreground">
                          {selectedItem.verified ? '✓ Verified Member' : 'Community Member'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentUser && currentUser.id !== selectedItem.ownerId && (
                    <div className="space-y-2">
                      <Button 
                        className="w-full"
                        onClick={() => handleClaimItem(selectedItem)}
                      >
                        {selectedItem.type === 'donation' ? 'Claim Item' : 
                         selectedItem.type === 'exchange' ? 'Exchange Item' : 'Contact Owner'}
                      </Button>
                      
                      {getChatForItem(selectedItem.id) && (
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={() => handleStartChat(selectedItem)}
                        >
                          <ChatCircle size={16} className="mr-2" />
                          Continue Conversation
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}