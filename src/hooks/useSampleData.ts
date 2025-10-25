import { useKV } from '@/hooks/useKV'

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
    identity: boolean
    address: boolean
  }
  avatar?: string
  partnerAccess?: boolean
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

interface Rating {
  id: string
  exchangeId: string
  itemTitle: string
  reviewerId: string
  reviewerName: string
  reviewerAvatar?: string
  targetUserId: string
  targetUserName: string
  rating: number
  review: string
  category: 'punctuality' | 'communication' | 'item_condition' | 'overall'
  subcategories: {
    punctuality: number
    communication: number
    itemCondition: number
    politeness: number
  }
  isPositive: boolean
  helpfulVotes: number
  createdAt: string
  verified: boolean
}

export function useInitializeSampleData() {
  const [currentUser] = useKV<UserProfile | null>('current-user', null)
  const [chats, setChats] = useKV<Chat[]>('user-chats', [])
  const [, setMessages] = useKV<Record<string, Message[]>>('chat-messages', {})
  const [ratings, setRatings] = useKV<Rating[]>('user-ratings', [])

  const initializeSampleChats = () => {
    if (!currentUser || chats?.length > 0) return

    // Initialize sample ratings if none exist
    if (ratings?.length === 0) {
      const sampleRatings: Rating[] = [
        {
          id: 'rating_1',
          exchangeId: 'exchange_1',
          itemTitle: 'Vintage Oak Dining Table',
          reviewerId: 'user_reviewer_1',
          reviewerName: 'Alex Johnson',
          reviewerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          targetUserId: 'user_donor_1',
          targetUserName: 'Sarah Johnson',
          rating: 5,
          review: 'Sarah was amazing! The table was exactly as described and she was very flexible with pickup timing. Highly recommended!',
          category: 'overall',
          subcategories: {
            punctuality: 5,
            communication: 5,
            itemCondition: 5,
            politeness: 5
          },
          isPositive: true,
          helpfulVotes: 3,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          verified: true
        },
        {
          id: 'rating_2',
          exchangeId: 'exchange_2',
          itemTitle: 'Garden Tools Set',
          reviewerId: 'user_reviewer_2',
          reviewerName: 'Maria Garcia',
          reviewerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
          targetUserId: 'user_donor_1',
          targetUserName: 'Sarah Johnson',
          rating: 4,
          review: 'Great exchange! Tools were in good condition. Sarah was a bit late but apologized and was very friendly.',
          category: 'overall',
          subcategories: {
            punctuality: 3,
            communication: 5,
            itemCondition: 4,
            politeness: 5
          },
          isPositive: true,
          helpfulVotes: 1,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          verified: true
        },
        {
          id: 'rating_3',
          exchangeId: 'exchange_3',
          itemTitle: 'Electronics Bundle',
          reviewerId: 'user_reviewer_3',
          reviewerName: 'John Smith',
          reviewerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          targetUserId: 'user_donor_2',
          targetUserName: 'Michael Chen',
          rating: 5,
          review: 'Fantastic experience! Michael was punctual, well-organized, and the items were in perfect condition. Will definitely exchange again!',
          category: 'overall',
          subcategories: {
            punctuality: 5,
            communication: 5,
            itemCondition: 5,
            politeness: 5
          },
          isPositive: true,
          helpfulVotes: 5,
          createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          verified: true
        },
        {
          id: 'rating_4',
          exchangeId: 'exchange_4',
          itemTitle: 'Books Collection',
          reviewerId: 'user_reviewer_4',
          reviewerName: 'Lisa Wong',
          reviewerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
          targetUserId: 'user_donor_3',
          targetUserName: 'Emma Thompson',
          rating: 4,
          review: 'Nice collection of books! Emma was responsive and easy to coordinate with. One book had more wear than expected but overall happy.',
          category: 'overall',
          subcategories: {
            punctuality: 4,
            communication: 5,
            itemCondition: 3,
            politeness: 4
          },
          isPositive: true,
          helpfulVotes: 2,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          verified: true
        }
      ]
      setRatings(sampleRatings)
    }

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
