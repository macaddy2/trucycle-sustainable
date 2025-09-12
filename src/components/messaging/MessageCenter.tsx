import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  PaperPlaneTilt, 
  Clock, 
  CheckCircle, 
  MapPin, 
  Package, 
  CalendarCheck,
  Phone,
  Camera,
  QrCode 
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { QRCodeGenerator, QRCodeDisplay, QRCodeData } from '../QRCode'

interface Message {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: Date | string
  type: 'text' | 'system' | 'location' | 'image'
  metadata?: {
    location?: { lat: number; lng: number; address: string }
    imageUrl?: string
    systemAction?: string
  }
}

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
  lastMessage?: Message
  unreadCount: number
  createdAt: Date | string
}

interface MessageCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId?: string // If provided, opens chat for specific item
}

export function MessageCenter({ open, onOpenChange, itemId }: MessageCenterProps) {
  const [currentUser] = useKV('current-user', null)
  const [chats, setChats] = useKV('user-chats', [] as Chat[])
  const [messages, setMessages] = useKV('chat-messages', {} as Record<string, Message[]>)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showQRCode, setShowQRCode] = useState<QRCodeData | null>(null)
  const [selectedDropOffLocation, setSelectedDropOffLocation] = useState<string>('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Helper function to normalize dates from KV storage
  const normalizeChat = (chat: Chat): Chat => ({
    ...chat,
    createdAt: chat.createdAt instanceof Date ? chat.createdAt : new Date(chat.createdAt),
    lastMessage: chat.lastMessage ? {
      ...chat.lastMessage,
      timestamp: chat.lastMessage.timestamp instanceof Date ? chat.lastMessage.timestamp : new Date(chat.lastMessage.timestamp)
    } : undefined
  })

  const normalizeMessage = (message: Message): Message => ({
    ...message,
    timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
  })

  // Get normalized data
  const normalizedChats = chats.map(normalizeChat)
  const selectedChat = normalizedChats.find(chat => chat.id === selectedChatId)
  const currentMessages = selectedChatId ? (messages[selectedChatId] || []).map(normalizeMessage) : []

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  // Select chat if itemId is provided
  useEffect(() => {
    if (itemId && normalizedChats.length > 0) {
      const itemChat = normalizedChats.find(chat => chat.itemId === itemId)
      if (itemChat) {
        setSelectedChatId(itemChat.id)
      }
    }
  }, [itemId, normalizedChats])

  // Mock real-time message simulation
  useEffect(() => {
    if (!selectedChatId || !currentUser) return

    const interval = setInterval(() => {
      // Simulate occasional messages from other party
      if (Math.random() > 0.98) { // 2% chance every second
        const otherUserId = selectedChat?.donorId === currentUser.id ? 
          selectedChat?.collectorId : selectedChat?.donorId
        const otherUserName = selectedChat?.donorId === currentUser.id ? 
          selectedChat?.collectorName : selectedChat?.donorName

        if (otherUserId && otherUserName) {
          receiveMessage({
            chatId: selectedChatId,
            senderId: otherUserId,
            senderName: otherUserName,
            content: getRandomResponse(),
            type: 'text'
          })
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [selectedChatId, currentUser])

  const getRandomResponse = () => {
    const responses = [
      "Thanks for the quick response!",
      "That works for me. See you then!",
      "Perfect, I'll be there",
      "Just confirming I'm still interested",
      "Great condition, exactly what I needed",
      "On my way now",
      "Running 5 minutes late, sorry!",
      "Collection completed, thank you!"
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId || !currentUser) return

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId: selectedChatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    }

    // Add message
    setMessages(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), message]
    }))

    // Update chat's last message
    setChats(prev => prev.map(chat => 
      chat.id === selectedChatId 
        ? { ...chat, lastMessage: message }
        : chat
    ))

    setNewMessage('')
    toast.success('Message sent')
  }

  const receiveMessage = (messageData: Omit<Message, 'id' | 'timestamp'>) => {
    const message: Message = {
      ...messageData,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    setMessages(prev => ({
      ...prev,
      [messageData.chatId]: [...(prev[messageData.chatId] || []), message]
    }))

    // Update chat's last message and unread count
    setChats(prev => prev.map(chat => 
      chat.id === messageData.chatId 
        ? { 
            ...chat, 
            lastMessage: message,
            unreadCount: selectedChatId === messageData.chatId ? 0 : chat.unreadCount + 1
          }
        : chat
    ))

    // Show notification if not currently viewing this chat
    if (selectedChatId !== messageData.chatId) {
      toast.info(`New message from ${messageData.senderName}`)
    }
  }

  const markChatAsRead = (chatId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ))
  }

  const sendSystemMessage = (action: string, content: string) => {
    if (!selectedChatId) return

    const message: Message = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId: selectedChatId,
      senderId: 'system',
      senderName: 'System',
      content,
      timestamp: new Date(),
      type: 'system',
      metadata: { systemAction: action }
    }

    setMessages(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), message]
    }))
  }

  const shareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          
          const message: Message = {
            id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            chatId: selectedChatId!,
            senderId: currentUser.id,
            senderName: currentUser.name,
            content: 'Shared location',
            timestamp: new Date(),
            type: 'location',
            metadata: {
              location: {
                lat: latitude,
                lng: longitude,
                address: 'Current location'
              }
            }
          }

          setMessages(prev => ({
            ...prev,
            [selectedChatId!]: [...(prev[selectedChatId!] || []), message]
          }))

          toast.success('Location shared')
        },
        () => {
          toast.error('Could not access location')
        }
      )
    }
  }

  const handleQRCodeGenerated = (qrData: QRCodeData) => {
    setShowQRCode(qrData)
    
    // Send system message about QR code generation
    const message = qrData.type === 'donor' 
      ? 'Drop-off QR code generated. Please take this item and QR code to the selected drop-off location.'
      : 'Pickup QR code generated. Show this to the shop attendant to collect your item.'
    
    sendSystemMessage('qr_generated', message)
  }

  const quickActions = [
    {
      label: 'Share Location',
      icon: MapPin,
      action: shareLocation,
      color: 'text-blue-600'
    },
    {
      label: 'Generate QR Code',
      icon: QrCode,
      action: () => {
        if (!selectedChat) return
        
        // Determine if current user is donor or collector
        const isDonor = currentUser.id === selectedChat.donorId
        
        // For demo purposes, set a sample drop-off location
        setSelectedDropOffLocation('TruCycle Partner Shop - Camden Market, London NW1 8AH')
      },
      color: 'text-purple-600'
    },
    {
      label: 'Confirm Collection',
      icon: CheckCircle,
      action: () => {
        sendSystemMessage('collection_confirmed', 'Collection has been confirmed by both parties')
        toast.success('Collection confirmed')
      },
      color: 'text-green-600'
    },
    {
      label: 'Schedule Pickup',
      icon: CalendarCheck,
      action: () => {
        sendSystemMessage('pickup_scheduled', 'Pickup has been scheduled for tomorrow at 2 PM')
        toast.success('Pickup scheduled')
      },
      color: 'text-orange-600'
    }
  ]

  const formatTime = (date: Date | string) => {
    const now = new Date()
    const dateObj = date instanceof Date ? date : new Date(date)
    const diff = now.getTime() - dateObj.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return dateObj.toLocaleDateString()
  }

  if (!currentUser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in Required</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Please sign in to access your messages
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <div className="flex h-full">
          {/* Chat List Sidebar */}
          <div className="w-1/3 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="text-h3 font-medium">Messages</h2>
              <p className="text-small text-muted-foreground">
                {normalizedChats.length} active conversations
              </p>
            </div>
            
            <ScrollArea className="flex-1">
              {normalizedChats.length === 0 ? (
                <div className="p-4 text-center">
                  <Package size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-small text-muted-foreground">
                    No messages yet. Start by claiming an item!
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {normalizedChats.map(chat => (
                    <Card 
                      key={chat.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedChatId === chat.id ? 'bg-muted border-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedChatId(chat.id)
                        markChatAsRead(chat.id)
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={
                              currentUser.id === chat.donorId ? chat.collectorAvatar : chat.donorAvatar
                            } />
                            <AvatarFallback>
                              {(currentUser.id === chat.donorId ? chat.collectorName : chat.donorName)[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-small font-medium truncate">
                                {currentUser.id === chat.donorId ? chat.collectorName : chat.donorName}
                              </p>
                              {chat.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {chat.unreadCount}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground truncate">
                              {chat.itemTitle}
                            </p>
                            
                            {chat.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {chat.lastMessage.content}
                              </p>
                            )}
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              {chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : formatTime(chat.createdAt)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={
                          currentUser.id === selectedChat.donorId ? 
                            selectedChat.collectorAvatar : selectedChat.donorAvatar
                        } />
                        <AvatarFallback>
                          {(currentUser.id === selectedChat.donorId ? 
                            selectedChat.collectorName : selectedChat.donorName)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">
                          {currentUser.id === selectedChat.donorId ? 
                            selectedChat.collectorName : selectedChat.donorName}
                        </h3>
                        <p className="text-small text-muted-foreground">
                          About: {selectedChat.itemTitle}
                        </p>
                      </div>
                    </div>
                    
                    <Badge 
                      variant={selectedChat.status === 'active' ? 'default' : 'secondary'}
                    >
                      {selectedChat.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {currentMessages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderId === currentUser.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div className={`max-w-[70%] ${
                          message.senderId === currentUser.id
                            ? 'bg-primary text-primary-foreground'
                            : message.type === 'system'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-muted text-foreground'
                        } rounded-lg p-3 ${message.type === 'system' ? 'mx-auto text-center' : ''}`}>
                          
                          {message.type === 'location' && message.metadata?.location && (
                            <div className="flex items-center space-x-2 mb-2">
                              <MapPin size={16} />
                              <span className="text-small">Location shared</span>
                            </div>
                          )}
                          
                          <p className="text-small">{message.content}</p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-70">
                              {message.type !== 'system' && message.senderName}
                            </span>
                            <span className="text-xs opacity-70">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Quick Actions */}
                <div className="p-2 border-t border-border">
                  <div className="flex space-x-2 mb-2">
                    {quickActions.map(action => (
                      <Button
                        key={action.label}
                        variant="outline"
                        size="sm"
                        onClick={action.action}
                        className="flex items-center space-x-1"
                      >
                        <action.icon size={14} className={action.color} />
                        <span className="text-xs">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim()}
                      size="icon"
                    >
                      <PaperPlaneTilt size={16} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-h3 mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">
                    Choose a chat from the sidebar to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Generation Dialog */}
        {selectedDropOffLocation && selectedChat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-h3 mb-4">Generate QR Code</h3>
              <p className="text-muted-foreground mb-4">
                Choose your role for this transaction:
              </p>
              
              <div className="space-y-3">
                {currentUser.id === selectedChat.donorId && (
                  <QRCodeGenerator
                    itemId={selectedChat.itemId}
                    itemTitle={selectedChat.itemTitle}
                    category="general" // You can derive this from item data
                    condition="good" // You can derive this from item data
                    co2Impact={25} // You can derive this from item data
                    dropOffLocation={selectedDropOffLocation}
                    type="donor"
                    onGenerated={handleQRCodeGenerated}
                  />
                )}
                
                {currentUser.id === selectedChat.collectorId && (
                  <QRCodeGenerator
                    itemId={selectedChat.itemId}
                    itemTitle={selectedChat.itemTitle}
                    category="general" // You can derive this from item data
                    condition="good" // You can derive this from item data
                    co2Impact={25} // You can derive this from item data
                    dropOffLocation={selectedDropOffLocation}
                    type="collector"
                    onGenerated={handleQRCodeGenerated}
                  />
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedDropOffLocation('')}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Display Dialog */}
        {showQRCode && (
          <QRCodeDisplay
            qrData={showQRCode}
            onClose={() => setShowQRCode(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}