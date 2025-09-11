import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heart, MapPin, Recycle, ArrowsClockwise, Leaf, Search, Plus, User } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { ItemListing } from './components/ItemListing'
import { ProfileDashboard } from './components/ProfileDashboard'
import { DropOffMap } from './components/DropOffMap'
import { CarbonTracker } from './components/CarbonTracker'

function App() {
  const [currentTab, setCurrentTab] = useState('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [user] = useKV('current-user', null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search functionality will be implemented in ItemListing component
  }

  return (
    <div className="min-h-screen bg-background font-roboto">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Recycle size={20} className="text-primary-foreground" />
              </div>
              <h1 className="text-h2 text-foreground">TruCycle</h1>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </form>
              
              {user ? (
                <Button variant="outline" size="sm">
                  <User size={16} className="mr-2" />
                  Profile
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">Sign In</Button>
                  <Button size="sm">Sign Up</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 md:flex md:w-auto">
              <TabsTrigger value="browse" className="flex items-center space-x-2">
                <Search size={16} />
                <span className="hidden sm:inline">Browse</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center space-x-2">
                <Plus size={16} />
                <span className="hidden sm:inline">List Item</span>
              </TabsTrigger>
              <TabsTrigger value="dropoff" className="flex items-center space-x-2">
                <MapPin size={16} />
                <span className="hidden sm:inline">Drop-off</span>
              </TabsTrigger>
              <TabsTrigger value="impact" className="flex items-center space-x-2">
                <Leaf size={16} />
                <span className="hidden sm:inline">Impact</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User size={16} />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsContent value="browse">
            <ItemListing searchQuery={searchQuery} />
          </TabsContent>
          
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="text-h2 flex items-center space-x-2">
                  <Plus size={24} className="text-primary" />
                  <span>List Your Item</span>
                </CardTitle>
                <CardDescription>
                  Help reduce waste by listing items for exchange, donation, or responsible disposal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus size={32} className="text-primary" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    This feature is coming soon! You'll be able to list items with photos, descriptions, and categories.
                  </p>
                  <Button disabled>Create Listing</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dropoff">
            <DropOffMap />
          </TabsContent>

          <TabsContent value="impact">
            <CarbonTracker />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileDashboard />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Recycle size={16} className="text-primary-foreground" />
                </div>
                <span className="font-medium">TruCycle</span>
              </div>
              <p className="text-small text-muted-foreground">
                Sustainable item exchange platform for London communities
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Features</h3>
              <div className="space-y-2 text-small text-muted-foreground">
                <p>Item Exchange</p>
                <p>Donation Platform</p>
                <p>Carbon Tracking</p>
                <p>Drop-off Points</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Support</h3>
              <div className="space-y-2 text-small text-muted-foreground">
                <p>Help Center</p>
                <p>Community Guidelines</p>
                <p>Safety Tips</p>
                <p>Contact Us</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Environmental Impact</h3>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Leaf size={12} />
                  <span>CO2 Saved</span>
                </Badge>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <ArrowsClockwise size={12} />
                  <span>Items Exchanged</span>
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-small text-muted-foreground">
            <p>&copy; 2024 TruCycle. Building sustainable communities in London.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App