import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowsClockwise,
  Heart,
  Recycle,
  Storefront,
  Truck,
} from '@phosphor-icons/react'

type ListingIntent = 'exchange' | 'donate' | 'recycle'
type FulfillmentChoice = 'pickup' | 'dropoff'

const INTENT_CONFIG: Record<ListingIntent, { title: string; description: string; icon: JSX.Element }> = {
  donate: {
    title: 'Donate to the community',
    description: 'Perfect for items that still have plenty of life left. We will help you plan a trusted drop-off.',
    icon: <Heart size={18} className="text-rose-500" />,
  },
  exchange: {
    title: 'Exchange with a neighbour',
    description: 'Share high-value items or swap for something new. Messaging and QR codes keep things safe.',
    icon: <ArrowsClockwise size={18} className="text-blue-500" />,
  },
  recycle: {
    title: 'Recycle responsibly',
    description: 'Divert broken or end-of-life items from landfill with certified partners and clear guidance.',
    icon: <Recycle size={18} className="text-emerald-500" />,
  },
}

interface ListingQuickStartDialogProps {
  open: boolean
  defaultIntent?: ListingIntent
  defaultFulfillment?: FulfillmentChoice
  onOpenChange: (open: boolean) => void
  onContinue: (options: {
    intent: ListingIntent
    fulfillment: FulfillmentChoice
    notes?: string
    preferPartnerSupport?: boolean
  }) => void
}

export function ListingQuickStartDialog({
  open,
  defaultIntent = 'donate',
  defaultFulfillment,
  onOpenChange,
  onContinue,
}: ListingQuickStartDialogProps) {
  const [intent, setIntent] = useState<ListingIntent>(defaultIntent)
  const [fulfillment, setFulfillment] = useState<FulfillmentChoice>(defaultFulfillment ?? (defaultIntent === 'donate' ? 'dropoff' : 'pickup'))
  const [notes, setNotes] = useState('')
  const [preferPartnerSupport, setPreferPartnerSupport] = useState(defaultIntent === 'donate')

  useEffect(() => {
    if (!open) return
    setIntent(defaultIntent)
    setFulfillment(defaultFulfillment ?? (defaultIntent === 'donate' ? 'dropoff' : 'pickup'))
    setNotes('')
    setPreferPartnerSupport(defaultIntent === 'donate')
  }, [open, defaultIntent, defaultFulfillment])

  const fulfillmentOptions = useMemo(() => {
    return [
      {
        value: 'dropoff' as FulfillmentChoice,
        title: 'Drop-off with partner support',
        description: 'Hand the item to a TruCycle partner shop. They will verify the QR code and manage the handover.',
        icon: <Storefront size={18} className="text-emerald-600" />,
      },
      {
        value: 'pickup' as FulfillmentChoice,
        title: 'Arrange a direct pickup',
        description: 'Coordinate with the collector. We will provide messaging templates and QR codes for secure exchange.',
        icon: <Truck size={18} className="text-slate-600" />,
      },
    ]
  }, [])

  const handleContinue = () => {
    onContinue({ intent, fulfillment, notes: notes.trim() || undefined, preferPartnerSupport })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-2">
          <Badge variant="secondary" className="self-start uppercase tracking-widest text-xs">Quick start</Badge>
          <DialogTitle className="text-h3">Let&apos;s set up your next listing</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Choose what you&apos;d like to do and we&apos;ll pre-fill the listing form with the right options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <section className="space-y-3">
            <Label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">What brings you here?</Label>
            <RadioGroup
              value={intent}
              onValueChange={(value) => setIntent(value as ListingIntent)}
              className="grid gap-3 md:grid-cols-3"
            >
              {Object.entries(INTENT_CONFIG).map(([value, config]) => (
                <Card
                  key={value}
                  className={`transition hover:border-primary/40 ${intent === value ? 'border-primary bg-primary/5 shadow-sm' : ''}`}
                >
                  <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-primary">{config.icon}</div>
                    <CardTitle className="text-base">{config.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                    <RadioGroupItem value={value} id={`intent-${value}`} className="sr-only" />
                    <Label htmlFor={`intent-${value}`} className="cursor-pointer text-sm font-medium text-primary">
                      {intent === value ? 'Selected' : 'Choose this'}
                    </Label>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </section>

          <section className="space-y-4">
            <Label className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">How should we handle the handover?</Label>
            <div className="grid gap-4 md:grid-cols-2">
              {fulfillmentOptions.map((option) => {
                const isSelected = fulfillment === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFulfillment(option.value)}
                    className={`flex h-full flex-col gap-3 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-primary">
                      {option.icon}
                      <span className="font-semibold">{option.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <Label htmlFor="listing-notes" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Anything we should know?
            </Label>
            <Textarea
              id="listing-notes"
              placeholder="Optional: add context, access notes, or partner preferences."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[96px]"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={preferPartnerSupport}
                onChange={(event) => setPreferPartnerSupport(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              I&apos;d like recommendations for the best partner hubs nearby.
            </label>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              You can fine-tune every detail on the next screen – we&apos;ll carry these choices forward.
            </p>
            <Button onClick={handleContinue} className="sm:w-auto">
              Continue to full listing form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

