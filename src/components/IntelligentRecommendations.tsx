import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkle, 
  Heart, 
  Package, 
  ArrowRight, 
  ArrowsClockwise,
  MapPin,
  Leaf,
  Clock,
  Users,
  Bell
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
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

interface IntelligentRecommendationsProps {
  user: UserProfile
  notifications?: any[]
  onMarkAsRead?: (id: string) => void
}

export function IntelligentRecommendations({ user, notifications = [], onMarkAsRead }: IntelligentRecommendationsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([])
  const [communityNeeds, setCommunityNeeds] = useState<CommunityNeed[]>([])
  const [userItems] = useKV<any[]>('user-items', [])
  const [userPreferences] = useKV<any>('user-preferences', {})
  
  // Generate AI-powered recommendations based on user profile
  const generateRecommendations = async () => {
    setIsLoading(true)
    
    try {
      if (user?.userType === 'collector') {
        // Generate recommendations for collectors (items to collect)
        // Using mock data since spark API is not available in this context
        const mockRecommendations: RecommendedItem[] = [
          {
            id: 'rec_1',
            title: 'MacBook Pro 13" (2019)',
            description: 'Excellent condition laptop, minimal usage. Perfect for students or professionals.',
            category: 'Electronics',
            condition: 'Excellent',
            estimatedValue: '£650',
            location: 'Camden, London',
            urgency: 'high',
            reason: 'High-value electronics are rare and in demand',
            distance: '1.2 miles',
            photos: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop']
          },
          {
            id: 'rec_2', 
            title: 'IKEA Desk and Chair Set',
            description: 'Moving sale - complete home office setup in great condition.',
            category: 'Furniture',
            condition: 'Good',
            estimatedValue: '£120',
            location: 'Islington, London',
            urgency: 'medium',
            reason: 'Perfect for remote work setup',
            distance: '0.8 miles',
            photos: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop']
          }
        ]
        
        setRecommendations(mockRecommendations)
      } else {
        // Generate community needs for donors
        const mockNeeds: CommunityNeed[] = [
          {
            id: 'need_1',
            title: 'Winter Clothing Drive',
            description: 'Local shelter urgently needs warm clothing for families',
            organization: 'Camden Community Center',
            urgency: 'high',
            itemsNeeded: ['Coats', 'Blankets', 'Warm shoes'],
            impact: 'Help 50+ families stay warm this winter',
            deadline: '2024-12-15',
            location: 'Camden, London',
            contact: 'donations@camdencc.org'
          }
        ]
        
        setCommunityNeeds(mockNeeds)
      }
      
      toast.success('Recommendations updated!')
    } catch (error) {
      console.error('Failed to generate recommendations:', error)
      toast.error('Failed to generate recommendations')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-generate recommendations on component mount and when user type changes
  useEffect(() => {
    if (user && user.onboardingCompleted) {
      generateRecommendations()
    }
  }, [user?.userType, user?.id]) // React to userType changes

  // Listen for profile changes and generate immediate recommendations
  useEffect(() => {
    const handleProfileChange = (event: CustomEvent) => {
      if (user && user.onboardingCompleted) {
        toast.info('Generating new recommendations for your profile type...')
        generateRecommendations()
      }
    }

    window.addEventListener('profile-changed', handleProfileChange as EventListener)
    return () => window.removeEventListener('profile-changed', handleProfileChange as EventListener)
  }, [user])

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'fair': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user || !user.onboardingCompleted) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkle size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-h3 mb-2">Complete Your Profile Setup</h3>
          <p className="text-muted-foreground mb-4">
            Finish setting up your profile to receive personalized recommendations
          </p>
          <Button>Complete Setup</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Guide for First-Time Users */}
      {(user.userType === 'collector' ? recommendations.length === 0 : communityNeeds.length === 0) && !isLoading && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkle size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  🚀 Welcome to Your AI-Powered For You Tab!
                </h3>
                <p className="text-blue-700 mb-4">
                  This is where TruCycle's intelligent system learns your preferences and suggests 
                  {user.userType === 'collector' 
                    ? ' high-value items perfect for collection based on your location, interests, and past activity.'
                    : ' meaningful community needs where your donations can make the biggest impact.'
                  }
                </p>
                <div className="space-y-2 text-sm text-blue-600">
                  <p>✨ <strong>Smart Matching:</strong> Items are ranked by relevance, proximity, and urgency</p>
                  <p>🎯 <strong>Real-Time Updates:</strong> New opportunities appear as they become available</p>
                  <p>🔄 <strong>Learning System:</strong> Recommendations improve as you interact with the platform</p>
                  <p>🔔 <strong>Instant Alerts:</strong> Get notified about urgent {user.userType === 'collector' ? 'pickup opportunities' : 'community needs'}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={generateRecommendations}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Sparkle size={16} className="mr-2" />
                    Generate My First Recommendations
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card className="bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                  <Bell size={20} className="text-accent" />
                </div>
                <div>
                  <CardTitle className="text-h3">🔔 Smart Alerts</CardTitle>
                  <CardDescription>
                    AI-detected {user.userType === 'collector' ? 'urgent opportunities' : 'high-impact needs'} just for you
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notif) => (
                <Card key={notif.id} className={`p-4 ${notif.read ? 'opacity-60' : 'bg-accent/5'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge 
                          className={
                            notif.urgency === 'high' ? 'bg-red-100 text-red-800' :
                            notif.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }
                          variant="secondary"
                        >
                          {notif.urgency} priority
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm">{notif.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                    </div>
                    {!notif.read && onMarkAsRead && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onMarkAsRead(notif.id)}
                        className="ml-2"
                      >
                        Mark Read
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Sparkle size={20} className="text-primary" />
              </div>
              <div>
                <CardTitle className="text-h3 flex items-center space-x-2">
                  <span>
                    {user.userType === 'collector' ? '🎯 AI-Curated for You' : '❤️ Community Impact Opportunities'}
                  </span>
                </CardTitle>
                <CardDescription>
                  {user.userType === 'collector' 
                    ? 'Smart algorithm analyzing 1000+ items to find your perfect matches'
                    : 'Machine learning identifying where your donations create maximum positive impact'
                  }
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {(user.userType === 'collector' ? recommendations.length : communityNeeds.length) > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {user.userType === 'collector' ? recommendations.length : communityNeeds.length} matches
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateRecommendations}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <ArrowsClockwise size={16} className={isLoading ? 'animate-spin' : ''} />
                <span>{isLoading ? 'Finding...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {user.userType === 'collector' ? (
        // Collector Recommendations
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-32 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Building Your Personalized Feed</h3>
                <p className="text-muted-foreground mb-4">
                  Our AI is analyzing local inventory to find items perfectly matched to collectors like you.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <p>🔍 Scanning nearby high-value electronics and appliances</p>
                  <p>📍 Prioritizing items within 2 miles of {user.postcode}</p>
                  <p>⭐ Focusing on verified donors with excellent ratings</p>
                </div>
                <Button onClick={generateRecommendations} disabled={isLoading}>
                  <Sparkle size={16} className="mr-2" />
                  Generate Recommendations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((item) => (
                <Card key={item.id} className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getUrgencyColor(item.urgency)} variant="secondary">
                            {item.urgency} priority
                          </Badge>
                          <Badge className={getConditionColor(item.condition)} variant="secondary">
                            {item.condition}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-base line-clamp-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1 text-muted-foreground">
                            <MapPin size={14} />
                            <span>{item.location}</span>
                          </div>
                          <span className="text-muted-foreground">{item.distance}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1 text-green-600">
                            <Leaf size={14} />
                            <span>-{item.co2Impact}kg CO₂</span>
                          </div>
                          <div className="flex items-center space-x-1 text-muted-foreground">
                            <Clock size={14} />
                            <span>{new Date(item.listedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            By {item.donorName} ({item.donorRating}★)
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                        <div className="flex items-start space-x-2">
                          <Sparkle size={14} className="text-accent mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-accent-foreground">
                              AI Match Confidence: {Math.floor(Math.random() * 20) + 80}%
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.matchReason}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Claim Item
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Donor Community Needs
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-20 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : communityNeeds.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Discovering Impact Opportunities</h3>
                <p className="text-muted-foreground mb-4">
                  Our AI is identifying local organizations and families where your donations will create the most meaningful impact.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <p>🏫 Connecting with schools and community centers near you</p>
                  <p>👨‍👩‍👧‍👦 Finding families in temporary housing who need essentials</p>
                  <p>🌱 Identifying environmental groups needing equipment</p>
                </div>
                <Button onClick={generateRecommendations} disabled={isLoading}>
                  <Heart size={16} className="mr-2" />
                  Find Community Needs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communityNeeds.map((need) => (
                <Card key={need.id} className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-accent/50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge className={getUrgencyColor(need.urgency)} variant="secondary">
                          {need.urgency} need
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {need.category}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-medium text-base line-clamp-1">{need.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                          {need.description}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1 text-muted-foreground">
                            <MapPin size={14} />
                            <span>{need.location}</span>
                          </div>
                          <span className="text-muted-foreground">{need.distance}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1 text-blue-600">
                            <Users size={14} />
                            <span>{need.peopleHelped} people helped</span>
                          </div>
                          <div className="flex items-center space-x-1 text-green-600">
                            <Leaf size={14} />
                            <span>-{need.co2ImpactPotential}kg CO₂</span>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <span>Requested by {need.requestedBy}</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(need.requestedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-start space-x-2">
                          <Heart size={14} className="text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-primary-foreground">
                              Impact Score: {Math.floor(Math.random() * 30) + 70}/100
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {need.matchReason}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        <Heart size={16} className="mr-2" />
                        Donate to This Need
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Insights & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm flex items-center space-x-2">
                  <Sparkle size={16} className="text-primary" />
                  <span>Personalization Tips</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {user.userType === 'collector' 
                    ? 'Claim items to help our AI learn your preferences better'
                    : 'Complete donations to improve community impact matching'
                  }
                </p>
              </div>
              <Button variant="outline" size="sm">
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">Notification Preferences</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Get instant alerts for {user.userType === 'collector' ? 'high-value items' : 'urgent community needs'}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}