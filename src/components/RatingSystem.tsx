import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Star, ThumbsUp } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

export interface Rating {
  id: string
  exchangeId: string
  itemTitle: string
  reviewerId: string
  reviewerName: string
  reviewerAvatar?: string
  targetUserId: string
  targetUserName: string
  rating: number // 1-5 stars
  review: string
  category: 'punctuality' | 'communication' | 'item_condition' | 'overall' // Main category
  subcategories: {
    punctuality: number
    communication: number
    itemCondition: number
    politeness: number
  }
  isPositive: boolean
  helpfulVotes: number
  createdAt: string
  verified: boolean // If the exchange was completed successfully
}

export interface UserRatingStats {
  totalRatings: number
  averageRating: number
  ratingDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  categoryAverages: {
    punctuality: number
    communication: number
    itemCondition: number
    politeness: number
  }
  verifiedRatings: number
  helpfulVotesReceived: number
}

interface RatingDisplayProps {
  rating: number
  totalRatings: number
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

interface RatingStarsProps {
  rating: number
  interactive?: boolean
  size?: 'sm' | 'md' | 'lg'
  onRatingChange?: (rating: number) => void
  className?: string
}

interface RatingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exchangeId: string
  itemTitle: string
  targetUserId: string
  targetUserName: string
  onRatingSubmitted?: () => void
}

interface RatingListProps {
  userId: string
  ratings: Rating[]
  showAll?: boolean
  className?: string
}

// Star Rating Component
export function RatingStars({ 
  rating, 
  interactive = false, 
  size = 'md', 
  onRatingChange, 
  className = '' 
}: RatingStarsProps) {
  const [hoveredRating, setHoveredRating] = useState(0)
  
  const starSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  const currentRating = interactive ? hoveredRating || rating : rating

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={starSize}
          className={`${
            star <= currentRating 
              ? 'text-yellow-500 fill-current' 
              : 'text-gray-300'
          } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          onClick={() => interactive && onRatingChange?.(star)}
          onMouseEnter={() => interactive && setHoveredRating(star)}
          onMouseLeave={() => interactive && setHoveredRating(0)}
        />
      ))}
    </div>
  )
}

// Rating Display with Count
export function RatingDisplay({ 
  rating, 
  totalRatings, 
  showCount = true, 
  size = 'md', 
  className = '' 
}: RatingDisplayProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <RatingStars rating={rating} size={size} />
      <span className={`font-medium ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}>
        {rating.toFixed(1)}
      </span>
      {showCount && (
        <span className={`text-muted-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          ({totalRatings} review{totalRatings !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  )
}

// Rating Form for leaving reviews
export function RatingForm({ 
  open, 
  onOpenChange, 
  exchangeId, 
  itemTitle, 
  targetUserId, 
  targetUserName, 
  onRatingSubmitted 
}: RatingFormProps) {
  const [currentUser] = useKV('current-user', null)
  const [ratings, setRatings] = useKV<Rating[]>('user-ratings', [])
  const [, setUserStats] = useKV<Record<string, UserRatingStats>>('user-rating-stats', {})
  
  const [formData, setFormData] = useState({
    overall: 0,
    punctuality: 0,
    communication: 0,
    itemCondition: 0,
    politeness: 0,
    review: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('Please sign in to leave a rating')
      return
    }

    if (formData.overall === 0) {
      toast.error('Please select an overall rating')
      return
    }

    if (formData.review.trim().length < 10) {
      toast.error('Please write a review with at least 10 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const newRating: Rating = {
        id: `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        exchangeId,
        itemTitle,
        reviewerId: currentUser.id,
        reviewerName: currentUser.name,
        reviewerAvatar: currentUser.avatar,
        targetUserId,
        targetUserName,
        rating: formData.overall,
        review: formData.review.trim(),
        category: 'overall',
        subcategories: {
          punctuality: formData.punctuality || formData.overall,
          communication: formData.communication || formData.overall,
          itemCondition: formData.itemCondition || formData.overall,
          politeness: formData.politeness || formData.overall
        },
        isPositive: formData.overall >= 4,
        helpfulVotes: 0,
        createdAt: new Date().toISOString(),
        verified: true // In real app, verify exchange completion
      }

      // Add the rating
      const updatedRatings = [...ratings, newRating]
      setRatings(updatedRatings)

      // Update user stats
      const userRatings = updatedRatings.filter(r => r.targetUserId === targetUserId)
      const stats: UserRatingStats = calculateUserStats(userRatings)
      
      setUserStats((prev) => ({
        ...prev,
        [targetUserId]: stats
      }))

      toast.success('Rating submitted successfully!')
      onRatingSubmitted?.()
      onOpenChange(false)
      
      // Reset form
      setFormData({
        overall: 0,
        punctuality: 0,
        communication: 0,
        itemCondition: 0,
        politeness: 0,
        review: ''
      })
    } catch (error) {
      console.error('Failed to submit rating', error)
      toast.error('Failed to submit rating. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rate Your Exchange</DialogTitle>
          <p className="text-muted-foreground">
            How was your experience exchanging <strong>{itemTitle}</strong> with {targetUserName}?
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Rating */}
          <div>
            <label className="text-sm font-medium mb-2 block">Overall Experience *</label>
            <RatingStars
              rating={formData.overall}
              interactive
              size="lg"
              onRatingChange={(rating) => setFormData(prev => ({ ...prev, overall: rating }))}
            />
          </div>

          {/* Category Ratings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Punctuality</label>
              <RatingStars
                rating={formData.punctuality}
                interactive
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, punctuality: rating }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Communication</label>
              <RatingStars
                rating={formData.communication}
                interactive
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, communication: rating }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Item Condition</label>
              <RatingStars
                rating={formData.itemCondition}
                interactive
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, itemCondition: rating }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Politeness</label>
              <RatingStars
                rating={formData.politeness}
                interactive
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, politeness: rating }))}
              />
            </div>
          </div>

          {/* Written Review */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Written Review * <span className="text-muted-foreground">(minimum 10 characters)</span>
            </label>
            <Textarea
              placeholder="Share details about your exchange experience..."
              value={formData.review}
              onChange={(e) => setFormData(prev => ({ ...prev, review: e.target.value }))}
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.review.length}/500 characters
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Display list of ratings for a user
export function RatingList({ userId, ratings, showAll = false, className = '' }: RatingListProps) {
  const [, setUserRatings] = useKV<Rating[]>('user-ratings', [])
  
  const userRatings = ratings.filter(r => r.targetUserId === userId)
  const displayRatings = showAll ? userRatings : userRatings.slice(0, 3)

  const handleHelpfulVote = (ratingId: string) => {
    setUserRatings((prev) => prev.map(rating => 
      rating.id === ratingId 
        ? { ...rating, helpfulVotes: rating.helpfulVotes + 1 }
        : rating
    ))
    toast.success('Thanks for your feedback!')
  }

  if (userRatings.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <p className="text-muted-foreground">No ratings yet</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {displayRatings.map((rating) => (
        <Card key={rating.id} className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={rating.reviewerAvatar} />
                <AvatarFallback className="text-xs">
                  {(rating.reviewerName || '?')[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{rating.reviewerName}</p>
                <div className="flex items-center space-x-2">
                  <RatingStars rating={rating.rating} size="sm" />
                  {rating.verified && (
                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {new Date(rating.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Exchange: {rating.itemTitle}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {rating.review}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Communication: {rating.subcategories.communication}/5</span>
              <span>Item: {rating.subcategories.itemCondition}/5</span>
              <span>Punctuality: {rating.subcategories.punctuality}/5</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleHelpfulVote(rating.id)}
              className="text-xs"
            >
              <ThumbsUp size={12} className="mr-1" />
              Helpful ({rating.helpfulVotes})
            </Button>
          </div>
        </Card>
      ))}

      {!showAll && userRatings.length > 3 && (
        <Button variant="outline" className="w-full">
          View All {userRatings.length} Reviews
        </Button>
      )}
    </div>
  )
}

// Calculate user rating statistics
function calculateUserStats(ratings: Rating[]): UserRatingStats {
  if (ratings.length === 0) {
    return {
      totalRatings: 0,
      averageRating: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      categoryAverages: {
        punctuality: 0,
        communication: 0,
        itemCondition: 0,
        politeness: 0
      },
      verifiedRatings: 0,
      helpfulVotesReceived: 0
    }
  }

  const totalRatings = ratings.length
  const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
  const verifiedRatings = ratings.filter(r => r.verified).length
  const helpfulVotesReceived = ratings.reduce((sum, r) => sum + r.helpfulVotes, 0)

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  ratings.forEach(r => {
    ratingDistribution[r.rating as keyof typeof ratingDistribution]++
  })

  const categoryAverages = {
    punctuality: ratings.reduce((sum, r) => sum + r.subcategories.punctuality, 0) / totalRatings,
    communication: ratings.reduce((sum, r) => sum + r.subcategories.communication, 0) / totalRatings,
    itemCondition: ratings.reduce((sum, r) => sum + r.subcategories.itemCondition, 0) / totalRatings,
    politeness: ratings.reduce((sum, r) => sum + r.subcategories.politeness, 0) / totalRatings
  }

  return {
    totalRatings,
    averageRating,
    ratingDistribution,
    categoryAverages,
    verifiedRatings,
    helpfulVotesReceived
  }
}
