import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  Clock, 
  Shield, 
  Phone, 
  CreditCard, 
  MapPin, 
  Certificate, 
  Medal,
  Upload,
  Info,
  Star
} from '@phosphor-icons/react'
import {
  getVerificationStatus,
  type VerificationLevel,
} from './verificationBadgeUtils'
import { toast } from 'sonner'

interface VerificationCenterProps {
  currentVerification: VerificationLevel
  onVerificationUpdate: (verification: VerificationLevel) => void
}

interface VerificationStep {
  id: keyof VerificationLevel
  title: string
  description: string
  icon: React.ReactNode
  requirement: string
  estimatedTime: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  trustBoost: number
}

const verificationSteps: VerificationStep[] = [
  {
    id: 'email',
    title: 'Email Verification',
    description: 'Verify your email address to receive important notifications',
    icon: <CheckCircle size={20} />,
    requirement: 'Click verification link sent to your email',
    estimatedTime: '2 minutes',
    difficulty: 'Easy',
    trustBoost: 10
  },
  {
    id: 'phone',
    title: 'Phone Verification',
    description: 'Add and verify your phone number for secure communication',
    icon: <Phone size={20} />,
    requirement: 'UK mobile number and SMS verification',
    estimatedTime: '5 minutes',
    difficulty: 'Easy',
    trustBoost: 15
  },
  {
    id: 'address',
    title: 'Address Verification',
    description: 'Confirm your London address for local exchanges',
    icon: <MapPin size={20} />,
    requirement: 'Proof of address document (utility bill, council tax)',
    estimatedTime: '10 minutes',
    difficulty: 'Medium',
    trustBoost: 20
  },
  {
    id: 'payment',
    title: 'Payment Method',
    description: 'Add a verified payment method for premium features',
    icon: <CreditCard size={20} />,
    requirement: 'Valid UK debit/credit card',
    estimatedTime: '5 minutes',
    difficulty: 'Easy',
    trustBoost: 15
  },
  {
    id: 'identity',
    title: 'Identity Verification',
    description: 'Verify your identity for the highest trust level',
    icon: <Certificate size={20} />,
    requirement: 'Government-issued photo ID (passport, driving licence)',
    estimatedTime: '15 minutes',
    difficulty: 'Hard',
    trustBoost: 25
  },
  {
    id: 'community',
    title: 'Community Standing',
    description: 'Earned through successful exchanges and positive reviews',
    icon: <Medal size={20} />,
    requirement: '5+ successful exchanges with 4.5+ average rating',
    estimatedTime: 'Ongoing',
    difficulty: 'Medium',
    trustBoost: 15
  }
]

export function VerificationCenter({ currentVerification, onVerificationUpdate }: VerificationCenterProps) {
  const [selectedStep, setSelectedStep] = useState<VerificationStep | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    phone: '',
    addressDoc: null as File | null,
    identityDoc: null as File | null
  })

  const completedSteps = Object.values(currentVerification || {}).filter(Boolean).length
  const totalSteps = Object.keys(currentVerification || {}).length
  const completionPercentage = (completedSteps / totalSteps) * 100

  const handleVerificationStart = async (step: VerificationStep) => {
    setIsSubmitting(true)
    
    try {
      // Simulate verification process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (step.id === 'email') {
        // Auto-complete email verification (usually already done)
        const updatedVerification = { ...currentVerification, email: true }
        onVerificationUpdate(updatedVerification)
        toast.success('Email verification completed!')
      } else if (step.id === 'phone') {
        // In real app, this would send SMS
        const updatedVerification = { ...currentVerification, phone: true }
        onVerificationUpdate(updatedVerification)
        toast.success('Phone verification completed!')
      } else if (step.id === 'payment') {
        // In real app, this would integrate with payment provider
        const updatedVerification = { ...currentVerification, payment: true }
        onVerificationUpdate(updatedVerification)
        toast.success('Payment method verified!')
      } else {
        toast.success(`${step.title} verification submitted for review. We'll notify you within 24 hours.`)
      }
      
      setSelectedStep(null)
    } catch (error) {
      console.error('Verification step failed', error)
      toast.error('Verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700'
      case 'Medium': return 'bg-yellow-100 text-yellow-700'
      case 'Hard': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Verification Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="text-primary" size={24} />
                <span>Trust & Verification</span>
              </CardTitle>
              <CardDescription>
                Complete verification steps to build trust and unlock features
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {completedSteps}/{totalSteps} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Verification Progress</span>
              <span>{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{completedSteps}</div>
              <div className="text-sm text-muted-foreground">Verifications</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-accent">
                +{verificationSteps.reduce((sum, step) => 
                  sum + (currentVerification[step.id] ? step.trustBoost : 0), 0
                )}
              </div>
              <div className="text-sm text-muted-foreground">Trust Points</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-secondary">
                {getVerificationStatus(currentVerification) === 'fully-verified' ? 'Elite' : 'Growing'}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Steps */}
      <div className="grid gap-4">
        <h3 className="text-h3 font-medium">Verification Steps</h3>
        {verificationSteps.map((step) => {
          const isCompleted = currentVerification[step.id]
          
          return (
            <Card key={step.id} className={`transition-colors ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? <CheckCircle size={24} /> : step.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="font-medium">{step.title}</h4>
                        <Badge className={getDifficultyColor(step.difficulty)}>
                          {step.difficulty}
                        </Badge>
                        <Badge variant="outline">
                          +{step.trustBoost} trust
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>⏱️ {step.estimatedTime}</span>
                        <span>📋 {step.requirement}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {isCompleted ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle size={14} className="mr-1" />
                        Verified
                      </Badge>
                    ) : step.id === 'community' ? (
                      <Badge variant="outline">
                        <Clock size={14} className="mr-1" />
                        Earn through exchanges
                      </Badge>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelectedStep(step)}>
                            Start Verification
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Verification Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="text-yellow-500" size={20} />
            <span>Verification Benefits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Unlock Features</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>Higher visibility in search results</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>Access to premium exchanges</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>Priority customer support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>Trusted user badge display</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Build Trust</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-blue-600" />
                  <span>Increase exchange success rate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-blue-600" />
                  <span>Build credibility with community</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-blue-600" />
                  <span>Reduce transaction disputes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-blue-600" />
                  <span>Access to verified-only exchanges</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      {selectedStep && (
        <Dialog open={!!selectedStep} onOpenChange={() => setSelectedStep(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {selectedStep.icon}
                <span>{selectedStep.title}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="text-blue-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">What you'll need</h4>
                    <p className="text-sm text-blue-700">{selectedStep.requirement}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Estimated time: {selectedStep.estimatedTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Form Content */}
              {selectedStep.id === 'phone' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">UK Mobile Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+44 7123 456789"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {selectedStep.id === 'address' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address-doc">Proof of Address Document</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-sm text-gray-600">
                        Upload utility bill, council tax, or bank statement (last 3 months)
                      </p>
                      <Input
                        id="address-doc"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="mt-2"
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          addressDoc: e.target.files?.[0] || null 
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedStep.id === 'identity' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="identity-doc">Government-Issued Photo ID</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-sm text-gray-600">
                        Upload passport, driving licence, or national ID
                      </p>
                      <Input
                        id="identity-doc"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="mt-2"
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          identityDoc: e.target.files?.[0] || null 
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setSelectedStep(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleVerificationStart(selectedStep)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Submit Verification'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
