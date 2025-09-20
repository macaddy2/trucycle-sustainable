import { useCallback, useEffect, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'

import type { Notification } from '@/components/NotificationList'

type NotificationInput = Omit<Notification, 'id' | 'createdAt'>

const generateNotificationId = () =>
  `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

export function useNotifications() {
  const [notifications, setNotifications] = useKV<Notification[]>('user-notifications', [])

  const addNotification = useCallback(
    (notification: NotificationInput) => {
      const newNotification: Notification = {
        ...notification,
        id: generateNotificationId(),
        createdAt: new Date().toISOString(),
      }

      setNotifications(current => [newNotification, ...current])
      return newNotification
    },
    [setNotifications],
  )

  const markAsRead = useCallback(
    (notificationId: string) => {
      setNotifications(current =>
        current.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      )
    },
    [setNotifications],
  )

  const markAllAsRead = useCallback(() => {
    setNotifications(current => current.map(notification => ({ ...notification, read: true })))
  }, [setNotifications])

  const deleteNotification = useCallback(
    (notificationId: string) => {
      setNotifications(current => current.filter(notification => notification.id !== notificationId))
    },
    [setNotifications],
  )

  const getNotificationsByType = useCallback(
    (type: Notification['type']) => notifications.filter(notification => notification.type === type),
    [notifications],
  )

  const getUrgentNotifications = useCallback(
    () => notifications.filter(notification => notification.urgency === 'urgent' && !notification.read),
    [notifications],
  )

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.read).length,
    [notifications],
  )

  useEffect(() => {
    const handleDemoNotification = (event: Event) => {
      const customEvent = event as CustomEvent<{ notification: NotificationInput }>
      if (customEvent.detail?.notification) {
        addNotification(customEvent.detail.notification)
      }
    }

    window.addEventListener('add-demo-notification', handleDemoNotification)
    return () => {
      window.removeEventListener('add-demo-notification', handleDemoNotification)
    }
  }, [addNotification])

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationsByType,
    getUrgentNotifications,
    unreadCount,
  }
}
