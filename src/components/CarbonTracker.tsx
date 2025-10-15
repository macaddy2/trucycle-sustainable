import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Leaf, Trophy, Recycle, ArrowsClockwise, TrendUp } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { getMyImpactMetrics } from '@/lib/api'
import { useEffect } from 'react'

interface CarbonData {
  totalCO2Saved: number
  itemsExchanged: number
  itemsDonated: number
  monthlyGoal: number
  currentMonthSavings: number
  badges: string[]
  weeklyData: { week: string; co2: number }[]
}

export function CarbonTracker() {
  const [carbonData, setCarbonData] = useKV<CarbonData>('carbon-data', {
    totalCO2Saved: 0,
    itemsExchanged: 0,
    itemsDonated: 0,
    monthlyGoal: 50,
    currentMonthSavings: 0,
    badges: [],
    weeklyData: []
  })

  useEffect(() => {
    let cancelled = false
    async function loadImpact() {
      try {
        const res = await getMyImpactMetrics()
        if (cancelled) return
        const data = (res as any)?.data
        if (data && typeof data === 'object') {
          const total = typeof data.total_co2_saved_kg === 'number' ? data.total_co2_saved_kg : 0
          const exchanged = typeof data.items_exchanged === 'number' ? data.items_exchanged : 0
          const donated = typeof data.items_donated === 'number' ? data.items_donated : 0
          const target = typeof data?.monthly_goal?.target_kg === 'number' ? data.monthly_goal.target_kg : 50
          const achieved = typeof data?.monthly_goal?.achieved_kg === 'number' ? data.monthly_goal.achieved_kg : 0
          setCarbonData(prev => ({
            ...prev,
            totalCO2Saved: total,
            itemsExchanged: exchanged,
            itemsDonated: donated,
            monthlyGoal: target,
            currentMonthSavings: achieved,
          }))
        }
      } catch {
        // Silently ignore errors (e.g., unauthenticated); keep defaults
      }
    }
    loadImpact()
    return () => { cancelled = true }
  }, [setCarbonData])

  const achievements = [
    {
      title: 'First Exchange',
      description: 'Complete your first item exchange',
      icon: <ArrowsClockwise size={24} />,
      earned: (carbonData?.itemsExchanged || 0) > 0,
      color: 'bg-accent text-accent-foreground',
    },
    {
      title: 'Generous Heart',
      description: 'Donate 5 items',
      icon: <Leaf size={24} />,
      earned: (carbonData?.itemsDonated || 0) >= 5,
      color: 'bg-primary text-primary-foreground',
    },
    {
      title: 'Carbon Saver',
      description: 'Save 25kg of CO2',
      icon: <Trophy size={24} />,
      earned: (carbonData?.totalCO2Saved || 0) >= 25,
      color: 'bg-secondary text-secondary-foreground',
    },
    {
      title: 'Eco Champion',
      description: 'Save 100kg of CO2',
      icon: <TrendUp size={24} />,
      earned: (carbonData?.totalCO2Saved || 0) >= 100,
      color: 'bg-green-600 text-white',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-foreground mb-2 flex items-center space-x-2">
          <Leaf size={32} className="text-primary" />
          <span>Environmental Impact</span>
        </h1>
        <p className="text-body text-muted-foreground">
          Track your positive impact on the environment
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Leaf size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-small text-muted-foreground">Total CO2 Saved</p>
                <p className="text-h2 font-bold text-primary">{carbonData?.totalCO2Saved || 0}kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <ArrowsClockwise size={24} className="text-accent" />
              </div>
              <div>
                <p className="text-small text-muted-foreground">Items Exchanged</p>
                <p className="text-h2 font-bold text-accent">{carbonData?.itemsExchanged || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                <Recycle size={24} className="text-secondary" />
              </div>
              <div>
                <p className="text-small text-muted-foreground">Items Donated</p>
                <p className="text-h2 font-bold text-secondary">{carbonData?.itemsDonated || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h3">Achievements</CardTitle>
          <CardDescription>
            Unlock badges by reaching sustainability milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all ${
                  achievement.earned ? 'border-primary bg-primary/5' : 'border-muted bg-muted/20'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      achievement.earned ? achievement.color : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{achievement.title}</h4>
                    <p className="text-small text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.earned && (
                    <Badge variant="secondary">Earned</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Environmental Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h3">Sustainability Tips</CardTitle>
          <CardDescription>
            Simple ways to increase your environmental impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p className="text-body">
                List items you no longer need instead of throwing them away
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p className="text-body">
                Choose exchanges over purchases when possible to reduce manufacturing demand
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p className="text-body">
                Use drop-off points for items that can't be directly exchanged
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p className="text-body">
                Repair items when possible before listing them for exchange
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
