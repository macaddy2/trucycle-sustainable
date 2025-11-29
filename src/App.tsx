import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Toaster } from '@/components/ui/sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  ArrowsClockwise,
  Leaf,
  Question as Search,
  User,
  QrCode,
  Bell,
  Package,
  Storefront,
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
  QuickClaimScanner,
  NotificationList,
} from './components'
import { ShopScannerOverview } from './components/ShopScannerOverview'
import { TruCycleGlyph } from './components/icons/TruCycleGlyph'
import { ThemeToggle } from './components/ThemeToggle'
import type { Notification } from './components/NotificationList'
import type { DropOffLocation } from './components/dropOffLocations'
import { AuthDialog, ProfileOnboarding } from './components/auth'
import { MessageCenter, MessageNotification } from './components/messaging'
import { messageSocket } from '@/lib/messaging/socket'
import { notificationSocket } from '@/lib/notifications/socket'
import { me as apiMe, clearTokens } from '@/lib/api'
import type { ClaimRequest } from '@/hooks/useExchangeManager'
import { useRecommendationNotifications, useNotifications, useExchangeManager, usePresence } from '@/hooks'
import { useIsMobile } from '@/hooks/use-mobile'
import { useThemeMode } from '@/hooks/useThemeMode'
import type { ListingCompletionDetails, ListingEditDraft } from './components/ItemListingForm'

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
    identity: boolean
    address: boolean
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
  const [showClaimScanner, setShowClaimScanner] = useState(false)
  const [shouldResumeListingAfterAuth, setShouldResumeListingAfterAuth] = useState(false)
  const [showDemoGuide, setShowDemoGuide] = useKV<boolean>('show-demo-guide', true)
  const [pendingFulfillmentMethod, setPendingFulfillmentMethod] = useState<'pickup' | 'dropoff' | null>(null)
  const [pendingDropOffLocation, setPendingDropOffLocation] = useState<DropOffLocation | null>(null)
  const [pendingListingIntent, setPendingListingIntent] = useState<'exchange' | 'donate' | 'recycle' | null>(null)
  const [pendingListingEdit, setPendingListingEdit] = useState<ListingEditDraft | null>(null)
  const [messageCenterView, setMessageCenterView] = useState<'chats' | 'requests'>('chats')
  const [messageCenterItemId, setMessageCenterItemId] = useState<string | undefined>()
  const [messageCenterChatId, setMessageCenterChatId] = useState<string | undefined>()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const themeControls = useThemeMode()
  const isMobile = useIsMobile()
  
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
  const { getRequestsForDonor } = useExchangeManager()
  // Keep messaging presence tracking alive across the app
  usePresence(user?.id ?? null)
  // Disconnect messaging socket when user signs out
  useEffect(() => {
    if (!user) {
      messageSocket.disconnect()
      notificationSocket.disconnect()
    }
  }, [user])
  // Always sync role, postcode and verification from auth/me when available
  useEffect(() => {
    let active = true
    async function syncMe() {
      try {
        const meRes = await apiMe()
        const meUser = meRes?.data?.user
        if (!active || !meUser) return
        const existingType = user?.userType ?? 'donor'
        const merged = {
          id: user?.id || meUser.id,
          name: [meUser.firstName, meUser.lastName].filter(Boolean).join(' ') || user?.name || meUser.email,
          email: meUser.email,
          userType: existingType as 'donor' | 'collector',
          onboardingCompleted: Boolean(user?.onboardingCompleted),
          postcode: meUser.postcode || user?.postcode,
          rating: user?.rating,
          verificationLevel: {
            email: Boolean(meUser.verifications?.email_verified),
            identity: Boolean(meUser.verifications?.identity_verified),
            address: Boolean(meUser.verifications?.address_verified),
          },
          rewardsBalance: user?.rewardsBalance,
          partnerAccess: Array.isArray(meUser.roles) ? meUser.roles.includes('partner') : (meUser.role === 'partner'),
        }
        setUser(merged as any)
      } catch {
        // ignore when unauthenticated
      }
    }
    syncMe()
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pendingListingRequests = useMemo(() => {
    if (!user) return 0
    return getRequestsForDonor(user.id).filter((r) => r.status === 'pending').length
  }, [user, getRequestsForDonor])

  const allTabs = useMemo(() => new Set([
    'home', 'browse', 'listings', 'messages', 'dropoff', 'impact', 'profile', 'list'
  ]), [])

  const baseNormalized = useMemo(() => {
    const base = import.meta.env.BASE_URL || '/'
    return base.replace(/\/$/, '')
  }, [])

  const pathToTab = useCallback((pathname: string) => {
    let path = pathname
    if (baseNormalized && path.startsWith(baseNormalized)) {
      path = path.slice(baseNormalized.length)
    }
    path = path.replace(/^\/+|\/+$/g, '')
    const seg = path.split('/')[0]?.toLowerCase() || ''
    if (!seg) return 'home'
    return allTabs.has(seg) ? seg : 'home'
  }, [allTabs, baseNormalized])

  const parseMessageChatIdFromPath = useCallback((pathname: string): string | undefined => {
    let path = pathname
    if (baseNormalized && path.startsWith(baseNormalized)) {
      path = path.slice(baseNormalized.length)
    }
    path = path.replace(/^\/+|\/+$/g, '')
    const parts = path.split('/')
    if (parts[0]?.toLowerCase() === 'messages' && parts[1]) {
      return parts[1]
    }
    return undefined
  }, [baseNormalized])

  const tabToPath = useCallback((tab: string) => {
    const seg = (tab || 'home').toLowerCase()
    const segment = seg === 'home' ? 'home' : seg
    return `${baseNormalized}/${segment}`
  }, [baseNormalized])

  const navigateToTab = useCallback((nextTab: string) => {
    setCurrentTabState(nextTab)
    const targetPath = tabToPath(nextTab)
    const withQuery = `${targetPath}${window.location.search}${window.location.hash}`
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: nextTab }, '', withQuery)
    }
  }, [tabToPath])

  const navigateToMessages = useCallback((chatId?: string) => {
    setCurrentTabState('messages')
    const basePath = tabToPath('messages')
    const targetPath = chatId ? `${basePath}/${chatId}` : basePath
    const withQuery = `${targetPath}${window.location.search}${window.location.hash}`
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: 'messages', chatId }, '', withQuery)
    } else {
      window.history.replaceState({ tab: 'messages', chatId }, '', withQuery)
    }
  }, [tabToPath])

  const navTabs = useMemo(() => {
    const isCollector = user?.userType === 'collector'
    const isDonor = user?.userType === 'donor'

    return [
      { value: 'home', label: 'Home', Icon: House, show: true },
      { value: 'browse', label: 'Browse', Icon: Search, show: !isDonor },
      { value: 'listings', label: isCollector ? 'My Collected Items' : 'My Listed Items', Icon: Package, show: true },
      { value: 'dropoff', label: 'Partner Shops', Icon: Storefront, show: !isCollector },
      { value: 'impact', label: 'Impact', Icon: Leaf, show: true },
    ].filter((tab) => tab.show)
  }, [user])

  const hasHomeTab = navTabs.some((tab) => tab.value === 'home')
  const hasBrowseTab = navTabs.some((tab) => tab.value === 'browse')
  const hasDropOffTab = navTabs.some((tab) => tab.value === 'dropoff')
  const hasDismissedOnboarding = user ? Boolean(onboardingDismissals[user.id]) : false

  const userFirstName = user?.name && typeof user.name === 'string' ? user.name.split(' ')[0] : undefined

  useEffect(() => {
    const availableTabs = new Set<string>([...navTabs.map(tab => tab.value), 'list', 'messages', 'profile'])

    if (!availableTabs.has(currentTab)) {
      const fallbackTab = navTabs[0]?.value ?? currentTab
      if (fallbackTab && fallbackTab !== currentTab) {
        setCurrentTabState(fallbackTab)
        const targetPath = tabToPath(fallbackTab)
        const withQuery = `${targetPath}${window.location.search}${window.location.hash}`
        if (window.location.pathname !== targetPath) {
          window.history.replaceState({ tab: fallbackTab }, '', withQuery)
        }
      }
    }
  }, [navTabs, currentTab, tabToPath])

  useEffect(() => {
    const initial = pathToTab(window.location.pathname)
    if (initial !== currentTab) {
      setCurrentTabState(initial)
    }
    const chatIdFromPath = parseMessageChatIdFromPath(window.location.pathname)
    if (initial === 'messages') {
      setMessageCenterChatId(chatIdFromPath)
    }
    const canonical = tabToPath(initial)
    const withQuery = `${canonical}${window.location.search}${window.location.hash}`
    // Don't overwrite deep link that includes chat id
    if (!chatIdFromPath && window.location.pathname !== canonical) {
      window.history.replaceState({ tab: initial }, '', withQuery)
    }
    const onPop = () => {
      const t = pathToTab(window.location.pathname)
      setCurrentTabState(t)
      if (t === 'messages') {
        const id = parseMessageChatIdFromPath(window.location.pathname)
        setMessageCenterChatId(id)
      } else {
        setMessageCenterChatId(undefined)
        setMessageCenterItemId(undefined)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [currentTab, parseMessageChatIdFromPath, pathToTab, tabToPath])

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
    navigateToMessages(options?.chatId)
  }, [navigateToMessages, setNotificationsOpen])

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

  // Remove sample chat initialization; rely on server rooms/messages

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

  const handleNotificationOpen = useCallback((n: Notification) => {
    // Close the tray first for better UX
    setNotificationsOpen(false)
    const rawType = (n.metadata as any)?.rawType as string | undefined
    const itemId = n.metadata?.itemId
    const type = String(rawType || '').toLowerCase()

    if (type === 'item.claim.request') {
      // Donor sees a new request – open Message Center to Requests or Listings
      if (itemId) {
        handleOpenMessages({ itemId, initialView: 'requests' })
      } else {
        navigateToTab('listings')
      }
      return
    }
    if (type === 'item.claim.approved') {
      // Collector claim approved – jump to chat for coordination
      handleOpenMessages({ itemId: itemId, initialView: 'chats' })
      return
    }
    if (type === 'item.collection' || type === 'dropoff.created' || type === 'dropin.created' || type === 'pickup.created') {
      // Status/operational updates – go to My Listings
      navigateToTab('listings')
      return
    }
    // Fallback: respect actionUrl if present
    if (n.actionUrl) {
      if (n.actionUrl.startsWith('http')) {
        window.location.href = n.actionUrl
      } else {
        const base = import.meta.env.BASE_URL || '/'
        const normalized = String(base || '/').replace(/\/$/, '')
        const target = n.actionUrl.startsWith('/') ? n.actionUrl : `/${n.actionUrl}`
        window.location.href = `${normalized}${target}`
      }
    }
  }, [handleOpenMessages, navigateToTab, setNotificationsOpen])

  useEffect(() => {
    const handleClaimRequested = (event: Event) => {
      const detail = (event as CustomEvent<{ request: ClaimRequest }>).detail
      if (user && detail.request.donorId === user.id) {
        toast.info(`${detail.request.collectorName} wants "${detail.request.itemTitle}"`)
        // Navigate to listings to manage requests there
        navigateToTab('listings')
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
  }, [handleOpenMessages, navigateToTab, user])

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
  }


  const handleSearch = () => {
    // If a donor searches from the homepage, switch to collector mode and go to Browse with the query.
    if (user?.userType === 'donor') {
      const updatedUser = { ...user, userType: 'collector' as const }
      setUser(updatedUser)
      // Wait for UI to reflect mode change so Browse tab/content exists, then navigate and scroll.
      setTimeout(() => {
        navigateToTab('browse')
        document.getElementById('item-listing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
      return
    }

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
  }, [navigateToTab, user])

  // If in shop scanner mode, render only the scanner
  if (showShopScanner) {
    if (user?.partnerAccess) {
      return <ShopScanner onClose={() => setShowShopScanner(false)} />
    }
    return <ShopScannerOverview onClose={() => setShowShopScanner(false)} />
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-raleway">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4 md:gap-6">
            <button
              type="button"
              onClick={handleLogoClick}
              className="group inline-flex items-center gap-3 rounded-full border border-border/60 bg-card/80 px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              title="Go to homepage"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <TruCycleGlyph className="h-6 w-6" />
              </div>
              <h1 className="text-h2 font-semibold tracking-tight text-foreground">TruCycle</h1>
            </button>

            {/* Desktop Navigation Tabs */}
            <div className="hidden md:flex flex-1 justify-center">
              <Tabs value={currentTab} onValueChange={navigateToTab}>
                <TabsList className="gap-2 rounded-full border border-border/60 bg-card/70 px-2 py-1 shadow-sm">
                  {navTabs.map(({ value, label, Icon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    >
                      <Icon size={16} />
                      <span className="hidden lg:inline">{label}</span>
                      {value === 'listings' && user?.userType === 'donor' && pendingListingRequests > 0 && (
                        <Badge variant="destructive" className="ml-1 text-[10px]">
                          {pendingListingRequests}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="ml-auto hidden md:flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-2 py-1 shadow-sm">
              {user ? (
                <div className="flex items-center gap-2">
                  <ThemeToggle mode={themeControls.mode} toggleMode={themeControls.toggleMode} />
                  <MessageNotification onOpenMessages={handleOpenMessages} />
                  {!isMobile && (
                    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full">
                          <div className="relative">
                            <Bell size={18} />
                            {totalUnreadNotifications > 0 && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5 h-4 min-w-4">
                                {totalUnreadNotifications}
                              </span>
                            )}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[420px] p-0">
                        <NotificationList
                          notifications={trayNotifications.map(t => t.notification)}
                          onMarkAsRead={handleNotificationMarkAsRead}
                          onMarkAllAsRead={handleNotificationsMarkAll}
                          onDeleteNotification={handleNotificationDelete}
                          onClickNotification={handleNotificationOpen}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowClaimScanner(true)}
                    title="Open scanner"
                    className="rounded-full"
                  >
                    <QrCode size={16} />
                  </Button>

                  <div className="flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Profile menu"
                          className="rounded-full"
                        >
                          <User size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>
                          {userFirstName ? `Hi, ${userFirstName}` : 'Account'}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => navigateToTab('profile')}>
                          My Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigateToTab('listings')}>
                          My Listings
                        </DropdownMenuItem>
                        {user?.partnerAccess ? (
                          <DropdownMenuItem onSelect={() => { window.location.href = `${baseNormalized}/partner/shops` }}>
                            Go to My Shops
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => { window.location.href = `${baseNormalized}/partner/register` }}>
                            Become a Partner
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleToggleUserType}>
                          {user?.userType === 'donor' ? 'Switch to Collector' : 'Switch to Donor'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            try { void clearTokens() } catch {}
                            setUser(null as any)
                            navigateToTab('home')
                          }}
                        >
                          Sign out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {userFirstName && (
                      <span className="hidden sm:inline text-sm text-muted-foreground">{userFirstName}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2 py-1 shadow-sm">
                  <ThemeToggle mode={themeControls.mode} toggleMode={themeControls.toggleMode} />
                  <Button size="sm" onClick={handleSignIn}>
                    Get Started
                  </Button>
                </div>
              )}

            </div>

            {/* Mobile Actions (Profile, Messages, Notifications, QR) */}
            <div className="flex md:hidden items-center gap-2">
              {user ? (
                <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2 py-1 shadow-sm">
                  <ThemeToggle mode={themeControls.mode} toggleMode={themeControls.toggleMode} />
                  <MessageNotification onOpenMessages={handleOpenMessages} />
                  {isMobile && (
                    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full">
                          <div className="relative">
                            <Bell size={18} />
                            {totalUnreadNotifications > 0 && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5 h-4 min-w-4">
                                {totalUnreadNotifications}
                              </span>
                            )}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[420px] p-0">
                        <NotificationList
                          notifications={trayNotifications.map(t => t.notification)}
                          onMarkAsRead={handleNotificationMarkAsRead}
                          onMarkAllAsRead={handleNotificationsMarkAll}
                          onDeleteNotification={handleNotificationDelete}
                          onClickNotification={handleNotificationOpen}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowClaimScanner(true)}
                    title="Open scanner"
                    className="rounded-full"
                  >
                    <QrCode size={16} />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Profile menu"
                        className="rounded-full"
                      >
                        <User size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        {userFirstName ? `Hi, ${userFirstName}` : 'Account'}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => navigateToTab('profile')}>
                        My Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigateToTab('listings')}>
                        My Listings
                      </DropdownMenuItem>
                      {user?.partnerAccess ? (
                        <DropdownMenuItem onSelect={() => { window.location.href = `${baseNormalized}/partner/shops` }}>
                          Go to My Shops
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => { window.location.href = `${baseNormalized}/partner/register` }}>
                          Become a Partner
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleToggleUserType}>
                        {user?.userType === 'donor' ? 'Switch to Collector' : 'Switch to Donor'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => {
                          try { void clearTokens() } catch {}
                          setUser(null as any)
                          navigateToTab('home')
                        }}
                      >
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-2 py-1 shadow-sm">
                  <ThemeToggle mode={themeControls.mode} toggleMode={themeControls.toggleMode} />
                  <Button size="sm" onClick={handleSignIn}>
                    Get Started
                  </Button>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Tabs */}
      <nav className="md:hidden border-t border-border/60 bg-card/90 backdrop-blur-md">
        <div className="container max-w-screen-2xl mx-auto px-4 py-2">
          <Tabs value={currentTab} onValueChange={navigateToTab} className="w-full">
            <TabsList className="grid w-full grid-flow-col auto-cols-fr gap-1 rounded-full border border-border/60 bg-card/80 p-1 shadow-sm">
              {navTabs.map(({ value, label, Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                  {value === 'listings' && user?.userType === 'donor' && pendingListingRequests > 0 && (
                    <Badge variant="destructive" className="ml-1 text-[10px]">
                      {pendingListingRequests}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentTab === 'messages' ? (
          <MessageCenter
            mode="page"
            itemId={messageCenterItemId}
            chatId={messageCenterChatId}
            initialView={messageCenterView}
          />
        ) : (
        <Tabs value={currentTab} onValueChange={navigateToTab}>
          {hasHomeTab && (
            <TabsContent value="home">
              <Homepage
                onExploreBrowse={() => {
                  if (user?.userType === 'donor') {
                    const updated = { ...user, userType: 'collector' as const }
                    setUser(updated)
                    setTimeout(() => {
                      navigateToTab('browse')
                      document.getElementById('item-listing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 0)
                  } else {
                    navigateToTab(hasBrowseTab ? 'browse' : 'listings')
                    if (hasBrowseTab) {
                      document.getElementById('item-listing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }
                }}
                onStartListing={() => {
                  if (user?.userType === 'collector') {
                    const updated = { ...user, userType: 'donor' as const }
                    setUser(updated)
                    setTimeout(() => {
                      handleStartListing('donate')
                    }, 0)
                  } else {
                    handleStartListing('donate')
                  }
                }}
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
              onAddNewItem={() => {
                // From My Collected Items, adding an item should switch to donor mode and open the listing flow.
                if (user) {
                  const next = user.userType === 'collector' ? { ...user, userType: 'donor' as const } : user
                  if (next !== user) setUser(next)
                }
                handleStartListing('donate')
              }}
              onOpenMessages={handleOpenMessages}
              onEditListing={(draft) => {
                setPendingListingEdit(draft)
                setPendingListingIntent(null)
                setPendingFulfillmentMethod(null)
                setPendingDropOffLocation(null)
                navigateToTab('list')
              }}
            />
          </TabsContent>

          

          <TabsContent value="list">
            <ItemListingForm
              onComplete={handleListingComplete}
              prefillFulfillmentMethod={pendingListingEdit ? null : pendingFulfillmentMethod}
              prefillDropOffLocation={pendingListingEdit ? null : pendingDropOffLocation}
              onFulfillmentPrefillHandled={() => setPendingFulfillmentMethod(null)}
              onDropOffPrefillHandled={() => setPendingDropOffLocation(null)}
              initialIntent={pendingListingEdit ? null : pendingListingIntent}
              onIntentHandled={() => setPendingListingIntent(null)}
              editingListing={pendingListingEdit}
              onEditingHandled={() => setPendingListingEdit(null)}
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
        )}
      </main>

      {/* Footer (hidden on messages page to keep the inbox full-height) */}
      {currentTab !== 'messages' && (
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
      )}

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
      {/* Scanner Modal */}
      {user && (
        <QuickClaimScanner open={showClaimScanner} onOpenChange={setShowClaimScanner} />
      )}
    </div>
  )
}

export default App


