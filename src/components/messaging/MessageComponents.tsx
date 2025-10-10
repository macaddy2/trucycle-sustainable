import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChatCircle, CheckCircle, Clock } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { useExchangeManager } from '@/hooks'

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
  const [chats] = useKV('user-chats', [] as Chat[])
  const [showTooltip, setShowTooltip] = useState(false)
  const { pendingRequestCountByItem } = useExchangeManager()

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0)
  const activeChats = chats.filter(chat => chat.status === 'active')
  const pendingRequests = currentUser?.userType === 'donor'
    ? Object.values(pendingRequestCountByItem).reduce((sum, count) => sum + count, 0)
    : 0

  // Show notification tooltip for new messages
  useEffect(() => {
    if (totalUnread > 0) {
      setShowTooltip(true)
      const timer = setTimeout(() => setShowTooltip(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [totalUnread])

  if (!currentUser) return null

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenMessages}
            className="relative"
          >
            <ChatCircle size={16} className="mr-2" />
            Messages
            {pendingRequests > 0 && (
              <Badge variant="outline" className="ml-2 hidden sm:inline-flex text-xs">
                {pendingRequests} requests
              </Badge>
            )}
            {totalUnread > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {totalUnread > 9 ? '9+' : totalUnread}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-2">
            <p className="font-medium">
              {totalUnread > 0 ? `${totalUnread} new messages` : 'No new messages'}
            </p>
            {pendingRequests > 0 && (
              <p className="text-xs text-amber-600">
                {pendingRequests} claim request{pendingRequests === 1 ? '' : 's'} waiting for your review.
              </p>
            )}
            {activeChats.slice(0, 3).map(chat => (
              <div key={chat.id} className="flex items-center space-x-2 text-sm">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {((currentUser.id === chat.donorId ? chat.collectorName : chat.donorName) || '?')[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    {currentUser.id === chat.donorId ? chat.collectorName : chat.donorName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {chat.itemTitle}
                  </p>
                </div>
                {chat.unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {chat.unreadCount}
                  </Badge>
                )}
              </div>
            ))}
            {activeChats.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{activeChats.length - 3} more conversations
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
