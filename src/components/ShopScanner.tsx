import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { QrCode, Scan, Package, User, MapPin, CheckCircle, X, ArrowRight, Clock, ShieldCheck } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import { kvGet, kvSet } from '@/lib/kvStore'

interface QRCodeData {
  id: string
  type: 'donor' | 'collector'
  itemId: string
  itemTitle: string
  userId: string
  userName: string
  transactionId: string
  dropOffLocation?: string
  metadata: {
    category: string
    condition: string
    estimatedWeight?: number
    co2Impact: number
    createdAt: string
    expiresAt: string
  }
  status: 'active' | 'scanned' | 'expired' | 'completed'
}

interface ScannedTransaction {
  qrData: QRCodeData
  scannedAt: string
  shopNotes?: string
  shopAttendant?: string
}

export function ShopScanner() {
  const [scanInput, setScanInput] = useState('')
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [shopNotes, setShopNotes] = useState('')
  const [attendantName, setAttendantName] = useState('')
  
  // Shop transaction history
  const [shopTransactions, setShopTransactions] = useKV<ScannedTransaction[]>('shop-transactions', [])

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleConfirmTransaction = async () => {
    if (!scannedData || !attendantName.trim()) {
      toast.error('Please enter attendant name')
      return
    }

    try {
      // Update QR code status in global registry
      const globalQRCodes = await kvGet<QRCodeData[]>('global-qr-codes') || []
      const updatedQRCodes = globalQRCodes.map(qr => 
        qr.transactionId === scannedData.transactionId 
          ? { 
              ...qr, 
              status: (scannedData.type === 'donor' ? 'scanned' : 'completed') as const 
            }
          : qr
      )
      await kvSet('global-qr-codes', updatedQRCodes)

      // Record transaction in shop history
      const transaction: ScannedTransaction = {
        qrData: scannedData,
        scannedAt: new Date().toISOString(),
        shopNotes: shopNotes.trim() || undefined,
        shopAttendant: attendantName.trim()
      }

      setShopTransactions(prev => [transaction, ...prev])

      // Send notification to relevant users (in real app, this would be through the notification system)
      if (scannedData.type === 'donor') {
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-80 w-80 translate-x-1/3 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 translate-y-1/3 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-emerald-300">
                <ShieldCheck size={24} />
                <span className="text-xs uppercase tracking-[0.4em]">Partner shop console</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">TruCycle Shop Scanner</h1>
                <p className="max-w-2xl text-base text-slate-200">
                  Welcome your neighbours, verify their QR code, and keep the circular economy flowing with fast drop-off and pickup processing.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1">
                  <QrCode size={16} className="text-emerald-300" />
                  Secure QR validation
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1">
                  <Package size={16} className="text-cyan-300" />
                  Real-time item status
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1">
                  <Clock size={16} className="text-slate-200" />
                  72h QR expiry reminders
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 text-sm text-slate-200 lg:w-64 lg:items-end">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-left shadow-inner lg:text-right">
                <span className="text-xs uppercase tracking-[0.3em] text-emerald-300">Today</span>
                <p className="mt-2 text-lg font-semibold text-white">
                  {totalTransactions} transaction{totalTransactions === 1 ? '' : 's'}
                </p>
                <p className="text-xs text-slate-300">
                  Drop-offs {dropOffCount} · Pickups {pickupCount}
                </p>
              </div>
              {latestTransaction && (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-xs text-slate-300">
                  <p className="uppercase tracking-[0.2em] text-slate-400">Last processed</p>
                  <p className="mt-1 text-sm font-medium text-white">{latestTransaction.qrData.itemTitle}</p>
                  <p>{formatDateTime(latestTransaction.scannedAt)}</p>
                </div>
              )}
              <Button
                variant="secondary"
                onClick={() => (window.location.href = window.location.pathname)}
                className="self-start rounded-full px-6 py-2 font-medium text-slate-900 shadow lg:self-end"
              >
                Back to main app
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
            <CardHeader className="border-b border-white/10 pb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl font-semibold text-white">Scan & verify</CardTitle>
                  <p className="mt-1 text-sm text-slate-300">
                    Accept drop-offs or release collections in seconds.
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  Live shift
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Scan size={20} />
                  <span>Keep QR codes within view of the scanner — they refresh every 72 hours.</span>
                </div>
                <div className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-1 text-xs uppercase tracking-widest">
                  Verified network
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">Shop attendant on duty</label>
                  <Input
                    placeholder="Enter your name..."
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                    className="border-white/20 bg-black/40 text-slate-100 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-300/40"
                  />
                </div>
                <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-4 text-xs text-slate-300">
                  <p className="font-semibold text-slate-200">Shift log</p>
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
                      <label className="text-sm font-medium text-slate-200">QR code data</label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          placeholder="Scan or paste QR code data..."
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          className="flex-1 border-white/20 bg-black/40 text-slate-100 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-300/40"
                        />
                        <Button
                          onClick={handleManualScan}
                          disabled={isProcessing || !scanInput.trim()}
                          className="sm:w-auto"
                        >
                          {isProcessing ? 'Processing…' : 'Scan now'}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400">
                        Paste the JSON string provided by the TruCycle scanner or use the upload option.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-sm text-slate-300">
                      <p className="text-sm font-medium text-white">Smooth handover checklist</p>
                      <div className="mt-3 space-y-3">
                        <div className="flex items-start gap-3">
                          <ArrowRight size={16} className="mt-1 text-emerald-300" />
                          <p>Welcome the neighbour and confirm their item matches the QR details.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <ArrowRight size={16} className="mt-1 text-emerald-300" />
                          <p>Check the item condition quickly — flag anything unusual in the notes.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <ArrowRight size={16} className="mt-1 text-emerald-300" />
                          <p>Submit the transaction to notify both parties instantly.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-black/40 p-6 text-center">
                    <p className="text-sm text-slate-300">Prefer to upload a QR code image?</p>
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
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full px-6 py-2 text-slate-900"
                    >
                      Upload image
                    </Button>
                    <p className="text-xs text-slate-400">Supports PNG or JPEG exports from the TruCycle kiosk scanner.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                    <Badge
                      variant={scannedData.type === 'donor' ? 'default' : 'secondary'}
                      className="rounded-full px-4 py-1 text-sm capitalize"
                    >
                      {scannedData.type === 'donor' ? 'Item drop-off' : 'Item pickup'}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Clock size={14} />
                      <span>{formatExpiryCountdown(scannedData.metadata.expiresAt)}</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Transaction ID</p>
                      <p className="mt-2 font-mono text-sm text-white">{scannedData.transactionId}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Item</p>
                      <p className="mt-2 text-sm font-medium text-white">{scannedData.itemTitle}</p>
                      <p className="text-xs text-slate-400 capitalize">
                        {scannedData.metadata.category} · {scannedData.metadata.condition}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Neighbour</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-white">
                        <User size={16} /> {scannedData.userName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {scannedData.type === 'donor' ? 'Dropping off for community reuse' : 'Collecting their reservation'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Impact</p>
                      <p className="mt-2 text-sm font-medium text-emerald-300">
                        -{scannedData.metadata.co2Impact} kg CO₂e
                      </p>
                      {scannedData.dropOffLocation && (
                        <p className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                          <MapPin size={14} />
                          {scannedData.dropOffLocation}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200">Shop notes (optional)</label>
                    <Textarea
                      placeholder="Capture condition details, storage location, or follow-up actions..."
                      value={shopNotes}
                      onChange={(e) => setShopNotes(e.target.value)}
                      rows={3}
                      className="border-white/20 bg-black/40 text-slate-100 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-300/40"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={handleConfirmTransaction}
                      className="flex-1 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                      disabled={!attendantName.trim()}
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Confirm {scannedData.type === 'donor' ? 'item received' : 'item released'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelScan}
                      className="border-white/20 bg-black/40 text-slate-100 hover:bg-black/50"
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
            <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Quick start checklist</CardTitle>
                <CardDescription className="text-slate-300">
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
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{step.title}</p>
                      <p className="text-xs text-slate-300">{step.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">Impact snapshot</CardTitle>
                <CardDescription className="text-slate-300">
                  Celebrate the climate wins your shop creates with every processed item.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Drop-offs</p>
                    <p className="mt-2 text-lg font-semibold text-white">{dropOffCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400">Pickups</p>
                    <p className="mt-2 text-lg font-semibold text-white">{pickupCount}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">CO₂ saved this shift</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-300">
                    -{totalCarbon.toFixed(1)} kg
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 p-4 text-xs text-slate-300">
                  <p>
                    Share these numbers with visitors to build trust and encourage more sustainable exchanges.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <CardHeader className="border-b border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl font-semibold text-white">Recent transactions</CardTitle>
              <Badge variant="outline" className="border-white/20 bg-white/5 px-4 py-1 text-slate-200">
                {totalTransactions} today
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {shopTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-black/40 p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                  <Package size={28} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium text-white">No transactions yet today</p>
                <p className="text-xs text-slate-300">Process your first drop-off or pickup to see it appear here instantly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shopTransactions.slice(0, 10).map((transaction, index) => {
                  const isDropOff = transaction.qrData.type === 'donor'
                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${isDropOff ? 'bg-emerald-500/20 text-emerald-200' : 'bg-cyan-500/20 text-cyan-200'}`}
                        >
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{transaction.qrData.itemTitle}</p>
                          <p className="text-xs text-slate-300">
                            {transaction.qrData.userName} • {transaction.qrData.transactionId}
                          </p>
                          <p className="text-xs text-slate-400">
                            Attendant: {transaction.shopAttendant || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 text-xs text-slate-300 sm:items-end">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{formatDateTime(transaction.scannedAt)}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                          <CheckCircle size={12} />
                          Processed
                        </span>
                        <span className="text-[11px] text-emerald-200">
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
