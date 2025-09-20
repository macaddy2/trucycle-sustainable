import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkle,
  Heart,
  Package,
  ArrowRight,
  MapPin,
  Leaf,
  Users,
  Bell,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  name: string
  userType: 'donor' | 'collector'
  postcode: string
  onboardingCompleted: boolean
}

interface RecommendedItem {
  id: string
  title: string
  description: string
  category: string
  condition: 'excellent' | 'good' | 'fair'
  location: string
  distance: string
  co2Impact: number
  donorName: string
  donorRating: number
  urgency: 'high' | 'medium' | 'low'
  matchReason: string
  tags: string[]
  photos: string[]
  listedAt: string
}

interface CommunityNeed {
  id: string
  title: string
  description: string
  category: string
  urgency: 'high' | 'medium' | 'low'
  requestedBy: string
  location: string
  distance: string
  peopleHelped: number
  co2ImpactPotential: number
  matchReason: string
  requestedAt: string
}

interface RecommendationNotification {
  id: string
  title: string
  message: string
  createdAt: string
  urgency: 'high' | 'medium' | 'low'
  read?: boolean
}

interface IntelligentRecommendationsProps {
  user: UserProfile
  notifications?: RecommendationNotification[]
  onMarkAsRead?: (id: string) => void
}

const collectorMockRecommendations: RecommendedItem[] = [
  {
    id: 'rec-1',
    title: 'MacBook Pro 13" (2019)',
    description: 'Excellent condition laptop perfect for remote work or study.',
    category: 'Electronics',
    condition: 'excellent',
    location: 'Camden, London',
    distance: '1.2 miles',
    co2Impact: 52,
    donorName: 'Sarah D.',
    donorRating: 4.9,
    urgency: 'high',
    matchReason: 'Matches your interest in work-from-home equipment and is nearby.',
    tags: ['Electronics', 'Pickup today', 'Premium'],
    photos: [],
    listedAt: new Date().toISOString(),
  },
  {
    id: 'rec-2',
    title: 'Solid Oak Dining Table',
    description: 'Seats six people comfortably, very light wear, collection only.',
    category: 'Furniture',
    condition: 'good',
    location: 'Islington, London',
    distance: '0.8 miles',
    co2Impact: 34,
    donorName: 'Michael W.',
    donorRating: 4.8,
    urgency: 'medium',
    matchReason: 'Popular item with high sustainability impact within delivery radius.',
    tags: ['Furniture', 'Sustainable', 'Great condition'],
    photos: [],
    listedAt: new Date().toISOString(),
  },
  {
    id: 'rec-3',
    title: 'Children’s Winter Clothing Bundle',
    description: '10-piece bundle of winter wear suitable for ages 6-8.',
    category: 'Clothing',
    condition: 'fair',
    location: 'Kentish Town, London',
    distance: '2.1 miles',
    co2Impact: 18,
    donorName: 'Community Hub',
    donorRating: 4.6,
    urgency: 'low',
    matchReason: 'Frequently requested category that matches your saved preferences.',
    tags: ['Family', 'Winter', 'Bundle'],
    photos: [],
    listedAt: new Date().toISOString(),
  },
]

const donorMockCommunityNeeds: CommunityNeed[] = [
  {
    id: 'need-1',
    title: 'Winter Clothing Drive',
    description: 'Local shelter urgently needs warm clothing sets for families relocating this month.',
    category: 'Clothing',
    urgency: 'high',
    requestedBy: 'Camden Community Centre',
    location: 'Camden, London',
    distance: '1.0 mile',
    peopleHelped: 45,
    co2ImpactPotential: 68,
    matchReason: 'High-urgency request close to your postcode with large community impact.',
    requestedAt: new Date().toISOString(),
  },
  {
    id: 'need-2',
    title: 'Laptops for Youth Programme',
    description: 'After-school coding club needs gently used laptops for 20 students.',
    category: 'Electronics',
    urgency: 'medium',
    requestedBy: 'North London STEM Collective',
    location: 'Highbury, London',
    distance: '2.4 miles',
    peopleHelped: 20,
    co2ImpactPotential: 54,
    matchReason: 'Matches your previous electronics donations and is within 3 miles.',
    requestedAt: new Date().toISOString(),
  },
]

const urgencyBadgeClass = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
} as const

const conditionBadgeClass = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  fair: 'bg-yellow-100 text-yellow-800',
} as const

export function IntelligentRecommendations({ user, notifications = [], onMarkAsRead }: IntelligentRecommendationsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([])
  const [communityNeeds, setCommunityNeeds] = useState<CommunityNeed[]>([])

  const generateRecommendations = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 400))

      if (user.userType === 'collector') {
        setRecommendations(collectorMockRecommendations)
        setCommunityNeeds([])
      } else {
        setCommunityNeeds(donorMockCommunityNeeds)
        setRecommendations([])
      }

      toast.success('Recommendations updated!')
    } catch (error) {
      console.error('Failed to generate recommendations', error)
      toast.error('Failed to refresh recommendations')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user?.onboardingCompleted) {
      void generateRecommendations()
    }
  }, [generateRecommendations, user?.onboardingCompleted])

  useEffect(() => {
    if (!user?.onboardingCompleted) {
      return
    }

    const handleProfileChange = () => {
      toast.info('Generating new recommendations for your profile…')
      void generateRecommendations()
    }

    window.addEventListener('profile-changed', handleProfileChange)
    return () => window.removeEventListener('profile-changed', handleProfileChange)
  }, [generateRecommendations, user?.onboardingCompleted])

  if (!user || !user.onboardingCompleted) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkle size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-h3 mb-2">Complete Your Profile Setup</h3>
          <p className="text-muted-foreground mb-4">
            Finish setting up your profile to receive personalised recommendations.
          </p>
          <Button>Complete Setup</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {notifications.length > 0 && (
        <Card className="bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                <Bell size={20} className="text-accent" />
              </div>
              <div>
                <CardTitle className="text-h3">Smart Alerts</CardTitle>
                <CardDescription>
                  {user.userType === 'collector'
                    ? 'AI-detected pickup opportunities nearby'
                    : 'High-impact community needs waiting for you'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <Card key={notification.id} className={`p-4 ${notification.read ? 'opacity-60' : 'bg-accent/5'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className={urgencyBadgeClass[notification.urgency]}>
                          {notification.urgency} priority
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    </div>
                    {!notification.read && onMarkAsRead && (
                      <Button variant="ghost" size="sm" onClick={() => onMarkAsRead(notification.id)}>
                        Mark read
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Sparkle size={20} className="text-primary" />
              </div>
              <div>
                <CardTitle className="text-h3">
                  {user.userType === 'collector' ? 'AI-curated for you' : 'Community impact opportunities'}
                </CardTitle>
                <CardDescription>
                  {user.userType === 'collector'
                    ? 'Matching you with high-value items close to home'
                    : 'Helping you direct donations where they matter most'}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void generateRecommendations()} disabled={isLoading}>
              Refresh recommendations
            </Button>
          </div>
        </CardHeader>
      </Card>

      {user.userType === 'collector' ? (
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Gathering items around {user.postcode}…
              </CardContent>
            </Card>
          ) : recommendations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">We are building your personalised feed</h3>
                <p className="text-muted-foreground mb-4">
                  Our AI is analysing local inventory to surface items matched to collectors like you.
                </p>
                <Button onClick={() => void generateRecommendations()} disabled={isLoading}>
                  <Sparkle size={16} className="mr-2" />
                  Generate recommendations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((item) => (
                <Card key={item.id} className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={urgencyBadgeClass[item.urgency]}>
                          {item.urgency} priority
                        </Badge>
                        <Badge variant="secondary" className={conditionBadgeClass[item.condition]}>
                          {item.condition}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.listedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-medium text-base line-clamp-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {item.location}
                        </span>
                        <span>{item.distance}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-green-600">
                          <Leaf size={14} />
                          -{item.co2Impact}kg CO₂
                        </span>
                        <span className="text-muted-foreground">
                          {item.donorName} ({item.donorRating.toFixed(1)}★)
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-accent/10 rounded-lg border border-accent/20 text-sm">
                      <p className="font-medium text-accent-foreground">
                        Match confidence: {Math.floor(Math.random() * 20) + 80}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{item.matchReason}</p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Claim item
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Finding high-impact causes near {user.postcode}…
              </CardContent>
            </Card>
          ) : communityNeeds.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Discovering impact opportunities</h3>
                <p className="text-muted-foreground mb-4">
                  We are identifying local organisations and families where your donations will matter most.
                </p>
                <Button onClick={() => void generateRecommendations()} disabled={isLoading}>
                  <Heart size={16} className="mr-2" />
                  Find community needs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communityNeeds.map((need) => (
                <Card key={need.id} className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-accent/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className={urgencyBadgeClass[need.urgency]}>
                        {need.urgency} need
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {need.category}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-medium text-base line-clamp-1">{need.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{need.description}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {need.location}
                        </span>
                        <span>{need.distance}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-blue-600">
                          <Users size={14} />
                          {need.peopleHelped} people helped
                        </span>
                        <span className="flex items-center gap-1 text-green-600">
                          <Leaf size={14} />
                          -{need.co2ImpactPotential}kg CO₂
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>Requested by {need.requestedBy}</span>
                        <span className="mx-1">•</span>
                        <span>{new Date(need.requestedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-sm">
                      <p className="font-medium text-primary-foreground">
                        Impact score: {Math.floor(Math.random() * 30) + 70}/100
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{need.matchReason}</p>
                    </div>

                    <Button className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <Heart size={16} className="mr-2" />
                      Donate to this need
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
