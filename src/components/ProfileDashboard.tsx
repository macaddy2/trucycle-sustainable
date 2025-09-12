import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  User, 
  Package, 
  Heart, 
  ArrowsClockwise, 
  Settings, 
  SignOut,
  Bell,
  CheckCircle,
  Sparkle,
  ChatCircle,
  QrCode,
  Shield
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { AuthDialog } from './auth/AuthDialog'
import { ProfileOnboarding } from './auth/ProfileOnboarding'
import { useMessaging, useInitializeSampleData, useRecommendationNotifications } from '@/hooks'
import { VerificationBadge, VerificationLevel } from './VerificationBadge'
import { RatingDisplay, RatingList, useUserRatingStats } from './RatingSystem'
import { VerificationCenter } from './VerificationCenter'
import { QRCodeDisplay } from './QRCodeDisplay'
import { NotificationList } from './NotificationList'

interface UserProfile {
  id: string
  name: string
  email: string
  userType: 'donor' | 'collector'
  postcode: string
  district?: string
  createdAt: string
  addressVerified?: boolean
  onboardingCompleted: boolean
  verificationLevel: VerificationLevel
  rating?: number
  verification: {
    email: boolean
    phone: boolean
    identity: boolean
    payment: boolean
  }
}

interface UserStats {
  itemsListed: number
  itemsDonated: number
  itemsCollected: number
  co2Saved: number
  successfulExchanges: number
  reviews: number
}

interface Activity {
  id: string
  type: 'listed' | 'donated' | 'collected' | 'exchange'
  itemTitle: string
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

  const [userRatingStats] = useUserRatingStats(user?.id || 'demo-user')
  const ratingStats = userRatingStats || {
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

        <AuthDialog 
          open={showAuthDialog} 
          onOpenChange={(open) => {
            setShowAuthDialog(open)
            if (!open && user) {
              handleOnboardingComplete()
            }
          }}
          initialMode={authMode}
        />
      </>
    )
  }

  // Sample activity data
  const activities: Activity[] = [
    {
      id: '1',
      type: 'donated',
      itemTitle: 'Samsung Galaxy S21',
      date: '2 hours ago',
      status: 'completed',
      co2Impact: 15.2
    },
    {
      id: '2', 
      type: 'collected',
      itemTitle: 'Vintage Leather Jacket',
      date: '1 day ago',
      status: 'pending',
      co2Impact: 8.5
    },
    {
      id: '3',
      type: 'exchange',
      itemTitle: 'Coffee Machine',
      date: '3 days ago', 
      status: 'completed',
      co2Impact: 22.1
    }
  ]

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">
            For You
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="qrcodes">QR Codes</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Summary */}
            <Card className="lg:col-span-1">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <VerificationBadge 
                      level={user.verificationLevel || 'basic'}
                      className="absolute -bottom-1 -right-1"
                      verification={{
                        email: true,
                        phone: false,
                        address: true,
                        identity: false,
                        payment: false,
                        community: stats.successfulExchanges >= 10
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-h3 font-medium">{user.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Badge 
                        variant={user.userType === 'collector' ? 'default' : 'secondary'}
                        className={user.userType === 'collector' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}
                      >
                        {user.userType}
                      </Badge>
                      <span>•</span>
                      <span>{user.district || user.postcode}</span>
                    </div>
                    
                    {ratingStats.totalRatings > 0 && (
                      <RatingDisplay 
                        rating={ratingStats.averageRating}
                        totalRatings={ratingStats.totalRatings || 0}
                        className="justify-center"
                      />
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Member since {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col w-full space-y-2">
                    <Button size="sm" variant="outline">
                      Edit Profile
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleToggleUserType}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      Switch to {user.userType === 'collector' ? 'Donor' : 'Collector'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleSignOut}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <SignOut size={16} className="mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Impact Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Environmental Impact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Sparkle size={20} className="text-green-600" />
                    </div>
                    <span>Environmental Impact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center space-x-3">
                        <Heart size={24} className="text-green-600" />
                        <div>
                          <p className="text-h3 font-bold text-green-600">{stats.co2Saved}</p>
                          <p className="text-small text-muted-foreground">kg CO₂ saved</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center space-x-3">
                        <ChatCircle size={24} className="text-blue-600" />
                        <div>
                          <p className="text-h3 font-bold text-blue-600">{stats.successfulExchanges}</p>
                          <p className="text-small text-muted-foreground">successful exchanges</p>
                          {stats.successfulExchanges >= 10 && (
                            <Badge variant="secondary" className="mt-1">
                              <CheckCircle size={12} className="mr-1" />
                              Trusted Member
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                </Card>

                {/* Activity Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-h3 font-bold text-blue-600">{stats.itemsListed}</p>
                        <p className="text-small text-muted-foreground">items listed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-h3 font-bold text-green-600">{stats.itemsDonated}</p>
                        <p className="text-small text-muted-foreground">items donated</p>
                      </div>
                      <div className="text-center">
                        <p className="text-h3 font-bold text-purple-600">{stats.itemsCollected}</p>
                        <p className="text-small text-muted-foreground">items collected</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Sparkle size={20} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <span>
                      AI-Powered Recommendations
                    </span>
                    <Badge variant="secondary" className="ml-2">
                      AI-Powered
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  {user.userType === 'collector' 
                    ? 'Personalized item suggestions based on your interests and location'
                    : 'Community needs and donation opportunities in your area'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <p><strong>📍 Search Radius:</strong> 2-5 miles from {user.district || user.postcode}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p><strong>🎯 Match Accuracy:</strong> 94% (based on your activity)</p>
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <Button 
                      size="sm"
                      onClick={handleToggleUserType}
                      variant="outline"
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      Switch Profile Type
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      See how AI recommendations change for different profile types
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <NotificationList 
              notifications={recomNotifications}
              userType={user.userType}
            />

            {/* Urgent Notifications Demo */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-orange-700">
                  <Bell size={20} className="text-orange-600" />
                  <span>Urgent Opportunities</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    Demo
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Experience time-sensitive alerts for high-priority items or urgent community needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-white rounded-lg border-l-4 border-orange-400">
                  <div className="space-y-2">
                    <p className="font-medium text-orange-900">
                      {user.userType === 'collector' 
                        ? '⚡ Time-Sensitive: Premium electronics available for immediate pickup'
                        : '🆘 Urgent: Community center needs winter supplies for homeless shelter'
                      }
                    </p>
                    <p className="text-sm text-orange-700">
                      {user.userType === 'collector'
                        ? 'Items must be collected within 24 hours due to donor\'s moving schedule.'
                        : 'Temperatures dropping this weekend - urgent need for blankets and warm clothing.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      const urgentDemo = {
                        title: user.userType === 'collector' 
                          ? '🚨 URGENT: MacBook Pro Available - Expires in 2 hours!'
                          : '🚨 URGENT: Emergency Supply Drive - 50 families need help',
                        message: user.userType === 'collector'
                          ? 'Verified donor offering 2019 MacBook Pro 16" for immediate pickup. First come, first served.'
                          : 'Single mother support group needs emergency baby supplies after unexpected arrivals.'
                      }
                      toast(urgentDemo.title, {
                        description: urgentDemo.message,
                        duration: 8000,
                        action: {
                          label: user.userType === 'collector' ? 'Claim Now' : 'Donate',
                          onClick: () => {
                            toast.success('Demo completed! 🎉', {
                              description: 'This shows how urgent notifications work in real scenarios.'
                            })
                          }
                        }
                      })
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Bell size={16} className="mr-2" />
                    Trigger Urgent Alert
                  </Button>
                  <p className="text-xs text-orange-700">
                    Click to experience a demo urgent notification tailored to your profile type
                    and see how time-sensitive alerts appear throughout the platform.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ChatCircle size={20} />
                  <span>Recent Conversations</span>
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
                      No conversations yet. Start by listing or claiming items.
                    </p>
                    <Button size="sm" onClick={() => window.location.hash = '#list'}>
                      List Your First Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chats.map((chat) => (
                      <div key={chat.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.participantName}`} />
                            <AvatarFallback>
                              {chat.participantName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{chat.participantName}</p>
                            <p className="text-sm text-muted-foreground">
                              About: {chat.itemTitle}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {chat.lastMessage}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-right">
                          <Badge 
                            variant={chat.status === 'active' ? 'default' : 'secondary'}
                          >
                            {chat.status}
                          </Badge>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive">
                              {chat.unreadCount}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {chat.lastActivity 
                              ? new Date(chat.lastActivity).toLocaleDateString()
                              : 'No activity'
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

          <TabsContent value="ratings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield size={20} />
                    <span>Rating Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="space-y-2">
                    <RatingDisplay 
                      rating={ratingStats.averageRating || 5.0}
                      totalRatings={ratingStats.totalRatings || 0}
                      size="lg"
                    />
                  </div>

                  {ratingStats.categoryBreakdown && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-left">Category Breakdown</h4>
                      <div className="space-y-2">
                        {[
                          { label: 'Punctuality', value: ratingStats.categoryBreakdown.punctuality || 5.0 },
                          { label: 'Communication', value: ratingStats.categoryBreakdown.communication || 5.0 },
                          { label: 'Item Condition', value: ratingStats.categoryBreakdown.itemCondition || 5.0 }
                        ].map((category) => (
                          <div key={category.label} className="flex items-center justify-between">
                            <span className="text-sm">{category.label}</span>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">{category.value.toFixed(1)}</span>
                              <div className="w-8 text-muted-foreground">★</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <VerificationBadge 
                      level={user.verificationLevel || 'basic'}
                      verification={{
                        email: true,
                        phone: false,
                        address: true,
                        identity: false,
                        payment: false,
                        community: stats.successfulExchanges >= 10
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Reviews</CardTitle>
                    <CardDescription>
                      What others are saying about your exchanges
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RatingList 
                      userId={user.id}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qrcodes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode size={20} />
                  <span>Your QR Codes</span>
                </CardTitle>
                <CardDescription>
                  QR codes for pickup and drop-off verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userQRCodes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <QrCode size={32} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-h3 mb-2">No QR codes yet</h3>
                    <p className="text-body text-muted-foreground mb-4">
                      QR codes will be generated when you complete exchanges
                    </p>
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
                          onClick={() => !isExpired && !isUsed && setSelectedQRCode(qrCode)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="space-y-1">
                                <h4 className="font-medium">{qrCode.itemTitle}</h4>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant={qrCode.type === 'pickup' ? 'default' : 'secondary'}
                                  >
                                    {qrCode.type}
                                  </Badge>
                                  <Badge 
                                    variant={
                                      isUsed ? 'outline' : 
                                      isExpired ? 'destructive' : 'secondary'
                                    }
                                  >
                                    {isUsed ? 'Used' : isExpired ? 'Expired' : 'Active'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <QrCode size={24} className="text-muted-foreground" />
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Transaction ID:</span>
                                <span>ID: {qrCode.transactionId.slice(-8)}</span>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Created:</span>
                                  <span>{new Date(qrCode.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>CO₂ Impact:</span>
                                  <span>{qrCode.co2Impact}kg</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full"
                                disabled={isExpired || isUsed}
                              >
                                {isExpired ? 'Expired' : isUsed ? 'Already Used' : 'View QR Code'}
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
            <Card>
              <CardHeader>
                <CardTitle>How QR Codes Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Package size={16} />
                      <span>Drop-off Process</span>
                    </h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>1. Generate QR code after listing confirmation</p>
                      <p>2. Take your item to the selected partner shop</p>
                      <p>3. Show QR code to shop attendant</p>
                      <p>4. Shop attendant scans and stores your item</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Heart size={16} />
                      <span>Pickup Process</span>
                    </h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>1. Receive QR code after successful item claim</p>
                      <p>2. Wait for donor to drop off item at partner shop</p>
                      <p>3. Visit shop and show your QR code</p>
                      <p>4. Shop attendant verifies and releases item</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your recent listings, donations, and collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-body text-muted-foreground mb-4">
                      No activity yet. Start by listing or collecting items.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Badge className={getActivityColor(activity.type)}>
                            {getActivityIcon(activity.type)}
                          </Badge>
                          <div>
                            <p className="font-medium">{activity.itemTitle}</p>
                            <p className="text-small text-muted-foreground">{activity.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-right">
                          <Badge className={getStatusColor(activity.status)}>
                            {activity.status}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              -{activity.co2Impact}kg CO₂
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sustainability Impact */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700">Your Sustainability Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-h2 font-bold text-green-600">{stats.co2Saved}</p>
                      <p className="text-small text-muted-foreground">kg CO₂ saved</p>
                    </div>
                    <div>
                      <p className="text-h2 font-bold text-blue-600">{stats.successfulExchanges}</p>
                      <p className="text-small text-muted-foreground">exchanges</p>
                    </div>
                    <div>
                      <p className="text-h2 font-bold text-purple-600">{stats.itemsListed + stats.itemsCollected}</p>
                      <p className="text-small text-muted-foreground">items cycled</p>
                    </div>
                  </div>
                  <p className="text-small text-muted-foreground">
                    You've contributed to a more sustainable London community!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your profile and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Profile Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <div className="text-sm text-muted-foreground">{user.name}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Email</Label>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">User Type</Label>
                        <div className="text-sm text-muted-foreground">{user.userType}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Postcode</Label>
                        <div className="text-sm text-muted-foreground">{user.postcode || 'Not set'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Notification Preferences */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Notification Preferences</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Email Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive updates about your items</p>
                        </div>
                        <Button variant="outline" size="sm">Enabled</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Push Notifications</p>
                          <p className="text-xs text-muted-foreground">Real-time alerts for messages and matches</p>
                        </div>
                        <Button variant="outline" size="sm">Enabled</Button>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Privacy Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Profile Visibility</p>
                          <p className="text-xs text-muted-foreground">Control who can see your profile</p>
                        </div>
                        <Button variant="outline" size="sm">Public</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Location Sharing</p>
                          <p className="text-xs text-muted-foreground">Share approximate location for better matches</p>
                        </div>
                        <Button variant="outline" size="sm">Enabled</Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t">
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full">
                        <Settings size={16} className="mr-2" />
                        Edit Profile
                      </Button>
                      <Button variant="destructive" size="sm" className="w-full">
                        <SignOut size={16} className="mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <VerificationCenter 
                currentVerification={user.verificationLevel || 'basic'}
                verification={{
                  email: true,
                  phone: false,
                  address: true,
                  identity: false,
                  payment: false,
                  community: stats.successfulExchanges >= 10
                }}
                onVerificationUpdate={(level) => {
                  setUser({ ...user, verificationLevel: level })
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        <ProfileOnboarding 
          open={showOnboarding} 
          onOpenChange={setShowOnboarding}
          onComplete={handleOnboardingComplete}
        />

        <AuthDialog 
          open={showAuthDialog} 
          onOpenChange={(open) => {
            setShowAuthDialog(open)
            if (!open && user) {
              handleOnboardingComplete()
            }
          }}
          initialMode={authMode}
        />

        {/* QR Code Display Modal */}
        {selectedQRCode && (
          <QRCodeDisplay
            qrData={selectedQRCode}
            onClose={() => setSelectedQRCode(null)}
          />
        )}
      </div>
    )
  }