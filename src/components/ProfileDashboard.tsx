import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, MapPin, Bell, Heart, Shield, Package, Star } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { AuthDialog } from './auth'
import { VerificationBadge } from './VerificationBadge'
import { RatingDisplay } from './RatingSystem'
import { IntelligentRecommendations } from './IntelligentRecommendations'
import { MyListingsView, type ManagedListing } from './MyListingsView'

interface ProfileDashboardProps {
  onCreateListing?: () => void
  onOpenMessages?: () => void
}

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
  rewardsBalance?: number
}

export function ProfileDashboard({ onCreateListing, onOpenMessages }: ProfileDashboardProps) {
  const [user, setUser] = useKV<UserProfile | null>('current-user', null)
  const [listings] = useKV<ManagedListing[]>('user-listings', [])
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'recommendations' | 'impact'>(initialActiveTab)
  const [highlightedListingId, setHighlightedListingId] = useState<string | null>(highlightListingId)

  useEffect(() => {
    setActiveTab(initialActiveTab)
  }, [initialActiveTab])

  useEffect(() => {
    setHighlightedListingId(highlightListingId)
    if (!highlightListingId) return

    const timer = window.setTimeout(() => setHighlightedListingId(null), 6000)
    return () => window.clearTimeout(timer)
  }, [highlightListingId])

  const verificationStats = useMemo(() => {
    if (!user) {
      return { completed: 0, total: 0 }
    }
    const values = Object.values(user.verificationLevel)
    return {
      completed: values.filter(Boolean).length,
      total: values.length,
    }
  }, [user])

  const recentListings = useMemo(() => {
    return listings.slice(0, 5)
  }, [listings])

  const formatStatus = (status: ListingStatus) => {
    switch (status) {
      case 'pending_dropoff':
        return 'Pending Dropoff'
      case 'active':
        return 'Active'
      case 'claimed':
        return 'Claimed'
      case 'collected':
        return 'Collected'
      case 'expired':
        return 'Expired'
      default:
        return status
    }
  }

  const handleToggleUserType = () => {
    if (!user) return

    const nextType = user.userType === 'donor' ? 'collector' : 'donor'
    const updatedUser: UserProfile = {
      ...user,
      userType: nextType,
    }
    setUser(updatedUser)

    toast.success(`Switched to ${nextType} view`, {
      description: nextType === 'collector'
        ? 'We will highlight nearby high-value items for you to claim.'
        : 'We will surface urgent community needs that match your donations.'
    })
  }

  const handleCompleteSetup = () => {
    toast.info('Opening setup checklist...')
    handleTabChange('overview')
  }

  if (!user) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-h2 flex items-center gap-2">
              <Shield size={20} />
              Sign in to see your profile
            </CardTitle>
            <CardDescription>
              Create an account to track verification, manage listings, and receive recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAuthDialog(true)}>Sign in or create account</Button>
          </CardContent>
        </Card>

        <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      </>
    )
  }

  const allVerified = verificationStats.completed === verificationStats.total
  const profileInitials = user.name
    ? user.name.split(' ').map((segment) => segment[0]).join('').toUpperCase()
    : 'U'
  const avatarSeed = encodeURIComponent(user.email || user.name || 'TruCycle user')
  const avatarAltText = user.name || user.email || 'TruCycle user avatar'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt={avatarAltText} />
                <AvatarFallback>{profileInitials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-h2">{user.name}</h2>
                  <VerificationBadge userType={user.userType} verificationLevel={user.verificationLevel} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Badge variant={user.userType === 'donor' ? 'default' : 'secondary'}>
                    {user.userType === 'donor' ? 'Donor' : 'Collector'} mode
                  </Badge>
                  <Badge variant="outline">{(user.rewardsBalance ?? 0).toLocaleString()} pts</Badge>
                  {user.postcode && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {user.postcode}
                    </span>
                  )}
                  {typeof user.rating === 'number' && (
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500" />
                      {user.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleToggleUserType}>
                Switch to {user.userType === 'donor' ? 'collector' : 'donor'} mode
              </Button>
              {!allVerified && (
                <Button onClick={handleCompleteSetup}>
                  <CheckCircle size={16} className="mr-2" />
                  Complete setup
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as ProfileTab)}>
        <TabsList className="grid grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listings">My listings</TabsTrigger>
          <TabsTrigger value="recommendations">For you</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-h4 flex items-center gap-2">
                  <Shield size={18} />
                  Verification progress
                </CardTitle>
                <CardDescription>
                  {verificationStats.completed} of {verificationStats.total} checks complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={verificationStats.total === 0 ? 0 : (verificationStats.completed / verificationStats.total) * 100} className="mb-4" />
                <div className="space-y-2 text-sm">
                  {Object.entries(user.verificationLevel).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      {value ? <CheckCircle size={16} className="text-green-600" /> : <Badge variant="outline">Pending</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-h4 flex items-center gap-2">
                  <Package size={18} />
                  Recent listings
                </CardTitle>
                <CardDescription>Latest items you have listed on TruCycle</CardDescription>
              </CardHeader>
              <CardContent>
                {recentListings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You have not listed any items yet.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {recentListings.map((item) => (
                      <li key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {formatStatus(item.status)} • {item.category}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">{item.actionType}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-h4 flex items-center gap-2">
                  <Bell size={18} />
                  Activity snapshot
                </CardTitle>
                <CardDescription>Highlights from the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Items listed</span>
                    <strong>{listings.length}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Verified checks passed</span>
                    <strong>{verificationStats.completed}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Recommendations saved</span>
                    <strong>{user.userType === 'collector' ? '8' : '5'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reward balance</span>
                    <strong>{user.rewardsBalance ?? 0} pts</strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-h4">Your active listings</CardTitle>
              <CardDescription>Manage the items you are currently sharing with the community.</CardDescription>
            </CardHeader>
            <CardContent>
              {listings.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground">
                  <p>You have not listed any items yet.</p>
                  <Button className="mt-4" onClick={onCreateListing}>Create your first listing</Button>
                </div>
              ) : (
                <MyListingsView
                  variant="dashboard"
                  defaultView="card"
                  onAddNewItem={onCreateListing}
                  onOpenMessages={onOpenMessages}
                />

              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <IntelligentRecommendations user={user} />
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-h4 flex items-center gap-2">
                <Heart size={18} />
                Community impact
              </CardTitle>
              <CardDescription>Track how your actions contribute to a circular economy.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Estimated CO₂ saved</p>
                <p className="text-2xl font-semibold">
                  {listings.reduce((total, item) => total + (item.co2Impact ?? 0), 0)}kg
                </p>
                <p className="text-xs text-muted-foreground mt-1">Based on items you have listed and exchanged.</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Community trust rating</p>
                <div className="flex items-center gap-2 mt-2">
                  <RatingDisplay rating={user.rating ?? 4.5} totalRatings={24} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Collect feedback from verified exchanges to grow trust.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
