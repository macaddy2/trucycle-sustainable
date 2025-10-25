/**
 * TruCycle Trust Score Algorithm
 * 
 * This utility calculates a comprehensive trust score for users based on multiple factors:
 * - Verification level completion
 * - Rating history and average
 * - Exchange activity and success rate
 * - Community reputation and helpful votes received
 * 
 * Trust Score ranges from 0-100, with the following tiers:
 * - 90-100: Elite Trusted User
 * - 75-89: Highly Trusted User
 * - 60-74: Trusted User
 * - 40-59: Verified User
 * - 0-39: New/Basic User
 */

import type { VerificationLevel } from './verificationBadgeUtils'
import { UserRatingStats } from './RatingSystem'

export interface TrustFactors {
  verificationLevel: VerificationLevel
  ratingStats: UserRatingStats
  exchangeHistory: {
    totalExchanges: number
    successfulExchanges: number
    cancelledExchanges: number
    disputedExchanges: number
  }
  accountAge: number // in days
  responseTime: number // average response time in hours
  profileCompleteness: number // percentage 0-100
}

export interface TrustScore {
  overall: number
  breakdown: {
    verification: number
    reputation: number
    activity: number
    reliability: number
  }
  tier: 'elite' | 'highly-trusted' | 'trusted' | 'verified' | 'basic'
  factors: string[]
  improvements: string[]
}

export function calculateTrustScore(factors: TrustFactors): TrustScore {
  // 1. Verification Score (0-30 points)
  const verificationScore = calculateVerificationScore(factors.verificationLevel)
  
  // 2. Reputation Score (0-30 points)
  const reputationScore = calculateReputationScore(factors.ratingStats)
  
  // 3. Activity Score (0-25 points)
  const activityScore = calculateActivityScore(factors.exchangeHistory, factors.accountAge)
  
  // 4. Reliability Score (0-15 points)
  const reliabilityScore = calculateReliabilityScore(factors.responseTime, factors.profileCompleteness)
  
  const overall = Math.min(100, verificationScore + reputationScore + activityScore + reliabilityScore)
  
  return {
    overall,
    breakdown: {
      verification: verificationScore,
      reputation: reputationScore,
      activity: activityScore,
      reliability: reliabilityScore
    },
    tier: getTrustTier(overall),
    factors: getTrustFactors(factors),
    improvements: getImprovementSuggestions(factors)
  }
}

function calculateVerificationScore(verification: VerificationLevel): number {
  if (!verification || typeof verification !== 'object') {
    return 0
  }
  
  const weights = {
    email: 8,      // Basic requirement
    identity: 12,  // High trust factor
    address: 10,   // Location verification
  }
  
  return Object.entries(verification).reduce((score, [key, verified]) => {
    return score + (verified ? weights[key as keyof typeof weights] : 0)
  }, 0)
}

function calculateReputationScore(ratingStats: UserRatingStats): number {
  if (ratingStats.totalRatings === 0) return 0
  
  // Base score from average rating (0-20 points)
  const averageScore = ((ratingStats.averageRating - 1) / 4) * 20
  
  // Volume bonus (0-5 points) - more ratings = more reliable
  const volumeBonus = Math.min(5, Math.log10(ratingStats.totalRatings + 1) * 2)
  
  // Verified ratings bonus (0-3 points)
  const verifiedRatio = ratingStats.verifiedRatings / ratingStats.totalRatings
  const verifiedBonus = verifiedRatio * 3
  
  // Helpful votes bonus (0-2 points)
  const helpfulBonus = Math.min(2, ratingStats.helpfulVotesReceived / 10)
  
  return Math.min(30, averageScore + volumeBonus + verifiedBonus + helpfulBonus)
}

function calculateActivityScore(exchangeHistory: TrustFactors['exchangeHistory'], accountAge: number): number {
  const { totalExchanges, successfulExchanges, cancelledExchanges, disputedExchanges } = exchangeHistory
  
  if (totalExchanges === 0) return 0
  
  // Success rate score (0-15 points)
  const successRate = successfulExchanges / totalExchanges
  const successScore = successRate * 15
  
  // Activity volume score (0-7 points)
  const monthlyAverage = totalExchanges / Math.max(1, accountAge / 30)
  const volumeScore = Math.min(7, monthlyAverage * 2)
  
  // Penalty for cancellations and disputes
  const cancellationPenalty = (cancelledExchanges / totalExchanges) * 5
  const disputePenalty = (disputedExchanges / totalExchanges) * 8
  
  return Math.max(0, successScore + volumeScore - cancellationPenalty - disputePenalty)
}

function calculateReliabilityScore(responseTime: number, profileCompleteness: number): number {
  // Response time score (0-8 points) - faster response = higher score
  const responseScore = Math.max(0, 8 - (responseTime / 6)) // 6+ hours = 0 points
  
  // Profile completeness score (0-7 points)
  const profileScore = (profileCompleteness / 100) * 7
  
  return Math.min(15, responseScore + profileScore)
}

function getTrustTier(score: number): TrustScore['tier'] {
  if (score >= 90) return 'elite'
  if (score >= 75) return 'highly-trusted'
  if (score >= 60) return 'trusted'
  if (score >= 40) return 'verified'
  return 'basic'
}

function getTrustFactors(factors: TrustFactors): string[] {
  const positiveFactors: string[] = []
  
  // Verification factors
  const verificationCount = Object.values(factors.verificationLevel || {}).filter(Boolean).length
  if (verificationCount >= 3) positiveFactors.push('Fully verified identity')
  else if (verificationCount >= 2) positiveFactors.push('Well-verified profile')
  
  // Rating factors
  if (factors.ratingStats.averageRating >= 4.5) {
    positiveFactors.push(`Excellent ${factors.ratingStats.averageRating.toFixed(1)}★ rating`)
  }
  if (factors.ratingStats.totalRatings >= 10) {
    positiveFactors.push(`${factors.ratingStats.totalRatings}+ verified reviews`)
  }
  
  // Activity factors
  const successRate = factors.exchangeHistory.successfulExchanges / Math.max(1, factors.exchangeHistory.totalExchanges)
  if (successRate >= 0.95) positiveFactors.push('Outstanding exchange success rate')
  else if (successRate >= 0.85) positiveFactors.push('High exchange success rate')
  
  // Reliability factors
  if (factors.responseTime <= 2) positiveFactors.push('Very responsive to messages')
  if (factors.profileCompleteness >= 90) positiveFactors.push('Complete profile information')
  
  return positiveFactors
}

function getImprovementSuggestions(factors: TrustFactors): string[] {
  const suggestions: string[] = []
  
  // Verification improvements
  const verification = factors.verificationLevel
  if (!verification.identity) suggestions.push('Complete identity verification')
  if (!verification.address) suggestions.push('Complete address verification')
  
  // Rating improvements
  if (factors.ratingStats.totalRatings < 5) {
    suggestions.push('Complete more exchanges to build your reputation')
  }
  
  // Profile improvements
  if (factors.profileCompleteness < 80) {
    suggestions.push('Complete your profile information')
  }
  
  // Response time improvements
  if (factors.responseTime > 6) {
    suggestions.push('Respond to messages more quickly')
  }
  
  return suggestions.slice(0, 3) // Limit to top 3 suggestions
}

// Utility functions for displaying trust information
export function getTrustBadgeColor(tier: TrustScore['tier']): string {
  switch (tier) {
    case 'elite': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'highly-trusted': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'trusted': return 'bg-green-100 text-green-800 border-green-200'
    case 'verified': return 'bg-amber-100 text-amber-800 border-amber-200'
    default: return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

export function getTrustBadgeText(tier: TrustScore['tier']): string {
  switch (tier) {
    case 'elite': return 'Elite Trusted'
    case 'highly-trusted': return 'Highly Trusted'
    case 'trusted': return 'Trusted'
    case 'verified': return 'Verified'
    default: return 'New User'
  }
}

export function shouldShowTrustWarning(score: number): boolean {
  return score < 40
}

export function getTrustScoreDescription(score: number): string {
  if (score >= 90) return 'This user has an exceptional track record and is highly trustworthy'
  if (score >= 75) return 'This user has a strong reputation and reliable exchange history'
  if (score >= 60) return 'This user has good ratings and completed verifications'
  if (score >= 40) return 'This user has basic verification but limited exchange history'
  return 'This user is new to the platform or has limited verification'
}
