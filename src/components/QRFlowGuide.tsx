import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, MessageCircle, QrCode, Scan, ArrowRight } from '@phosphor-icons/react'
import { useState } from 'react'

interface QRFlowGuideProps {
  onNavigateToTab?: (tab: string) => void
}

export function QRFlowGuide({ onNavigateToTab }: QRFlowGuideProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const markStepComplete = (stepNumber: number) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps(prev => [...prev, stepNumber])
    }
  }

  const steps = [
    {
      id: 1,
      title: "Sign in to your account",
      description: "Create an account or sign in to access all features",
      icon: CheckCircle,
      action: () => {},
      completed: completedSteps.includes(1)
    },
    {
      id: 2,
      title: "Start a conversation",
      description: "Click the Messages button and select a conversation",
      icon: MessageCircle,
      action: () => onNavigateToTab?.('browse'),
      completed: completedSteps.includes(2)
    },
    {
      id: 3,
      title: "Generate QR Code",
      description: "In the chat, click 'Generate QR Code' button",
      icon: QrCode,
      action: () => {},
      completed: completedSteps.includes(3)
    },
    {
      id: 4,
      title: "Test the QR Code",
      description: "Download, share, or test scanning the generated QR code",
      icon: Scan,
      action: () => onNavigateToTab?.('qr-test'),
      completed: completedSteps.includes(4)
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <QrCode size={24} className="text-primary" />
            <span>QR Code Flow Test Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Follow these steps to test the complete QR code generation and scanning flow:
          </p>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className="flex items-start space-x-4 p-4 rounded-lg border bg-card"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                }`}>
                  {step.completed ? (
                    <CheckCircle size={16} />
                  ) : (
                    <step.icon size={16} />
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      Step {step.id}: {step.title}
                    </h3>
                    <Badge variant={step.completed ? 'default' : 'secondary'}>
                      {step.completed ? 'Done' : 'Pending'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  
                  <div className="flex space-x-2">
                    {step.action && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={step.action}
                        disabled={step.completed}
                      >
                        Go <ArrowRight size={14} className="ml-1" />
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => markStepComplete(step.id)}
                      disabled={step.completed}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">What to Test:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• QR code generation for both donor and collector roles</li>
              <li>• QR code display with all metadata (item info, user info, location)</li>
              <li>• Download functionality</li>
              <li>• Share functionality (if supported by browser)</li>
              <li>• QR code scanning in the shop scanner interface</li>
              <li>• Transaction confirmation flow</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default QRFlowGuide