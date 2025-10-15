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
  Paperclip,
  ArrowLeft
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useMessaging, useExchangeManager, usePresence } from '@/hooks'
import { sendGeneralMessage } from '@/lib/api'
import { messageSocket, fileToBase64 } from '@/lib/messaging/socket'
import { useKV } from '@/hooks/useKV'
import type { ManagedListing } from '@/types/listings'
import type { Chat as MessagingChat, Message as MessagingMessage } from '@/hooks/useMessaging'
import type { ClaimRequest } from '@/hooks/useExchangeManager'
import { QRCodeGenerator, QRCodeDisplay, QRCodeData } from '../QRCode'
import { LocationSelector } from '@/components/LocationSelector'
import MessageCenterSkeleton from '@/components/skeletons/MessageCenterSkeleton'

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
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile((e as any).matches)
    try {
      mql.addEventListener('change', handler as any)
      return () => mql.removeEventListener('change', handler as any)
    } catch {
      // Safari fallback
      mql.addListener(handler as any)
      return () => mql.removeListener(handler as any)
    }
  }, [])
  const baseNormalized = useMemo(() => {
    const base = (import.meta as any)?.env?.BASE_URL || '/'
    return String(base).replace(/\/$/, '')
  }, [])
  const pushMessagesPath = useCallback((id?: string) => {
    if (!isPage) return
    const base = `${baseNormalized}/messages`
    const target = id ? `${base}/${id}` : base
    const withQuery = `${target}${window.location.search}${window.location.hash}`
    window.history.pushState({ tab: 'messages', chatId: id }, '', withQuery)
  }, [baseNormalized, isPage])
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
  const { isOnline } = usePresence(currentUser?.id)

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'chats' | 'requests'>(initialView)
  const [newMessage, setNewMessage] = useState('')
  const [attachments, setAttachments] = useState<Array<{ file: File; url: string }>>([])
  const [pendingBlocks, setPendingBlocks] = useState<Array<{ id: string; type: 'text' | 'images'; senderId: string; senderName: string; content?: string; images?: string[]; timestamp: Date }>>([])
  const [imageViewer, setImageViewer] = useState<{ urls: string[]; index: number } | null>(null)
  const [showScheduleSheet, setShowScheduleSheet] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState<string>('')
  const [scheduleLocation, setScheduleLocation] = useState<{ lat?: number; lng?: number; label?: string } | null>(null)
  const [showLocationSheet, setShowLocationSheet] = useState(false)
  const [inlineLocationPickerOpen, setInlineLocationPickerOpen] = useState(false)
  const [locationValue, setLocationValue] = useState<{ lat?: number; lng?: number; label?: string; radiusKm: number }>({ radiusKm: 10 })
  const [loadingChats, setLoadingChats] = useState<boolean>(true)
  const [loadingThread, setLoadingThread] = useState<boolean>(false)
  
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

  // On mobile page view, clear selection when URL chatId is cleared
  useEffect(() => {
    if (isPage && isMobile && !chatId) {
      setSelectedChatId(null)
    }
  }, [chatId, isPage, isMobile])

  // Apply chatId from props when it changes; supports both local chat ids and remote room ids
  const lastChatIdPropRef = useRef<string | undefined>(undefined)
  const attemptedRoomLookupRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!chatId) {
      lastChatIdPropRef.current = undefined
      return
    }
    if (chatId === lastChatIdPropRef.current) return

    // First try direct match by local chat id
    const byLocal = normalizedChats.find(c => c.id === chatId)
    if (byLocal) {
      setSelectedChatId(byLocal.id)
      lastChatIdPropRef.current = chatId
      return
    }

    // Then try match by remote room id
    const byRemote = normalizedChats.find(c => c.remoteRoomId === chatId)
    if (byRemote) {
      setSelectedChatId(byRemote.id)
      lastChatIdPropRef.current = chatId
      return
    }

    // If not found yet, ask the messaging store to refresh active rooms once
    if (!attemptedRoomLookupRef.current.has(chatId)) {
      attemptedRoomLookupRef.current.add(chatId)
      ;(async () => { try { await refreshActiveRooms() } catch {} })()
    }
  }, [chatId, normalizedChats, refreshActiveRooms])

  // Only auto-select from itemId if user hasn't chosen a chat yet
  useEffect(() => {
    if (itemId && !selectedChatId && normalizedChats.length > 0) {
      const existingChat = normalizedChats.find(chat => chat.itemId === itemId)
      if (existingChat) {
        setSelectedChatId(existingChat.id)
      }
    }
  }, [itemId, normalizedChats, selectedChatId])

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
      setLoadingThread(true)
      try {
        await loadHistoryForChat(selectedChatId)
      } finally {
        loadedChatIdsRef.current.add(selectedChatId)
        setLoadingThread(false)
      }
    })()
  }, [selectedChatId])

  // Initial load of active rooms from server when MessageCenter mounts
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingChats(true)
      try { await refreshActiveRooms() } finally {
        if (!cancelled) setLoadingChats(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When user signs in after the page has mounted, fetch rooms once
  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    ;(async () => {
      setLoadingChats(true)
      try { await refreshActiveRooms() } finally {
        if (!cancelled) setLoadingChats(false)
      }
    })()
    return () => { cancelled = true }
  }, [currentUser, refreshActiveRooms])

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

  const handleSendMessage = async () => {
    if (!selectedChat) return
    const chat = normalizedChats.find(c => c.id === selectedChat.id)
    const caption = newMessage.trim() || undefined
    const hasText = Boolean(caption)
    const hasFiles = attachments.length > 0
    if (!hasText && !hasFiles) return

    try {
      if (hasFiles && chat?.remoteRoomId) {
        const totalBytes = attachments.reduce((sum, a) => sum + a.file.size, 0)
        if (totalBytes > 3 * 1024 * 1024) {
          toast.error('Total attachments must be ≤ 3MB')
          return
        }
        const files = await Promise.all(attachments.map(async (a) => ({
          name: a.file.name,
          type: a.file.type,
          data: await fileToBase64(a.file),
        })))
        // Add pending block
        const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        setPendingBlocks(prev => [...prev, { id: tempId, type: 'images', senderId: currentUser.id, senderName: currentUser.name, images: attachments.map(a => a.url), content: caption, timestamp: new Date() }])
        setAttachments([])
        setNewMessage('')
        await messageSocket.sendMessage(chat.remoteRoomId, caption, files)
        // Clear pending
        setPendingBlocks(prev => prev.filter(p => p.id !== tempId))
        return
      }
      if (hasText) {
        // Add pending text bubble
        const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        setPendingBlocks(prev => [...prev, { id: tempId, type: 'text', senderId: currentUser.id, senderName: currentUser.name, content: caption, timestamp: new Date() }])
        setNewMessage('')
        await dispatchMessage(selectedChat.id, caption)
        setPendingBlocks(prev => prev.filter(p => p.id !== tempId))
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send')
    }
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const handlePickImage = () => fileInputRef.current?.click()
  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return
    const onlyImages = files.filter(f => f.type.startsWith('image/'))
    if (onlyImages.length !== files.length) toast.error('Only image files are supported')
    const next = [...attachments]
    let skipped = 0
    for (const f of onlyImages) {
      const url = URL.createObjectURL(f)
      next.push({ file: f, url })
      const total = next.reduce((s, a) => s + a.file.size, 0)
      if (total > 3 * 1024 * 1024) {
        // remove last if over limit
        const removed = next.pop()
        if (removed) URL.revokeObjectURL(removed.url)
        skipped++
      }
    }
    if (skipped > 0) {
      toast.info(`Removed ${skipped} attachment${skipped > 1 ? 's' : ''} to stay under 3MB total`)
    }
    setAttachments(next)
  }
  const removeAttachment = (i: number) => {
    setAttachments(prev => {
      const copy = [...prev]
      const removed = copy.splice(i, 1)
      if (removed[0]) URL.revokeObjectURL(removed[0].url)
      return copy
    })
  }
  const openImageViewer = (urls: string[], index: number) => setImageViewer({ urls, index })
  const closeImageViewer = () => setImageViewer(null)

  const groupedMessages = (list: MessagingMessage[]) => {
    const blocks: Array<
      | { type: 'images'; senderId: string; senderName?: string; images: string[]; caption?: string; timestamp: Date }
      | { type: 'message'; message: MessagingMessage }
    > = []
    let i = 0
    while (i < list.length) {
      const m = list[i]
      if (m.type === 'image' && m.metadata?.imageUrl) {
        const imgs: string[] = [m.metadata.imageUrl]
        const senderId = m.senderId
        const senderName = m.senderName
        const ts0 = new Date(m.timestamp)
        let caption: string | undefined = m.content || undefined
        let j = i + 1
        while (j < list.length) {
          const n = list[j]
          if (n.type !== 'image' || n.senderId !== senderId || !n.metadata?.imageUrl) break
          const dt = Math.abs(new Date(n.timestamp).getTime() - ts0.getTime())
          if (dt > 2 * 60 * 1000) break
          imgs.push(n.metadata.imageUrl)
          j++
        }
        blocks.push({ type: 'images', senderId, senderName, images: imgs, caption, timestamp: ts0 })
        i = j
        continue
      }
      blocks.push({ type: 'message', message: m })
      i++
    }
    return blocks
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
          lat: Number(position.coords.latitude.toFixed(7)),
          lng: Number(position.coords.longitude.toFixed(7)),
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
      if (isPage) {
        pushMessagesPath(chatForRequest.remoteRoomId || chatForRequest.id)
      }
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
        action: () => setShowScheduleSheet(true),
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

  const renderBody = () => {
    if (loadingChats || (selectedChatId && loadingThread)) {
      return <MessageCenterSkeleton />
    }

    return (
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
              <div
                className={`${
                  isPage && isMobile ? (selectedChatId ? 'hidden' : 'w-full') : 'w-1/3'
                } ${isPage && isMobile ? '' : 'border-r border-border'} flex flex-col min-h-0`}
              >
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
                          className={`cursor-pointer transition-colors ${
                            selectedChatId === chat.id ? 'bg-muted border-primary' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            setSelectedChatId(chat.id)
                            if (isPage) {
                              pushMessagesPath(chat.remoteRoomId || chat.id)
                            }
                          }}
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
                                  <div className="flex items-center gap-2 min-w-0">
                                    {(() => {
                                      const otherId = currentUser.id === chat.donorId ? chat.collectorId : chat.donorId
                                      const online = typeof chat.otherOnline === 'boolean' ? chat.otherOnline : isOnline(otherId)
                                      return (
                                        <span className={`${online ? 'bg-green-500' : 'bg-slate-300'} inline-block w-2 h-2 rounded-full`}></span>
                                      )
                                    })()}
                                    <p className="text-small font-medium truncate">
                                      {currentUser.id === chat.donorId ? chat.collectorName : chat.donorName}
                                    </p>
                                  </div>
                                  {chat.unreadCount > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      {chat.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{chat.itemTitle}</p>
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

              <div
                className={`${
                  isPage && isMobile ? (selectedChatId ? 'flex w-full' : 'hidden') : 'flex-1 flex'
                } flex-col min-h-0`}
              >
                {selectedChat ? (
                  <>
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isPage && isMobile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Back to chats"
                            onClick={() => {
                              setSelectedChatId(null)
                              if (isPage) pushMessagesPath(undefined)
                            }}
                          >
                            <ArrowLeft size={18} />
                          </Button>
                        )}
                        <Avatar>
                          <AvatarImage src={
                            currentUser.id === selectedChat.donorId
                              ? selectedChat.collectorAvatar
                              : selectedChat.donorAvatar
                          } />
                          <AvatarFallback>
                            {((currentUser.id === selectedChat.donorId ? selectedChat.collectorName : selectedChat.donorName) || '?')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const otherId = currentUser.id === selectedChat.donorId ? selectedChat.collectorId : selectedChat.donorId
                              const online =
                                typeof selectedChat.otherOnline === 'boolean' ? selectedChat.otherOnline : isOnline(otherId)
                              return (
                                <span className={`${online ? 'bg-green-500' : 'bg-slate-300'} inline-block w-2 h-2 rounded-full`}></span>
                              )
                            })()}
                            <h3 className="font-medium">
                              {currentUser.id === selectedChat.donorId ? selectedChat.collectorName : selectedChat.donorName}
                            </h3>
                          </div>
                          <p className="text-small text-muted-foreground">About: {selectedChat.itemTitle}</p>
                        </div>
                      </div>
                      <Badge variant={selectedChat.status === 'active' ? 'secondary' : 'outline'}>
                        {selectedChat.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <ScrollArea className="flex-1 min-h-0 p-4">
                      <div ref={messagesContainerRef} className="space-y-4">
                        {groupedMessages(currentMessages).map((block, idx) => {
                          if (block.type === 'images') {
                            const align = block.senderId === currentUser.id ? 'justify-end' : 'justify-start'
                            return (
                              <div key={`imggrp_${idx}`} className={`flex ${align}`}>
                                <div className="max-w-[70%] rounded-lg p-2 bg-muted">
                                  <div className="grid grid-cols-2 gap-2">
                                    {block.images.map((url, i) => (
                                      <img
                                        key={`${url}_${i}`}
                                        src={url}
                                        onClick={() => openImageViewer(block.images, i)}
                                        className="w-28 h-28 object-cover rounded cursor-pointer"
                                      />
                                    ))}
                                  </div>
                                  {block.caption && (
                                    <p className="text-xs mt-2 text-foreground whitespace-pre-line">{block.caption}</p>
                                  )}
                                  <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                    <span>{block.senderName || 'User'}</span>
                                    <span>{formatRelativeTime(block.timestamp)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          const m = block.message
                          return (
                            <div
                              key={m.id}
                              className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  m.senderId === currentUser.id
                                    ? 'bg-primary text-primary-foreground'
                                    : m.type === 'system'
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-muted text-foreground'
                                } ${m.type === 'system' ? 'mx-auto text-center' : ''}`}
                              >
                                {m.type === 'location' && m.metadata?.location && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={16} />
                                    <span className="text-small">Location shared</span>
                                  </div>
                                )}
                                <p className="text-small whitespace-pre-line">{m.content}</p>
                                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                  <span>{m.type !== 'system' ? m.senderName : 'System'}</span>
                                  <span>{formatRelativeTime(m.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {pendingBlocks.map(p => (
                          p.type === 'images' ? (
                            <div key={p.id} className="flex justify-end opacity-60">
                              <div className="max-w-[70%] rounded-lg p-2 bg-muted">
                                <div className="grid grid-cols-2 gap-2">
                                  {(p.images || []).map((url, i) => (
                                    <img key={`${url}_${i}`} src={url} className="w-28 h-28 object-cover rounded" />
                                  ))}
                                </div>
                                {p.content && (
                                  <p className="text-xs mt-2 text-foreground whitespace-pre-line">{p.content}</p>
                                )}
                                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                  <span>{p.senderName}</span>
                                  <span>Sending…</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div key={p.id} className="flex justify-end">
                              <div className="max-w-[70%] rounded-lg p-3 bg-primary text-primary-foreground opacity-60">
                                <p className="text-small whitespace-pre-line">{p.content}</p>
                                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                  <span>{p.senderName}</span>
                                  <span>Sending…</span>
                                </div>
                              </div>
                            </div>
                          )
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
                          multiple
                          className="hidden"
                          onChange={handleImageSelected}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={handlePickImage} title="Attach image">
                          <Paperclip size={16} />
                        </Button>
                        {attachments.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {attachments.map((a, i) => (
                              <div key={i} className="relative">
                                <img
                                  src={a.url}
                                  className="w-12 h-12 object-cover rounded"
                                  onClick={() => openImageViewer(attachments.map(x => x.url), i)}
                                />
                                <button
                                  className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs"
                                  onClick={() => removeAttachment(i)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Input
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={event => setNewMessage(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() && attachments.length === 0}
                          size="icon"
                          title="Send"
                        >
                          <PaperPlaneTilt size={16} />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col">
                    {isPage && isMobile && (
                      <div className="p-4 border-b border-border flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Back to chats"
                          onClick={() => {
                            setSelectedChatId(null)
                            if (isPage) pushMessagesPath(undefined)
                          }}
                        >
                          <ArrowLeft size={18} />
                        </Button>
                        <span className="ml-2 text-sm text-muted-foreground">Chats</span>
                      </div>
                    )}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center space-y-2 text-muted-foreground">
                        <Package size={48} className="mx-auto text-muted-foreground" />
                        <p className="font-medium text-foreground">{chatId ? 'Loading conversation…' : 'Select a conversation'}</p>
                        {!chatId && (
                          <p className="text-sm">
                            Choose a chat from the {isPage && isMobile ? 'list' : 'sidebar'} to start messaging
                          </p>
                        )}
                      </div>
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
  }

  if (isPage) {
    return (
      <div className="rounded-lg border border-border overflow-hidden shadow-sm bg-background">
        {renderBody()}
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-5xl h-[640px] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Message Center</DialogTitle>
          </DialogHeader>
          {renderBody()}
        </DialogContent>
      </Dialog>

      {imageViewer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <div className="relative max-w-3xl w-full px-4">
            <img src={imageViewer.urls[imageViewer.index]} className="max-h-[80vh] w-full object-contain rounded" />
            <div className="absolute top-2 right-2">
              <Button size="sm" variant="secondary" onClick={closeImageViewer}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showLocationSheet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLocationSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-background border-t border-border rounded-t-2xl p-4 shadow-lg max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Share location</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowLocationSheet(false)}>
                Close
              </Button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Pick a place using OpenStreetMap</div>
              <Button variant="outline" onClick={() => setInlineLocationPickerOpen(true)}>
                Open map selector
              </Button>
              {locationValue.lat && locationValue.lng && (
                <div className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{locationValue.label || 'Selected location'}</div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (!selectedChat || !locationValue.lat || !locationValue.lng) return
                    dispatchMessage(selectedChat.id, locationValue.label || 'Shared location', 'location', {
                      location: {
                        lat: locationValue.lat,
                        lng: locationValue.lng,
                        address: locationValue.label || 'Selected location'
                      }
                    })
                    toast.success('Location shared')
                    setShowLocationSheet(false)
                  }}
                  disabled={!locationValue.lat || !locationValue.lng}
                >
                  Share
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowLocationSheet(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
          <LocationSelector
            open={inlineLocationPickerOpen}
            onOpenChange={setInlineLocationPickerOpen}
            initialValue={locationValue}
            onApply={val => setLocationValue(val)}
          />
        </div>
      )}

      {showScheduleSheet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowScheduleSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-background border-t border-border rounded-t-2xl p-4 shadow-lg max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Schedule pickup</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowScheduleSheet(false)}>
                Close
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Pickup time</label>
                <Input type="datetime-local" value={scheduleDateTime} onChange={e => setScheduleDateTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Location</div>
                {scheduleLocation?.label ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{scheduleLocation.label}</div>
                    {typeof scheduleLocation.lat === 'number' && typeof scheduleLocation.lng === 'number' && null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No location chosen</div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setInlineLocationPickerOpen(true)}>
                    Choose on map
                  </Button>
                  <Button
                    onClick={() => {
                      if (!navigator.geolocation) return
                      navigator.geolocation.getCurrentPosition(pos => {
                        setScheduleLocation({
                          lat: Number(pos.coords.latitude.toFixed(7)),
                          lng: Number(pos.coords.longitude.toFixed(7)),
                          label: 'Current location'
                        })
                        toast.success('Using current location')
                      })
                    }}
                  >
                    Use my location
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!scheduleDateTime || !scheduleLocation}
                  onClick={() => {
                    if (!selectedChat) return
                    const dt = new Date(scheduleDateTime)
                    const when = isNaN(dt.getTime()) ? scheduleDateTime : dt.toLocaleString()
                    const where = scheduleLocation?.label || 'Selected location'
                    sendSystemMessage(
                      selectedChat.id,
                      `Pickup has been scheduled for ${when} at ${where}.`,
                      'pickup_scheduled'
                    )
                    toast.success('Pickup details shared')
                    setShowScheduleSheet(false)
                  }}
                >
                  Share schedule
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowScheduleSheet(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
          <LocationSelector
            open={inlineLocationPickerOpen}
            onOpenChange={open => {
              setInlineLocationPickerOpen(open)
            }}
            initialValue={{
              lat: scheduleLocation?.lat,
              lng: scheduleLocation?.lng,
              label: scheduleLocation?.label,
              radiusKm: 5
            }}
            onApply={(val: any) =>
              setScheduleLocation({
                lat: typeof val.lat === 'number' ? Number(val.lat.toFixed(7)) : val.lat,
                lng: typeof val.lng === 'number' ? Number(val.lng.toFixed(7)) : val.lng,
                label: val.label
              })
            }
          />
        </div>
      )}
    </>
  )
}
