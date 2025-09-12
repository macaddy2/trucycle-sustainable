import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
  Package
  Arrows
  SignOut,
  CheckCi
  ChatCircle,
  Shield
import { u
import 
  CheckCircle,
  Sparkles,
  ChatCircle,
  QrCode,
  Shield
} from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { AuthDialog } from './auth/AuthDialog'
import { ProfileOnboarding } from './auth/ProfileOnboarding'
import { useMessaging, useInitializeSampleData, useRecommendationNotifications } from '@/hooks'
import { VerificationBadge, VerificationLevel } from './VerificationBadge'
import { RatingDisplay, RatingList, useUserRatingStats } from './RatingSystem'
import { VerificationCenter } from './VerificationCenter'
import { QRCodeDisplay } from './QRCodeDisplay'
import { NotificationList } from './NotificationList'

  rating?: number
    email: b
    identity: 
  }

  itemsListed: num
  itemsCollected: n
  successfulExchang
}
interface Activity {
  type: 'listed' | 'donated' | 'collec
  date: string
  co2Impact: numb

  id: string
  type: 'pickup' | 'd
  createdAt: string
  c
}

  const [user, setUse
  const [showOnboardi
  const [selectedQRCod
  
  const { notifica
  // Initialize sample data w
  useEffect(() =>
 

  const [stats] = us
    itemsDon
    co2Saved: 847,
    reviews: 18
  date: string
  status: 'completed' | 'pending' | 'in-progress'
  co2Impact: number
}

interface QRCodeData {
  id: string
  transactionId: string
  type: 'pickup' | 'dropoff'
  itemTitle: string
  createdAt: string
  expiresAt: string
  co2Impact: number
  status: 'active' | 'expired' | 'used'
}

export function ProfileDashboard() {
  const [currentTab, setCurrentTab] = useState('overview')
  const [user, setUser] = useKV<UserProfile | null>('current-user', null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [selectedQRCode, setSelectedQRCode] = useState<QRCodeData | null>(null)
  const [userQRCodes] = useKV<QRCodeData[]>('user-qr-codes', [])
  
  const { chats, getTotalUnreadCount } = useMessaging()
  const { notifications: recomNotifications, unreadCount } = useRecommendationNotifications(user)
  
  // Initialize sample data when user logs in
  const { initializeSampleChats } = useInitializeSampleData()
  useEffect(() => {
    if (user) {
      initializeSampleChats()
    }
  }, [user, initializeSampleChats])

  const [stats] = useKV<UserStats>('user-stats', {
    itemsListed: 12,
    itemsDonated: 8,
    itemsCollected: 15,
    co2Saved: 847,
    successfulExchanges: 23,
    reviews: 18
  })

  const [userRatingStats] = useUserRatingStats(user?.id || 'demo-user')
  const ratingStats = userRatingStats || {
    averageRating: 4.8,
    totalRatings: 15,
    categoryBreakdown: {
      punctuality: 4.9,
      communication: 4.7,
      itemCondition: 4.8
    }
  }

  const handleSignOut = () => {
    setUser(null)
    toast.success('Signed out successfully')
  }

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true)
    }
  }, [user])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  const handleToggleUserType = async () => {
    if (!user) return

    const newUserType = user.userType === 'collector' ? 'donor' : 'collector'
    const updatedUser = {
      ...user,
      userType: newUserType
    }

    setUser(updatedUser)
    
    // Show confirmation message
    toast.success(
      `Profile switched to ${newUserType.charAt(0).toUpperCase() + newUserType.slice(1)}`,
      {
        description: `You'll now see ${newUserType === 'collector' ? 'item recommendations' : 'community needs'} tailored for your new profile type.`
      }
    )

    // Switch to recommendations tab to show the difference
    setCurrentTab('recommendations')

    // Generate sample demonstration notification for the new profile type
    const demoNotification = {
      id: `demo-${Date.now()}`,
      userId: user.id,
      type: newUserType === 'collector' ? 'item_match' : 'community_need',
      title: newUserType === 'collector' 
        ? '🔥 High-Value Item Alert: Samsung Smart TV Available'
        : '❤️ Community Need: Local School Needs Supplies',
      message: newUserType === 'collector'
        ? 'A verified donor is offering a 55" Samsung Smart TV in excellent condition. Urgent pickup needed due to house move.'
        : 'St. Mary\'s Primary School urgently needs art supplies and books for their new term. Your donations could help 150+ children.',
      urgency: 'high' as const,
      createdAt: new Date().toISOString(),
      read: false,
      actionUrl: newUserType === 'collector' ? '/browse' : '/profile?tab=recommendations'
    }

    // Add the demo notification to show immediate difference
    setTimeout(() => {
      // Trigger the notification update via custom event
      window.dispatchEvent(new CustomEvent('add-demo-notification', { 
        detail: { notification: demoNotification } 
      }))
      
      // Show a toast notification too
      toast(demoNotification.title, {
        description: demoNotification.message,
        action: {
          label: newUserType === 'collector' ? 'View Item' : 'See Needs',
          onClick: () => setCurrentTab('recommendations')
        }
      })
    }, 500)

    // Trigger new recommendations check after a brief delay
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('profile-changed', { detail: { userType: newUserType } }))
    }, 1000)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'listed': return <Package size={16} />
      case 'donated': return <Heart size={16} />
      case 'collected': return <Package size={16} />
      case 'exchange': return <ArrowsClockwise size={16} />
      default: return <Package size={16} />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'listed': return 'bg-blue-100 text-blue-800'
      case 'donated': return 'bg-green-100 text-green-800'
      case 'collected': return 'bg-purple-100 text-purple-800'
      case 'exchange': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // If no user is signed in, show welcome/setup screen
  if (!user) {
    return (
      <>
        <div className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-primary" />
              </div>
              <h1 className="text-h1 mb-2">Welcome to TruCycle!</h1>
              <p className="text-body text-muted-foreground mb-6">
                Create your profile to start exchanging items and tracking your environmental impact
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => {
                    setAuthMode('signup')
                    setShowAuthDialog(true)
                  }}
                >
                  Create Account
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setAuthMode('signin')
                    setShowAuthDialog(true)
                  }}
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
        </TabsLis
        <TabsC

              <CardC
                  <div className
                      <AvatarImage 
                        {user.name.
                    </Avatar>
                      level={user.verifi
             
            
                        identity
          
         
     
   

                        c
                        {user.user
     
              
                    {r
                        rating={rating
                        cl
                    )}
                    <
      

               
                    </Bu
                      size="sm" 
                      on
                    >
                    
      
     
              
                      S
                  </div>
              </CardConten

            <div clas
     
   

          
                </CardHeader>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-cente
                        <div>
                          <p className="text-sm
                   
                    <div classNam
                        <ChatCircle size={24} className="text-blue-600" />
              
                        
                              <CheckCircle size={12} className
                            </Badge>
                        </div>
                    </CardContent>
                </C

                  <CardHeader>
                  </CardHeader>
                    <div className=
                        <p className="text-h
                      </div>
                        <p className="text-h3 font-bold text-green-600">{stats.ite
                      </div>
                        <p className="text-h3 font
                      </div>
                  </CardContent>
              </div>
          </TabsContent>
                    </Avatar>
              <CardHeader>
                  <div className="w-8 h-8 bg-purple-100 rounded
                  </div>
                    <span>
                    </span>
                      AI-Powered
                  </div>
                <CardDescription>
                    ? 'Personalized ite
                  }
              </CardHead
                <div c
                    <p><
                  
                  </div>
                    <Button 
                      onClick={handleToggleUserType}
                      classNa
                      Switch Profile Type
                    <p className="text-xs text-muted-foreground">
                      >
                </div>
            </Card>
            <NotificationList 
              userType={user.userType}

                    
                <CardTitle className="flex items-cente
                  <span>Urgent Opport
                    Demo
                </CardTitle>
                  Experience time-sensitive alerts
              </CardHead
                <div c
                    
                        ? '⚡ Time-Sensitive: Premium electronics avail
                      }
                    <p c
                        

                  </div>
                <div className="flex items-center space-
                    size="sm"
                      const u
                          ? 
                        message:
                          : 'Single mot
                      toast(urgentDemo.title, {
                        duration: 8000,
                     
                            toast.success('Demo completed! 🎉', {
                            }
                        }
                    }}
                  >
                    Trigger Urgent Alert
                  <p className="text-xs text-orange-700">
                    a
                </div>
            </Card>

            <Card>
                <CardT
                  <span>Rece
                <Ca

              <CardContent>
                  <div className="text-center py-8">
                      <ChatCircle size={24
                    
                    </p>
                      List Your First Item
                  </div>
                  <div className="space-y-3">
                      <div
                          <Avatar>
                            <A
                            <
                          <di
                            <p className="text-sm text-mut
                            </p>
                              {chat.lastMessage}
                          </div>
                        <div>
                            variant={chat.status === 'active' ? 'default' : 'secondary'}
                            {chat.status}
                          {cha
                      </div>
                          
                            {chat.lastActivity 
                      <div className="flex items-center space-x-3">
                          </p>
                        <div>
                  </div>
              </CardContent>
          </TabsContent>
          <TabsContent value="ratings" className="space-y-6">
              <Card className="lg:col-span-1">
                  <CardTitle className="flex
                    <span>Rating Sum
                </CardHeader
                        </div>
                      rating
                    </CardContent>
                  </div>
                  {rati

                        {[
                      
                  <CardHeader>
                            <span className="text-sm">{cate
                  </CardHeader>
                            </d
                    <div className="grid grid-cols-3 gap-4">
                    </div>

                    <VerificationBadge 
                      </div>
                        phone: false,
                        identity: false,
                        community: stats.successfulExchanges >= 10
                    />
                </CardContent>

                <Card>
                    <CardTit
                      What
                  </CardContent>
                    <Ra
              </div>
                </
          </TabsContent>

            <Card>
                <CardTitle className="flex items-center space-x-2">
                  <span>Yo
                <CardDescription>
                </CardDescription>
              <CardContent>
                  <div c
                  <div className="flex-1">
                    <h3 cl
                      QR codes will be generated
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-
                      const isEx
                      
                        
                          cl
                          }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h4 className="font-medium">{qrCode.itemTitle}<
                   
                                  
                           
                           
                                      isExp
                                  >
                                  </Badge>
                        
                                <QrCode size={24} className="text-muted-foreg
                            </div>
                        
                                <span>Transaction ID:</span>
                            
                               
                                  <span>{new Date(qr
                                <div cl
                                  <span>{qrCode.co2Impact}kg</span>
                     
                            
                             
                                variant="outline" 
                                disabled={isExpired || isUsed}
                        
                        
                </div>
                    })}
            </Card>

            {/* QR Code Instru
              <CardHeader>
              </CardHeader>
            />

                      <span>Drop-off Process<
                    <div className="space-y-2 text-sm text-mu
              <CardHeader>
                      <p>4. Shop attendant scans and stores your item</p>
                  </div>
                    <h4 className="font-medium mb-2
                      <span>Pickup Process</span>
                    <div
                  </Badge>
                      <p>4. 
                <CardDescription>
              </CardContent>
                </CardDescription>
          <TabsContent valu
              <CardContent className="space-y-4">
                <CardDescription>
                </CardDescription>
              <CardContent>
                  <div className="text-center py-8">
                      <Package size={24} className="text-muted-foreground" />
                    <p className="text-body text-muted-foreground mb-4">
                      }
                ) : (
                    {activities.map((activity) => (
                        <div className="flex items-c
                            {getActivityIcon(activity.type)}
                          <div>
                       
                        
                  </div>
                </div>
                            <p className="text-sm font-medium
                         
                        </div
                    ))}
                )}
            </Card>
            {/* Sustainability Impact */}
              <CardHeader>
              </CardHeader>
                <div className="text-center space-y-4">
                    <div>
                      <
                    <div>
                      <p className="text-small text-mute
                    <div>
                      <p classNam
                  </div>
                    You've contributed to 
                </div>
            </Card>

            <div className=
                <CardHead
                  <CardD
                  </Ca
                <CardContent className="space-y-6">
                  <
                    <div className="grid grid-cols-2 ga
                        <Label className
                      </div
                  <p className="text-xs text-orange-700">
                      </div>
                        <Label className="text-sm font-medium">User Type</Label>
                  </p>
                      
              </CardContent>
                  <
          </TabsContent>

                      <div className="flex items-center justif
                  
              <CardHeader>
                      </div>
                        <div>
                          <p className="text-xs tex
                </CardTitle>
                    </div>

                  <div className="
              </CardHeader>
                        <di
                {chats.length === 0 ? (
                        <Button variant="outline" si
                      <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Location Sharing</p
                    </div>
                      </div>
                  </div>
                  <div c
                      <Button variant="outline" className="w-full">
                        Edit Profile
                      <Button
                        
                ) : (
                </CardContent>
                    {chats.map((chat) => (
                currentVerification={user.verificationLevel || 'basic'}
                        <div className="flex items-center space-x-4">
                  address: true,
                  payment: false,
                }}
                  setUser({ ...user, verificationLevel: level })
              />
          </TabsContent>

          open={showOnboarding} 
          onComplete={handleOnboardingComplete}
                              About: {chat.itemTitle}
          open={showAuthDialog} 
            setShowAuthDialog(open)
              handleOnboardingComplete()
          }}
                          </div>
        {/* QR Code Display Mo
          <QRCodeDisplay
            onClose={() => setSel
        )}
                          >





                            </Badge>





                            }

                        </div>

                    ))}

                )}

            </Card>




              <Card className="lg:col-span-1">





                </CardHeader>



                      rating={ratingStats.averageRating || 5.0}

                      size="lg"
                    />




















                    </div>









                        identity: false,
                        payment: false,

                      }}
                    />

                </CardContent>


              <div className="lg:col-span-2">

                  <CardHeader>





                  <CardContent>





              </div>

          </TabsContent>




























                      

















                                  </Badge>




                                    }
                                  >

                                  </Badge>
                                </div>





                            




                              </div>


























                  </div>






































          </TabsContent>



              <CardHeader>

                <CardDescription>

                </CardDescription>

              <CardContent>







                    </p>
                  </div>








                          <div>

                            <p className="text-small text-muted-foreground">{activity.date}</p>

                        </div>



                          </Badge>







                    ))}

                )}

            </Card>





              </CardHeader>


















                  </p>
                </div>

            </Card>



            <div className="space-y-6">

                <CardHeader>

                  <CardDescription>
































                        <div>






                        <div>


                        </div>


                    </div>










                        </div>

                      </div>







                    </div>





















                  phone: false,




                }}




            </div>

        </Tabs>



























