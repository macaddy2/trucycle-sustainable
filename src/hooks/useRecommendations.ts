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
  const [lastCheckTime, setLastCheckTime] = useKV('last-notification-check', null)
  
  // Check for new recommendations periodically
  const checkForNewRecommendations = async () => {
    if (!user || !user.onboardingCompleted) return

    try {
      const now = new Date().toISOString()
      const lastCheck = lastCheckTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      if (user.userType === 'collector') {
        // Check for new items that match collector preferences
        const prompt = spark.llmPrompt`Check for urgent item opportunities for a collector user in ${user.postcode}, London. 

        Generate 1-2 realistic urgent alerts for high-value or time-sensitive items that just became available. Consider:
        - Someone moving house urgently (appliances, furniture)
        - High-value electronics being offered
        - Quality furniture or household items in excellent condition
        - Items from verified donors with good ratings

        Focus on items that would be genuinely urgent/valuable for collectors. Make alerts specific and actionable.

        For each notification:
        - title: Urgent alert title (e.g., "High-Value TV Available - Urgent Pickup Needed")
        - message: Brief description of opportunity and why it's urgent
        - urgency: high, medium, or low
        - itemId: fake item ID like "item-urgent-123"

        Return as JSON with a "notifications" array (can be empty if no urgent matches).`

        const response = await spark.llm(prompt, 'gpt-4o-mini', true)
        const data = JSON.parse(response)

        if (data.notifications && data.notifications.length > 0) {
          const newNotifications = data.notifications.map((notif: any, index: number) => ({
            id: `notif-${Date.now()}-${index}`,
            userId: user.id,
            type: 'item_match' as const,
            title: notif.title,
            message: notif.message,
            itemId: notif.itemId,
            urgency: notif.urgency,
            createdAt: now,
            read: false,
            actionUrl: '/browse'
          }))

          setNotifications(prev => [...newNotifications, ...prev])
          
          // Show toast for high urgency items
          newNotifications.forEach((notif: RecommendationNotification) => {
            if (notif.urgency === 'high') {
              toast(notif.title, {
                description: notif.message,
                action: {
                  label: 'View Item',
                  onClick: () => {
                    // Navigate to item - in a real app this would use router
                    window.location.hash = '#browse'
                  }
                }
              })
            }
          })
        }
      } else {
        // Check for community needs for donors
        const prompt = spark.llmPrompt`Check for urgent community needs for a donor user in ${user.postcode}, London.

        Generate 1-2 realistic urgent alerts for community organizations or people in genuine need. Consider:
        - Emergency shelter needs (winter clothing, blankets)
        - School urgent requests (supplies before term starts)
        - Community center equipment needs
        - Family emergency situations (household essentials)
        - Environmental group urgent equipment needs

        Focus on genuine community impact where donations would make a real difference.

        For each notification:
        - title: Urgent alert title (e.g., "Emergency: Shelter Needs Winter Clothing")
        - message: Brief description of the need, who benefits, and impact
        - urgency: high, medium, or low

        Return as JSON with a "notifications" array (can be empty if no urgent needs).`

        const response = await spark.llm(prompt, 'gpt-4o-mini', true)
        const data = JSON.parse(response)

        if (data.notifications && data.notifications.length > 0) {
          const newNotifications = data.notifications.map((notif: any, index: number) => ({
            id: `notif-${Date.now()}-${index}`,
            userId: user.id,
            type: 'community_need' as const,
            title: notif.title,
            message: notif.message,
            urgency: notif.urgency,
            createdAt: now,
            read: false,
            actionUrl: '/profile?tab=recommendations'
          }))

          setNotifications(prev => [...newNotifications, ...prev])
          
          // Show toast for high urgency needs
          newNotifications.forEach((notif: RecommendationNotification) => {
            if (notif.urgency === 'high') {
              toast(notif.title, {
                description: notif.message,
                action: {
                  label: 'See Needs',
                  onClick: () => {
                    window.location.hash = '#profile'
                  }
                }
              })
            }
          })
        }
      }

      setLastCheckTime(now)
    } catch (error) {
      console.error('Error checking for recommendations:', error)
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
      if (notification && notification.userId === user.id) {
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

      if (user.userType === 'collector') {
        const urgentNotifications = [
          {
            id: `urgent-${Date.now()}-1`,
            userId: user.id,
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
            userId: user.id,
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
            userId: user.id,
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
            userId: user.id,
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
      .filter(notif => notif.userId === user.id)
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
      const prompt = spark.llmPrompt`Generate 5 highly personalized ${user.userType === 'collector' ? 'item recommendations' : 'community needs'} for a ${user.userType} user in ${user.postcode}, London.

      Make these suggestions specific, actionable, and timely. Consider:
      - Local availability and proximity
      - Seasonal relevance
      - Community impact
      - User's profile type preferences
      - Current London community needs

      ${user.userType === 'collector' 
        ? 'Focus on items that are commonly available, useful, and have good environmental impact.'
        : 'Focus on genuine community organizations and people in need who would benefit from donations.'
      }

      Return as JSON with personalized suggestions.`

      const response = await spark.llm(prompt, 'gpt-4o-mini', true)
      const data = JSON.parse(response)

      return data.suggestions || []
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