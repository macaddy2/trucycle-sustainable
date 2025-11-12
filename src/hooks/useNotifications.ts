import { useCallback, useEffect, useMemo } from 'react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import { listNotifications } from '@/lib/api/client'
import { notificationSocket } from '@/lib/notifications/socket'
import type { NotificationViewModel } from '@/lib/api/types'

import type { Notification } from '@/components/NotificationList'

type NotificationData = Record<string, any>

function normalizeData(data: unknown): NotificationData {
  if (data && typeof data === 'object') return data as NotificationData
  return {}
}

type NotificationInput = Omit<Notification, 'id' | 'createdAt'>

const generateNotificationId = () =>
  `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

export function mapServerToUi(n: NotificationViewModel): Notification {
  // Map backend types to UI categories/urgency
  let uiType: Notification['type'] = 'system'
  let urgency: Notification['urgency'] = 'low'
  const t = String(n.type || '').toLowerCase()
  if (t === 'item.claim.request') { uiType = 'exchange_request'; urgency = 'medium' }
  else if (t === 'item.claim.approved') { uiType = 'exchange_request'; urgency = 'high' }
  else if (t === 'item.collection' || t === 'dropoff.created' || t === 'dropin.created' || t === 'pickup.created') {
    uiType = 'system'; urgency = 'medium'
  } else { uiType = 'system'; urgency = 'low' }

  const data = normalizeData(n?.data)
  const nestedItem = normalizeData(data.item)
  const nestedClaim = normalizeData(data.claim)
  const nestedRequester = normalizeData(data.requester || data.collector || data.user)

  const itemId = data.itemId || data.item_id || nestedItem.id || nestedClaim.item_id || nestedClaim.itemId
  const itemTitle = data.itemTitle || nestedItem.title || nestedClaim.item_title || undefined
  const claimId = data.claimId || data.claim_id || nestedClaim.id
  const requesterId = data.requesterId || data.collectorId || nestedRequester.id
  const requesterName = data.requesterName || nestedRequester.name || [nestedRequester.first_name, nestedRequester.last_name].filter(Boolean).join(' ')
  const requesterAvatar = data.requesterAvatar || nestedRequester.avatar || nestedRequester.profile_image

  return {
    id: n.id,
    userId: 'me',
    type: uiType,
    title: n.title || 'Notification',
    message: (n.body ?? '') as string,
    urgency,
    createdAt: n.createdAt,
    read: Boolean(n.read),
    actionUrl: undefined,
    metadata: {
      itemId: itemId ? String(itemId) : undefined,
      itemTitle: itemTitle ? String(itemTitle) : undefined,
      claimId: claimId ? String(claimId) : undefined,
      requesterId: requesterId ? String(requesterId) : undefined,
      requesterName: requesterName ? String(requesterName) : undefined,
      requesterAvatar: requesterAvatar ? String(requesterAvatar) : undefined,
      rawType: n.type,
    },
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useKV<Notification[]>('user-notifications', [])
  const [currentUser] = useKV<{ id: string; userType?: string } | null>('current-user', null)

  // Load unread notifications from server and connect WS
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Fetch unread to initialize
        const res = await listNotifications({ unread: true, limit: 50 })
        const items = Array.isArray(res?.data) ? res.data : []
        const mapped = items.map(mapServerToUi)
        if (!cancelled && mapped.length) {
          setNotifications(prev => {
            const seen = new Set(prev.map(x => x.id))
            const merged = [...mapped.filter(x => !seen.has(x.id)), ...prev]
            // Sort by createdAt desc
            merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            return merged
          })
        }
      } catch {
        // ignore unauthenticated or network errors
      }
      try { await notificationSocket.connect() } catch {}
    })()

    // Remove any locally generated demo/system notifications prefixed by 'notif_' (legacy)
    setNotifications(prev => prev.filter(n => !String(n.id).startsWith('notif_') && !String(n.id).startsWith('urgent-')))

    const onNew = (n: NotificationViewModel) => {
      const ui = mapServerToUi(n)
      setNotifications(prev => [ui, ...prev])
      // Toast surface
      if (ui.title) {
        toast.info(ui.title, { description: ui.message })
      }

      if (String(n.type || '').toLowerCase() === 'item.claim.request' && currentUser?.userType === 'donor') {
        window.dispatchEvent(new CustomEvent('exchange-claims-refresh-requested', {
          detail: {
            reason: 'notification',
            silent: true,
            itemId: ui.metadata?.itemId,
            claimId: ui.metadata?.claimId,
            requesterId: ui.metadata?.requesterId,
          },
        }))
      }
    }
    notificationSocket.onNotificationNew(onNew)
    return () => {
      cancelled = true
      notificationSocket.offNotificationNew(onNew)
    }
  }, [setNotifications, currentUser?.userType])

  // Allow local/manual injection (used by some flows)
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
      // Fire and forget to server; update local immediately
      notificationSocket.markRead(notificationId).catch(() => {})
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
    setNotifications(current => {
      const unreadIds = current.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length) notificationSocket.markRead(unreadIds).catch(() => {})
      return current.map(notification => ({ ...notification, read: true }))
    })
  }, [setNotifications])

  const deleteNotification = useCallback(
    (notificationId: string) => {
      // Local-only removal from tray; server does not support delete
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
