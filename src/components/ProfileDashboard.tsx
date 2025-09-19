import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Package,
  ArrowsClockwise,
  SignOut,
  CheckCircle,
  ChatCircle,
  Shield,
  QrCode,
  Sparkles,
  Heart,
  User
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { AuthDialog } from './auth/AuthDialog'
import { ProfileOnboarding } from './auth/ProfileOnboarding'
import { useMessaging, useInitializeSampleData, useRecommendationNotifications } from '@/hooks'
import { VerificationBadge, VerificationLevel } from './VerificationBadge'
import { RatingDisplay, RatingList, useUserRatingStats } from './RatingSystem'
import { VerificationCenter } from './VerificationCenter'
import { QRCodeDisplay } from './QRCode'
import { NotificationList } from './NotificationList'

interface UserProfile {
  id: string
  name: string
  email: string
  userType: 'donor' | 'collector'
  onboardingCompleted: boolean
  rating?: number
  verificationLevel: {
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
  successfulExchanges: number
  co2Saved: number
  reviews: number
}

interface Activity {
  type: 'listed' | 'donated' | 'collected' | 'exchange'
  title: string
  date: string
  status: 'completed' | 'pending' | 'in-progress'
  co2Impact: number
}

interface QRCodeData {
  id: string
  transactionId: string
  type: 'pickup' | 'dropoff'
  itemTitle: string
  createdAt: string
  expiresAt: string
  co2Impact: number
  status: 'active' | 'expired' | 'used'
}

export function ProfileDashboard() {
  const [currentTab, setCurrentTab] = useState('overview')
  const [user, setUser] = useKV<UserProfile | null>('current-user', null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [selectedQRCode, setSelectedQRCode] = useState<QRCodeData | null>(null)
  const [userQRCodes] = useKV<QRCodeData[]>('user-qr-codes', [])
  
  const { chats, getTotalUnreadCount } = useMessaging()
  const { notifications: recomNotifications, unreadCount } = useRecommendationNotifications(user)
  
  // Initialize sample data when user logs in
  const { initializeSampleChats } = useInitializeSampleData()
  useEffect(() => {
    if (user) {
      initializeSampleChats()
    }
  }, [user, initializeSampleChats])

  const [stats] = useKV<UserStats>('user-stats', {
    itemsListed: 12,
    itemsDonated: 8,
    itemsCollected: 15,
    co2Saved: 847,
    successfulExchanges: 23,
    reviews: 18
  })

  const userRatingStats = useUserRatingStats(user?.id || 'demo-user')
  const ratingStats = userRatingStats.totalRatings > 0 ? {
    averageRating: userRatingStats.averageRating,
    totalRatings: userRatingStats.totalRatings,
    categoryBreakdown: {
      punctuality: userRatingStats.categoryAverages.punctuality,
      communication: userRatingStats.categoryAverages.communication,
      itemCondition: userRatingStats.categoryAverages.itemCondition
    }
  } : {
    averageRating: 4.8,
    totalRatings: 15,
    categoryBreakdown: {
      punctuality: 4.9,
      communication: 4.7,
      itemCondition: 4.8
    }
  }

  const handleSignOut = () => {
    setUser(null)
    toast.success('Signed out successfully')
  }

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true)
    }
  }, [user])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  const handleToggleUserType = async () => {
    if (!user) return

    const newUserType = user.userType === 'collector' ? 'donor' : 'collector'
    const updatedUser = {
      ...user,
      userType: newUserType
    }

    setUser(updatedUser)
    
    // Show confirmation message
    toast.success(
      `Profile switched to ${newUserType.charAt(0).toUpperCase() + newUserType.slice(1)}`,
      {
        description: `You'll now see ${newUserType === 'collector' ? 'item recommendations' : 'community needs'} tailored for your new profile type.`
      }
    )

    // Switch to recommendations tab to show the difference
    setCurrentTab('recommendations')

    // Generate sample demonstration notification for the new profile type
    const demoNotification = {
      id: `demo-${Date.now()}`,
      userId: user.id,
      type: newUserType === 'collector' ? 'item_match' : 'community_need',
      title: newUserType === 'collector' 
        ? '🔥 High-Value Item Alert: Samsung Smart TV Available'
        : '❤️ Community Need: Local School Needs Supplies',
      message: newUserType === 'collector'
        ? 'A verified donor is offering a 55" Samsung Smart TV in excellent condition. Urgent pickup needed due to house move.'
        : 'St. Mary\'s Primary School urgently needs art supplies and books for their new term. Your donations could help 150+ children.',
      urgency: 'high' as const,
      createdAt: new Date().toISOString(),
      read: false,
      actionUrl: newUserType === 'collector' ? '/browse' : '/profile?tab=recommendations'
    }

    // Add the demo notification to show immediate difference
    setTimeout(() => {
      // Trigger the notification update via custom event
      window.dispatchEvent(new CustomEvent('add-demo-notification', { 
        detail: { notification: demoNotification } 
      }))
      
      // Show a toast notification too
      toast(demoNotification.title, {
        description: demoNotification.message,
        action: {
          label: newUserType === 'collector' ? 'View Item' : 'See Needs',
          onClick: () => setCurrentTab('recommendations')
        }
      })
    }, 500)

    // Trigger new recommendations check after a brief delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('profile-changed', { detail: { userType: newUserType } }))
    }, 1000)
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

  // Sample activities
  const activities: Activity[] = [
    {
      type: 'donated',
      title: 'Kitchen Blender to Sarah M.',
      date: '2 hours ago',
      status: 'completed',
      co2Impact: 15
    },
    {
      type: 'collected',
      title: 'Laptop from James K.',
      date: '1 day ago',
      status: 'completed',
      co2Impact: 45
    },
    {
      type: 'listed',
      title: 'Winter Coat',
      date: '3 days ago',
      status: 'pending',
      co2Impact: 0
    }
  ]

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
        </div>

        {/* Authentication Dialog */}
        <AuthDialog 
          open={showAuthDialog} 
          onOpenChange={(open) => {
            setShowAuthDialog(open)
            if (!open && user && !user.onboardingCompleted) {
              setShowOnboarding(true)
            }
          }}
          initialMode={authMode}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">For You</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} alt={user.name || 'User'} />
                    <AvatarFallback>
                      {user?.name && typeof user.name === 'string' ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    <h2 className="text-h2">{user.name || 'User'}</h2>
                    <VerificationBadge 
                      verified={{
                        email: user.verificationLevel?.email ?? true,
                        phone: user.verificationLevel?.phone ?? false,
                        identity: user.verificationLevel?.identity ?? false,
                        address: user.verificationLevel?.address ?? true,
                        payment: user.verificationLevel?.payment ?? false,
                        community: user.verificationLevel?.community ?? (stats.successfulExchanges >= 10)
                      }}
                      className="mx-auto"
                    />
                    <Badge variant="secondary" className="capitalize">
                      {user.userType}
                    </Badge>
                  </div>

                  {ratingStats && (
                    <RatingDisplay 
                      rating={ratingStats.averageRating}
                      totalRatings={ratingStats.totalRatings}
                      className="justify-center"
                    />
                  )}

                  <div className="flex space-x-2 w-full">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleToggleUserType}
                      className="flex-1"
                    >
                      Switch to {user.userType === 'donor' ? 'Collector' : 'Donor'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSignOut}
                    >
                      <SignOut size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Your Impact</CardTitle>
                <CardDescription>Track your sustainability contributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-2 mx-auto">
                      <Package size={24} className="text-blue-600" />
                    </div>
                    <p className="text-h3 font-bold">{stats.itemsListed}</p>
                    <p className="text-small text-muted-foreground">Items Listed</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-2 mx-auto">
                      <Heart size={24} className="text-green-600" />
                    </div>
                    <p className="text-h3 font-bold">{stats.itemsDonated}</p>
                    <p className="text-small text-muted-foreground">Items Donated</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-2 mx-auto">
                      <ArrowsClockwise size={24} className="text-purple-600" />
                    </div>
                    <p className="text-h3 font-bold">{stats.itemsCollected}</p>
                    <p className="text-small text-muted-foreground">Items Collected</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-2 mx-auto">
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                    <p className="text-h3 font-bold">{stats.co2Saved}kg</p>
                    <p className="text-small text-muted-foreground">CO₂ Saved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package size={20} />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>Your latest exchanges and donations</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={24} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-body text-muted-foreground mb-4">
                    No activity yet. Start by listing your first item!
                  </p>
                  <Button variant="outline">List Your First Item</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-small text-muted-foreground">{activity.date}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className={getStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                        {activity.co2Impact > 0 && (
                          <p className="text-small text-green-600 mt-1">
                            +{activity.co2Impact}kg CO₂ saved
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles size={20} className="text-purple-600" />
                <span>AI-Powered {user.userType === 'collector' ? 'Item Recommendations' : 'Community Needs'}</span>
              </CardTitle>
              <CardDescription>
                {user.userType === 'collector' 
                  ? 'Personalized item suggestions based on your preferences and location'
                  : 'Local communities and organizations that could benefit from your donations'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Switch between Donor and Collector profiles to see different recommendation types.
                </p>
                <Button 
                  onClick={handleToggleUserType}
                  className="w-full"
                  variant="outline"
                >
                  Switch Profile Type
                </Button>
                <p className="text-xs text-muted-foreground">
                  This demo shows how the AI system adapts recommendations based on your profile type.
                </p>
              </div>
            </CardContent>
          </Card>

          <NotificationList 
            userType={user.userType}
            notifications={recomNotifications}
            onMarkAsRead={() => {}}
          />
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ChatCircle size={20} />
                <span>Messages</span>
                {getTotalUnreadCount() > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {getTotalUnreadCount()}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Conversations with other TruCycle users</CardDescription>
            </CardHeader>
            <CardContent>
              {chats.length === 0 ? (
                <div className="text-center py-8">
                  <ChatCircle size={24} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-body text-muted-foreground mb-4">
                    No conversations yet. Start exchanging items to connect with other users!
                  </p>
                  <Button variant="outline">List Your First Item</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {chats.map((chat) => (
                    <div key={chat.id} className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer">
                      <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${chat.recipientEmail}`} />
                        <AvatarFallback>{chat?.recipientName && typeof chat.recipientName === 'string' ? chat.recipientName.split(' ').map(n => n[0]).join('') : 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{chat.recipientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {chat.lastActivity ? new Date(chat.lastActivity).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <p className="text-small text-muted-foreground">
                          About: {chat.itemTitle}
                        </p>
                        <p className="text-small text-muted-foreground truncate">
                          {chat.lastMessage}
                        </p>
                      </div>
                      <div>
                        <Badge 
                          variant={chat.status === 'active' ? 'default' : 'secondary'}
                        >
                          {chat.status}
                        </Badge>
                        {chat.unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode size={20} />
                <span>Your QR Codes</span>
              </CardTitle>
              <CardDescription>
                QR codes for item pickups and drop-offs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userQRCodes.length === 0 ? (
                <div className="text-center py-8">
                  <QrCode size={24} className="text-muted-foreground mx-auto mb-2" />
                  <div className="flex-1">
                    <h3 className="font-medium mb-2">No QR Codes Yet</h3>
                    <p className="text-small text-muted-foreground">
                      QR codes will be generated when you complete item exchanges
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userQRCodes.map((qrCode) => {
                    const isExpired = new Date(qrCode.expiresAt) < new Date()
                    const isUsed = qrCode.status === 'used'
                    
                    return (
                      <Card 
                        key={qrCode.id}
                        className={`cursor-pointer transition-colors ${
                          isExpired || isUsed ? 'opacity-60' : 'hover:bg-muted/50'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium">{qrCode.itemTitle}</h4>
                            <Badge 
                              variant={
                                isUsed ? 'secondary' : 
                                isExpired ? 'destructive' : 'default'
                              }
                            >
                              {isUsed ? 'Used' : isExpired ? 'Expired' : 'Active'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Transaction ID:</span>
                              <span className="font-mono text-xs">{qrCode.transactionId.slice(0, 8)}...</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Created:</span>
                              <span>{new Date(qrCode.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>CO₂ Impact:</span>
                              <span>{qrCode.co2Impact}kg</span>
                            </div>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-3"
                            disabled={isExpired || isUsed}
                            onClick={() => setSelectedQRCode(qrCode)}
                          >
                            <QrCode size={16} className="mr-2" />
                            View QR Code
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield size={20} />
                  <span>Rating Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div>
                    <RatingDisplay 
                      rating={ratingStats.averageRating || 5.0}
                      totalRatings={ratingStats.totalRatings}
                      size="lg"
                    />
                  </div>
                  
                  {ratingStats.categoryBreakdown && (
                    <div className="space-y-3">
                      {Object.entries(ratingStats.categoryBreakdown).map(([category, rating]) => (
                        <div key={category}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm capitalize">{category}</span>
                            <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                          </div>
                          <Progress value={(rating / 5) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>Build trust with verified credentials</CardDescription>
              </CardHeader>
              <CardContent>
                <VerificationBadge 
                  verified={{
                    email: user.verificationLevel?.email ?? true,
                    phone: user.verificationLevel?.phone ?? false,
                    identity: user.verificationLevel?.identity ?? false,
                    address: user.verificationLevel?.address ?? true,
                    payment: user.verificationLevel?.payment ?? false,
                    community: user.verificationLevel?.community ?? (stats.successfulExchanges >= 10)
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
                <CardDescription>What other users are saying about you</CardDescription>
              </CardHeader>
              <CardContent>
                <RatingList ratings={[]} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm text-muted-foreground">{user.name || 'User'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">User Type</Label>
                      <p className="text-sm text-muted-foreground capitalize">{user.userType}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Get notified about new matches</p>
                    </div>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Location Sharing</p>
                      <p className="text-xs text-muted-foreground">Help others find nearby items</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    Edit Profile
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full mt-2"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            <VerificationCenter 
              userId={user.id}
              currentVerification={{
                email: user.verificationLevel?.email ?? true,
                phone: user.verificationLevel?.phone ?? false,
                identity: user.verificationLevel?.identity ?? false,
                address: user.verificationLevel?.address ?? true,
                payment: user.verificationLevel?.payment ?? false,
                community: user.verificationLevel?.community ?? (stats.successfulExchanges >= 10)
              }}
              onVerificationUpdate={(verification) => 
                setUser({ 
                  ...user, 
                  verificationLevel: {
                    ...user.verificationLevel,
                    ...verification
                  }
                })
              }
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Profile Onboarding */}
      <ProfileOnboarding 
        open={showOnboarding} 
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* Authentication Dialog */}
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={(open) => {
          setShowAuthDialog(open)
          if (!open && user && !user.onboardingCompleted) {
            handleOnboardingComplete()
          }
        }}
        initialMode={authMode}
      />

      {/* QR Code Display Modal */}
      {selectedQRCode && (
        <QRCodeDisplay
          qrCodeData={selectedQRCode}
          onClose={() => setSelectedQRCode(null)}
        />
      )}
    </div>
  )
}