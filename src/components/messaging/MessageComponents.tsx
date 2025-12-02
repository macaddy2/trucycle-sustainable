import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChatCircle, CheckCircle, Clock } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { useExchangeManager } from '@/hooks'
import { useMessaging } from '@/hooks/useMessaging'

interface MessageNotificationProps {
  onOpenMessages: () => void
}

interface Chat {
  id: string
  itemId: string
  itemTitle: string
  donorId: string
  donorName: string
  collectorId: string
  collectorName: string
  unreadCount: number
  status: string
  lastMessage?: {
    content: string
    timestamp: Date
    senderName: string
  }
}

export function MessageNotification({ onOpenMessages }: MessageNotificationProps) {
  const [currentUser] = useKV('current-user', null)
  const { chats, refreshActiveRooms, getTotalUnreadCount } = useMessaging()
  const { pendingRequestCountByItem } = useExchangeManager()

  useEffect(() => {
    if (currentUser) {
      refreshActiveRooms()
    }
  }, [currentUser, refreshActiveRooms])

  const totalUnread = getTotalUnreadCount()
  const activeChats = chats.filter(chat => chat.status === 'active')
  const pendingRequests = currentUser?.userType === 'donor'
    ? Object.values(pendingRequestCountByItem).reduce((sum, count) => sum + count, 0)
    : 0

  // ...existing code...

  if (!currentUser) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onOpenMessages}
      className="relative rounded-full"
    >
      <ChatCircle size={16} />
      {totalUnread > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {totalUnread > 9 ? '9+' : totalUnread}
        </Badge>
      )}
    </Button>
  )
}

interface InlineMessageProps {
  itemId: string
  isOwner: boolean
  onStartChat: (recipientId: string, recipientName: string) => void
}

export function InlineMessage({ itemId, isOwner, onStartChat }: InlineMessageProps) {
  const [currentUser] = useKV('current-user', null)
  const [chats] = useKV('user-chats', [] as Chat[])

  const existingChat = chats.find(chat => chat.itemId === itemId)

  if (!currentUser || isOwner) return null

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <ChatCircle size={20} className="text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Contact Item Owner</h4>
              <p className="text-small text-muted-foreground">
                {existingChat ? 'Continue conversation' : 'Start a conversation about this item'}
              </p>
            </div>
          </div>

          {existingChat ? (
            <div className="flex items-center space-x-2">
              {existingChat.unreadCount > 0 && (
                <Badge variant="destructive">
                  {existingChat.unreadCount} new
                </Badge>
              )}
              <Button size="sm">
                View Messages
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => onStartChat('donor_id', 'Item Owner')}
            >
              Send Message
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface MessageStatusProps {
  status: 'pending' | 'sent' | 'delivered' | 'read'
  timestamp: Date
}

export function MessageStatus({ status, timestamp }: MessageStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock size={12} className="text-muted-foreground" />
      case 'sent':
        return <CheckCircle size={12} className="text-muted-foreground" />
      case 'delivered':
        return <CheckCircle size={12} className="text-blue-500" />
      case 'read':
        return <CheckCircle size={12} className="text-green-500" />
    }
  }

  return (
    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
      {getStatusIcon()}
      <span>{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  )
}
