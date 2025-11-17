import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { QrCode, Scan, Package, User, MapPin, CheckCircle, X, ArrowRight, Clock, ShieldCheck } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import { kvGet, kvSet } from '@/lib/kvStore'
import { useExchangeManager } from '@/hooks'
import type { ManagedListing } from '@/types/listings'
import type { QRCodeData } from './QRCode'

interface ScannedTransaction {
  qrData: QRCodeData
  scannedAt: string
  shopNotes?: string
  shopAttendant?: string
  stage: 'dropoff' | 'collection'
}

interface ShopScannerProps {
  onClose?: () => void
}

export function ShopScanner({ onClose }: ShopScannerProps = {}) {
  const [scanInput, setScanInput] = useState('')
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [shopNotes, setShopNotes] = useState('')
  const [attendantName, setAttendantName] = useState('')

  // Shop transaction history
  const [shopTransactions, setShopTransactions] = useKV<ScannedTransaction[]>('shop-transactions', [])
  const [, setUserListings] = useKV<ManagedListing[]>('user-listings', [])
  const [, setGlobalListings] = useKV<ManagedListing[]>('global-listings', [])
  const [, setUserQrCodes] = useKV<QRCodeData[]>('user-qr-codes', [])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { completeClaimRequest, getRequestsForItem } = useExchangeManager()

  const totalTransactions = shopTransactions.length
  const dropOffCount = shopTransactions.filter(transaction => transaction.qrData.type === 'donor').length
  const pickupCount = totalTransactions - dropOffCount
  const totalCarbon = shopTransactions.reduce((sum, transaction) => sum + (transaction.qrData.metadata.co2Impact ?? 0), 0)
  const latestTransaction = shopTransactions[0]

  const handleManualScan = async () => {
    if (!scanInput.trim()) {
      toast.error('Please enter QR code data')
      return
    }

    await processQRCode(scanInput)
  }

  const processQRCode = async (qrCodeString: string) => {
    setIsProcessing(true)
    try {
      const qrData = JSON.parse(qrCodeString)
      
      // Verify the QR code exists in global registry
      const globalQRCodes = await kvGet<QRCodeData[]>('global-qr-codes') || []
      const foundQR = globalQRCodes.find(qr => qr.transactionId === qrData.transactionId)

      if (!foundQR) {
        toast.error('Invalid QR code - transaction not found')
        return
      }

      if (new Date() > new Date(foundQR.metadata.expiresAt)) {
        toast.error('QR code has expired')
        return
      }

      if (foundQR.status === 'completed') {
        toast.error('This transaction has already been completed')
        return
      }

      setScannedData(foundQR)
      toast.success('QR code scanned successfully')
    } catch (error) {
      console.error('Failed to parse QR code', error)
      toast.error('Invalid QR code format')
    } finally {
      setIsProcessing(false)
    }
  }

  const applyListingPatch = useCallback((itemId: string, patch: Partial<ManagedListing>) => {
    if (!itemId) return
    setUserListings(prev => prev.map(listing => listing.id === itemId ? { ...listing, ...patch } : listing))
    setGlobalListings(prev => prev.map(listing => listing.id === itemId ? { ...listing, ...patch } : listing))
  }, [setUserListings, setGlobalListings])

  const finalizeClaimForItem = useCallback((itemId: string) => {
    if (!itemId) return
    const requests = getRequestsForItem(itemId)
    const target = requests.find((request) => request.status === 'approved')
      || requests.find((request) => request.status === 'pending')
    if (target) {
      completeClaimRequest(target.id)
    }
  }, [getRequestsForItem, completeClaimRequest])

  const syncUserQrCodes = useCallback((transactionId: string, stage: 'dropoff' | 'collection') => {
    if (!transactionId) return
    setUserQrCodes(prev => prev.map((qr) => {
      if (qr.transactionId !== transactionId) return qr
      if (stage === 'dropoff') {
        return qr.type === 'donor' ? { ...qr, status: 'scanned' as const } : qr
      }
      return { ...qr, status: 'completed' as const }
    }))
  }, [setUserQrCodes])

  const handleConfirmTransaction = async () => {
    if (!scannedData || !attendantName.trim()) {
      toast.error('Please enter attendant name')
      return
    }

    try {
      // Update QR code status in global registry
      const globalQRCodes = await kvGet<QRCodeData[]>('global-qr-codes') || []
      const stage: 'dropoff' | 'collection' = scannedData.type === 'donor' ? 'dropoff' : 'collection'
      const updatedQRCodes = globalQRCodes.map(qr => {
        if (qr.transactionId !== scannedData.transactionId) return qr
        if (stage === 'dropoff') {
          return qr.type === 'donor'
            ? { ...qr, status: 'scanned' as const }
            : qr
        }
        return { ...qr, status: 'completed' as const }
      })
      await kvSet('global-qr-codes', updatedQRCodes)
      syncUserQrCodes(scannedData.transactionId, stage)

      // Record transaction in shop history
      const transaction: ScannedTransaction = {
        qrData: scannedData,
        scannedAt: new Date().toISOString(),
        shopNotes: shopNotes.trim() || undefined,
        shopAttendant: attendantName.trim(),
        stage,
      }

      setShopTransactions(prev => [transaction, ...prev])

      if (stage === 'dropoff') {
        applyListingPatch(scannedData.itemId, { status: 'active' })
      } else {
        const completionTimestamp = new Date().toISOString()
        applyListingPatch(scannedData.itemId, {
          status: 'collected',
          claimStatus: 'completed',
          claimCompletedAt: completionTimestamp,
        })
        finalizeClaimForItem(scannedData.itemId)
      }

      // Send notification to relevant users (in real app, this would be through the notification system)
      if (stage === 'dropoff') {
        toast.success('Item received! Collector will be notified.')
      } else {
        toast.success('Item released to collector!')
      }

      // Reset form
      setScannedData(null)
      setScanInput('')
      setShopNotes('')
      setAttendantName('')
    } catch (error) {
      console.error('Failed to process transaction', error)
      toast.error('Failed to process transaction')
    }
  }

  const handleCancelScan = () => {
    setScannedData(null)
    setScanInput('')
    setShopNotes('')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' +
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatExpiryCountdown = (expiresAt: string) => {
    const expiry = new Date(expiresAt).getTime()
    const diff = expiry - Date.now()
    if (diff <= 0) return 'Expired'

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'} remaining`
    }

    if (hours > 0) {
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m remaining`
    }

    return `${minutes}m remaining`
  }

  const handleExit = () => {
    if (onClose) {
      onClose()
    } else {
      window.location.href = window.location.pathname
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-primary">
                <ShieldCheck size={24} />
                <span className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Partner shop console</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">TruCycle Shop Scanner</h1>
                <p className="max-w-2xl text-base text-muted-foreground">
                  Welcome your neighbours, verify their QR code, and keep the circular economy flowing with fast drop-off and pickup processing.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1">
                  <QrCode size={16} className="text-primary" />
                  Secure QR validation
                </span>
                <span className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1">
                  <Package size={16} className="text-sky-500" />
                  Real-time item status
                </span>
                <span className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1">
                  <Clock size={16} className="text-amber-500" />
                  72h QR expiry reminders
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 text-sm text-muted-foreground lg:w-64 lg:items-end">
              <div className="rounded-2xl border border-border bg-background px-5 py-4 text-left shadow-sm lg:text-right">
                <span className="text-xs uppercase tracking-[0.3em] text-primary">Today</span>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {totalTransactions} transaction{totalTransactions === 1 ? '' : 's'}
                </p>
                <p className="text-xs">Drop-offs {dropOffCount} · Pickups {pickupCount}</p>
              </div>
              {latestTransaction && (
                <div className="rounded-2xl border border-border bg-background px-5 py-4 text-xs">
                  <p className="uppercase tracking-[0.2em] text-muted-foreground">Last processed</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{latestTransaction.qrData.itemTitle}</p>
                  <p>{formatDateTime(latestTransaction.scannedAt)}</p>
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleExit}
                className="self-start rounded-full px-6 py-2 font-medium lg:self-end"
              >
                Exit scanner
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="shadow-lg">
            <CardHeader className="border-b border-border pb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl font-semibold text-foreground">Scan & verify</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Accept drop-offs or release collections in seconds.
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                  Live shift
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-primary sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Scan size={20} />
                  <span>Keep QR codes within view of the scanner — they refresh every 72 hours.</span>
                </div>
                <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs uppercase tracking-widest text-primary">
                  Verified network
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Shop attendant on duty</label>
                  <Input
                    placeholder="Enter your name..."
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/40"
                  />
                </div>
                <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Shift log</p>
                  <p className="mt-1">
                    {attendantName
                      ? `Thanks, ${attendantName}. Every confirmed QR code will be tagged with your name.`
                      : 'Enter your name to tag each processed QR code for accountability.'}
                  </p>
                </div>
              </div>

              {!scannedData ? (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,0.9fr)]">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">QR code data</label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          placeholder="Scan or paste QR code data..."
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          className="flex-1 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/40"
                        />
                        <Button
                          onClick={handleManualScan}
                          disabled={isProcessing || !scanInput.trim()}
                          className="sm:w-auto"
                        >
                          {isProcessing ? 'Processing…' : 'Scan now'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paste the JSON string provided by the TruCycle scanner or use the upload option.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-border bg-muted p-5 text-sm text-muted-foreground">
                      <p className="text-sm font-medium text-foreground">Smooth handover checklist</p>
                      <div className="mt-3 space-y-3">
                        <div className="flex items-start gap-3">
                          <ArrowRight size={16} className="mt-1 text-primary" />
                          <p>Welcome the neighbour and confirm their item matches the QR details.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <ArrowRight size={16} className="mt-1 text-primary" />
                          <p>Check the item condition quickly — flag anything unusual in the notes.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <ArrowRight size={16} className="mt-1 text-primary" />
                          <p>Submit the transaction to notify both parties instantly.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted p-6 text-center">
                    <p className="text-sm text-muted-foreground">Prefer to upload a QR code image?</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          toast.info('QR code image upload would be processed here (requires QR reader library)')
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full px-6 py-2"
                    >
                      Upload image
                    </Button>
                    <p className="text-xs text-muted-foreground">Supports PNG or JPEG exports from the TruCycle kiosk scanner.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4">
                    <Badge
                      variant={scannedData.type === 'donor' ? 'default' : 'secondary'}
                      className="rounded-full px-4 py-1 text-sm capitalize"
                    >
                      {scannedData.type === 'donor' ? 'Item drop-off' : 'Item pickup'}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={14} />
                      <span>{formatExpiryCountdown(scannedData.metadata.expiresAt)}</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Transaction ID</p>
                      <p className="mt-2 font-mono text-sm text-foreground">{scannedData.transactionId}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Item</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{scannedData.itemTitle}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {scannedData.metadata.category} · {scannedData.metadata.condition}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Neighbour</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                        <User size={16} /> {scannedData.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scannedData.type === 'donor' ? 'Dropping off for community reuse' : 'Collecting their reservation'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Impact</p>
                      <p className="mt-2 text-sm font-medium text-primary">
                        -{scannedData.metadata.co2Impact} kg CO₂e
                      </p>
                      {scannedData.dropOffLocation && (
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin size={14} />
                          {scannedData.dropOffLocation}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Shop notes (optional)</label>
                    <Textarea
                      placeholder="Capture condition details, storage location, or follow-up actions..."
                      value={shopNotes}
                      onChange={(e) => setShopNotes(e.target.value)}
                      rows={3}
                      className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/40"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={handleConfirmTransaction}
                      className="flex-1"
                      disabled={!attendantName.trim()}
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Confirm {scannedData.type === 'donor' ? 'item received' : 'item released'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelScan}
                      className="border-border"
                    >
                      <X size={16} className="mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Quick start checklist</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Guide volunteers through each QR interaction and deliver a polished shop experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: 'Greet & verify',
                    description: 'Confirm the neighbour\'s item and match it to the QR code details.',
                  },
                  {
                    title: 'Quality glance',
                    description: 'Check the condition quickly and note anything unusual before storing.',
                  },
                  {
                    title: 'Complete the handover',
                    description: 'Submit the transaction so both parties receive instant notifications.',
                  },
                ].map((step, index) => (
                  <div key={step.title} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Impact snapshot</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Celebrate the climate wins your shop creates with every processed item.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Drop-offs</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{dropOffCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Pickups</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{pickupCount}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">CO₂ saved this shift</p>
                  <p className="mt-2 text-lg font-semibold text-primary">
                    -{totalCarbon.toFixed(1)} kg
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-xs text-muted-foreground">
                  <p>
                    Share these numbers with visitors to build trust and encourage more sustainable exchanges.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl font-semibold text-foreground">Recent transactions</CardTitle>
              <Badge variant="outline" className="border-border px-4 py-1 text-muted-foreground">
                {totalTransactions} today
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {shopTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Package size={28} className="text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No transactions yet today</p>
                <p className="text-xs text-muted-foreground">Process your first drop-off or pickup to see it appear here instantly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shopTransactions.slice(0, 10).map((transaction, index) => {
                  const isDropOff = transaction.qrData.type === 'donor'
                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${isDropOff ? 'bg-primary/10 text-primary' : 'bg-sky-100 text-sky-600'}`}
                        >
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{transaction.qrData.itemTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.qrData.userName} • {transaction.qrData.transactionId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Attendant: {transaction.shopAttendant || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground sm:items-end">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{formatDateTime(transaction.scannedAt)}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                          <CheckCircle size={12} />
                          Processed
                        </span>
                        <span className="text-[11px] text-primary">
                          -{transaction.qrData.metadata.co2Impact} kg CO₂e
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
