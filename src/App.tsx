import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { MapPin, Recycle, ArrowsClockwise, Leaf, Question as Search, Plus, User, QrCode, Bell } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { ItemListing, ItemListingForm, ProfileDashboard, DropOffMap, CarbonTracker, ShopScanner, DemoGuide } from './components'
import type { DropOffLocation } from './components/dropOffLocations'
import { AuthDialog, ProfileOnboarding } from './components/auth'
import { MessageCenter, MessageNotification } from './components/messaging'
import type { ClaimRequest } from '@/hooks/useExchangeManager'
import { useInitializeSampleData, useRecommendationNotifications } from '@/hooks'

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

function App() {
  const [currentTab, setCurrentTab] = useState('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useKV<UserProfile | null>('current-user', null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showMessageCenter, setShowMessageCenter] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showShopScanner, setShowShopScanner] = useState(false)
  const [showDemoGuide] = useKV<boolean>('show-demo-guide', true)
  const [pendingFulfillmentMethod, setPendingFulfillmentMethod] = useState<'pickup' | 'dropoff' | null>(null)
  const [pendingDropOffLocation, setPendingDropOffLocation] = useState<DropOffLocation | null>(null)
  const [messageCenterView, setMessageCenterView] = useState<'chats' | 'requests'>('chats')
  const [messageCenterItemId, setMessageCenterItemId] = useState<string | undefined>()
  const [messageCenterChatId, setMessageCenterChatId] = useState<string | undefined>()
  
  const { initializeSampleChats } = useInitializeSampleData()
  const { unreadCount, triggerUrgentNotifications } = useRecommendationNotifications(user ?? null)

  // Check for shop scanner mode in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('mode') === 'shop-scanner') {
      setShowShopScanner(true)
    }
  }, [])

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true)
    }
  }, [user])

  // Initialize sample data when user logs in
  useEffect(() => {
    if (user) {
      initializeSampleChats()
    }
  }, [initializeSampleChats, user])

  useEffect(() => {
    const handleClaimRequested = (event: Event) => {
      const detail = (event as CustomEvent<{ request: ClaimRequest }>).detail
      if (user && detail.request.donorId === user.id) {
        toast.info(`${detail.request.collectorName} wants "${detail.request.itemTitle}"`)
        handleOpenMessages({ itemId: detail.request.itemId, initialView: 'requests' })
      }
    }

    const handleClaimApproved = (event: Event) => {
      const detail = (event as CustomEvent<{ request: ClaimRequest; chatId?: string }>).detail
      if (user && detail.request.collectorId === user.id) {
        toast.success(`Your request for "${detail.request.itemTitle}" was approved!`)
        handleOpenMessages({ itemId: detail.request.itemId, chatId: detail.chatId, initialView: 'chats' })
      }
    }

    const handleCollectionConfirmed = (event: Event) => {
      const detail = (event as CustomEvent<{ request: ClaimRequest; rewardPoints: number }>).detail
      if (user && detail.request.donorId === user.id) {
        toast.success(`Collection confirmed! ${detail.rewardPoints} GreenPoints added to your rewards.`)
      } else if (user && detail.request.collectorId === user.id) {
        toast.success(`Thanks for collecting "${detail.request.itemTitle}". Enjoy your new item!`)
      }
    }

    window.addEventListener('exchange-claim-requested', handleClaimRequested as EventListener)
    window.addEventListener('exchange-claim-approved', handleClaimApproved as EventListener)
    window.addEventListener('exchange-collection-confirmed', handleCollectionConfirmed as EventListener)

    return () => {
      window.removeEventListener('exchange-claim-requested', handleClaimRequested as EventListener)
      window.removeEventListener('exchange-claim-approved', handleClaimApproved as EventListener)
      window.removeEventListener('exchange-collection-confirmed', handleCollectionConfirmed as EventListener)
    }
  }, [handleOpenMessages, user])

  const handleSignIn = () => {
    setAuthMode('signin')
    setShowAuthDialog(true)
  }

  const handleSignUp = () => {
    setAuthMode('signup')
    setShowAuthDialog(true)
  }

  const handleAuthComplete = () => {
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  const handleToggleUserType = () => {
    if (!user) return
    
    const newUserType: 'donor' | 'collector' = user.userType === 'donor' ? 'collector' : 'donor'
    const updatedUser: UserProfile = { ...user, userType: newUserType }
    setUser(updatedUser)
    
    // Trigger demo notification for the switched profile
    const demoNotification = {
      id: `demo-${Date.now()}`,
      userId: user.id,
      type: newUserType === 'collector' ? 'item_match' : 'community_need',
      title: newUserType === 'collector' 
        ? 'New High-Value Items Available!' 
        : 'Urgent Community Need Alert!',
      message: newUserType === 'collector'
        ? 'Several quality electronics and furniture items just became available in your area.'
        : 'Local shelter urgently needs winter clothing and bedding for families.',
      urgency: 'high',
      createdAt: new Date().toISOString(),
      read: false,
      actionUrl: newUserType === 'collector' ? '/browse' : '/profile'
    }
    
    // Dispatch custom event for demo notification
    window.dispatchEvent(new CustomEvent('add-demo-notification', {
      detail: { notification: demoNotification }
    }))
    
    // Show immediate toast
    toast(demoNotification.title, {
      description: demoNotification.message,
      action: {
        label: newUserType === 'collector' ? 'View Items' : 'See Needs',
        onClick: () => {
          if (newUserType === 'collector') {
            setCurrentTab('browse')
          } else {
            setCurrentTab('profile')
          }
        }
      }
    })
  }

  const handleOpenMessages = useCallback((options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => {
    if (options?.initialView) {
      setMessageCenterView(options.initialView)
    } else {
      setMessageCenterView('chats')
    }
    setMessageCenterItemId(options?.itemId)
    setMessageCenterChatId(options?.chatId)
    setShowMessageCenter(true)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search functionality will be implemented in ItemListing component
  }

  const handleDonationFlowStart = (method: 'pickup' | 'dropoff') => {
    setPendingFulfillmentMethod(method)
    if (method === 'dropoff') {
      setPendingDropOffLocation(null)
      setCurrentTab('dropoff')
    } else {
      setCurrentTab('list')
    }
  }

  const handleDropOffPlanned = (location: DropOffLocation) => {
    setPendingFulfillmentMethod('dropoff')
    setPendingDropOffLocation(location)
    setCurrentTab('list')
  }

  // If in shop scanner mode, render only the scanner
  if (showShopScanner) {
    return <ShopScanner />
  }

  return (
    <div className="min-h-screen bg-background font-roboto">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Recycle size={20} className="text-primary-foreground" />
              </div>
              <h1 className="text-h2 text-foreground">TruCycle</h1>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </form>
              
              {user ? (
                <div className="flex items-center space-x-2">
              <MessageNotification onOpenMessages={() => handleOpenMessages()} />
                  
                  {/* Recommendation Notifications */}
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentTab('profile')}
                      className="relative"
                      title={`${unreadCount} new ${user?.userType === 'collector' ? 'item recommendation' : 'community need'}${unreadCount !== 1 ? 's' : ''}`}
                    >
                      <Bell size={16} />
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 text-xs w-5 h-5 p-0 flex items-center justify-center"
                      >
                        {unreadCount}
                      </Badge>
                    </Button>
                  )}
                  
                  {/* Trigger Urgent Notifications */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (triggerUrgentNotifications) {
                        triggerUrgentNotifications()
                      }
                    }}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    title="Demo: Experience urgent alerts"
                  >
                    <Bell size={16} className="animate-pulse" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowShopScanner(true)}
                    title="Shop Scanner (For Partner Shops)"
                  >
                    <QrCode size={16} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentTab('profile')}
                  >
                    <User size={16} className="mr-2" />
                    {user?.name && typeof user.name === 'string' ? user.name.split(' ')[0] : 'User'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowShopScanner(true)}
                    title="Shop Scanner (For Partner Shops)"
                  >
                    <QrCode size={16} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSignIn}>
                    Sign In
                  </Button>
                  <Button size="sm" onClick={handleSignUp}>
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 md:flex md:w-auto">
              <TabsTrigger value="browse" className="flex items-center space-x-2">
                <Search size={16} />
                <span className="hidden sm:inline">Browse</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center space-x-2">
                <Plus size={16} />
                <span className="hidden sm:inline">List Item</span>
              </TabsTrigger>
              <TabsTrigger value="dropoff" className="flex items-center space-x-2">
                <MapPin size={16} />
                <span className="hidden sm:inline">Drop-off</span>
              </TabsTrigger>
              <TabsTrigger value="impact" className="flex items-center space-x-2">
                <Leaf size={16} />
                <span className="hidden sm:inline">Impact</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User size={16} />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsContent value="browse">
            <ItemListing
              searchQuery={searchQuery}
              onStartDonationFlow={handleDonationFlowStart}
              onOpenMessages={handleOpenMessages}
            />
          </TabsContent>

          <TabsContent value="list">
            <ItemListingForm
              onComplete={() => setCurrentTab('browse')}
              prefillFulfillmentMethod={pendingFulfillmentMethod}
              prefillDropOffLocation={pendingDropOffLocation}
              onFulfillmentPrefillHandled={() => setPendingFulfillmentMethod(null)}
              onDropOffPrefillHandled={() => setPendingDropOffLocation(null)}
            />
          </TabsContent>

          <TabsContent value="dropoff">
            <DropOffMap
              onPlanDropOff={handleDropOffPlanned}
              highlightGuidedFlow={pendingFulfillmentMethod === 'dropoff'}
            />
          </TabsContent>

          <TabsContent value="impact">
            <CarbonTracker />
          </TabsContent>

          <TabsContent value="profile">
            {user && showDemoGuide && currentTab === 'profile' && (
              <DemoGuide
                onSwitchProfile={handleToggleUserType}
                currentUserType={user.userType}
                userName={user?.name && typeof user.name === 'string' ? user.name.split(' ')[0] : 'User'}
              />
            )}
            <ProfileDashboard />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Recycle size={16} className="text-primary-foreground" />
                </div>
                <span className="font-medium">TruCycle</span>
              </div>
              <p className="text-small text-muted-foreground">
                Sustainable item exchange platform for London communities
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Features</h3>
              <div className="space-y-2 text-small text-muted-foreground">
                <p>Item Exchange</p>
                <p>Donation Platform</p>
                <p>Carbon Tracking</p>
                <p>Drop-off Points</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Support</h3>
              <div className="space-y-2 text-small text-muted-foreground">
                <p>Help Center</p>
                <p>Community Guidelines</p>
                <p>Safety Tips</p>
                <p>Contact Us</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Environmental Impact</h3>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Leaf size={12} />
                  <span>CO2 Saved</span>
                </Badge>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <ArrowsClockwise size={12} />
                  <span>Items Exchanged</span>
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-small text-muted-foreground">
            <p>&copy; 2024 TruCycle. Building sustainable communities in London.</p>
          </div>
        </div>
      </footer>

      {/* Authentication Dialogs */}
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

      <ProfileOnboarding 
        open={showOnboarding} 
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* Message Center */}
      <MessageCenter
        open={showMessageCenter}
        onOpenChange={(open) => {
          setShowMessageCenter(open)
          if (!open) {
            setMessageCenterItemId(undefined)
            setMessageCenterChatId(undefined)
            setMessageCenterView('chats')
          }
        }}
        itemId={messageCenterItemId}
        chatId={messageCenterChatId}
        initialView={messageCenterView}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}

export default App
