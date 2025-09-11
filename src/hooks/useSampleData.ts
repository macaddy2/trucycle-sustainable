import { useKV } from '@github/spark/hooks'

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
  status: 'active' | 'collection_arranged' | 'completed' | 'cancelled'
  lastMessage?: {
    id: string
    content: string
    timestamp: Date
    senderName: string
    senderId: string
  }
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}

interface Message {
  id: string
  chatId: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
  type: 'text' | 'system' | 'location' | 'image'
}

export function useInitializeSampleData() {
  const [currentUser] = useKV('current-user', null)
  const [chats, setChats] = useKV('user-chats', [] as Chat[])
  const [messages, setMessages] = useKV('chat-messages', {} as Record<string, Message[]>)

  const initializeSampleChats = () => {
    if (!currentUser || chats.length > 0) return

    const sampleChats: Chat[] = [
      {
        id: 'chat_1',
        itemId: 'item_1',
        itemTitle: 'Vintage Oak Dining Table',
        donorId: 'user_donor_1',
        donorName: 'Sarah Johnson',
        donorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        collectorId: currentUser.id,
        collectorName: currentUser.name,
        collectorAvatar: currentUser.avatar,
        status: 'active',
        unreadCount: 2,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        lastMessage: {
          id: 'msg_last_1',
          content: 'I can meet you tomorrow afternoon for pickup. What time works best?',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          senderName: 'Sarah Johnson',
          senderId: 'user_donor_1'
        }
      },
      {
        id: 'chat_2',
        itemId: 'item_2',
        itemTitle: 'Working Laptop - Dell XPS 13',
        donorId: 'user_donor_2',
        donorName: 'Michael Chen',
        donorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        collectorId: currentUser.id,
        collectorName: currentUser.name,
        collectorAvatar: currentUser.avatar,
        status: 'collection_arranged',
        unreadCount: 0,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        lastMessage: {
          id: 'msg_last_2',
          content: 'Perfect! See you at the coffee shop tomorrow at 2 PM.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          senderName: currentUser.name,
          senderId: currentUser.id
        }
      }
    ]

    const sampleMessages: Record<string, Message[]> = {
      'chat_1': [
        {
          id: 'msg_1_1',
          chatId: 'chat_1',
          senderId: 'system',
          senderName: 'TruCycle',
          content: 'Chat started for "Vintage Oak Dining Table". Please coordinate pickup details safely and responsibly.',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          type: 'system'
        },
        {
          id: 'msg_1_2',
          chatId: 'chat_1',
          senderId: currentUser.id,
          senderName: currentUser.name,
          content: 'Hi! I\'m very interested in the dining table. Is it still available?',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
          type: 'text'
        },
        {
          id: 'msg_1_3',
          chatId: 'chat_1',
          senderId: 'user_donor_1',
          senderName: 'Sarah Johnson',
          content: 'Yes, it\'s still available! It\'s a lovely piece, just doesn\'t fit in our new place.',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
          type: 'text'
        },
        {
          id: 'msg_1_4',
          chatId: 'chat_1',
          senderId: currentUser.id,
          senderName: currentUser.name,
          content: 'That\'s perfect! When would be a good time to pick it up?',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
          type: 'text'
        },
        {
          id: 'msg_1_5',
          chatId: 'chat_1',
          senderId: 'user_donor_1',
          senderName: 'Sarah Johnson',
          content: 'I can meet you tomorrow afternoon for pickup. What time works best?',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          type: 'text'
        }
      ],
      'chat_2': [
        {
          id: 'msg_2_1',
          chatId: 'chat_2',
          senderId: 'system',
          senderName: 'TruCycle',
          content: 'Chat started for "Working Laptop - Dell XPS 13". Please coordinate pickup details safely and responsibly.',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          type: 'system'
        },
        {
          id: 'msg_2_2',
          chatId: 'chat_2',
          senderId: currentUser.id,
          senderName: currentUser.name,
          content: 'Hi! I\'m interested in the laptop. Could you tell me more about its condition?',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
          type: 'text'
        },
        {
          id: 'msg_2_3',
          chatId: 'chat_2',
          senderId: 'user_donor_2',
          senderName: 'Michael Chen',
          content: 'It\'s in excellent condition! I barely used it, just for light work. Battery still lasts 6+ hours.',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          type: 'text'
        },
        {
          id: 'msg_2_4',
          chatId: 'chat_2',
          senderId: currentUser.id,
          senderName: currentUser.name,
          content: 'Sounds great! Where would be convenient for you to meet?',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
          type: 'text'
        },
        {
          id: 'msg_2_5',
          chatId: 'chat_2',
          senderId: 'user_donor_2',
          senderName: 'Michael Chen',
          content: 'How about the coffee shop on High Street tomorrow at 2 PM?',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
          type: 'text'
        },
        {
          id: 'msg_2_6',
          chatId: 'chat_2',
          senderId: currentUser.id,
          senderName: currentUser.name,
          content: 'Perfect! See you at the coffee shop tomorrow at 2 PM.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          type: 'text'
        }
      ]
    }

    setChats(sampleChats)
    setMessages(sampleMessages)
  }

  return {
    initializeSampleChats
  }
}