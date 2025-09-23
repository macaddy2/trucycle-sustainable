import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

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
    options?: { linkedRequestId?: string }
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
    getChatForItem
  }
}

export type { Message, Chat }
