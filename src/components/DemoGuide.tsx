import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Sparkle, 
  ArrowsClockwise, 
  User,
  Gift,
  TrendUp,
  CheckCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface DemoGuideProps {
  onSwitchProfile: () => void
  currentUserType: 'donor' | 'collector'
  userName: string
}

export function DemoGuide({ onSwitchProfile, currentUserType, userName }: DemoGuideProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  const markStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId])
      toast.success('Step completed! 🎉')
    }
  }

  const demoSteps = [
    {
      id: 'switch-profile',
      title: 'Experience Profile Switching',
      description: `Switch from ${currentUserType} to ${currentUserType === 'collector' ? 'donor' : 'collector'} mode`,
      action: 'Switch Profile Type',
      onAction: () => {
        onSwitchProfile()
        markStepComplete('switch-profile')
      },
      icon: <ArrowsClockwise size={20} />,
      benefit: 'See how AI recommendations change for different user types'
    },
    {
      id: 'explore-foryou',
      title: 'Explore Your For You Tab',
      description: 'Browse AI-curated recommendations tailored to your profile',
      action: 'Already Here!',
      onAction: () => markStepComplete('explore-foryou'),
      icon: <Sparkle size={20} />,
      benefit: 'Discover personalized matches based on location and preferences'
    },
    {
      id: 'check-notifications',
      title: 'Smart Notification System',
      description: 'Watch for real-time alerts about urgent opportunities',
      action: 'Generate Demo Alert',
      onAction: () => {
        const demoNotification = {
          id: `demo-quick-${Date.now()}`,
          title: currentUserType === 'collector' 
            ? '🔥 Quick Demo: MacBook Pro Available!' 
            : '❤️ Quick Demo: School Needs Supplies!',
          message: currentUserType === 'collector'
            ? 'A verified donor just listed a MacBook Pro in excellent condition near you. Pickup available today!'
            : 'Local primary school urgently needs art supplies for 50+ children starting new term next week.',
          urgency: 'high' as const
        }
        
        toast(demoNotification.title, {
          description: demoNotification.message,
          duration: 5000,
          action: {
            label: 'View Details',
            onClick: () => toast.info('This was a demo notification!')
          }
        })
        markStepComplete('check-notifications')
      },
      icon: <Gift size={20} />,
      benefit: 'Get instant alerts for time-sensitive opportunities'
    }
  ]

  const allStepsCompleted = demoSteps.every(step => completedSteps.includes(step.id))

  return (
    <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center space-x-2">
              <User size={20} className="text-green-600" />
              <span>Welcome {userName}! 👋</span>
              {allStepsCompleted && <CheckCircle size={20} className="text-green-600" />}
            </CardTitle>
            <CardDescription>
              Take a quick tour of TruCycle's AI-powered recommendation system
            </CardDescription>
          </div>
          <Badge 
            variant={allStepsCompleted ? "default" : "secondary"}
            className={allStepsCompleted ? "bg-green-100 text-green-800" : ""}
          >
            {completedSteps.length}/{demoSteps.length} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {allStepsCompleted && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              🎉 Congratulations! You've experienced TruCycle's intelligent recommendation system. 
              The AI will continue learning your preferences as you interact with real items and community needs.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demoSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id)
            
            return (
              <Card 
                key={step.id} 
                className={`transition-all duration-200 ${
                  isCompleted 
                    ? 'bg-green-50 border-green-200' 
                    : 'hover:shadow-md cursor-pointer'
                }`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {isCompleted ? <CheckCircle size={16} /> : step.icon}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Step {index + 1}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-blue-600 flex items-center space-x-1">
                        <TrendUp size={12} />
                        <span>{step.benefit}</span>
                      </p>
                      
                      <Button 
                        size="sm" 
                        variant={isCompleted ? "outline" : "default"}
                        className="w-full text-xs"
                        onClick={step.onAction}
                        disabled={isCompleted && step.id !== 'check-notifications'}
                      >
                        {isCompleted ? (
                          step.id === 'check-notifications' ? 'Generate Another' : '✓ Completed'
                        ) : step.action}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {!allStepsCompleted && (
          <div className="text-center pt-4 border-t border-green-200">
            <p className="text-sm text-green-700">
              <strong>Pro Tip:</strong> Try switching between donor and collector modes to see how 
              the AI adapts recommendations for different user behaviors and needs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
