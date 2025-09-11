import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/tex
import { Badge } from '@/components/ui/badge'
import { Plus, Camera, MapPin, Recycle, Heart, Arro
import { toast } from 'sonner'
const CATEGORIES = [
import { Progress } from '@/components/ui/progress'
import { Plus, Camera, MapPin, Recycle, Heart, ArrowsClockwise } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Other'

  { value: 'excell
  { value: 'fair'
]
const ACTION_TYPE
    value: 'exc
    icon:
 

    label: 'Donate',
    description: 'Give away for free',
  },
    value: 'recycle', 
    icon: Recycle, 
 

interface ItemListingF
}
export function ItemLis
  const [user] = useKV(
  
  const [formData, setFormData] = useState
    description: '',
    
    
    contactMethod: 'p


  const progress = (currentStep / tota
  const handleInputChange
  }
  co
    const newPhotoUrl 
      ...prev,
    }))
  }
  const removePhoto = (inde
   
 

    switch (step) {
        return formData.t
 

        return formData.location.trim() !== ''
        return false
  }
  const nextStep = () => {
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    condition: '',
    actionType: '',
    photos: [] as string[],
    location: '',
    contactMethod: 'platform'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = () => {
    // Simulate photo upload - in real app this would handle file selection
    const newPhotoUrl = `/api/placeholder/400/300?random=${Date.now()}`
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, newPhotoUrl]
    }))
    toast.success('Photo added successfully')
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim() !== '' && formData.description.trim() !== ''
      case 2:
        return formData.category !== '' && formData.condition !== ''
      case 3:
        return formData.actionType !== ''
      case 4:
        return formData.location.trim() !== ''
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    } else {
      toast.error('Please fill in all required fields')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to create a listing')
      return
    }

    if (!validateStep(4)) {
      toast.error('Please complete all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const newListing = {
        id: `listing-${Date.now()}`,
        ...formData,
        userId: user.id,
        userName: user.name,
        status: 'active',
        createdAt: new Date().toISOString(),
        views: 0,
        interested: []
      }

      // Add to user's listings
      setListings(currentListings => [...currentListings, newListing])

      // Add to global listings for browsing
      const globalListings = await spark.kv.get('global-listings') || []
      await spark.kv.set('global-listings', [...globalListings, newListing])

      // Update user's carbon footprint based on action type
      if (user.carbonFootprint) {
        const carbonImpact = formData.actionType === 'recycle' ? 5 : 
                           formData.actionType === 'donate' ? 3 : 2
        
        const updatedUser = {
          ...user,
          carbonFootprint: {
            ...user.carbonFootprint,
            totalSaved: user.carbonFootprint.totalSaved + carbonImpact,
            itemsProcessed: user.carbonFootprint.itemsProcessed + 1
          }
        }
        await spark.kv.set('current-user', updatedUser)
      }

      toast.success('Item listed successfully!')
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        condition: '',
        actionType: '',
        photos: [],
        location: '',
        contactMethod: 'platform'
      })
      setCurrentStep(1)
      
      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      toast.error('Failed to create listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-h2 flex items-center space-x-2">
            <Plus size={24} className="text-primary" />
            <span>List Your Item</span>
          </CardTitle>
          <CardDescription>
            Please sign in to create a listing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              You need to be signed in to list items on TruCycle
            </p>
            <Button onClick={() => window.location.reload()}>
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h2 flex items-center space-x-2">
          <Plus size={24} className="text-primary" />
          <span>List Your Item</span>
        </CardTitle>
        <CardDescription>
          Step {currentStep} of {totalSteps}: Help reduce waste by listing your item
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Item Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Vintage Wooden Coffee Table"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                
                  
            

              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your item's condition, size, and any relevant details..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div>
                  >
                      <div className="font-medium">{condition.label}</div>
                    </CardContent>
                ))}
            </div>
        )}
        {/* Step 3: Action Type
          <div className="space-y-4">
              <Label>What would you like to do with this item? *</La
                {ACTION_TYPES.map(action => {
                  ret
                      k
                        formD
                        
                   
                      <CardContent className="p-
                         
                            <div clas
                          </div>
                      </CardContent>
                  )
              </div>
          </div>

        {currentSt
            <div>
              <div
                
          

                />
              <p className="tex
              </p>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div><span clas
                <div><span className="font-medium">Action:</span>
                <div><span class
            </div>
        )}
        {/* Navigation */}
          <Button
            onClick={prevStep}
          >
          </Button>
          {currentStep 
              Next

              {is
          )}
      </CardContent>
  )

















































































































