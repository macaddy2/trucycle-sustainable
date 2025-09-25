import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Leaf, Trophy, Recycle, ArrowsClockwise, TrendUp } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'

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
  const [carbonData] = useKV<CarbonData>('carbon-data', {
    totalCO2Saved: 0,
    itemsExchanged: 0,
    itemsDonated: 0,
    monthlyGoal: 50,
    currentMonthSavings: 0,
    badges: [],
    weeklyData: []
  })

  const progressPercentage = Math.min((carbonData?.currentMonthSavings || 0) / (carbonData?.monthlyGoal || 1) * 100, 100)

  const achievements = [
    {
      title: 'First Exchange',
      description: 'Complete your first item exchange',
      icon: <ArrowsClockwise size={24} />,
      earned: (carbonData?.itemsExchanged || 0) > 0,
      color: 'bg-accent text-accent-foreground'
    },
    {
      title: 'Generous Heart',
      description: 'Donate 5 items',
      icon: <Leaf size={24} />,
      earned: (carbonData?.itemsDonated || 0) >= 5,
      color: 'bg-primary text-primary-foreground'
    },
    {
      title: 'Carbon Saver',
      description: 'Save 25kg of CO₂',
      icon: <Trophy size={24} />,
      earned: (carbonData?.totalCO2Saved || 0) >= 25,
      color: 'bg-secondary text-secondary-foreground'
    },
    {
      title: 'Eco Champion',
      description: 'Save 100kg of CO₂',
      icon: <TrendUp size={24} />,
      earned: (carbonData?.totalCO2Saved || 0) >= 100,
      color: 'bg-green-600 text-white'
    }
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
                <p className="text-small text-muted-foreground">Total CO₂ Saved</p>
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

      {/* Monthly Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h3">Monthly CO₂ Savings Goal</CardTitle>
          <CardDescription>
            Track your progress towards this month's environmental goal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-small text-muted-foreground">
                {carbonData?.currentMonthSavings || 0}kg of {carbonData?.monthlyGoal || 100}kg goal
              </span>
              <span className="text-small font-medium">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-center">
              {progressPercentage >= 100 ? (
                <Badge className="bg-green-600 text-white">
                  🎉 Goal Achieved!
                </Badge>
              ) : (
                <p className="text-small text-muted-foreground">
                  {Math.max(0, (carbonData?.monthlyGoal || 100) - (carbonData?.currentMonthSavings || 0))}kg to go
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                  achievement.earned
                    ? 'border-primary bg-primary/5'
                    : 'border-muted bg-muted/20'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      achievement.earned
                        ? achievement.color
                        : 'bg-muted text-muted-foreground'
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
                    <Badge variant="secondary">✓ Earned</Badge>
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

      {/* Call to Action */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Leaf size={32} className="text-primary" />
          </div>
          <h3 className="text-h3 mb-2">Ready to make a bigger impact?</h3>
          <p className="text-body text-muted-foreground mb-4">
            List an item or browse available exchanges to continue your sustainability journey
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button>Browse Items</Button>
            <Button variant="outline">List an Item</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
