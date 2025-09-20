import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, Ca
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
  ArrowsClockwise,
  Shield,
  User,
  QrCode,
  Leaf,
  Package
import { u
import 
import 
import { 
  Star,
  Leaf,
  Heart,
  Package
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { AuthDialog } from './auth'
import { MessageCenter } from './messaging'
import { RatingDisplay } from './ratings'
import { VerificationBadges } from './verification'
import { QRCodeDisplay } from './qr-code'
import { RecommendationCard } from './recommendations'
import { MyListedItems } from './listings'

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

    reviews: 18

    totalRatings: userStats.reviews,
    breakdown: {
      communication: 4.6,
    }
    totalRatings: userStats.reviews,

      communication: 4.7,
    }

    setUser(null)
  }
  const handleToggl
    
   

      `Switched to ${newUserType} profile! 🔄`, 
        description: `You can now ${
    )
    setCurrentTa
    // Generate sample 
      id: `demo-${Date.no
      type: newUserType 
    }
  } : {
    totalRatings: userStats.reviews,
    averageRating: user?.rating || 4.8,
    breakdown: {
      punctuality: 4.9,
      communication: 4.7,
      itemCondition: 4.8
    }
  }

  const handleSignOut = () => {
    setUser(null)
    toast.success('Signed out successfully')
  }

  const handleToggleUserType = async () => {
    if (!user) return
    
    const newUserType: 'donor' | 'collector' = user.userType === 'donor' ? 'collector' : 'donor'
    const updatedUser: UserProfile = { ...user, userType: newUserType }
    setUser(updatedUser)
    
    toast.success(
      `Switched to ${newUserType} profile! 🔄`, 
      { 
        description: `You can now ${newUserType === 'collector' ? 'browse and collect items' : 'list items for donation'}.` 
      }
    )

    setCurrentTab('recommendations')
    
    // Generate sample notification based on new user type
    const demoNotification = {
      id: `demo-${Date.now()}`,
      userId: user.id,
      type: newUserType === 'collector' ? 'item_match' : 'community_need',
      title: newUserType === 'collector' 
        ? '🔥 High-Value Items Available!' 
        : '❤️ Urgent Community Need!',
      message: newUserType === 'collector'
        ? 'Several quality electronics and furniture items just became available in your area.'
        : 'St. Margaret\'s Shelter urgently needs winter clothing and bedding for families.',
      urgency: 'high',
      createdAt: new Date().toISOString(),
      read: false,
      actionUrl: newUserType === 'collector' ? '/browse' : '/profile'
    }

    // Add demo notification after a short delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('add-demo-notification', {
        detail: { notification: demoNotification }
      }))
      
      // Show a toast notification as well
      toast(demoNotification.title, {
        description: demoNotification.message,
        action: {
          label: newUserType === 'collector' ? 'View Items' : 'See Needs',
          onClick: () => setCurrentTab('recommendations')
        }
      })
    }, 1000)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'listed': return <Plus size={16} className="text-blue-600" />
      case 'donated': return <Heart size={16} className="text-green-600" />
      case 'collected': return <Package size={16} className="text-purple-600" />
      default: return <ArrowsClockwise size={16} className="text-teal-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'listed': return 'bg-blue-100 text-blue-800'
      case 'donated': return 'bg-green-100 text-green-800'
      case 'collected': return 'bg-purple-100 text-purple-800'
      default: return 'bg-teal-100 text-teal-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
    }
  }

  const activities: Activity[] = [
    {
      type: 'donated',
      title: 'Kitchen appliances to Camden Food Bank',
      date: '2 hours ago',
      status: 'completed',
      co2Impact: 12.4
    },
    {
      type: 'collected',
      title: 'Laptop from James in Islington',
      date: 'Yesterday',
      status: 'completed',
      co2Impact: 8.7
    },
    {
      type: 'listed',
      title: 'Children\'s books collection',
      date: '3 days ago',
      status: 'pending',
      co2Impact: 3.2
    }
  ]

  // If no user is signed in, show sign-in prompt
  if (!user) {
    return (
      <>
        <div className="space-y-6">
          <Card className="text-center py-12">
            <CardContent>
              <h1 className="text-h2 mb-4">Sign in to view your profile</h1>
              <p className="text-body text-muted-foreground mb-6">
                Track your environmental impact and manage your listings
              </p>
              <div className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAuthMode('signin')
                    setShowAuthDialog(true)
                  }}
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => {
                    setAuthMode('signup')
                    setShowAuthDialog(true)
                  }}
                >
                  Sign Up
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <AuthDialog 
          open={showAuthDialog}
          onOpenChange={(open) => {
            setShowAuthDialog(open)
            if (!open) {
              // Handle auth complete if needed
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">For You</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
                    >
                   

                      className="flex-1"
                    >
                    </Button>
            <Card>
            </Card>
            {/* Impact Stats */}
              <CardHeader>
                    <AvatarImage src="" />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  <div className="text-center space-y-2">
                      <Leaf size={24}
                    <p clas
                  
                    <h2 className="text-h3">{user?.name || 'User'}</h2>
                    <VerificationBadges 
                      verificationLevel={{
                        email: user.verificationLevel.email,
                        phone: user.verificationLevel.phone,
                        identity: user.verificationLevel.identity,
                        address: user.verificationLevel.address,
                        payment: user.verificationLevel.payment,
                        community: user.verificationLevel.community
                    </di
                  </di
              </CardContent>
          </div>
          {/* Recent Activit
            <CardHeader>
                  
                        <p className="text-small text-mut
                    </div>
                      <Badge className={
                      </Badge>
                      </div>
                      onClick={handleToggleUserType}
                ))}
            </CardContent>
        </TabsContent>
        <TabsContent value="
            <CardHeader>
                <Sparkle size={2
                      className="flex-1"
              <CardDescription>
              </CardD
                      Sign Out
                <p className=
                </p>
                  onCl
                  className=
                  S

            {/* Impact Stats */}
            </CardContent>

            userType={user.userType}
                <CardDescription>Environmental contribution summary</CardDescription>

          <Card>
              <CardTitle>Messages</CardTitle>
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center">
                      <Leaf size={24} className="text-green-600" />
                <Button va
                    <p className="text-small text-muted-foreground">CO₂ Saved</p>
                    <p className="text-h3 text-green-600">{userStats.co2Saved}kg</p>
        <TabsContent val
            <CardH
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center">
                      <ArrowsClockwise size={24} className="text-blue-600" />
                <div class
                    <p className="text-small text-muted-foreground">Exchanges</p>
                    <p className="text-h3">{userStats.successfulExchanges}</p>
                  <Butto
                  
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center">
                      <Heart size={24} className="text-red-600" />
                    }}
                    <p className="text-small text-muted-foreground">Donated</p>
                    <p className="text-h3">{userStats.itemsDonated}</p>
                </div>
            </Card
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center">
                      <Star size={24} className="text-yellow-600" />
              <CardDescrip
                    <p className="text-small text-muted-foreground">Rating</p>
                    <p className="text-h3">{user?.rating || 4.8}</p>
                  totalR
                
                  {Object.en
                   
                

                </div>
            </Ca
        </TabsContent>
              <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
                <Verifica
                    email
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getActivityIcon(activity.type)}
                      <div>
                        <p className="text-body text-foreground">{activity.title}</p>
                </div>
                  <div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                      Edit Profile
                        <p className="text-small text-green-600">+{activity.co2Impact}kg CO₂</p>
                    Sign Out
                </div>
                  </div>
                ))}
              </div>
      {showQRCode && selec
          qrData=
        />

}
          <Card className="border-2 border-primary/20 bg-primary/5">

              <div className="flex items-center space-x-2">
                <Sparkle size={20} className="text-purple-600" />
                <CardTitle>Personalized For You</CardTitle>
              </div>

                AI-powered recommendations based on your {user.userType} profile





                  Switch between donor and collector profiles to see different recommendation types.




                  className="w-full"




                  This will trigger personalized recommendations for your new profile type.





          <RecommendationCard 








              <CardTitle>Messages</CardTitle>
              <CardDescription>Conversations with other users</CardDescription>


              <div className="text-center py-8">
                <p className="text-body text-muted-foreground mb-4">
                  No active conversations yet
                </p>
                <Button variant="outline">Start a Conversation</Button>
              </div>







              <CardTitle>Your QR Codes</CardTitle>

                QR codes for item collection and drop-off verification



              <div className="text-center py-8">
                <div className="space-y-4">

                    <p className="text-small text-muted-foreground mb-4">
                      QR codes will appear here when you have active exchanges


                  <Button 
                    onClick={() => {
                      setSelectedQR({
                        id: 'demo-qr',
                        itemName: 'Demo Item',
                        type: 'collection',
                        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        metadata: { location: 'Camden Shop', collector: user.name }
                      })
                      setShowQRCode(true)
                    }}
                    variant="outline"
                  >
                    <QrCode size={16} className="mr-2" />
                    Generate Demo QR Code
                  </Button>

              </div>





          <Card className="w-full">
            <CardHeader>
              <CardTitle>Your Ratings</CardTitle>
              <CardDescription>Reviews from other community members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-6">
                <RatingDisplay 
                  averageRating={ratingStats.averageRating}
                  totalRatings={ratingStats.totalRatings}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(ratingStats.breakdown).map(([category, rating]) => (
                    <div key={category} className="text-center">
                      <div className="space-y-2">
                        <span className="text-sm capitalize">{category}</span>
                        <div className="text-lg font-semibold">{rating}</div>
                      </div>

                  ))}

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>




                <VerificationBadges 
                  verificationLevel={{
                    email: user.verificationLevel.email,
                    phone: user.verificationLevel.phone,
                    identity: user.verificationLevel.identity,
                    address: user.verificationLevel.address,
                    payment: user.verificationLevel.payment,
                    community: user.verificationLevel.community







                <CardTitle>Account Settings</CardTitle>


              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-muted-foreground">{user.name}</p>

                  <div>
                    <Label className="text-sm font-medium">User Type</Label>
                    <p className="text-sm text-muted-foreground capitalize">{user.userType}</p>
                  </div>


                  <div>
                    <p className="text-xs text-muted-foreground">Email: {user.email}</p>


                  <div>
                    <p className="text-xs text-muted-foreground">How others see you in the community</p>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Edit Profile
                    </Button>





                    size="sm"













      {showQRCode && selectedQR && (

          qrData={selectedQR}
          onClose={() => setShowQRCode(false)}




