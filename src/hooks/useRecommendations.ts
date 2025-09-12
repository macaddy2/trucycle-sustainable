import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  userType: 'donor' | 'collector'
  postcode: string
  onboardingCompleted: boolean
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
  
  // Check for new recommendations periodically
  const checkForNewRecommendations = async () => {
    if (!user || !user.onboardingCompleted) return

    try {
      const now = new Date().toISOString()
      const lastCheck = lastCheckTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      if (user?.userType === 'collector') {
        // Mock urgent notifications for collectors
        const mockNotifications: RecommendationNotification[] = [
          {
            id: `notif-${Date.now()}`,
            userId: user?.id || "",
            type: 'item_match',
            title: 'High-Value MacBook Available!',
            message: 'Verified donor offering MacBook Pro in excellent condition - pickup needed today.',
            urgency: 'high',
            createdAt: now,
            read: false,
            actionUrl: '/browse'
          }
        ]
        
        setNotifications(prev => [...(prev || []), ...mockNotifications])
      } else {
        // Mock community need alerts for donors
        const mockNotifications: RecommendationNotification[] = [
          {
            id: `notif-${Date.now()}`,
            userId: user?.id || "",
            type: 'community_need',
            title: 'Urgent Community Need!',
            message: 'Local shelter urgently needs winter clothing and blankets for families.',
            urgency: 'high',
            createdAt: now,
            read: false,
            actionUrl: '/profile'
          }
        ]
        
        setNotifications(prev => [...(prev || []), ...mockNotifications])
      }

      setLastCheckTime(now)
    } catch (error) {
      console.error('Failed to check recommendations:', error)
    }
  }

  // Check for recommendations every 10 minutes when user is active
  useEffect(() => {
    if (!user || !user.onboardingCompleted) return

    // Initial check
    checkForNewRecommendations()

    // Set up periodic checks
    const interval = setInterval(checkForNewRecommendations, 10 * 60 * 1000) // 10 minutes

    // Listen for demo notifications when profile switches
    const handleDemoNotification = (event: CustomEvent) => {
      const { notification } = event.detail
      if (notification && notification.userId === user?.id || "") {
        setNotifications(prev => [notification, ...prev])
      }
    }

    // Listen for urgent notification requests
    const handleUrgentRequest = () => {
      checkForNewRecommendations()
    }

    window.addEventListener('add-demo-notification', handleDemoNotification as EventListener)
    window.addEventListener('request-urgent-notifications', handleUrgentRequest as EventListener)

    return () => {
      clearInterval(interval)
      window.removeEventListener('add-demo-notification', handleDemoNotification as EventListener)
      window.removeEventListener('request-urgent-notifications', handleUrgentRequest as EventListener)
    }
  }, [user])

  // Function to trigger urgent notifications manually
  const triggerUrgentNotifications = async () => {
    if (!user || !user.onboardingCompleted) return

    try {
      const now = new Date().toISOString()

      if (user?.userType === 'collector') {
        const urgentNotifications = [
          {
            id: `urgent-${Date.now()}-1`,
            userId: user?.id || "",
            type: 'urgent_request' as const,
            title: '🚨 URGENT: Samsung 65" TV - Must Go Today!',
            message: 'Family moving overseas in 24 hours. Samsung 65" QLED TV (2022 model) in perfect condition. Free to good home. Pickup from Canary Wharf before 8pm tonight.',
            itemId: 'urgent-tv-123',
            urgency: 'high' as const,
            createdAt: now,
            read: false,
            actionUrl: '/browse?urgent=true'
          },
          {
            id: `urgent-${Date.now()}-2`,
            userId: user?.id || "",
            type: 'urgent_request' as const,
            title: '⚡ FLASH: Designer Furniture Clearance',
            message: 'Office closure tomorrow! Herman Miller chairs, standing desks, and premium furniture available. First come, first served. Collection from Shoreditch office.',
            itemId: 'urgent-office-456',
            urgency: 'high' as const,
            createdAt: now,
            read: false,
            actionUrl: '/browse?category=furniture'
          }
        ]

        setNotifications(prev => [...urgentNotifications, ...prev])
        
        urgentNotifications.forEach((notif) => {
          toast(notif.title, {
            description: notif.message,
            duration: 10000,
            action: {
              label: 'Claim Now',
              onClick: () => {
                toast.success('Demo completed! 🎉', {
                  description: 'In real use, this would take you directly to claim the urgent item.',
                })
              }
            }
          })
        })
      } else {
        const urgentNotifications = [
          {
            id: `urgent-${Date.now()}-1`,
            userId: user?.id || "",
            type: 'urgent_request' as const,
            title: '🆘 URGENT: School Fire Appeal',
            message: 'Local primary school suffered water damage. Urgently need children\'s books, stationery, and educational toys for 200+ pupils. Term starts Monday!',
            urgency: 'high' as const,
            createdAt: now,
            read: false,
            actionUrl: '/profile?tab=recommendations'
          },
          {
            id: `urgent-${Date.now()}-2`,
            userId: user?.id || "",
            type: 'urgent_request' as const,
            title: '❄️ EMERGENCY: Winter Shelter Appeal',
            message: 'Homeless shelter preparing for cold snap this weekend. Desperately need warm blankets, winter coats (all sizes), and sleeping bags. Every donation saves lives.',
            urgency: 'high' as const,
            createdAt: now,
            read: false,
            actionUrl: '/list?category=clothing'
          }
        ]

        setNotifications(prev => [...urgentNotifications, ...prev])
        
        urgentNotifications.forEach((notif) => {
          toast(notif.title, {
            description: notif.message,
            duration: 10000,
            action: {
              label: 'Help Now',
              onClick: () => {
                toast.success('Demo completed! 🎉', {
                  description: 'In real use, this would take you directly to donation options.',
                })
              }
            }
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
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    )
  }

  // Get unread count
  const getUnreadCount = () => {
    return notifications.filter(notif => !notif.read && notif.userId === user?.id).length
  }

  // Get recent notifications for user
  const getUserNotifications = () => {
    if (!user) return []
    return notifications
      .filter(notif => notif.userId === user?.id || "")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10) // Last 10 notifications
  }

  return {
    notifications: getUserNotifications(),
    unreadCount: getUnreadCount(),
    markAsRead,
    checkForNewRecommendations,
    triggerUrgentNotifications
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
      const mockSuggestions = user?.userType === 'collector' 
        ? [
            {
              id: 'sugg_1',
              title: 'Vintage Furniture in Hackney',
              description: 'Beautiful mid-century pieces available from verified donor',
              urgency: 'medium',
              impact: 'Save 25kg CO2 by giving furniture new life'
            },
            {
              id: 'sugg_2', 
              title: 'Electronics Collection Opportunity',
              description: 'High-value items available near your area',
              urgency: 'high',
              impact: 'Prevent electronic waste and save energy'
            }
          ]
        : [
            {
              id: 'need_1',
              title: 'Support Local Families',
              description: 'Camden shelter needs household essentials',
              urgency: 'high',
              impact: 'Help 20+ families in temporary housing'
            },
            {
              id: 'need_2',
              title: 'School Supply Drive',
              description: 'Primary school needs educational materials',
              urgency: 'medium',
              impact: 'Support learning for 200+ children'
            }
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
    isGenerating
  }
}