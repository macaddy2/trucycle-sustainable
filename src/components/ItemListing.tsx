import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Heart, MapPin, ArrowsClockwise, Clock, Package, ChatCircle, Recycle } from '@phosphor-icons/react'
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
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  location: string
  distance?: string
  actionType: 'exchange' | 'donate' | 'recycle'
  photos: string[]
  createdAt: string
  listedDate?: string
  co2Impact?: number
  verified?: boolean
  userId: string
  userName: string
  ownerName?: string
  ownerId?: string
  ownerAvatar?: string
  status: string
  views: number
  interested: string[]
}

export function ItemListing({ searchQuery }: ItemListingProps) {
  const [currentUser] = useKV('current-user', null)
  const [globalListings] = useKV<Item[]>('global-listings', [])
  const [items, setItems] = useState<Item[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedCondition, setSelectedCondition] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  
  const { createOrGetChat, getChatForItem } = useMessaging()

  // Initialize with sample items and global listings
  useEffect(() => {
    const sampleItems: Item[] = [
      {
        id: 'item_1',
        title: 'Vintage Oak Dining Table',
        description: 'Beautiful solid oak dining table, seats 6 people comfortably. Some minor scratches but structurally sound.',
        category: 'furniture',
        condition: 'good',
        location: 'Camden, London',
        distance: '2.3 miles',
        actionType: 'donate',
        photos: [],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        listedDate: '2 days ago',
        co2Impact: 45,
        verified: true,
        userId: 'user_donor_1',
        userName: 'Sarah Johnson',
        ownerId: 'user_donor_1',
        ownerName: 'Sarah Johnson',
        ownerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        status: 'active',
        views: 12,
        interested: []
      },
      {
        id: 'item_2',
        title: 'Working Laptop - Dell XPS 13',
        description: 'Dell XPS 13 in excellent condition. Perfect for students or remote work. Includes charger.',
        category: 'electronics',
        condition: 'excellent',
        location: 'Islington, London',
        distance: '1.8 miles',
        actionType: 'exchange',
        photos: [],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        listedDate: '1 day ago',
        co2Impact: 120,
        verified: true,
        userId: 'user_donor_2',
        userName: 'Michael Chen',
        ownerId: 'user_donor_2',
        ownerName: 'Michael Chen',
        ownerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        status: 'active',
        views: 8,
        interested: []
      },
      {
        id: 'item_3',
        title: 'Designer Winter Coat',
        description: 'Barely worn designer winter coat, size Medium. Perfect for the upcoming season.',
        category: 'clothing',
        condition: 'excellent',
        location: 'Hackney, London',
        distance: '3.1 miles',
        actionType: 'exchange',
        photos: [],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        listedDate: '5 hours ago',
        co2Impact: 15,
        verified: false,
        userId: 'user_donor_3',
        userName: 'Emma Thompson',
        ownerId: 'user_donor_3',
        ownerName: 'Emma Thompson',
        ownerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        status: 'active',
        views: 3,
        interested: []
      }
    ]

    // Combine sample items with global listings
    const allItems = [...sampleItems, ...globalListings]
    setItems(allItems)
  }, [globalListings])

  const handleClaimItem = async (item: Item) => {
    if (!currentUser) {
      toast.error('Please sign in to claim items')
      return
    }

    if (currentUser.id === (item.ownerId || item.userId)) {
      toast.error('You cannot claim your own item')
      return
    }

    try {
      const chatId = await createOrGetChat(
        item.id,
        item.title,
        item.photos[0],
        item.ownerId || item.userId,
        item.ownerName || item.userName,
        item.ownerAvatar,
        currentUser.id,
        currentUser.name,
        currentUser.avatar
      )

      toast.success(`Item claimed! You can now message ${item.ownerName || item.userName} about pickup details.`)
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
        item.ownerId || item.userId,
        item.ownerName || item.userName,
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

  const categories = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Kitchen Items', 'Garden Tools', 'Sports Equipment', 'Toys & Games', 'Home Decor', 'Other']
  const conditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' }
  ]

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesCondition = selectedCondition === 'all' || item.condition === selectedCondition
    const matchesType = selectedType === 'all' || item.actionType === selectedType

    return matchesSearch && matchesCategory && matchesCondition && matchesType
  })

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'fair': return 'bg-yellow-100 text-yellow-800'
      case 'poor': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'exchange': return <ArrowsClockwise size={16} />
      case 'donate': return <Heart size={16} />
      case 'recycle': return <Recycle size={16} />
      default: return <Package size={16} />
    }
  }

  const getTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'exchange': return 'bg-accent text-accent-foreground'
      case 'donate': return 'bg-primary text-primary-foreground'
      case 'recycle': return 'bg-secondary text-secondary-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
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
                <SelectItem value="donate">Donate</SelectItem>
                <SelectItem value="recycle">Recycle</SelectItem>
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
                  <Badge className={getTypeColor(item.actionType)}>
                    {getTypeIcon(item.actionType)}
                    <span className="ml-1 capitalize">{item.actionType}</span>
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
                      <span>{item.listedDate || formatTimeAgo(item.createdAt)}</span>
                    </div>
                    <div className="text-small text-primary font-medium">
                      -{item.co2Impact || 5}kg CO₂
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
                    
                    {currentUser && currentUser.id !== (item.ownerId || item.userId) && (
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
                      <Badge className={getTypeColor(selectedItem.actionType)}>
                        {selectedItem.actionType}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{selectedItem.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance:</span>
                      <span>{selectedItem.distance || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Environmental Impact</h4>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-700 font-medium">
                        -{selectedItem.co2Impact || 5}kg CO₂ saved
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
                            alt={selectedItem.ownerName || selectedItem.userName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-primary-foreground font-medium">
                            {(selectedItem.ownerName || selectedItem.userName)[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{selectedItem.ownerName || selectedItem.userName}</p>
                        <p className="text-small text-muted-foreground">
                          {selectedItem.verified ? '✓ Verified Member' : 'Community Member'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentUser && currentUser.id !== (selectedItem.ownerId || selectedItem.userId) && (
                    <div className="space-y-2">
                      <Button 
                        className="w-full"
                        onClick={() => handleClaimItem(selectedItem)}
                      >
                        {selectedItem.actionType === 'donate' ? 'Claim Item' : 
                         selectedItem.actionType === 'exchange' ? 'Exchange Item' : 
                         selectedItem.actionType === 'recycle' ? 'Request Pickup' : 'Contact Owner'}
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