import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import {
  ArrowsClockwise,
  Leaf,
  Question as Search,
  User,
  QrCode,
  Bell,
  Package,
  Storefront,
  ChatCircle,
  House
} from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import {
  ItemListing,
  ItemListingForm,
  MyListingsView,
  ProfileDashboard,
  DropOffMap,
  CarbonTracker,
  ShopScanner,
  DemoGuide,
  Homepage,
} from './components'
import { ShopScannerOverview } from './components/ShopScannerOverview'
import { TruCycleGlyph } from './components/icons/TruCycleGlyph'
import { NotificationList, type Notification } from './components/NotificationList'
import type { DropOffLocation } from './components/dropOffLocations'
import { AuthDialog, ProfileOnboarding } from './components/auth'
import { MessageCenter, MessageNotification } from './components/messaging'
import type { ClaimRequest } from '@/hooks/useExchangeManager'
import { useInitializeSampleData, useRecommendationNotifications, useNotifications } from '@/hooks'
import type { ListingCompletionDetails } from './components/ItemListingForm'

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
  partnerAccess?: boolean
}

function App() {
  const [currentTab, setCurrentTabState] = useState('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useKV<UserProfile | null>('current-user', null)
  const [onboardingDismissals, setOnboardingDismissals] = useKV<Record<string, boolean>>('onboarding-dismissals', {})
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingMode, setOnboardingMode] = useState<'onboarding' | 'edit'>('onboarding')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showShopScanner, setShowShopScanner] = useState(false)
  const [shouldResumeListingAfterAuth, setShouldResumeListingAfterAuth] = useState(false)
  const [showDemoGuide, setShowDemoGuide] = useKV<boolean>('show-demo-guide', true)
  const [pendingFulfillmentMethod, setPendingFulfillmentMethod] = useState<'pickup' | 'dropoff' | null>(null)
  const [pendingDropOffLocation, setPendingDropOffLocation] = useState<DropOffLocation | null>(null)
  const [pendingListingIntent, setPendingListingIntent] = useState<'exchange' | 'donate' | 'recycle' | null>(null)
  const [messageCenterView, setMessageCenterView] = useState<'chats' | 'requests'>('chats')
  const [messageCenterItemId, setMessageCenterItemId] = useState<string | undefined>()
  const [messageCenterChatId, setMessageCenterChatId] = useState<string | undefined>()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  
  const { initializeSampleChats } = useInitializeSampleData()
  const {
    notifications: systemNotifications,
    markAsRead: markSystemNotificationAsRead,
    markAllAsRead: markAllSystemNotifications,
    deleteNotification: deleteSystemNotification,
    unreadCount: systemUnreadCount,
  } = useNotifications()
  const {
    notifications: recommendationNotifications,
    unreadCount: recommendationUnreadCount,
    markAsRead: markRecommendationAsRead,
  } = useRecommendationNotifications(user ?? null)

  const navigateToTab = useCallback((nextTab: string) => {
    setCurrentTabState(nextTab)
  }, [])

  const navTabs = useMemo(() => {
    const isCollector = user?.userType === 'collector'
    const isDonor = user?.userType === 'donor'

    return [
      { value: 'home', label: 'Home', Icon: House, show: true },
      { value: 'browse', label: 'Browse', Icon: Search, show: !isDonor },
      { value: 'listings', label: isCollector ? 'My Collected Items' : 'My Listed Items', Icon: Package, show: true },
      { value: 'messages', label: 'Messages', Icon: ChatCircle, show: Boolean(user) },
      { value: 'dropoff', label: 'Partner Shops', Icon: Storefront, show: !isCollector },
      { value: 'impact', label: 'Impact', Icon: Leaf, show: true },
      { value: 'profile', label: 'Profile', Icon: User, show: true },
    ].filter((tab) => tab.show)
  }, [user])

  const hasHomeTab = navTabs.some((tab) => tab.value === 'home')
  const hasBrowseTab = navTabs.some((tab) => tab.value === 'browse')
  const hasDropOffTab = navTabs.some((tab) => tab.value === 'dropoff')
  const hasDismissedOnboarding = user ? Boolean(onboardingDismissals[user.id]) : false

  const userFirstName = user?.name && typeof user.name === 'string' ? user.name.split(' ')[0] : undefined

  useEffect(() => {
    const availableTabs = new Set<string>([...navTabs.map(tab => tab.value), 'list'])

    if (!availableTabs.has(currentTab)) {
      const fallbackTab = navTabs[0]?.value ?? currentTab
      if (fallbackTab && fallbackTab !== currentTab) {
        setCurrentTabState(fallbackTab)
      }
    }
  }, [navTabs, currentTab])

  // Check for shop scanner mode in URL
  const handleOpenMessages = useCallback((options?: { itemId?: string; chatId?: string; initialView?: 'chats' | 'requests' }) => {
    if (options?.initialView) {
      setMessageCenterView(options.initialView)
    } else {
      setMessageCenterView('chats')
    }
    setMessageCenterItemId(options?.itemId)
    setMessageCenterChatId(options?.chatId)
    setNotificationsOpen(false)
    navigateToTab('messages')
  }, [navigateToTab, setNotificationsOpen])

  const handleDemoGuideComplete = useCallback(() => {
    setShowDemoGuide(false)
  }, [setShowDemoGuide])

  useEffect(() => {
    if (currentTab !== 'messages') {
      setMessageCenterItemId(undefined)
      setMessageCenterChatId(undefined)
      setMessageCenterView('chats')
    }
  }, [currentTab])

  useEffect(() => {
    if (user && shouldResumeListingAfterAuth) {
      setShouldResumeListingAfterAuth(false)
      navigateToTab('list')
    }
  }, [user, shouldResumeListingAfterAuth, navigateToTab])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('mode') === 'shop-scanner') {
      setShowShopScanner(true)
    }
  }, [])

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !user.onboardingCompleted && !hasDismissedOnboarding) {
      setOnboardingMode('onboarding')
      setShowOnboarding(true)
    }
  }, [user, hasDismissedOnboarding])

  // Initialize sample data when user logs in
  useEffect(() => {
    if (user) {
      initializeSampleChats()
    }
  }, [initializeSampleChats, user])

  useEffect(() => {
    const handleOpenProfileOnboarding = () => {
      setOnboardingMode('edit')
      setShowOnboarding(true)
      if (user) {
        setOnboardingDismissals((prev) => ({ ...prev, [user.id]: false }))
      }
    }

    window.addEventListener('open-profile-onboarding', handleOpenProfileOnboarding)
    const handleOpenAuthDialog = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: 'signin' | 'signup' }>).detail
      if (detail?.mode) {
        setAuthMode(detail.mode)
      }
      setShowAuthDialog(true)
    }

    window.addEventListener('open-auth-dialog', handleOpenAuthDialog)
    return () => {
      window.removeEventListener('open-profile-onboarding', handleOpenProfileOnboarding)
      window.removeEventListener('open-auth-dialog', handleOpenAuthDialog)
    }
  }, [user, setOnboardingDismissals])

  useEffect(() => {
    if (user && user.onboardingCompleted && onboardingDismissals[user.id]) {
      setOnboardingDismissals((prev) => ({ ...prev, [user.id]: false }))
    }
  }, [user, onboardingDismissals, setOnboardingDismissals])

  useEffect(() => {
    setOnboardingMode('onboarding')
  }, [user?.id])

  const trayNotifications = useMemo(() => {
    const items: Array<{ source: 'system' | 'recommendation'; notification: Notification }> = []

    systemNotifications.forEach((notification) => {
      items.push({ source: 'system', notification })
    })

    recommendationNotifications.forEach((notification) => {
      items.push({
        source: 'recommendation',
        notification: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type === 'community_need' ? 'community_need' : 'item_match',
          title: notification.title,
          message: notification.message,
          urgency: notification.type === 'urgent_request' ? 'urgent' : notification.urgency,
          createdAt: notification.createdAt,
          read: notification.read,
          actionUrl: notification.actionUrl,
          metadata: notification.itemId ? { itemId: notification.itemId } : undefined,
        },
      })
    })

    return items.sort((a, b) => new Date(b.notification.createdAt).getTime() - new Date(a.notification.createdAt).getTime())
  }, [systemNotifications, recommendationNotifications])

  const notificationSourceMap = useMemo(() => {
    const map = new Map<string, 'system' | 'recommendation'>()
    trayNotifications.forEach(({ source, notification }) => {
      map.set(notification.id, source)
    })
    return map
  }, [trayNotifications])

  const hasUnreadNotifications = user ? trayNotifications.some(({ notification }) => !notification.read) : false
  const totalUnreadNotifications = user ? systemUnreadCount + recommendationUnreadCount : 0

  const handleNotificationMarkAsRead = useCallback((id: string) => {
    const source = notificationSourceMap.get(id)
    if (source === 'system') {
      markSystemNotificationAsRead(id)
    } else if (source === 'recommendation') {
      markRecommendationAsRead(id)
    }
  }, [markSystemNotificationAsRead, markRecommendationAsRead, notificationSourceMap])

  const handleNotificationDelete = useCallback((id: string) => {
    const source = notificationSourceMap.get(id)
    if (source === 'system') {
      deleteSystemNotification(id)
    } else if (source === 'recommendation') {
      markRecommendationAsRead(id)
    }
  }, [deleteSystemNotification, markRecommendationAsRead, notificationSourceMap])

  const handleNotificationsMarkAll = useCallback(() => {
    markAllSystemNotifications()
    recommendationNotifications.forEach((notification) => markRecommendationAsRead(notification.id))
    setNotificationsOpen(false)
  }, [markAllSystemNotifications, markRecommendationAsRead, recommendationNotifications, setNotificationsOpen])

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

    if (!user) {
      setShouldResumeListingAfterAuth(false)
    }
  }

  const handleOnboardingOpenChange = useCallback((open: boolean) => {
    setShowOnboarding(open)
    if (!open) {
      if (user && onboardingMode === 'onboarding' && !user.onboardingCompleted) {
        setOnboardingDismissals((prev) => ({ ...prev, [user.id]: true }))
      }
      setOnboardingMode('onboarding')
    }
  }, [user, onboardingMode, setOnboardingDismissals])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    setOnboardingMode('onboarding')
    if (user) {
      setOnboardingDismissals((prev) => ({ ...prev, [user.id]: false }))
    }
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
            navigateToTab('browse')
          } else {
            navigateToTab('profile')
          }
        }
      }
    })
  }


  const handleSearch = () => {
    const fallbackTab = hasBrowseTab
      ? 'browse'
      : navTabs.find((tab) => tab.value === 'listings')?.value ?? navTabs[0]?.value ?? currentTab
    navigateToTab(fallbackTab)
    if (fallbackTab === 'browse') {
      document.getElementById('item-listing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleLogoClick = useCallback(() => {
    if (hasHomeTab) {
      navigateToTab('home')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [hasHomeTab, navigateToTab])


  const handleListingComplete = useCallback(({ listing, qrCode }: ListingCompletionDetails) => {
    const fulfillment = listing.fulfillmentMethod ?? 'pickup'
    const isDropOff = fulfillment === 'dropoff'

    navigateToTab('listings')
    toast.success(isDropOff ? 'Drop-off QR ready!' : 'Pickup QR ready!', {
      description: `Transaction ${qrCode.transactionId} for "${listing.title}" is saved under your ${
        isDropOff ? 'partner shop drop-offs' : 'collection pickups'
      }.`
    })
  }, [navigateToTab])

  const handleDropOffPlanned = (location: DropOffLocation) => {
    setPendingFulfillmentMethod('dropoff')
    setPendingDropOffLocation(location)
    setPendingListingIntent('donate')
    navigateToTab('list')
  }

  const handleStartListing = useCallback((intent?: 'exchange' | 'donate' | 'recycle') => {
    const fallbackIntent: 'exchange' | 'donate' | 'recycle' = intent ?? (user?.userType === 'collector' ? 'exchange' : 'donate')

    setPendingListingIntent(fallbackIntent)
    setPendingFulfillmentMethod(fallbackIntent === 'donate' ? 'dropoff' : 'pickup')
    setPendingDropOffLocation(null)

    if (!user) {
      setShouldResumeListingAfterAuth(true)
      setAuthMode('signup')
      setShowAuthDialog(true)
      return
    }

    navigateToTab('list')
  }, [navigateToTab, user, user?.userType])

  // If in shop scanner mode, render only the scanner
  if (showShopScanner) {
    if (user?.partnerAccess) {
      return <ShopScanner onClose={() => setShowShopScanner(false)} />
    }
    return <ShopScannerOverview onClose={() => setShowShopScanner(false)} />
  }

  return (
    <div className="min-h-screen bg-background font-roboto">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleLogoClick}
                className="group flex items-center space-x-3 rounded-full border border-transparent px-2 py-1 transition hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                title="Go to homepage"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-emerald-500 text-primary-foreground shadow-lg ring-2 ring-primary/30 transition-transform group-hover:scale-105">
                  <TruCycleGlyph className="h-8 w-8 drop-shadow-sm" />
                </div>
                <h1 className="text-h2 text-foreground drop-shadow-sm">TruCycle</h1>
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              {user ? (
                <div className="flex items-center space-x-2">
                  <MessageNotification onOpenMessages={handleOpenMessages} />

                  <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative"
                        title={totalUnreadNotifications > 0 ? `${totalUnreadNotifications} new notification${totalUnreadNotifications === 1 ? '' : 's'}` : 'Notifications'}
                      >
                        <Bell size={16} />
                        {totalUnreadNotifications > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 text-xs w-5 h-5 p-0 flex items-center justify-center"
                          >
                            {totalUnreadNotifications > 99 ? '99+' : totalUnreadNotifications}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0" align="end">
                      <NotificationList
                        notifications={trayNotifications.map(({ notification }) => notification)}
                        onMarkAsRead={handleNotificationMarkAsRead}
                        onMarkAllAsRead={hasUnreadNotifications ? handleNotificationsMarkAll : undefined}
                        onDeleteNotification={handleNotificationDelete}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShopScanner(true)}
                    title={user?.partnerAccess ? 'Open partner shop scanner' : 'View your QR activity'}
                    className={user?.partnerAccess ? 'border-primary/50 text-primary' : undefined}
                  >
                    <QrCode size={16} />
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigateToTab('profile')}
                          aria-label="Open profile"
                        >
                          <User size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span>{userFirstName ? `Open profile (${userFirstName})` : 'Open profile'}</span>
                      </TooltipContent>
                    </Tooltip>
                    {userFirstName && (
                      <span className="hidden sm:inline text-sm text-muted-foreground">{userFirstName}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
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
          <Tabs value={currentTab} onValueChange={navigateToTab} className="w-full">
            <TabsList className="grid w-full grid-flow-col auto-cols-fr md:flex md:w-auto md:gap-2">
              {navTabs.map(({ value, label, Icon }) => (
                <TabsTrigger key={value} value={value} className="flex items-center space-x-2">
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={navigateToTab}>
          {hasHomeTab && (
            <TabsContent value="home">
              <Homepage
                onExploreBrowse={() => navigateToTab(hasBrowseTab ? 'browse' : 'listings')}
                onStartListing={() => handleStartListing()}
                onViewImpact={() => navigateToTab('impact')}
                onViewPartners={() => {
                  if (hasDropOffTab) {
                    navigateToTab('dropoff')
                  } else {
                    handleStartListing('donate')
                  }
                }}
                onOpenMessages={handleOpenMessages}
                onSearch={handleSearch}
                onSearchChange={setSearchQuery}
                searchQuery={searchQuery}
                isAuthenticated={Boolean(user)}
                userName={userFirstName}
                onSignIn={handleSignIn}
                onSignUp={handleSignUp}
              />
            </TabsContent>
          )}

          {hasBrowseTab && (
            <TabsContent value="browse">
              <section id="item-listing-section">
                <ItemListing
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSearchSubmit={handleSearch}
                  onOpenMessages={handleOpenMessages}
                />
              </section>
            </TabsContent>
          )}

          <TabsContent value="listings">
            <MyListingsView
              onAddNewItem={() => handleStartListing()}
              onOpenMessages={handleOpenMessages}
            />
          </TabsContent>

          {user && (
            <TabsContent value="messages">
              <MessageCenter
                mode="page"
                itemId={messageCenterItemId}
                chatId={messageCenterChatId}
                initialView={messageCenterView}
              />
            </TabsContent>
          )}

          <TabsContent value="list">
            <ItemListingForm
              onComplete={handleListingComplete}
              prefillFulfillmentMethod={pendingFulfillmentMethod}
              prefillDropOffLocation={pendingDropOffLocation}
              onFulfillmentPrefillHandled={() => setPendingFulfillmentMethod(null)}
              onDropOffPrefillHandled={() => setPendingDropOffLocation(null)}
              initialIntent={pendingListingIntent}
              onIntentHandled={() => setPendingListingIntent(null)}
            />
          </TabsContent>

          {hasDropOffTab && (
            <TabsContent value="dropoff">
              <DropOffMap
                onPlanDropOff={handleDropOffPlanned}
                highlightGuidedFlow={pendingFulfillmentMethod === 'dropoff'}
              />
            </TabsContent>
          )}

          <TabsContent value="impact">
            <CarbonTracker />
          </TabsContent>

          <TabsContent value="profile">
            {user && showDemoGuide && currentTab === 'profile' && (
              <DemoGuide
                onSwitchProfile={handleToggleUserType}
                currentUserType={user.userType}
                userName={userFirstName ?? 'User'}
                onComplete={handleDemoGuideComplete}
              />
            )}
            <ProfileDashboard
              onCreateListing={() => handleStartListing()}
              onOpenMessages={handleOpenMessages}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TruCycleGlyph className="h-4 w-4" />
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
            <p>&copy; {new Date().getFullYear()} TruCycle. Building sustainable communities in London.</p>
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
        onOpenChange={handleOnboardingOpenChange}
        onComplete={handleOnboardingComplete}
        mode={onboardingMode}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}

export default App


