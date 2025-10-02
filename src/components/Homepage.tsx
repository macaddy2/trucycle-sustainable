import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowsClockwise,
  Leaf,
  Package,
  Storefront,
  ChatCircle,
  Recycle,
  Lightning,
  UsersThree,
  HandHeart,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface HighlightCardProps {
  icon: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  accent?: 'primary' | 'secondary' | 'emerald' | 'amber'
}

const accentClasses: Record<NonNullable<HighlightCardProps['accent']>, string> = {
  primary: 'from-primary/10 via-primary/5 to-transparent border-primary/30',
  secondary: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20',
  emerald: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20',
  amber: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
}

function HighlightCard({ icon, title, description, action, accent = 'primary' }: HighlightCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur-sm transition-all hover:shadow-md',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-80',
        accentClasses[accent],
      )}
    >
      <div className="relative z-10 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/80 shadow-inner">
          {icon}
        </div>
        <div>
          <h3 className="text-h5 font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-base text-muted-foreground">{description}</p>
        </div>
        {action && (
          <Button variant="secondary" onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}

interface HomepageProps {
  onExploreBrowse: () => void
  onStartListing: () => void
  onViewImpact: () => void
  onViewPartners: () => void
  onOpenMessages: () => void
  onSearch: () => void
  onSearchChange: (value: string) => void
  searchQuery: string
  isAuthenticated: boolean
  userName?: string
  onSignIn: () => void
  onSignUp: () => void
}

export function Homepage({
  onExploreBrowse,
  onStartListing,
  onViewImpact,
  onViewPartners,
  onOpenMessages,
  onSearch,
  onSearchChange,
  searchQuery,
  isAuthenticated,
  userName,
  onSignIn,
  onSignUp,
}: HomepageProps) {
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-primary/5 to-emerald-500/10 px-6 py-16 shadow-lg">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-6">
            <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm font-medium">
              Building circular communities in London
            </Badge>
            <h2 className="text-pretty text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Discover, donate, and measure your impact in one beautiful experience.
            </h2>
            <p className="max-w-xl text-lg text-muted-foreground">
              TruCycle brings together donors, collectors, and partner shops. Browse local treasures, list pre-loved items in seconds, plan sustainable drop-offs, and see the carbon you save along the way.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onStartListing}>
                List or donate now
              </Button>
            </div>
          </div>

          <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-background/80 p-6 shadow-inner backdrop-blur">
            <h3 className="text-lg font-semibold text-foreground">Find something you need</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Search by category, keyword, or location to discover listings near you.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                onSearch()
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search furniture, electronics, baby essentials..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Button type="submit" className="w-full" variant="secondary">
                Start searching
              </Button>
            </form>
            {!isAuthenticated ? (
              <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">New here?</p>
                <p className="mt-1">
                  Create a free account to save favourites, chat with donors, and plan drop-offs.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={onSignUp}>
                    Sign up
                  </Button>
                  <Button size="sm" variant="outline" onClick={onSignIn}>
                    Sign in
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Welcome back{userName ? `, ${userName}` : ''}!</p>
                <p className="mt-1">
                  Resume your sustainable journey by checking new messages or measuring your impact.
                </p>
                <Button size="sm" className="mt-3" variant="outline" onClick={onOpenMessages}>
                  View messages
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                <ArrowsClockwise size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Items recirculated this month</p>
                <p className="text-2xl font-semibold text-foreground">1,240+</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Leaf size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kg of CO₂ prevented</p>
                <p className="text-2xl font-semibold text-foreground">18,600</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <UsersThree size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Neighbours supporting neighbours</p>
                <p className="text-2xl font-semibold text-foreground">8,400+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-2xl font-semibold text-foreground">All the essentials in one flow</h3>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Switch between browsing, listing, messaging, and measuring impact without losing context. These highlights preview the core experiences you can jump into at any time.
            </p>
          </div>
          <Button variant="ghost" onClick={onExploreBrowse}>
            Jump into marketplace
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <HighlightCard
            icon={<Package size={24} className="text-primary" />}
            title="Browse community-powered listings"
            description="Discover quality furniture, tech, clothing, and essentials donated by neighbours. Filter by distance, urgency, and availability."
            action={{ label: 'Explore listings', onClick: onExploreBrowse }}
            accent="primary"
          />

          <HighlightCard
            icon={<ArrowsClockwise size={24} className="text-blue-600" />}
            title="Create listings in seconds"
            description="Guided forms, smart fulfilment suggestions, and rich item previews help you share what you no longer need with zero friction."
            action={{ label: 'List or donate an item', onClick: onStartListing }}
            accent="secondary"
          />

          <HighlightCard
            icon={<Storefront size={24} className="text-emerald-600" />}
            title="Partner shops and drop-off hubs"
            description="Plan sustainable drop-offs at trusted repair cafés and charity partners across London. Real-time availability keeps queues short."
            action={{ label: 'View partner map', onClick: onViewPartners }}
            accent="emerald"
          />

          <HighlightCard
            icon={<Leaf size={24} className="text-amber-600" />}
            title="Measure your circular impact"
            description="Carbon savings, reuse streaks, and neighbourhood milestones make every donation feel meaningful for you and the planet."
            action={{ label: 'Open impact tracker', onClick: onViewImpact }}
            accent="amber"
          />
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-3xl border border-border/60 bg-card/60 p-8 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Lightning size={26} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Guided journey</p>
              <h3 className="text-2xl font-semibold text-foreground">How TruCycle keeps you moving</h3>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                title: 'Smart matching',
                copy: 'Receive recommendations when items align with your wish list or when community needs arise.'
              },
              {
                title: 'Simple handovers',
                copy: 'Choose collection or drop-off options with automated reminders to keep both parties on track.'
              },
              {
                title: 'Impact insights',
                copy: 'Track kilograms diverted from landfill and unlock achievements that celebrate consistent giving.'
              },
              {
                title: 'Community trust',
                copy: 'Verification badges, ratings, and messaging tools build safer exchanges and lasting relationships.'
              }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/60 bg-background/70 p-5 shadow-sm">
                <h4 className="text-lg font-semibold text-foreground">{item.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-6 rounded-3xl border border-border/60 bg-card/60 p-8 shadow-sm backdrop-blur">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <HandHeart size={26} />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Community stories</p>
                <h3 className="text-2xl font-semibold text-foreground">Loved by givers and collectors</h3>
              </div>
            </div>
            <div className="space-y-5 text-sm text-muted-foreground">
              <figure className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-5 shadow-sm">
                <blockquote>
                  “I listed a spare cot and within an hour a family nearby arranged collection. Seeing the carbon savings is the cherry on top.”
                </blockquote>
                <figcaption className="font-medium text-foreground">Amelia • Clapton</figcaption>
              </figure>
              <figure className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-5 shadow-sm">
                <blockquote>
                  “Partnering with TruCycle has doubled donations to our repair café. The drop-off planning tool keeps everything organised.”
                </blockquote>
                <figcaption className="font-medium text-foreground">Joseph • Brixton Repair Hub</figcaption>
              </figure>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-6 text-sm text-emerald-700">
            <p className="font-medium text-emerald-800">Ready to make your next swap?</p>
            <p className="mt-2">
              Join thousands of Londoners extending the life of items. Every exchange keeps resources in circulation.
            </p>
            <Button className="mt-4" variant="secondary" onClick={onStartListing}>
              Start your next listing or donation
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-background via-blue-500/5 to-primary/10 p-8 shadow-lg">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                <ChatCircle size={26} />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Stay connected</p>
                <h3 className="text-2xl font-semibold text-foreground">Conversations that keep exchanges on track</h3>
              </div>
            </div>
            <p className="text-muted-foreground">
              Coordinate collections, share delivery updates, and receive nudges when it&apos;s time to follow up. Instant messaging keeps donors and collectors aligned every step of the way.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={onOpenMessages}>Open message centre</Button>
              <Button variant="outline" onClick={onViewImpact}>
                View my impact
              </Button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-background/80 p-6 shadow-inner">
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" aria-hidden="true" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Recycle size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today 14:10</p>
                  <p className="font-semibold text-foreground">Pickup confirmed with Joseph</p>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground shadow-sm">
                “Great! I&apos;ll be there around 6pm. Let me know if you need help carrying the desk.”
              </div>
              <div className="rounded-xl border border-border/60 bg-primary/5 p-4 text-sm text-foreground shadow-sm">
                “Thanks Joseph! Looking forward to meeting you. I&apos;ll share the carbon impact afterwards.”
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
