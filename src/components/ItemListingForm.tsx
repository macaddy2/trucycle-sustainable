import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Camera, MapPin, Recycle, Heart, ArrowsClockwise } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Clothing',
  'Books',
  'Kitchen Items',
  'Garden Tools',
  'Sports Equipment',
  'Toys & Games',
  'Home Decor',
  'Other'
]

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent', description: 'Like new, minimal wear' },
  { value: 'good', label: 'Good', description: 'Well maintained, minor wear' },
  { value: 'fair', label: 'Fair', description: 'Used but functional' },
  { value: 'poor', label: 'Poor', description: 'Needs repair or refurbishment' }
]

const ACTION_TYPES = [
  { 
    value: 'exchange', 
    label: 'Exchange', 
    icon: ArrowsClockwise, 
    description: 'Trade for another item',
    color: 'text-accent'
  },
  { 
    value: 'donate', 
    label: 'Donate', 
    icon: Heart, 
    description: 'Give away for free',
    color: 'text-primary'
  },
  { 
    value: 'recycle', 
    label: 'Recycle', 
    icon: Recycle, 
    description: 'Proper disposal/recycling',
    color: 'text-secondary'
  }
]

interface ItemListingFormProps {
  onComplete?: () => void
}

export function ItemListingForm({ onComplete }: ItemListingFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [user] = useKV('current-user', null)
  const [listings, setListings] = useKV('user-listings', [])
  const [globalListings, setGlobalListings] = useKV('global-listings', [])
  
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
    const photoIndex = formData.photos.length + 1
    const newPhotoUrl = `https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop&auto=format&q=60&random=${photoIndex}`
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
      setGlobalListings(currentGlobalListings => [...currentGlobalListings, newListing])

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
              />
            </div>
            
            <div>
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
              <Label>Photos ({formData.photos.length}/5)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                    <img src={photo} alt={`Item photo ${index + 1}`} className="w-full h-full object-cover" />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      onClick={() => removePhoto(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                {formData.photos.length < 5 && (
                  <Button
                    variant="outline"
                    className="aspect-square h-auto flex-col"
                    onClick={handlePhotoUpload}
                  >
                    <Camera size={24} className="mb-2" />
                    <span className="text-xs">Add Photo</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Category and Condition */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Condition *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {CONDITIONS.map(condition => (
                  <Card
                    key={condition.value}
                    className={`cursor-pointer transition-colors ${
                      formData.condition === condition.value 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleInputChange('condition', condition.value)}
                  >
                    <CardContent className="p-4">
                      <div className="font-medium">{condition.label}</div>
                      <div className="text-sm text-muted-foreground">{condition.description}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Action Type */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <Label>What would you like to do with this item? *</Label>
              <div className="grid grid-cols-1 gap-3 mt-4">
                {ACTION_TYPES.map(action => {
                  const Icon = action.icon
                  return (
                    <Card
                      key={action.value}
                      className={`cursor-pointer transition-colors ${
                        formData.actionType === action.value 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleInputChange('actionType', action.value)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Icon size={24} className={action.color} />
                          <div>
                            <div className="font-medium">{action.label}</div>
                            <div className="text-sm text-muted-foreground">{action.description}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Location and Contact */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Location *</Label>
              <div className="relative">
                <MapPin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="e.g., Camden, North London"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                General area only - exact address will be shared privately
              </p>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-3">Listing Summary</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Title:</span> {formData.title}</div>
                <div><span className="font-medium">Category:</span> {formData.category}</div>
                <div><span className="font-medium">Condition:</span> {formData.condition}</div>
                <div><span className="font-medium">Action:</span> {formData.actionType}</div>
                <div><span className="font-medium">Location:</span> {formData.location}</div>
                <div><span className="font-medium">Photos:</span> {formData.photos.length} uploaded</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          {currentStep < totalSteps ? (
            <Button onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Listing'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}