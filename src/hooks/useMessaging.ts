import { useEffect } from 'react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import { messageSocket } from '@/lib/messaging/socket'
import { createOrFindRoom, listRoomMessages } from '@/lib/api'
import type { DMMessageView } from '@/lib/api/types'

interface UserProfile {
  id: string
  name: string
  email: string
  userType: 'donor' | 'collector'
  verificationLevel: 'basic' | 'verified' | 'trusted'
  onboardingCompleted: boolean
  rating?: number
  completedVerifications: {
    email: boolean
    phone: boolean
    identity: boolean
  }
  avatar?: string
  partnerAccess?: boolean
}

interface Message {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: Date
  type: 'text' | 'system' | 'location' | 'image'
  status: 'pending' | 'sent' | 'delivered' | 'read'
  metadata?: {
    location?: { lat: number; lng: number; address: string }
    imageUrl?: string
    systemAction?: string
  }
}

interface Chat {
  id: string
  itemId: string
  itemTitle: string
  itemImage?: string
  donorId: string
  donorName: string
  donorAvatar?: string
  collectorId: string
  collectorName: string
  collectorAvatar?: string
  linkedRequestId?: string
  remoteRoomId?: string
  status: 'active' | 'collection_arranged' | 'completed' | 'cancelled'
  lastMessage?: Message
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}

export function useMessaging() {
  const [currentUser] = useKV<UserProfile | null>('current-user', null)
  const [chats, setChats] = useKV<Chat[]>('user-chats', [])
  const [messages, setMessages] = useKV<Record<string, Message[]>>('chat-messages', {})

  // Connect WS and handle incoming events
  useEffect(() => {
    if (!currentUser) return
    messageSocket.connect()

    const handleIncoming = (m: DMMessageView) => {
      const chat = chats.find(c => c.remoteRoomId === m.roomId)
      if (!chat) return
      const chatId = chat.id
      const isSystem = m.category === 'general'
      const isImage = Boolean(m.imageUrl)
      const type: Message['type'] = isSystem ? 'system' : (isImage ? 'image' : 'text')
      const senderId = m.sender?.id || 'system'
      const senderName = m.sender ? [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') || 'User' : 'System'
      const content = m.text || m.caption || (m.imageUrl ? 'Image' : '')
      const incoming: Message = {
        id: m.id,
        chatId,
        senderId,
        senderName,
        content,
        timestamp: new Date(m.createdAt as any),
        type,
        status: 'delivered',
        metadata: m.imageUrl ? { imageUrl: m.imageUrl } : undefined,
      }
      setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), incoming] }))
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: incoming, unreadCount: c.unreadCount + 1, updatedAt: new Date() } : c))
    }

    const handleRoomActivity = (p: { roomId: string; updatedAt: string }) => {
      const chat = chats.find(c => c.remoteRoomId === p.roomId)
      if (!chat) return
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, updatedAt: new Date(p.updatedAt) } : c))
    }

    messageSocket.onMessageNew(handleIncoming)
    messageSocket.onRoomActivity(handleRoomActivity)
    return () => {
      messageSocket.offMessageNew(handleIncoming)
      messageSocket.offRoomActivity(handleRoomActivity)
    }
  }, [currentUser, chats, setMessages, setChats])

  const createOrGetChat = async (
    itemId: string,
    itemTitle: string,
    itemImage: string | undefined,
    donorId: string,
    donorName: string,
    donorAvatar: string | undefined,
    collectorId: string,
    collectorName: string,
    collectorAvatar: string | undefined,
    options?: { linkedRequestId?: string; remoteRoomId?: string }
  ) => {
    // Check if chat already exists
    const existingChat = chats.find(chat =>
      chat.itemId === itemId &&
      chat.donorId === donorId &&
      chat.collectorId === collectorId
    )

    if (existingChat) {
      if (options?.linkedRequestId && existingChat.linkedRequestId !== options.linkedRequestId) {
        setChats(prev => prev.map(chat =>
          chat.id === existingChat.id
            ? { ...chat, linkedRequestId: options.linkedRequestId }
            : chat
        ))
      }
      return existingChat.id
    }

    // Create new chat
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newChat: Chat = {
      id: chatId,
      itemId,
      itemTitle,
      itemImage,
      donorId,
      donorName,
      donorAvatar,
      collectorId,
      collectorName,
      collectorAvatar,
      linkedRequestId: options?.linkedRequestId,
      remoteRoomId: options?.remoteRoomId,
      status: 'active',
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setChats(prev => [...prev, newChat])

    // Send initial system message
    const systemMessage: Message = {
      id: `sys_${Date.now()}_init`,
      chatId,
      senderId: 'system',
      senderName: 'TruCycle',
      content: `Chat started for "${itemTitle}". Please coordinate pickup details safely and responsibly.`,
      timestamp: new Date(),
      type: 'system',
      status: 'delivered',
      metadata: { systemAction: 'chat_created' }
    }

    setMessages(prev => ({
      ...prev,
      [chatId]: [systemMessage]
    }))

    toast.success('Chat created! You can now message about this item.')
    return chatId
  }

  const sendMessage = async (
    chatId: string,
    content: string,
    type: 'text' | 'system' | 'location' | 'image' = 'text',
    metadata?: Message['metadata']
  ) => {
    if (!currentUser) {
      toast.error('Please sign in to send messages')
      return
    }

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content,
      timestamp: new Date(),
      type,
      status: 'sent',
      metadata
    }

    // Add message to chat
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message]
    }))

    // Update chat's last message and timestamp
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            lastMessage: message,
            updatedAt: new Date()
          }
        : chat
    ))

    // Send over WS if linked to a server room (text only here)
    try {
      const chat = chats.find(c => c.id === chatId)
      if (chat?.remoteRoomId && type === 'text') {
        await messageSocket.sendMessage(chat.remoteRoomId, content)
      }
    } catch {
      // ignore WS errors for now
    }

    // Simulate message delivery (in real app, this would be handled by backend)
    setTimeout(() => {
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId]?.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'delivered' }
            : msg
        ) || []
      }))
    }, 500)

    return message.id
  }

  const markMessagesAsRead = (chatId: string) => {
    // Mark chat as read
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ))

    // Mark messages as read
    setMessages(prev => ({
      ...prev,
      [chatId]: prev[chatId]?.map(msg => 
        msg.senderId !== currentUser?.id 
          ? { ...msg, status: 'read' }
          : msg
      ) || []
    }))
  }

  const updateChatStatus = (chatId: string, status: Chat['status']) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, status, updatedAt: new Date() }
        : chat
    ))

    // Send system message about status change
    const statusMessages = {
      collection_arranged: 'Collection has been arranged between both parties.',
      completed: 'Item collection has been completed successfully.',
      cancelled: 'This exchange has been cancelled.'
    }

    if (status !== 'active' && statusMessages[status]) {
      sendMessage(chatId, statusMessages[status], 'system', { 
        systemAction: `status_${status}` 
      })
    }
  }

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId))
    setMessages(prev => {
      const newMessages = { ...prev }
      delete newMessages[chatId]
      return newMessages
    })
    toast.success('Chat deleted')
  }

  const simulateIncomingMessage = (chatId: string, fromUserId: string, fromUserName: string, content: string) => {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId,
      senderId: fromUserId,
      senderName: fromUserName,
      content,
      timestamp: new Date(),
      type: 'text',
      status: 'delivered'
    }

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message]
    }))

    // Update chat and increment unread if not currently viewing
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            lastMessage: message,
            unreadCount: chat.unreadCount + 1,
            updatedAt: new Date()
          }
        : chat
    ))

    toast.info(`New message from ${fromUserName}`)
  }

  const getChatById = (chatId: string) => {
    return chats.find(chat => chat.id === chatId)
  }

  const getMessagesForChat = (chatId: string) => {
    return messages[chatId] || []
  }

  const getTotalUnreadCount = () => {
    return chats.reduce((total, chat) => total + chat.unreadCount, 0)
  }

  const getChatForItem = (itemId: string) => {
    return chats.find(chat => chat.itemId === itemId)
  }

  return {
    chats,
    messages,
    currentUser,
    createOrGetChat,
    sendMessage,
    markMessagesAsRead,
    updateChatStatus,
    deleteChat,
    simulateIncomingMessage,
    getChatById,
    getMessagesForChat,
    getTotalUnreadCount,
    getChatForItem,
    linkChatToRoom: (chatId: string, remoteRoomId: string) => {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, remoteRoomId } : c))
    },
    ensureRemoteRoomForChat: async (chatId: string) => {
      const chat = chats.find(c => c.id === chatId)
      if (!currentUser || !chat) return null
      if (chat.remoteRoomId) {
        try { await messageSocket.joinRoom(currentUser.id === chat.donorId ? chat.collectorId : chat.donorId) } catch {}
        return chat.remoteRoomId
      }
      const otherUserId = currentUser.id === chat.donorId ? chat.collectorId : chat.donorId
      try {
        const res = await createOrFindRoom(otherUserId)
        const roomId = res?.data?.id
        if (roomId) {
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, remoteRoomId: roomId } : c))
          try { await messageSocket.joinRoom(otherUserId) } catch {}
          return roomId
        }
      } catch {}
      return null
    },
    loadHistoryForChat: async (chatId: string) => {
      const chat = chats.find(c => c.id === chatId)
      if (!chat?.remoteRoomId) return
      try {
        const res = await listRoomMessages(chat.remoteRoomId, { limit: 50 })
        const items = res?.data?.messages || []
        if (!Array.isArray(items) || items.length === 0) return
        const mapped: Message[] = items.map((m) => {
          const isSystem = m.category === 'general'
          const isImage = Boolean(m.imageUrl)
          const type: Message['type'] = isSystem ? 'system' : (isImage ? 'image' : 'text')
          const senderId = m.sender?.id || 'system'
          const senderName = m.sender ? [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') || 'User' : 'System'
          const content = m.text || m.caption || (m.imageUrl ? 'Image' : '')
          return {
            id: m.id,
            chatId,
            senderId,
            senderName,
            content,
            timestamp: new Date(m.createdAt as any),
            type,
            status: 'delivered',
            metadata: m.imageUrl ? { imageUrl: m.imageUrl } : undefined,
          }
        })
        // Deduplicate by message id when merging
        setMessages(prev => {
          const existing = prev[chatId] || []
          const seen = new Set(existing.map(x => x.id))
          const merged = [...existing, ...mapped.filter(x => !seen.has(x.id))]
          return { ...prev, [chatId]: merged }
        })
      } catch {}
    }
  }
}

export type { Message, Chat }
