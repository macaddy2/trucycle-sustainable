import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { User, Leaf, Package, Heart, ArrowsClockwise, Star, Settings, Award, SignOut } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { AuthDialog } from './auth/AuthDialog'
import { ProfileOnboarding } from './auth/ProfileOnboarding'
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

  const [stats] = useKV<UserStats>('user-stats', {
    itemsListed: 0,
    itemsDonated: 0,
    itemsCollected: 0,
    co2Saved: 0,
    reviews: 0,
    successfulExchanges: 0
  })

  const [activities] = useKV<Activity[]>('user-activities', [])

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
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
                        {user.verified && (
                          <Badge variant="secondary">✓ Verified</Badge>
                        )}
                      </h3>
                      <p className="text-small text-muted-foreground capitalize">
                        {user.userType} • {user.postcode || 'Location not set'}
                      </p>
                      <div className="flex items-center justify-center space-x-1 mt-2">
                        <Star size={16} className="text-yellow-500 fill-current" />
                        <span className="text-small font-medium">{(user.rating || 5.0).toFixed(1)}</span>
                        <span className="text-small text-muted-foreground">
                          ({stats.reviews} reviews)
                        </span>
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
                <div className="grid grid-cols-2 gap-4">
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
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Account Settings</CardTitle>
                <CardDescription>
                  Manage your preferences and account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-body text-muted-foreground mb-4">
                    Settings panel coming soon
                  </p>
                  <Button variant="outline">Update Profile</Button>
                </div>
              </CardContent>
            </Card>
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
    </>
  )
}