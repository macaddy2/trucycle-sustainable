import { useEffect, useState } from 'react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import { messageSocket } from '@/lib/messaging/socket'
import { createOrFindRoom, listRoomMessages, listActiveRooms, sendGeneralMessage } from '@/lib/api'
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
  // Online status of the other participant (derived from presence)
  otherOnline?: boolean
  status: 'active' | 'collection_arranged' | 'completed' | 'cancelled'
  lastMessage?: Message
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}

export function useMessaging() {
  const [currentUser] = useKV<UserProfile | null>('current-user', null)
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})

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

    const handlePresence = (p: { userId: string; online: boolean }) => {
      setChats(prev => prev.map(c => {
        const otherId = currentUser?.id === c.donorId ? c.collectorId : c.donorId
        return otherId === p.userId ? { ...c, otherOnline: p.online } : c
      }))
    }

    messageSocket.onMessageNew(handleIncoming)
    messageSocket.onRoomActivity(handleRoomActivity)
    messageSocket.onPresenceUpdate(handlePresence)
    return () => {
      messageSocket.offMessageNew(handleIncoming)
      messageSocket.offRoomActivity(handleRoomActivity)
      messageSocket.offPresenceUpdate(handlePresence)
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
      otherOnline: undefined,
      status: 'active',
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setChats(prev => [...prev, newChat])
    // No local system inserts; rely on server events/history
    toast.success('Chat is ready. You can now message about this item.')
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

    // Do not optimistically add to UI; rely on 'message:new' events
    try {
      const chat = chats.find(c => c.id === chatId)
      if (chat?.remoteRoomId && type === 'text') {
        await messageSocket.sendMessage(chat.remoteRoomId, content)
      } else if (chat?.remoteRoomId && type === 'system') {
        await sendGeneralMessage(chat.remoteRoomId, { text: content, title: metadata?.systemAction })
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send message')
    }

    return undefined
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

  const refreshActiveRooms = async () => {
    if (!currentUser) return
    try {
      const res = await listActiveRooms()
      const rooms = Array.isArray(res?.data) ? res.data : []
      setChats(prev => {
        // Map each backend room to a lightweight Chat
        const mapped: Chat[] = rooms.map((r) => {
          const other = (r.participants || []).find(p => p.id !== currentUser.id) || (r.participants || [])[0]
          const displayName = other ? [other.firstName, other.lastName].filter(Boolean).join(' ') || 'User' : 'Conversation'
          const now = new Date()
          // Build a minimal lastMessage preview if present
          const lm = r.lastMessage
          const last: Message | undefined = lm ? {
            id: lm.id,
            chatId: `chat_${r.id}`,
            senderId: lm.sender?.id || 'system',
            senderName: lm.sender ? [lm.sender.firstName, lm.sender.lastName].filter(Boolean).join(' ') || 'User' : 'System',
            content: lm.text || lm.caption || (lm.imageUrl ? 'Image' : ''),
            timestamp: new Date(lm.createdAt as any),
            type: lm.category === 'general' ? 'system' : (lm.imageUrl ? 'image' : 'text'),
            status: 'delivered'
          } : undefined
          const isDonor = currentUser.userType === 'donor'
          return {
            id: `chat_${r.id}`,
            itemId: `direct_${r.id}`,
            itemTitle: 'Direct message',
            itemImage: undefined,
            donorId: isDonor ? currentUser.id : (other?.id || ''),
            donorName: isDonor ? currentUser.name : (displayName || 'User'),
            collectorId: isDonor ? (other?.id || '') : currentUser.id,
            collectorName: isDonor ? (displayName || 'User') : currentUser.name,
            donorAvatar: undefined,
            collectorAvatar: undefined,
            linkedRequestId: undefined,
            remoteRoomId: r.id,
            otherOnline: Boolean(other?.online),
            status: 'active',
            lastMessage: last,
            unreadCount: 0,
            createdAt: new Date(r.createdAt as any || now),
            updatedAt: new Date(r.updatedAt as any || now),
          }
        })
        // Merge by remoteRoomId or id
        const existingByRoom = new Map(prev.filter(c => c.remoteRoomId).map(c => [c.remoteRoomId!, c]))
        const merged = mapped.map(m => {
          const ex = existingByRoom.get(m.remoteRoomId!)
          return ex ? { ...ex, lastMessage: m.lastMessage, updatedAt: m.updatedAt } : m
        })
        return merged
      })
    } catch {
      // ignore; UI can remain empty
    }
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
    getChatById,
    getMessagesForChat,
    getTotalUnreadCount,
    getChatForItem,
    refreshActiveRooms,
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


export type { Message, Chat }
