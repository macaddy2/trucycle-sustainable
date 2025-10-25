import type { MouseEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  BellRinging,
  CheckCircle,
  Package,
  Heart,
  ArrowsClockwise,
  Clock,
  X
} from '@phosphor-icons/react'

export interface Notification {
  id: string
  userId: string
  type: 'item_match' | 'community_need' | 'exchange_request' | 'system' | 'urgent'
  title: string
  message: string
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: string
  read: boolean
  actionUrl?: string
  metadata?: {
    itemId?: string
    itemTitle?: string
    requesterId?: string
    requesterName?: string
    rawType?: string
  }
}

interface NotificationListProps {
  notifications?: Notification[]
  onMarkAsRead?: (notificationId: string) => void
  onMarkAllAsRead?: () => void
  onDeleteNotification?: (notificationId: string) => void
  onClickNotification?: (notification: Notification) => void
  className?: string
}

export function NotificationList({ 
  notifications = [], 
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClickNotification,
  className 
}: NotificationListProps) {
  const unreadCount = notifications.filter(n => !n.read).length

  const getNotificationIcon = (type: string, urgency: string) => {
    if (urgency === 'urgent') {
      return <BellRinging size={20} className="text-red-500" />
    }
    
    switch (type) {
      case 'item_match':
        return <Package size={20} className="text-blue-500" />
      case 'community_need':
        return <Heart size={20} className="text-pink-500" />
      case 'exchange_request':
        return <ArrowsClockwise size={20} className="text-green-500" />
      case 'system':
        return <Bell size={20} className="text-gray-500" />
      default:
        return <Bell size={20} className="text-gray-500" />
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-100 border-red-200 text-red-900'
      case 'high':
        return 'bg-orange-100 border-orange-200 text-orange-900'
      case 'medium':
        return 'bg-yellow-100 border-yellow-200 text-yellow-900'
      case 'low':
        return 'bg-green-100 border-green-200 text-green-900'
      default:
        return 'bg-gray-100 border-gray-200 text-gray-900'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
    if (onClickNotification) {
      onClickNotification(notification)
      return
    }
    // Fallback: navigate by actionUrl if provided
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('http')) {
        window.location.href = notification.actionUrl
      } else {
        const base = (import.meta as any).env?.BASE_URL || '/'
        const normalized = String(base || '/').replace(/\/$/, '')
        const target = notification.actionUrl.startsWith('/') ? notification.actionUrl : `/${notification.actionUrl}`
        window.location.href = `${normalized}${target}`
      }
    }
  }

  const handleDeleteClick = (e: MouseEvent, notificationId: string) => {
    e.stopPropagation()
    if (onDeleteNotification) {
      onDeleteNotification(notificationId)
    }
  }

  if (notifications.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Bell size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-foreground mb-2">No notifications</h3>
          <p className="text-muted-foreground text-sm">
            You're all caught up! New notifications will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Bell size={20} />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Stay updated with your TruCycle activity
            </CardDescription>
          </div>
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
              <CheckCircle size={16} className="mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.read ? 'bg-accent/20' : ''
                } ${notification.urgency === 'urgent' ? 'border-l-4 border-l-red-500' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.urgency)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        {/* Metadata display */}
                        {notification.metadata?.itemTitle && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              <Package size={10} className="mr-1" />
                              {notification.metadata.itemTitle}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-2">
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Clock size={12} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          {notification.urgency !== 'low' && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs mt-1 ${getUrgencyColor(notification.urgency)}`}
                            >
                              {notification.urgency}
                            </Badge>
                          )}
                        </div>
                        
                        {onDeleteNotification && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteClick(e, notification.id)}
                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          >
                            <X size={12} />
                          </Button>
                        )}
                        
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

