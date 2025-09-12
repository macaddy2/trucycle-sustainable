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
        const prompt = spark.llmPrompt`Check if there are any new high-priority or urgent items available for collection that would match a collector user in ${user.postcode}, London. 

        Consider items that would be:
        - Urgent (donor needs to get rid of quickly)
        - High-value or popular items
        - In their local area
        - Recently listed since ${lastCheck}

        Generate 0-2 realistic notification alerts if there are any urgent matches. For each notification:
        - title: Short alert title
        - message: Brief description of the opportunity
        - urgency: high, medium, or low
        - itemId: fake item ID like "item-123"

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
        const prompt = spark.llmPrompt`Check if there are any urgent community needs or donation requests in ${user.postcode}, London that would benefit from donations.

        Consider:
        - Emergency donation requests
        - Community organizations with urgent needs
        - High-impact donation opportunities
        - Time-sensitive charitable needs

        Generate 0-2 realistic notification alerts for urgent community needs. For each notification:
        - title: Short alert title
        - message: Brief description of the need and impact
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

    return () => clearInterval(interval)
  }, [user])

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
    checkForNewRecommendations
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