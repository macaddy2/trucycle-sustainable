import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { QrCode, CheckCircle, Clock, UserCircle, ArrowClockwise, Camera } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import { getItemById, qrClaimOut, qrDropoffIn, qrViewItem } from '@/lib/api'
import jsQR from 'jsqr'

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

  // Camera scanning state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Selected item state
  const [itemId, setItemId] = useState<string | null>(null)
  const [itemView, setItemView] = useState<any | null>(null)
  const [itemDetails, setItemDetails] = useState<any | null>(null)

  const summary = useMemo(() => {
    const total = history.length
    const dropoffs = history.filter(record => record.mode === 'dropoff').length
    const pickups = total - dropoffs
    return { total, dropoffs, pickups }
  }, [history])

  const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/

  const extractItemId = (payload: string): string | null => {
    const match = payload.match(UUID_RE)
    if (match) return match[0]
    // Accept raw payloads like "QR:ITEM:<id>" as a fallback
    const parts = payload.split(':')
    const maybeId = parts[parts.length - 1]
    return UUID_RE.test(maybeId) ? maybeId : null
  }

  const fetchItem = useCallback(async (id: string) => {
    try {
      const [viewRes, itemRes] = await Promise.all([
        qrViewItem(id),
        getItemById(id).catch(() => undefined),
      ])
      setItemView(viewRes?.data ?? null)
      setItemDetails((itemRes as any)?.data ?? null)
      setItemId(id)
    } catch (err: any) {
      console.error('Failed to fetch item context', err)
      toast.error(err?.message || 'Unable to fetch item details')
    }
  }, [])

  // Auto-search when input is long enough (>= UUID length)
  useEffect(() => {
    const val = input.trim()
    if (!val) return
    if (val.length >= 'e4b9e53a-6e1b-41f6-9fae-8cab35a059a3'.length) {
      const id = extractItemId(val)
      if (id && id !== itemId) {
        fetchItem(id)
      }
    }
  }, [input, fetchItem])

  // Camera and scanning setup on open
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function init() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices || !navigator.mediaDevices?.getUserMedia) {
          setScanError('Camera not supported in this browser')
          return
        }
        const devices = await navigator.mediaDevices.enumerateDevices()
        const vids = devices.filter(d => d.kind === 'videoinput')
        setCameras(vids)
        const preferred = selectedCameraId || vids[0]?.deviceId
        if (preferred) {
          const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: preferred } } })
          if (cancelled) return
          setStream(s)
          if (videoRef.current) {
            videoRef.current.srcObject = s
            await videoRef.current.play().catch(() => {})
          }
        }
      } catch (err: any) {
        console.error('Failed to init camera', err)
        setScanError(err?.message || 'Unable to access camera')
      }
    }
    init()
    return () => {
      cancelled = true
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
      setStream(null)
      setScanning(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCameraId])

  const switchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId)
  }

  // QR detection: BarcodeDetector with jsQR fallback
  useEffect(() => {
    if (!open) return
    let running = true
    const tryScan = async () => {
      if (!running || !videoRef.current) return
      const video = videoRef.current
      // Prefer native BarcodeDetector
      const Detector = (window as any).BarcodeDetector
      if (Detector) {
        try {
          const detector = new Detector({ formats: ['qr_code'] })
          setScanning(true)
          const codes = await detector.detect(video as any)
          if (codes && codes.length > 0) {
            const value = codes[0]?.rawValue
            if (value && value !== input) setInput(String(value))
          }
        } catch {
          // fall through to jsQR
        }
      }
      // jsQR fallback
      try {
        const vw = video.videoWidth
        const vh = video.videoHeight
        if (vw && vh) {
          const canvas = canvasRef.current || document.createElement('canvas')
          canvasRef.current = canvas
          canvas.width = vw
          canvas.height = vh
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, vw, vh)
            const imageData = ctx.getImageData(0, 0, vw, vh)
            const result = jsQR(
              imageData.data as unknown as Uint8ClampedArray,
              vw,
              vh,
              { inversionAttempts: 'attemptBoth' }
            )
            const value = result?.data
            if (value && value !== input) setInput(value)
          }
        }
      } catch {
        // ignore
      }
      if (running) setTimeout(tryScan, 350)
    }
    setScanning(true)
    tryScan()
    return () => {
      running = false
      setScanning(false)
    }
  }, [open, input])

  const handleConfirm = async () => {
    const val = input.trim()
    const id = itemId || extractItemId(val)
    if (!id) {
      toast.error('Scan or enter a valid QR/item id')
      return
    }
    try {
      if (mode === 'dropoff') {
        const res = await qrDropoffIn(id, { notes: notes.trim() || undefined })
        toast.success(res?.data?.scan_result ? `Drop-off ${res.data.scan_result}` : 'Drop-off recorded')
      } else {
        const res = await qrClaimOut(id, { notes: notes.trim() || undefined })
        toast.success(res?.data?.scan_result ? `Pickup ${res.data.scan_result}` : 'Pickup confirmed')
      }
      // add a minimal local record
      const record: ScanRecord = {
        id: generateId(),
        mode,
        reference: id,
        notes: notes.trim() || undefined,
        staff: staff.trim() || undefined,
        scannedAt: new Date().toISOString(),
      }
      setHistory(prev => [record, ...prev].slice(0, 25))
      setNotes('')
    } catch (err: any) {
      console.error('Confirm failed', err)
      toast.error(err?.message || 'Failed to register scan')
    }
  }

  const handleClearHistory = () => {
    setItemId(null)
    setItemView(null)
    setItemDetails(null)
    setInput('')
    toast.info('Cleared selected item')
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
            {/* Camera scanner */}
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-primary" />
                  <span className="text-sm font-medium">Camera scanner</span>
                </div>
                <div>
                  {cameras.length > 0 ? (
                    <select
                      className="text-xs rounded-md border bg-background px-2 py-1"
                      value={selectedCameraId || cameras[0]?.deviceId}
                      onChange={e => switchCamera(e.target.value)}
                    >
                      {cameras.map(cam => (
                        <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${cam.deviceId.slice(-4)}`}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground">No cameras</span>
                  )}
                </div>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl bg-black">
                {scanError ? (
                  <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">{scanError}</div>
                ) : (
                  <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline />
                )}
              </div>
            </div>
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
                      placeholder='Paste QR payload or item id'
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
                  {/* Staff on duty - temporarily commented out */}
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
                      placeholder='Paste QR payload or item id'
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
                  {/* Staff on duty - temporarily commented out */}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleConfirm}>
                <CheckCircle size={18} className="mr-2" />
                Confirm {mode === 'dropoff' ? 'drop-off' : 'pickup'}
              </Button>
              <Button variant="outline" onClick={handleClearHistory}>
                <ArrowClockwise size={18} className="mr-2" />
                Clear item
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Item details</h3>
              {itemId && <Badge variant="outline" title="Item id" className="font-mono">{itemId.slice(0, 8)}…</Badge>}
            </div>
            {!itemId ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Clock size={20} />
                <p>Scan a QR or paste an item id.</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {itemDetails && (
                    <div className="rounded-xl bg-background p-3">
                      <p className="text-sm font-semibold">{itemDetails.title ?? 'Item'}</p>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-2">
                        {itemDetails.pickup_option && <Badge variant="outline" className="capitalize">{itemDetails.pickup_option}</Badge>}
                        {itemDetails.status && <Badge variant="outline">{itemDetails.status}</Badge>}
                      </div>
                      {itemDetails.owner && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <UserCircle size={18} className="text-muted-foreground" />
                          <span>{itemDetails.owner?.name ?? 'User'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {itemView && itemView.scan_events && (
                    <div className="rounded-xl bg-background p-3">
                      <p className="text-xs font-semibold text-muted-foreground">Recent scans</p>
                      <div className="mt-2 space-y-1">
                        {itemView.scan_events.slice(0, 5).map((e: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="capitalize">{String(e.scan_type || 'event').toLowerCase().replace(/_/g, ' ')}</span>
                            <span className="text-muted-foreground">{e.scanned_at ? new Date(e.scanned_at).toLocaleString() : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
