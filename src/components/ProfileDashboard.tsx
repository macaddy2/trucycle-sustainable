import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowsClockwise,
  Shield,
  User,
  QrCode,
  Leaf,
  Package,
  Star,
  Heart,
  MapPin,
  Bell,
  CheckCircle
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { AuthDialog } from './auth'
import { MessageCenter } from './messaging'
import { RatingDisplay } from './RatingSystem'
import { VerificationBadge } from './VerificationBadge'
import { QRCodeDisplay } from './QRCode'
import { IntelligentRecommendations } from './IntelligentRecommendations'

interface UserProfile {
  id: string
  name: string
  email: string
  userType: 'donor' | 'collector'
  onboardingCompleted: boolean
  postcode?: string
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

interface ListedItem {
  id: string
  title: string
  description: string
  category: string
  condition: string
  photos: string[]
  status: 'active' | 'claimed' | 'collected' | 'expired'
  createdAt: string
  views: number
  carbonImpact: number
}

export function ProfileDashboard() {
  const [user, setUser] = useKV<UserProfile | null>('current-user', null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showMessageCenter, setShowMessageCenter] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [listedItems] = useKV<ListedItem[]>('user-items', [])
  const [showCompleteSetup, setShowCompleteSetup] = useState(false)

  // Check if profile setup is incomplete
  useEffect(() => {
    if (user && user.onboardingCompleted) {
      const verificationCount = Object.values(user.verificationLevel).filter(Boolean).length
      const isIncomplete = verificationCount < 3 || !user.verificationLevel.address
      setShowCompleteSetup(isIncomplete)
    }
  }, [user])

  const handleCompleteSetup = () => {
    if (!user) return
    
    // Simulate address verification completion
    const updatedUser: UserProfile = {
      ...user,
      postcode: 'SW1A 1AA', // Default London postcode for demo
      verificationLevel: {
        ...user.verificationLevel,
        address: true,
        identity: true,
        phone: true
      }
    }
    setUser(updatedUser)
    
    // Trigger smart notification system
    toast.success('Profile Setup Complete!', {
      description: `Smart recommendations are now active for ${user.userType}s in your area.`,
      action: {
        label: 'View Recommendations',
        onClick: () => setActiveTab('recommendations')
      }
    })
    
    // Auto-switch to recommendations tab
    setTimeout(() => setActiveTab('recommendations'), 1000)
  }

  const toggleUserType = () => {
    if (!user) return
    
    const newUserType: 'donor' | 'collector' = user.userType === 'donor' ? 'collector' : 'donor'
    const updatedUser: UserProfile = { ...user, userType: newUserType }
    setUser(updatedUser)
    
    toast.success(`Switched to ${newUserType} mode`, {
      description: `You'll now see recommendations tailored for ${newUserType}s.`
    })
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <User size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-h2 mb-2">Sign in to view your profile</h2>
            <p className="text-muted-foreground mb-6">
              Track your environmental impact, manage listings, and connect with your community.
            </p>
            <Button onClick={() => setShowAuthDialog(true)}>
              Sign In / Sign Up
            </Button>
          </CardContent>
        </Card>

        <AuthDialog 
          open={showAuthDialog} 
          onOpenChange={setShowAuthDialog}
          initialMode="signin"
        />
      </div>
    )
  }

  const verificationProgress = Object.values(user.verificationLevel).filter(Boolean).length
  const totalVerifications = Object.keys(user.verificationLevel).length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                <AvatarFallback>
                  {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-h2 flex items-center gap-2">
                  {user.name}
                  <VerificationBadge verified={user.verificationLevel} />
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={user.userType === 'donor' ? 'default' : 'secondary'}>
                    {user.userType === 'donor' ? 'Donor' : 'Collector'}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleUserType}
                    className="text-xs"
                  >
                    Switch to {user.userType === 'donor' ? 'Collector' : 'Donor'}
                  </Button>
                  {user.rating && (
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-yellow-500 fill-current" />
                      <span className="text-sm">{user.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {showCompleteSetup && (
              <Button 
                onClick={handleCompleteSetup}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={16} className="mr-2" />
                Complete Setup
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listings">My Items</TabsTrigger>
          <TabsTrigger value="recommendations">For You</TabsTrigger>
          <TabsTrigger value="verification">Trust</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Profile Completion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={20} />
                  Profile Verification
                </CardTitle>
                <CardDescription>
                  {verificationProgress}/{totalVerifications} verifications complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={(verificationProgress / totalVerifications) * 100} className="mb-4" />
                <div className="space-y-2">
                  {Object.entries(user.verificationLevel).map(([key, verified]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      {verified ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <div className="w-4 h-4 border border-muted-foreground rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package size={20} />
                  Activity Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Items Listed</span>
                    <Badge variant="secondary">{listedItems?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Successful Exchanges</span>
                    <Badge variant="secondary">
                      {listedItems?.filter(item => item.status === 'collected').length || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Community Rating</span>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-current" />
                      <span className="text-sm">{user.rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Environmental Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf size={20} />
                  Environmental Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {listedItems?.reduce((sum, item) => sum + (item.carbonImpact || 0), 0).toFixed(1) || '0.0'} kg
                    </div>
                    <p className="text-sm text-muted-foreground">CO2 saved</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Items rescued</span>
                    <Badge variant="outline" className="text-green-600">
                      {listedItems?.filter(item => item.status === 'collected').length || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>My Listed Items</CardTitle>
              <CardDescription>
                Manage your active listings and view past exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!listedItems || listedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-h3 mb-2">No items listed yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start sharing items with your community to make an environmental impact.
                  </p>
                  <Button>
                    <Package size={16} className="mr-2" />
                    List Your First Item
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listedItems.map((item) => (
                    <Card key={item.id} className="border">
                      <CardContent className="p-4">
                        <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                          <Package size={32} className="text-muted-foreground" />
                        </div>
                        <h4 className="font-medium mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant={item.status === 'active' ? 'default' : 'secondary'}
                          >
                            {item.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.views} views
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          {user && user.postcode ? (
            <IntelligentRecommendations user={{ ...user, postcode: user.postcode }} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-h3 mb-2">Complete your address verification</h3>
                <p className="text-muted-foreground mb-4">
                  To receive personalized recommendations, please complete your profile setup.
                </p>
                <Button onClick={handleCompleteSetup}>
                  <CheckCircle size={16} className="mr-2" />
                  Complete Setup
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle>Trust & Safety</CardTitle>
              <CardDescription>
                Build trust in the community through verification and ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-h3 mb-4">Verification Status</h3>
                  <div className="space-y-3">
                    {Object.entries(user.verificationLevel).map(([key, verified]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {verified ? 'Verified' : 'Pending verification'}
                          </p>
                        </div>
                        {verified ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <Button variant="outline" size="sm">
                            Verify
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-h3 mb-4">Community Rating</h3>
                  <div className="text-center p-6 border rounded-lg">
                    <div className="text-3xl font-bold mb-2">
                      {user.rating?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="flex justify-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          className={`${
                            star <= (user.rating || 0)
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Based on community feedback
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact">
          <Card>
            <CardHeader>
              <CardTitle>Environmental Impact</CardTitle>
              <CardDescription>
                Track your contribution to sustainability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 border rounded-lg">
                  <Leaf size={32} className="mx-auto mb-3 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">
                    {listedItems?.reduce((sum, item) => sum + (item.carbonImpact || 0), 0).toFixed(1) || '0.0'}
                  </div>
                  <p className="text-sm text-muted-foreground">kg CO2 saved</p>
                </div>
                
                <div className="text-center p-6 border rounded-lg">
                  <ArrowsClockwise size={32} className="mx-auto mb-3 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">
                    {listedItems?.filter(item => item.status === 'collected').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Items exchanged</p>
                </div>
                
                <div className="text-center p-6 border rounded-lg">
                  <Heart size={32} className="mx-auto mb-3 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">
                    {listedItems?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Community contributions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Center */}
      <MessageCenter 
        open={showMessageCenter}
        onOpenChange={setShowMessageCenter}
      />
    </div>
  )
}