import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { 
  User, 
  Leaf, 
  Package, 
  Heart, 
  ArrowsClockwise, 
  Star, 
  Settings, 
  Award, 
  SignOut,
  ChatCircle,
  Bell,
  Shield,
  CheckCircle,
  QrCode
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { AuthDialog } from './auth/AuthDialog'
import { ProfileOnboarding } from './auth/ProfileOnboarding'
import { useMessaging, useInitializeSampleData } from '@/hooks'
import { VerificationBadge, VerificationLevel } from './VerificationBadge'
import { RatingDisplay, RatingList, useUserRatingStats } from './RatingSystem'
import { VerificationCenter } from './VerificationCenter'
import { QRCodeDisplay, QRCodeData } from './QRCode'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  name: string
  email: string
  userType: 'donor' | 'collector'
  postcode?: string
  createdAt: string
  onboardingCompleted?: boolean
  avatar?: string
  verified?: boolean
  rating?: number
  verificationLevel?: {
    email: boolean
    phone: boolean
    identity: boolean
    address: boolean
    payment: boolean
    community: boolean
  }
}

interface UserStats {
  itemsListed: number
  itemsDonated: number
  itemsCollected: number
  co2Saved: number
  reviews: number
  successfulExchanges: number
}

interface Activity {
  id: string
  type: 'listed' | 'donated' | 'collected' | 'exchange'
  item: string
  date: string
  status: 'completed' | 'pending' | 'in-progress'
  co2Impact: number
}

export function ProfileDashboard() {
  const [user, setUser] = useKV('current-user', null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [selectedQRCode, setSelectedQRCode] = useState<QRCodeData | null>(null)
  const [userQRCodes] = useKV<QRCodeData[]>('user-qr-codes', [])
  
  const { chats, getTotalUnreadCount } = useMessaging()
  const { initializeSampleChats } = useInitializeSampleData()

  // Initialize sample data when user is signed in
  useEffect(() => {
    if (user) {
      initializeSampleChats()
    }
  }, [user])

  // Get user rating statistics
  const ratingStats = useUserRatingStats(user?.id || '')

  const [stats] = useKV<UserStats>('user-stats', {
    itemsListed: 0,
    itemsDonated: 0,
    itemsCollected: 0,
    co2Saved: 0,
    reviews: 0,
    successfulExchanges: 0
  })

  const [activities] = useKV<Activity[]>('user-activities', [])
  const [userRatings] = useKV('user-ratings', [])

  const handleSignOut = () => {
    setUser(null)
    toast.success('Signed out successfully')
  }

  const handleAuthComplete = () => {
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    toast.success('Welcome to TruCycle! You can now start listing and browsing items.')
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'listed': return <Package size={16} />
      case 'donated': return <Heart size={16} />
      case 'collected': return <Package size={16} />
      case 'exchange': return <ArrowsClockwise size={16} />
      default: return <Package size={16} />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'listed': return 'bg-blue-100 text-blue-800'
      case 'donated': return 'bg-green-100 text-green-800'
      case 'collected': return 'bg-purple-100 text-purple-800'
      case 'exchange': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // If no user is signed in, show welcome/setup screen
  if (!user) {
    return (
      <>
        <div className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-primary" />
              </div>
              <h1 className="text-h1 mb-2">Welcome to TruCycle!</h1>
              <p className="text-body text-muted-foreground mb-6">
                Create your profile to start exchanging items and tracking your environmental impact
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => {
                    setAuthMode('signup')
                    setShowAuthDialog(true)
                  }}
                >
                  Create Account
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setAuthMode('signin')
                    setShowAuthDialog(true)
                  }}
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-h3">Getting Started</CardTitle>
              <CardDescription>
                Here's what you can do once you create your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Package size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">List Items</p>
                    <p className="text-small text-muted-foreground">
                      Upload items you want to exchange or donate
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                    <ArrowsClockwise size={20} className="text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Find Items</p>
                    <p className="text-small text-muted-foreground">
                      Browse and claim items from other users
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                    <Leaf size={20} className="text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium">Track Impact</p>
                    <p className="text-small text-muted-foreground">
                      Monitor your CO₂ savings and earn achievements
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <AuthDialog 
          open={showAuthDialog} 
          onOpenChange={setShowAuthDialog}
          initialMode={authMode}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-h1 text-foreground mb-2">Profile Dashboard</h1>
            <p className="text-body text-muted-foreground">
              Manage your account and track your sustainability journey
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="flex items-center space-x-2">
            <SignOut size={16} />
            <span>Sign Out</span>
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <ChatCircle size={16} />
              <span>Messages</span>
              {getTotalUnreadCount() > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">
                  {getTotalUnreadCount()}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="qrcodes" className="flex items-center space-x-2">
              <QrCode size={16} />
              <span>QR Codes</span>
              {userQRCodes.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {userQRCodes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ratings" className="flex items-center space-x-2">
              <Star size={16} />
              <span>Ratings</span>
              {ratingStats.totalRatings > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">
                  {ratingStats.totalRatings}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Info */}
              <Card className="lg:col-span-1">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <Avatar className="w-20 h-20 mx-auto">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-lg">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="text-h3 flex items-center justify-center space-x-2">
                        <span>{user.name}</span>
                      </h3>
                      <div className="flex items-center justify-center space-x-2 mt-2">
                        <VerificationBadge 
                          verified={user.verificationLevel || {
                            email: true,
                            phone: false,
                            identity: false,
                            address: true,
                            payment: false,
                            community: stats.successfulExchanges >= 5
                          }}
                          variant="compact"
                        />
                      </div>
                      <p className="text-small text-muted-foreground capitalize mt-1">
                        {user.userType} • {user.postcode || 'Location not set'}
                      </p>
                      
                      {/* Rating Display */}
                      <div className="mt-3">
                        <RatingDisplay
                          rating={ratingStats.averageRating || 5.0}
                          totalRatings={ratingStats.totalRatings || 0}
                          size="md"
                          className="justify-center"
                        />
                        {ratingStats.totalRatings > 0 && (
                          <div className="flex justify-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span>Communication: {(ratingStats.categoryAverages?.communication || 5.0).toFixed(1)}</span>
                            <span>Punctuality: {(ratingStats.categoryAverages?.punctuality || 5.0).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Button variant="outline" className="w-full">
                      <Settings size={16} className="mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Overview */}
              <div className="lg:col-span-2 space-y-6">
                {/* Impact Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Leaf size={20} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-small text-muted-foreground">CO₂ Saved</p>
                          <p className="text-h3 font-bold text-primary">{stats.co2Saved}kg</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                          <ArrowsClockwise size={20} className="text-accent" />
                        </div>
                        <div>
                          <p className="text-small text-muted-foreground">Exchanges</p>
                          <p className="text-h3 font-bold text-accent">{stats.successfulExchanges}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                          <ChatCircle size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-small text-muted-foreground">Active Chats</p>
                          <div className="flex items-center space-x-2">
                            <p className="text-h3 font-bold text-blue-600">{chats.length}</p>
                            {getTotalUnreadCount() > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {getTotalUnreadCount()} new
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-h3">Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-h3 font-bold text-blue-600">{stats.itemsListed}</p>
                        <p className="text-small text-muted-foreground">Items Listed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-h3 font-bold text-green-600">{stats.itemsDonated}</p>
                        <p className="text-small text-muted-foreground">Items Donated</p>
                      </div>
                      <div className="text-center">
                        <p className="text-h3 font-bold text-purple-600">{stats.itemsCollected}</p>
                        <p className="text-small text-muted-foreground">Items Collected</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3 flex items-center space-x-2">
                  <ChatCircle size={20} />
                  <span>Messages</span>
                </CardTitle>
                <CardDescription>
                  Conversations about your items and exchanges
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chats.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <ChatCircle size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-body text-muted-foreground mb-4">
                      No conversations yet. Start by claiming an item!
                    </p>
                    <Button>Browse Items</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chats.map((chat) => (
                      <div key={chat.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={
                              user.id === chat.donorId ? chat.collectorAvatar : chat.donorAvatar
                            } />
                            <AvatarFallback>
                              {(user.id === chat.donorId ? chat.collectorName : chat.donorName)[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.id === chat.donorId ? chat.collectorName : chat.donorName}
                            </p>
                            <p className="text-small text-muted-foreground">
                              About: {chat.itemTitle}
                            </p>
                            {chat.lastMessage && (
                              <p className="text-small text-muted-foreground truncate max-w-md">
                                {chat.lastMessage.senderName === user.name ? 'You: ' : ''}
                                {chat.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={chat.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {chat.status.replace('_', ' ')}
                          </Badge>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {chat.unreadCount} new
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {chat.lastMessage 
                              ? new Date(chat.lastMessage.timestamp).toLocaleDateString()
                              : new Date(chat.createdAt).toLocaleDateString()
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratings">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Rating Summary */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-h3 flex items-center space-x-2">
                    <Star size={20} />
                    <span>Rating Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <RatingDisplay
                      rating={ratingStats.averageRating || 5.0}
                      totalRatings={ratingStats.totalRatings || 0}
                      size="lg"
                      className="justify-center"
                    />
                  </div>

                  {/* Rating Distribution */}
                  {ratingStats.totalRatings > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Rating Breakdown</h4>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center space-x-2 text-sm">
                          <span className="w-8">{rating}★</span>
                          <Progress 
                            value={(ratingStats.ratingDistribution[rating as keyof typeof ratingStats.ratingDistribution] / ratingStats.totalRatings) * 100} 
                            className="flex-1 h-2" 
                          />
                          <span className="w-8 text-muted-foreground">
                            {ratingStats.ratingDistribution[rating as keyof typeof ratingStats.ratingDistribution]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Category Averages */}
                  {ratingStats.totalRatings > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Category Scores</h4>
                      {[
                        { label: 'Communication', value: ratingStats.categoryAverages?.communication || 0 },
                        { label: 'Punctuality', value: ratingStats.categoryAverages?.punctuality || 0 },
                        { label: 'Item Condition', value: ratingStats.categoryAverages?.itemCondition || 0 },
                        { label: 'Politeness', value: ratingStats.categoryAverages?.politeness || 0 }
                      ].map((category) => (
                        <div key={category.label} className="flex items-center justify-between text-sm">
                          <span>{category.label}</span>
                          <div className="flex items-center space-x-1">
                            <Star size={14} className="text-yellow-500 fill-current" />
                            <span className="font-medium">{category.value.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Verification Status */}
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Trust & Verification</h4>
                    <VerificationBadge 
                      verified={user.verificationLevel || {
                        email: true,
                        phone: false,
                        identity: false,
                        address: true,
                        payment: false,
                        community: stats.successfulExchanges >= 5
                      }}
                      variant="detailed"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Reviews List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-h3">Reviews</CardTitle>
                    <CardDescription>
                      What others say about exchanging with {user.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RatingList
                      userId={user.id}
                      ratings={userRatings}
                      showAll={false}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qrcodes">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-h3 flex items-center space-x-2">
                    <QrCode size={20} />
                    <span>Your QR Codes</span>
                  </CardTitle>
                  <CardDescription>
                    Manage drop-off and pickup QR codes for your transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userQRCodes.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <QrCode size={32} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-h3 mb-2">No QR codes yet</h3>
                      <p className="text-muted-foreground mb-4">
                        QR codes will appear here when you generate them during transactions
                      </p>
                      <p className="text-small text-muted-foreground">
                        Start a conversation with another user and use the "Generate QR Code" action
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userQRCodes.map((qrCode) => {
                        const expiryDate = new Date(qrCode.metadata.expiresAt)
                        const isExpired = new Date() > expiryDate
                        const timeUntilExpiry = expiryDate.getTime() - Date.now()
                        const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60))

                        return (
                          <Card key={qrCode.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge 
                                    variant={qrCode.type === 'donor' ? 'default' : 'secondary'}
                                    className="capitalize"
                                  >
                                    {qrCode.type}
                                  </Badge>
                                  <Badge 
                                    variant={
                                      isExpired ? 'destructive' : 
                                      qrCode.status === 'active' ? 'default' : 
                                      'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {isExpired ? 'Expired' : qrCode.status}
                                  </Badge>
                                </div>

                                <div>
                                  <h4 className="font-medium text-sm line-clamp-1">{qrCode.itemTitle}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ID: {qrCode.transactionId}
                                  </p>
                                </div>

                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <div className="flex items-center justify-between">
                                    <span>Category:</span>
                                    <span className="capitalize">{qrCode.metadata.category}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>CO₂ Impact:</span>
                                    <span className="text-green-600">-{qrCode.metadata.co2Impact}kg</span>
                                  </div>
                                  {!isExpired && (
                                    <div className="flex items-center justify-between">
                                      <span>Expires:</span>
                                      <span className={hoursUntilExpiry < 2 ? 'text-red-600' : ''}>
                                        {hoursUntilExpiry < 1 ? 'Soon' : `${hoursUntilExpiry}h`}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => setSelectedQRCode(qrCode)}
                                  disabled={isExpired}
                                >
                                  {isExpired ? 'Expired' : 'View QR Code'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QR Code Instructions */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-h3">How QR Codes Work</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center space-x-2">
                        <Badge variant="default">Donor</Badge>
                        <span>Drop-off Process</span>
                      </h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>1. Generate a drop-off QR code during conversation</p>
                        <p>2. Take your item to the selected partner shop</p>
                        <p>3. Show the QR code to the shop attendant</p>
                        <p>4. Shop attendant scans and confirms receipt</p>
                        <p>5. Collector is notified that item is available for pickup</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 flex items-center space-x-2">
                        <Badge variant="secondary">Collector</Badge>
                        <span>Pickup Process</span>
                      </h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>1. Generate a pickup QR code during conversation</p>
                        <p>2. Wait for donor to drop off item at partner shop</p>
                        <p>3. Visit the partner shop when notified</p>
                        <p>4. Show your QR code to the shop attendant</p>
                        <p>5. Shop attendant verifies and releases item to you</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Recent Activity</CardTitle>
                <CardDescription>
                  Your latest exchanges, donations, and listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-body text-muted-foreground mb-4">
                      No activity yet. Start by listing or browsing items!
                    </p>
                    <Button>Browse Items</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Badge className={getActivityColor(activity.type)}>
                            {getActivityIcon(activity.type)}
                            <span className="ml-1 capitalize">{activity.type}</span>
                          </Badge>
                          <div>
                            <p className="font-medium">{activity.item}</p>
                            <p className="text-small text-muted-foreground">{activity.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(activity.status)}>
                            {activity.status}
                          </Badge>
                          <p className="text-small text-muted-foreground mt-1">
                            -{activity.co2Impact}kg CO₂
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Achievements</CardTitle>
                <CardDescription>
                  Your sustainability milestones and badges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-body text-muted-foreground mb-4">
                    Your achievements will appear here as you use TruCycle
                  </p>
                  <Button variant="outline">View All Achievements</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-h3">Account Settings</CardTitle>
                  <CardDescription>
                    Manage your preferences and account information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Profile Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Profile Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Display Name</Label>
                          <div className="text-sm text-muted-foreground">{user.name}</div>
                        </div>
                        <div>
                          <Label>Email Address</Label>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                        <div>
                          <Label>User Type</Label>
                          <div className="text-sm text-muted-foreground capitalize">{user.userType}</div>
                        </div>
                        <div>
                          <Label>Location</Label>
                          <div className="text-sm text-muted-foreground">{user.postcode || 'Not set'}</div>
                        </div>
                      </div>
                      <Button variant="outline">Edit Profile</Button>
                    </div>

                    {/* Notification Preferences */}
                    <div className="space-y-4 pt-6 border-t">
                      <h4 className="font-medium">Notification Preferences</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Email Notifications</p>
                            <p className="text-xs text-muted-foreground">Receive updates about your exchanges</p>
                          </div>
                          <Button variant="outline" size="sm">Enabled</Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">SMS Notifications</p>
                            <p className="text-xs text-muted-foreground">Get text updates for urgent messages</p>
                          </div>
                          <Button variant="outline" size="sm">Disabled</Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Marketing Communications</p>
                            <p className="text-xs text-muted-foreground">Tips and platform updates</p>
                          </div>
                          <Button variant="outline" size="sm">Enabled</Button>
                        </div>
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="space-y-4 pt-6 border-t">
                      <h4 className="font-medium">Privacy Settings</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Profile Visibility</p>
                            <p className="text-xs text-muted-foreground">Who can see your profile information</p>
                          </div>
                          <Button variant="outline" size="sm">Community</Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Location Sharing</p>
                            <p className="text-xs text-muted-foreground">Share approximate location in listings</p>
                          </div>
                          <Button variant="outline" size="sm">Enabled</Button>
                        </div>
                      </div>
                    </div>

                    {/* Account Actions */}
                    <div className="space-y-4 pt-6 border-t">
                      <h4 className="font-medium">Account Actions</h4>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          <Settings size={16} className="mr-2" />
                          Download My Data
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                          <SignOut size={16} className="mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Center */}
              <VerificationCenter
                userId={user.id}
                currentVerification={user.verificationLevel || {
                  email: true,
                  phone: false,
                  identity: false,
                  address: true,
                  payment: false,
                  community: stats.successfulExchanges >= 5
                }}
                onVerificationUpdate={(verification) => {
                  setUser((prev: any) => ({ ...prev, verificationLevel: verification }))
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ProfileOnboarding 
        open={showOnboarding} 
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />

      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={(open) => {
          setShowAuthDialog(open)
          if (!open) {
            handleAuthComplete()
          }
        }}
        initialMode={authMode}
      />

      {/* QR Code Display Dialog */}
      {selectedQRCode && (
        <QRCodeDisplay
          qrData={selectedQRCode}
          onClose={() => setSelectedQRCode(null)}
        />
      )}
    </>
  )
}