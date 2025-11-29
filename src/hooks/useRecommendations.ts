import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useKV } from '@/hooks/useKV'

interface UserProfile {
  id: string
  userType: 'donor' | 'collector'
  postcode?: string
  onboardingCompleted: boolean
  partnerAccess?: boolean
}

interface RecommendationNotification {
  id: string
  userId: string
  type: 'item_match' | 'community_need' | 'urgent_request'
  title: string
  message: string
  itemId?: string
  urgency: 'high' | 'medium' | 'low'
  createdAt: string
  read: boolean
  actionUrl?: string
}

export function useRecommendationNotifications(user: UserProfile | null) {
  const [notifications, setNotifications] = useKV<RecommendationNotification[]>('recommendation-notifications', [])
  const [lastCheckTime, setLastCheckTime] = useKV<string | null>('last-notification-check', null)

  // Clear any legacy/demo notifications persisted locally (one-time on mount)
  useEffect(() => {
    setNotifications([])
    setLastCheckTime(null)
  }, [setNotifications, setLastCheckTime])

  const checkForNewRecommendations = useCallback(async () => {
    if (!user?.id) return

    try {
      const now = new Date().toISOString()
      const minutesSinceLastCheck = lastCheckTime
        ? (Date.now() - new Date(lastCheckTime).getTime()) / (1000 * 60)
        : Infinity
      if (minutesSinceLastCheck < 1) return

      // TODO: wire to backend endpoint; keep timestamp fresh to avoid spamming.
      setLastCheckTime(now)
    } catch (error) {
      console.error('Failed to check recommendations:', error)
    }
  }, [lastCheckTime, setLastCheckTime, user])

  // Check for recommendations every 10 minutes when user is active
  useEffect(() => {
    if (!user?.id) return

    void checkForNewRecommendations()

    const interval = setInterval(() => {
      void checkForNewRecommendations()
    }, 10 * 60 * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [checkForNewRecommendations, user])

  // Function to trigger urgent notifications manually (demo-only until backend exists)
  const triggerUrgentNotifications = async () => {
    if (!user?.id) return

    try {
      const now = new Date().toISOString()

      if (user.userType === 'collector') {
        const urgentNotifications: RecommendationNotification[] = [
          {
            id: `urgent-${Date.now()}-1`,
            userId: user.id,
            type: 'urgent_request',
            title: 'URGENT: Samsung 65" TV - Must Go Today!',
            message: 'Family moving overseas in 24 hours. QLED TV (2022) free to good home. Pickup from Canary Wharf before 8pm tonight.',
            itemId: 'urgent-tv-123',
            urgency: 'high',
            createdAt: now,
            read: false,
            actionUrl: '/browse?urgent=true',
          },
          {
            id: `urgent-${Date.now()}-2`,
            userId: user.id,
            type: 'urgent_request',
            title: 'FLASH: Designer Furniture Clearance',
            message: 'Office closure tomorrow. Herman Miller chairs, standing desks, and premium furniture available. Collection from Shoreditch office.',
            itemId: 'urgent-office-456',
            urgency: 'high',
            createdAt: now,
            read: false,
            actionUrl: '/browse?category=furniture',
          },
        ]

        setNotifications(prev => [...urgentNotifications, ...(prev || [])])

        urgentNotifications.forEach((notif) => {
          toast(notif.title, {
            description: notif.message,
            duration: 10000,
            action: {
              label: 'Claim Now',
              onClick: () => {
                toast.success('Demo completed', {
                  description: 'In production this would take you to the item.',
                })
              },
            },
          })
        })
      } else {
        const urgentNotifications: RecommendationNotification[] = [
          {
            id: `urgent-${Date.now()}-1`,
            userId: user.id,
            type: 'community_need',
            title: 'URGENT: School Fire Appeal',
            message: 'Local primary school suffered water damage. Need children\'s books, stationery, and educational toys for 200+ pupils.',
            urgency: 'high',
            createdAt: now,
            read: false,
            actionUrl: '/profile?tab=recommendations',
          },
          {
            id: `urgent-${Date.now()}-2`,
            userId: user.id,
            type: 'community_need',
            title: 'EMERGENCY: Winter Shelter Appeal',
            message: 'Homeless shelter preparing for cold snap needs warm blankets, winter coats, and sleeping bags.',
            urgency: 'high',
            createdAt: now,
            read: false,
            actionUrl: '/list?category=clothing',
          },
        ]

        setNotifications(prev => [...urgentNotifications, ...(prev || [])])

        urgentNotifications.forEach((notif) => {
          toast(notif.title, {
            description: notif.message,
            duration: 10000,
            action: {
              label: 'Help Now',
              onClick: () => {
                toast.success('Demo completed', {
                  description: 'In production this would take you to donation options.',
                })
              },
            },
          })
        })
      }
    } catch (error) {
      console.error('Error generating urgent notifications:', error)
    }
  }

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      (prev || []).map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true }
          : notif
      )
    )
  }

  // Get unread count
  const getUnreadCount = () => {
    if (!notifications || !user) return 0
    return notifications.filter(notif => !notif.read && notif.userId === user.id).length
  }

  // Get recent notifications for user
  const getUserNotifications = () => {
    if (!user || !notifications) return []
    return notifications
      .filter(notif => notif.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10) // Last 10 notifications
  }

  return {
    notifications: getUserNotifications(),
    unreadCount: getUnreadCount(),
    markAsRead,
    checkForNewRecommendations,
    triggerUrgentNotifications,
  }
}

// Hook for manual recommendation triggers
export function useSmartRecommendations(user: UserProfile | null) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePersonalizedRecommendations = async () => {
    if (!user || !user.onboardingCompleted) return []

    setIsGenerating(true)
    try {
      // Mock personalized recommendations
      const mockSuggestions = user.userType === 'collector'
        ? [
            {
              id: 'sugg_1',
              title: 'Vintage Furniture in Hackney',
              description: 'Beautiful mid-century pieces available from verified donor',
              urgency: 'medium',
              impact: 'Save 25kg CO2 by giving furniture new life',
            },
            {
              id: 'sugg_2',
              title: 'Electronics Collection Opportunity',
              description: 'High-value items available near your area',
              urgency: 'high',
              impact: 'Prevent electronic waste and save energy',
            },
          ]
        : [
            {
              id: 'need_1',
              title: 'Support Local Families',
              description: 'Camden shelter needs household essentials',
              urgency: 'high',
              impact: 'Help 20+ families in temporary housing',
            },
            {
              id: 'need_2',
              title: 'School Supply Drive',
              description: 'Primary school needs educational materials',
              urgency: 'medium',
              impact: 'Support learning for 200+ children',
            },
          ]

      return mockSuggestions
    } catch (error) {
      console.error('Error generating recommendations:', error)
      toast.error('Failed to generate recommendations')
      return []
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generatePersonalizedRecommendations,
    isGenerating,
  }
}
