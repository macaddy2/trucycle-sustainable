import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { QrCode, CheckCircle, Clock, UserCircle, ArrowClockwise } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

interface PartnerScanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ScanMode = 'dropoff' | 'pickup'

interface ScanRecord {
  id: string
  mode: ScanMode
  reference: string
  notes?: string
  staff?: string
  scannedAt: string
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `scan-${Date.now()}-${Math.round(Math.random() * 1e6)}`
}

export function PartnerScanModal({ open, onOpenChange }: PartnerScanModalProps) {
  const [mode, setMode] = useState<ScanMode>('dropoff')
  const [input, setInput] = useState('')
  const [notes, setNotes] = useState('')
  const [staff, setStaff] = useState('')
  const [history, setHistory] = useKV<ScanRecord[]>('partner-scan-history', [])

  const summary = useMemo(() => {
    const total = history.length
    const dropoffs = history.filter(record => record.mode === 'dropoff').length
    const pickups = total - dropoffs
    return { total, dropoffs, pickups }
  }, [history])

  const handleScan = () => {
    const value = input.trim()
    if (!value) {
      toast.error('Enter or paste QR data to continue')
      return
    }

    const record: ScanRecord = {
      id: generateId(),
      mode,
      reference: value.slice(0, 64),
      notes: notes.trim() || undefined,
      staff: staff.trim() || undefined,
      scannedAt: new Date().toISOString(),
    }

    setHistory(prev => [record, ...prev].slice(0, 25))
    toast.success(mode === 'dropoff' ? 'Drop-off recorded' : 'Pickup confirmed')
    setInput('')
    setNotes('')
  }

  const handleClearHistory = () => {
    setHistory([])
    toast.info('Scan history cleared')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-h3">
            <QrCode size={24} className="text-primary" />
            Scan drop-offs & pickups
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
          <div className="space-y-5">
            <Tabs value={mode} onValueChange={value => setMode(value as ScanMode)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="dropoff">Drop-off</TabsTrigger>
                <TabsTrigger value="pickup">Pickup</TabsTrigger>
              </TabsList>
              <TabsContent value="dropoff" className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="dropoff-scan">
                    QR payload or manual code
                  </label>
                  <Input
                    id="dropoff-scan"
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    placeholder='{ "transactionId": "..." }'
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="scan-notes">
                      Shop notes (optional)
                    </label>
                    <Textarea
                      id="scan-notes"
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                      placeholder="Condition, packaging, or special observations"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="scan-staff">
                      Staff on duty
                    </label>
                    <Input
                      id="scan-staff"
                      value={staff}
                      onChange={event => setStaff(event.target.value)}
                      placeholder="Name for audit trail"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="pickup" className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="pickup-scan">
                    QR payload or manual code
                  </label>
                  <Input
                    id="pickup-scan"
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    placeholder='{ "transactionId": "..." }'
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="pickup-notes">
                      Release notes (optional)
                    </label>
                    <Textarea
                      id="pickup-notes"
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                      placeholder="Collector verified ID, packaging, etc."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="pickup-staff">
                      Staff on duty
                    </label>
                    <Input
                      id="pickup-staff"
                      value={staff}
                      onChange={event => setStaff(event.target.value)}
                      placeholder="Name for audit trail"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleScan}>
                <CheckCircle size={18} className="mr-2" />
                Confirm {mode === 'dropoff' ? 'drop-off' : 'pickup'}
              </Button>
              <Button variant="outline" onClick={handleClearHistory}>
                <ArrowClockwise size={18} className="mr-2" />
                Clear history
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Today&apos;s summary</h3>
              <Badge variant="outline">{summary.total} scans</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-background p-3 text-center">
                <p className="text-xs uppercase text-muted-foreground">Drop-offs</p>
                <p className="text-lg font-semibold text-foreground">{summary.dropoffs}</p>
              </div>
              <div className="rounded-xl bg-background p-3 text-center">
                <p className="text-xs uppercase text-muted-foreground">Pickups</p>
                <p className="text-lg font-semibold text-foreground">{summary.pickups}</p>
              </div>
              <div className="rounded-xl bg-background p-3 text-center">
                <p className="text-xs uppercase text-muted-foreground">Mode</p>
                <p className="text-lg font-semibold text-primary">{mode === 'dropoff' ? 'Drop-off' : 'Pickup'}</p>
              </div>
            </div>
            <Separator />
            <ScrollArea className="h-64">
              {history.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <Clock size={20} />
                  <p>No scans recorded yet today.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(record => (
                    <div key={record.id} className="rounded-xl bg-background p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={record.mode === 'dropoff' ? 'secondary' : 'outline'}>
                            {record.mode === 'dropoff' ? 'Drop-off' : 'Pickup'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {record.staff && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserCircle size={14} />
                            {record.staff}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-foreground">{record.reference}</p>
                      {record.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{record.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
