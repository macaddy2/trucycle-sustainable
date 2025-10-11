import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PaperPlaneTilt,
  CheckCircle,
  MapPin,
  Package,
  CalendarCheck,
  Paperclip
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useMessaging, useExchangeManager } from '@/hooks'
import { sendGeneralMessage, sendImageMessage } from '@/lib/api'
import { useKV } from '@/hooks/useKV'
import type { ManagedListing } from '@/types/listings'
import type { Chat as MessagingChat, Message as MessagingMessage } from '@/hooks/useMessaging'
import type { ClaimRequest } from '@/hooks/useExchangeManager'
import { QRCodeGenerator, QRCodeDisplay, QRCodeData } from '../QRCode'

interface MessageCenterProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  itemId?: string
  chatId?: string
  initialView?: 'chats' | 'requests'
  mode?: 'modal' | 'page'
}

interface RequestGroup {
  itemId: string
  itemTitle: string
  requests: ClaimRequest[]
}

const requestStatusStyles: Record<ClaimRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  declined: 'bg-slate-100 text-slate-700',
  completed: 'bg-green-100 text-green-700'
}

const formatRelativeTime = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return dateObj.toLocaleDateString()
}

export function MessageCenter({ open = false, onOpenChange, itemId, chatId, initialView = 'chats', mode = 'modal' }: MessageCenterProps) {
  const isPage = mode === 'page'
  const handleDialogOpenChange = useCallback((value: boolean) => onOpenChange?.(value), [onOpenChange])
  const {
    currentUser,
    chats,
    messages,
    sendMessage: dispatchMessage,
    markMessagesAsRead,
    updateChatStatus,
    createOrGetChat,
    refreshActiveRooms,
    ensureRemoteRoomForChat,
    loadHistoryForChat
  } = useMessaging()
  const {
    confirmClaimRequest,
    completeClaimRequest,
    getClaimRequestById,
    getRequestsForDonor,
    getRewardBalance
  } = useExchangeManager()

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'chats' | 'requests'>(initialView)
  const [newMessage, setNewMessage] = useState('')
  const [showQRCode, setShowQRCode] = useState<QRCodeData | null>(null)
  const [selectedDropOffLocation, setSelectedDropOffLocation] = useState('')
  const [selectedRequestItem, setSelectedRequestItem] = useState<string | null>(itemId ?? null)
  const [globalListings] = useKV<ManagedListing[]>('global-listings', [])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLElement | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const wasAtBottomRef = useRef<boolean>(true)
  const ensuredChatIdsRef = useRef<Set<string>>(new Set())
  const loadedChatIdsRef = useRef<Set<string>>(new Set())

  const normalizeChat = useCallback((chat: MessagingChat): MessagingChat => ({
    ...chat,
    createdAt: chat.createdAt instanceof Date ? chat.createdAt : new Date(chat.createdAt),
    lastMessage: chat.lastMessage
      ? {
          ...chat.lastMessage,
          timestamp: chat.lastMessage.timestamp instanceof Date
            ? chat.lastMessage.timestamp
            : new Date(chat.lastMessage.timestamp)
        }
      : undefined
  }), [])

  const normalizeMessage = useCallback((message: MessagingMessage): MessagingMessage => ({
    ...message,
    timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
  }), [])

  const normalizedChats = useMemo(() => chats.map(normalizeChat), [chats, normalizeChat])
  const selectedChat = useMemo(
    () => normalizedChats.find(chat => chat.id === selectedChatId) ?? null,
    [normalizedChats, selectedChatId]
  )
  const currentMessages = useMemo(() => {
    if (!selectedChatId) return [] as MessagingMessage[]
    return (messages[selectedChatId] || []).map(normalizeMessage)
  }, [messages, normalizeMessage, selectedChatId])

  const donorRequests = useMemo(() => {
    if (!currentUser) return [] as ClaimRequest[]
    return getRequestsForDonor(currentUser.id)
  }, [currentUser, getRequestsForDonor])

  const groupedRequests = useMemo(() => {
    const groups: Record<string, RequestGroup> = {}
    donorRequests.forEach(request => {
      if (!groups[request.itemId]) {
        groups[request.itemId] = {
          itemId: request.itemId,
          itemTitle: request.itemTitle,
          requests: []
        }
      }
      groups[request.itemId].requests.push(request)
    })
    return Object.values(groups)
  }, [donorRequests])

  const selectedRequestGroup = useMemo(() => {
    if (!selectedRequestItem) return null
    return groupedRequests.find(group => group.itemId === selectedRequestItem) ?? null
  }, [groupedRequests, selectedRequestItem])

  const pendingRequestsCount = useMemo(() => {
    return donorRequests.filter(request => request.status === 'pending').length
  }, [donorRequests])

  const linkedRequest = useMemo(() => {
    if (!selectedChat?.linkedRequestId) return null
    return getClaimRequestById(selectedChat.linkedRequestId)
  }, [selectedChat, getClaimRequestById])

  const listingForChat = useMemo(() => {
    if (!selectedChat) return null
    return globalListings.find(listing => listing.id === selectedChat.itemId) ?? null
  }, [globalListings, selectedChat])

  const generatorDropOffLocation = useMemo(() => {
    if (selectedDropOffLocation) {
      return selectedDropOffLocation
    }

    if (listingForChat?.dropOffLocation) {
      const location = listingForChat.dropOffLocation
      const postcode = 'postcode' in location ? location.postcode : undefined
      return postcode ? `${location.name}, ${postcode}` : location.name
    }

    return undefined
  }, [listingForChat, selectedDropOffLocation])

  const hasSharedLocation = useMemo(() => {
    return currentMessages.some(message =>
      message.type === 'location' || message.metadata?.systemAction === 'location_shared'
    )
  }, [currentMessages])

  const hasScheduledExchange = useMemo(() => {
    return currentMessages.some(message => {
      const action = message.metadata?.systemAction
      return action === 'pickup_scheduled' || action === 'dropoff_scheduled'
    })
  }, [currentMessages])

  const isNewChat = useMemo(() => currentMessages.every(m => m.type === 'system'), [currentMessages])

  const messageTemplates = useMemo(() => {
    if (!selectedChat || !currentUser || !isNewChat) return [] as string[]
    const otherName = currentUser.id === selectedChat.donorId
      ? selectedChat.collectorName
      : selectedChat.donorName

    if (currentUser.id === selectedChat.donorId) {
      return [
        `Thanks for requesting this item, ${otherName}! It is still available.`,
        'Could we meet at the TruCycle partner hub this weekend to hand it over?',
        'I will prepare the item for collection. Let me know if you need any help with transport.'
      ]
    }

    return [
      `Hi ${otherName}, I love this item. Is it still available?`,
      'I can collect tomorrow afternoon if that works for you.',
      'Could you please share the pickup address when convenient?'
    ]
  }, [currentUser, selectedChat])

  useEffect(() => {
    setActivePanel(initialView)
  }, [initialView])

  useEffect(() => {
    if (chatId) {
      setSelectedChatId(chatId)
      return
    }

    if (itemId && normalizedChats.length > 0) {
      const existingChat = normalizedChats.find(chat => chat.itemId === itemId)
      if (existingChat) {
        setSelectedChatId(existingChat.id)
      }
    }
  }, [chatId, itemId, normalizedChats])

  useEffect(() => {
    if (activePanel === 'requests') {
      if (itemId && groupedRequests.some(group => group.itemId === itemId)) {
        setSelectedRequestItem(itemId)
      } else if (!selectedRequestItem && groupedRequests.length > 0) {
        setSelectedRequestItem(groupedRequests[0].itemId)
      }
    }
  }, [activePanel, groupedRequests, itemId, selectedRequestItem])

  useEffect(() => {
    if (!selectedChatId) return
    markMessagesAsRead(selectedChatId)
  }, [markMessagesAsRead, selectedChatId])

  // Ensure remote room exists (run once per chat id)
  useEffect(() => {
    if (!selectedChatId) return
    if (ensuredChatIdsRef.current.has(selectedChatId)) return
    ;(async () => {
      try {
        await ensureRemoteRoomForChat(selectedChatId)
      } finally {
        ensuredChatIdsRef.current.add(selectedChatId)
      }
    })()
  }, [selectedChatId])

  // Load initial history (run once per chat id)
  useEffect(() => {
    if (!selectedChatId) return
    if (loadedChatIdsRef.current.has(selectedChatId)) return
    ;(async () => {
      try {
        await loadHistoryForChat(selectedChatId)
      } finally {
        loadedChatIdsRef.current.add(selectedChatId)
      }
    })()
  }, [selectedChatId])

  // Initial load of active rooms from server when MessageCenter mounts
  useEffect(() => {
    let ran = false
    if (ran) return
    ran = true
    ;(async () => {
      try { await refreshActiveRooms() } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Only auto-scroll when the user was at the bottom prior to updates
  useEffect(() => {
    if (!scrollViewportRef.current && messagesContainerRef.current) {
      const viewport = messagesContainerRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null
      if (viewport) scrollViewportRef.current = viewport
    }

    const viewport = scrollViewportRef.current
    if (!viewport) return

    if (wasAtBottomRef.current) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [currentMessages])

  // Track whether the user is near the bottom of the message list and set up listener per chat.
  useEffect(() => {
    if (!scrollViewportRef.current && messagesContainerRef.current) {
      const vp = messagesContainerRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null
      if (vp) scrollViewportRef.current = vp
    }

    const target = scrollViewportRef.current
    if (!target) return

    const onScroll = () => {
      const threshold = 48
      const distanceFromBottom = target.scrollHeight - (target.scrollTop + target.clientHeight)
      const atBottom = distanceFromBottom <= threshold
      wasAtBottomRef.current = atBottom
      setIsAtBottom(atBottom)
    }

    // Initialize once when chat changes
    onScroll()
    target.addEventListener('scroll', onScroll)
    return () => target.removeEventListener('scroll', onScroll)
  }, [selectedChatId])

  // When switching to a chat, jump the viewport to the bottom once.
  useEffect(() => {
    if (!messagesContainerRef.current) return
    const viewport = messagesContainerRef.current.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    if (!viewport) return
    // Jump to bottom without affecting page scroll
    viewport.scrollTop = viewport.scrollHeight
  }, [selectedChatId])

  const sendSystemMessage = useCallback(async (chatIdValue: string, content: string, action: string) => {
    try {
      const chat = normalizedChats.find(c => c.id === chatIdValue)
      if (chat?.remoteRoomId) {
        await sendGeneralMessage(chat.remoteRoomId, { text: content, title: action })
      }
    } catch {}
  }, [normalizedChats])

  const handleSendMessage = () => {
    if (!selectedChat) return
    if (!newMessage.trim()) return
    dispatchMessage(selectedChat.id, newMessage.trim())
    setNewMessage('')
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const handlePickImage = () => fileInputRef.current?.click()
  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedChat) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image is too large. Max 3MB')
      return
    }
    try {
      const chat = normalizedChats.find(c => c.id === selectedChat.id)
      if (!chat?.remoteRoomId) return
      const caption = newMessage.trim() || undefined
      await sendImageMessage(chat.remoteRoomId, file, caption)
      if (caption) setNewMessage('')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send image')
    }
  }

  const shareLocation = useCallback(() => {
    if (!selectedChat) return
    if (!navigator.geolocation) {
      toast.error('Location sharing is not supported on this device')
      return
    }

    navigator.geolocation.getCurrentPosition((position) => {
      dispatchMessage(selectedChat.id, 'Shared location', 'location', {
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Current location'
        }
      })
      toast.success('Location shared')
    }, () => {
      toast.error('Could not access location')
    })
  }, [dispatchMessage, selectedChat])

  const handleApproveRequest = async (request: ClaimRequest) => {
    if (!currentUser) return
    const approved = await confirmClaimRequest(request.id)
    if (!approved) return

    const chatIdentifier = await createOrGetChat(
      approved.itemId,
      approved.itemTitle,
      approved.itemImage,
      approved.donorId,
      approved.donorName,
      undefined,
      approved.collectorId,
      approved.collectorName,
      approved.collectorAvatar,
      { linkedRequestId: approved.id }
    )

    toast.success(`Confirmed ${approved.collectorName} for "${approved.itemTitle}"`)
    updateChatStatus(chatIdentifier, 'collection_arranged')
    setActivePanel('chats')
    setSelectedChatId(chatIdentifier)
    markMessagesAsRead(chatIdentifier)
    sendSystemMessage(
      chatIdentifier,
      'Donor accepts Collector claim',
      'exchange_confirmed'
    )

    window.dispatchEvent(new CustomEvent('exchange-claim-approved', {
      detail: { request: approved, chatId: chatIdentifier }
    }))
  }

  const handleOpenChatForRequest = (request: ClaimRequest) => {
    const chatForRequest = normalizedChats.find(chat => chat.linkedRequestId === request.id)
    if (chatForRequest) {
      setActivePanel('chats')
      setSelectedChatId(chatForRequest.id)
    } else {
      toast.info('Start the exchange to open a chat with this collector')
    }
  }

  const handleConfirmCollection = useCallback(() => {
    if (!selectedChat || !currentUser) return

    if (linkedRequest) {
      if (selectedChat.donorId !== currentUser.id && selectedChat.collectorId !== currentUser.id) {
        toast.error('Only the donor or collector can complete this exchange.')
        return
      }

      const result = completeClaimRequest(linkedRequest.id)
      if (!result) return
      if (result.alreadyCompleted) {
        toast.info('This exchange has already been marked as collected.')
        return
      }

      updateChatStatus(selectedChat.id, 'completed')
      sendSystemMessage(
        selectedChat.id,
        `Collection confirmed. ${result.rewardPoints} GreenPoints have been awarded to the donor.`,
        'collection_confirmed'
      )
      return
    }

    updateChatStatus(selectedChat.id, 'completed')
    sendSystemMessage(selectedChat.id, 'Collection has been confirmed by both parties.', 'collection_confirmed')
    toast.success('Collection confirmed')
  }, [completeClaimRequest, currentUser, linkedRequest, selectedChat, sendSystemMessage, updateChatStatus])

  const handleQRCodeGenerated = (qrData: QRCodeData) => {
    setShowQRCode(qrData)
    const message = qrData.type === 'donor'
      ? 'Drop-off QR code generated. Please take this item and QR code to the selected drop-off location.'
      : 'Pickup QR code generated. Show this to the shop attendant to collect your item.'
    if (selectedChat) {
      sendSystemMessage(selectedChat.id, message, 'qr_generated')
    }
  }

  const quickActions = useMemo(() => {
    const actions = [
      {
        label: 'Share Location',
        icon: MapPin,
        action: shareLocation,
        color: 'text-blue-600',
        visible: Boolean(selectedChat)
      },
      {
        label: 'Schedule Pickup',
        icon: CalendarCheck,
        action: () => {
          if (!selectedChat) return
          sendSystemMessage(
            selectedChat.id,
            'Pickup has been scheduled for tomorrow at 2 PM.',
            'pickup_scheduled'
          )
          toast.success('Pickup details shared')
        },
        color: 'text-orange-600',
        visible: Boolean(selectedChat)
      }
    ]

    if (
      linkedRequest &&
      currentUser &&
      selectedChat &&
      linkedRequest.status === 'approved' &&
      (selectedChat.donorId === currentUser.id || selectedChat.collectorId === currentUser.id)
    ) {
      actions.push({
        label: 'Mark collected',
        icon: CheckCircle,
        action: handleConfirmCollection,
        color: 'text-green-600',
        visible: true
      })
    }

    return actions.filter(action => action.visible)
  }, [
    currentUser,
    handleConfirmCollection,
    hasScheduledExchange,
    hasSharedLocation,
    linkedRequest,
    selectedChat,
    sendSystemMessage,
    shareLocation
  ])

  if (!currentUser) {
    if (isPage) {
      return (
        <Card className="border-border">
          <CardContent className="py-12 text-center space-y-4">
            <h2 className="text-h3 font-medium">Messages</h2>
            <p className="text-muted-foreground">Please sign in to access your messages.</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in Required</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Please sign in to access your messages
            </p>
            <Button onClick={() => handleDialogOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const rewardBalance = getRewardBalance(currentUser.id)

  const renderBody = () => (
    <>
              <div className={`flex flex-col min-h-0 ${isPage ? 'h-[min(100svh,720px)]' : 'h-full'}`}>
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div>
                    <h2 className="text-h3 font-medium">Messages</h2>
                    <p className="text-small text-muted-foreground">
                      {normalizedChats.length} active conversation{normalizedChats.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  {/* Requests tab removed: requests are managed in My Listings */}
                </div>
      
                {false ? (
                  <div className="flex flex-1 min-h-0">
                    {groupedRequests.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground space-y-4">
                        <Package size={48} className="mx-auto text-muted-foreground" />
                        <div>
                          <p className="font-medium">No claim requests yet</p>
                          <p className="text-sm">
                            Collectors can request your listings directly from the marketplace.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-1/3 border-r border-border flex flex-col min-h-0">
                          <ScrollArea className="flex-1 min-h-0">
                            <div className="p-3 space-y-2">
                              {groupedRequests.map(group => {
                                const pending = group.requests.filter(request => request.status === 'pending').length
                                const approved = group.requests.filter(request => request.status === 'approved').length
                                const collected = group.requests.some(request => request.status === 'completed')
                                return (
                                  <Card
                                    key={group.itemId}
                                    className={`cursor-pointer transition-colors ${selectedRequestItem === group.itemId ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                                    onClick={() => setSelectedRequestItem(group.itemId)}
                                  >
                                    <CardContent className="p-3 space-y-2">
                                      <p className="font-medium text-sm line-clamp-2">{group.itemTitle}</p>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline">{group.requests.length} interested</Badge>
                                        {pending > 0 && (
                                          <Badge variant="destructive">{pending} pending</Badge>
                                        )}
                                        {approved > 0 && (
                                          <Badge variant="secondary">{approved} confirmed</Badge>
                                        )}
                                        {collected && (
                                          <Badge variant="secondary" className="bg-green-600 text-white">Collected</Badge>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>
                          </ScrollArea>
                        </div>
      
                        <div className="flex-1 flex flex-col min-h-0">
                          {selectedRequestGroup ? (
                            <ScrollArea className="flex-1 min-h-0">
                              <div className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-h3">{selectedRequestGroup.itemTitle}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Select a collector to confirm the exchange.
                                    </p>
                                  </div>
                                  <Badge variant="outline">Reward balance: {rewardBalance} GreenPoints</Badge>
                                </div>
      
                                {selectedRequestGroup.requests.map(request => {
                                  const requestChat = normalizedChats.find(chat => chat.linkedRequestId === request.id)
                                  return (
                                    <Card key={request.id} className="border-border/60">
                                      <CardContent className="p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                              {request.collectorAvatar ? (
                                                <AvatarImage src={request.collectorAvatar} alt={request.collectorName} />
                                              ) : (
                                                <AvatarFallback>{(request.collectorName || '?')[0]}</AvatarFallback>
                                              )}
                                            </Avatar>
                                            <div>
                                              <p className="font-medium">{request.collectorName}</p>
                                              <p className="text-xs text-muted-foreground">
                                                Requested {formatRelativeTime(request.createdAt)}
                                              </p>
                                            </div>
                                          </div>
                                          <Badge className={requestStatusStyles[request.status]}>
                                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                          </Badge>
                                        </div>
      
                                        <div className="flex flex-wrap gap-2 justify-between text-xs text-muted-foreground">
                                          <span>Donor: {request.donorName}</span>
                                          <span>Collector ID: {request.collectorId.slice(-6)}</span>
                                        </div>
      
                                        <div className="flex flex-wrap gap-2">
                                          {request.status === 'pending' && (
                                            <Button size="sm" onClick={() => handleApproveRequest(request)}>
                                              Confirm exchange
                                            </Button>
                                          )}
                                          {request.status === 'approved' && requestChat && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleOpenChatForRequest(request)}
                                            >
                                              Open chat
                                            </Button>
                                          )}
                                          {request.status === 'approved' && !requestChat && (
                                            <Button size="sm" variant="outline" disabled>
                                              Chat pending activation
                                            </Button>
                                          )}
                                          {request.status === 'completed' && (
                                            <Badge variant="outline" className="bg-green-100 text-green-700">
                                              Reward issued
                                            </Badge>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )
                                })}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                              Select an item to view interested collectors
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 min-h-0">
                    <div className="w-1/3 border-r border-border flex flex-col min-h-0">
                      <ScrollArea className="flex-1 min-h-0">
                        {normalizedChats.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground space-y-2">
                            <Package size={36} className="mx-auto text-muted-foreground" />
                            <p>No conversations yet</p>
                            <p>Start by requesting or listing an item.</p>
                          </div>
                        ) : (
                          <div className="space-y-1 p-2">
                            {normalizedChats.map(chat => (
                              <Card
                                key={chat.id}
                                className={`cursor-pointer transition-colors ${selectedChatId === chat.id ? 'bg-muted border-primary' : 'hover:bg-muted/50'}`}
                                onClick={() => setSelectedChatId(chat.id)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start space-x-3">
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={currentUser.id === chat.donorId ? chat.collectorAvatar : chat.donorAvatar} />
                                      <AvatarFallback>
                                        {((currentUser.id === chat.donorId ? chat.collectorName : chat.donorName) || '?')[0]}
                                      </AvatarFallback>
                                    </Avatar>
      
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <p className="text-small font-medium truncate">
                                          {currentUser.id === chat.donorId ? chat.collectorName : chat.donorName}
                                        </p>
                                        {chat.unreadCount > 0 && (
                                          <Badge variant="destructive" className="text-xs">
                                            {chat.unreadCount}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {chat.itemTitle}
                                      </p>
                                      {chat.lastMessage && (
                                        <p className="text-xs text-muted-foreground truncate mt-1">
                                          {chat.lastMessage.content}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {chat.lastMessage
                                          ? formatRelativeTime(chat.lastMessage.timestamp)
                                          : formatRelativeTime(chat.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
      
                    <div className="flex-1 flex flex-col min-h-0">
                      {selectedChat ? (
                        <>
                          <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={currentUser.id === selectedChat.donorId ? selectedChat.collectorAvatar : selectedChat.donorAvatar} />
                                <AvatarFallback>
                                  {((currentUser.id === selectedChat.donorId ? selectedChat.collectorName : selectedChat.donorName) || '?')[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium">
                                  {currentUser.id === selectedChat.donorId ? selectedChat.collectorName : selectedChat.donorName}
                                </h3>
                                <p className="text-small text-muted-foreground">
                                  About: {selectedChat.itemTitle}
                                </p>
                              </div>
                            </div>
                            <Badge variant={selectedChat.status === 'active' ? 'secondary' : 'outline'}>
                              {selectedChat.status.replace('_', ' ')}
                            </Badge>
                          </div>
      
                          <ScrollArea className="flex-1 min-h-0 p-4">
                            <div ref={messagesContainerRef} className="space-y-4">
                              {currentMessages.map(message => (
                                <div
                                  key={message.id}
                                  className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[70%] rounded-lg p-3 ${
                                      message.senderId === currentUser.id
                                        ? 'bg-primary text-primary-foreground'
                                        : message.type === 'system'
                                        ? 'bg-muted text-muted-foreground'
                                        : 'bg-muted text-foreground'
                                    } ${message.type === 'system' ? 'mx-auto text-center' : ''}`}
                                  >
                                    {message.type === 'location' && message.metadata?.location && (
                                      <div className="flex items-center gap-2 mb-2">
                                        <MapPin size={16} />
                                        <span className="text-small">Location shared</span>
                                      </div>
                                    )}
                                    <p className="text-small whitespace-pre-line">{message.content}</p>
                                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                      <span>{message.type !== 'system' ? message.senderName : 'System'}</span>
                                      <span>{formatRelativeTime(message.timestamp)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div ref={messagesEndRef} />
                            </div>
                          </ScrollArea>
      
                          {quickActions.length > 0 && (
                            <div className="p-3 border-t border-border flex flex-wrap gap-2">
                              {quickActions.map(action => (
                                <Button
                                  key={action.label}
                                  variant="outline"
                                  size="sm"
                                  onClick={action.action}
                                  className="flex items-center space-x-1"
                                >
                                  <action.icon size={14} className={action.color} />
                                  <span className="text-xs">{action.label}</span>
                                </Button>
                              ))}
                            </div>
                          )}
      
                          {messageTemplates.length > 0 && (
                            <div className="px-4 py-2 border-t border-border bg-muted/40 flex flex-wrap gap-2">
                              {messageTemplates.map(template => (
                                <Button
                                  key={template}
                                  variant="ghost"
                                  size="sm"
                                  className="text-left whitespace-normal"
                                  onClick={() => setNewMessage(template)}
                                >
                                  {template}
                                </Button>
                              ))}
                            </div>
                          )}
      
                          <div className="p-4 border-t border-border">
                            <div className="flex gap-2 items-center">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageSelected}
                              />
                              <Button type="button" variant="outline" size="icon" onClick={handlePickImage} title="Attach image">
                                <Paperclip size={16} />
                              </Button>
                              <Input
                                placeholder="Type your message..."
                                value={newMessage}
                                onChange={(event) => setNewMessage(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault()
                                    handleSendMessage()
                                  }
                                }}
                                className="flex-1"
                              />
                              <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="icon" title="Send">
                                <PaperPlaneTilt size={16} />
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center space-y-2 text-muted-foreground">
                            <Package size={48} className="mx-auto text-muted-foreground" />
                            <p className="font-medium text-foreground">Select a conversation</p>
                            <p className="text-sm">Choose a chat from the sidebar to start messaging</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
      
              {selectedDropOffLocation && selectedChat && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 space-y-4">
                    <div>
                      <h3 className="text-h3 mb-2">Generate QR Code</h3>
                      <p className="text-muted-foreground text-sm">
                        Choose your role for this transaction to generate the right QR code.
                      </p>
                    </div>
      
                    {currentUser.id === selectedChat.donorId && (
                      <QRCodeGenerator
                        itemId={selectedChat.itemId}
                        itemTitle={selectedChat.itemTitle}
                        category={listingForChat?.category ?? 'general'}
                        condition={listingForChat?.condition ?? 'good'}
                        actionType={listingForChat?.actionType ?? 'donate'}
                        co2Impact={listingForChat?.co2Impact ?? 25}
                        description={listingForChat?.description}
                        primaryImageUrl={listingForChat?.photos?.[0]}
                        dropOffLocation={generatorDropOffLocation}
                        type="donor"
                        onGenerated={handleQRCodeGenerated}
                      />
                    )}

                    {currentUser.id === selectedChat.collectorId && (
                      <QRCodeGenerator
                        itemId={selectedChat.itemId}
                        itemTitle={selectedChat.itemTitle}
                        category={listingForChat?.category ?? 'general'}
                        condition={listingForChat?.condition ?? 'good'}
                        actionType={listingForChat?.actionType ?? 'donate'}
                        co2Impact={listingForChat?.co2Impact ?? 25}
                        description={listingForChat?.description}
                        primaryImageUrl={listingForChat?.photos?.[0]}
                        dropOffLocation={generatorDropOffLocation}
                        type="collector"
                        onGenerated={handleQRCodeGenerated}
                      />
                    )}
      
                    <Button variant="outline" onClick={() => setSelectedDropOffLocation('')} className="w-full">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
      
              {showQRCode && (
                <QRCodeDisplay
                  qrData={showQRCode}
                  onClose={() => setShowQRCode(null)}
                />
              )}
    </>
  )

  if (isPage) {
    return (
      <div className="rounded-lg border border-border overflow-hidden shadow-sm bg-background">
        {renderBody()}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-5xl h-[640px] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Message Center</DialogTitle>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  )
}
