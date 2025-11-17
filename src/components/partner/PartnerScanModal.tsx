import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  QrCode,
  CheckCircle,
  Clock,
  UserCircle,
  ArrowClockwise,
  Camera,
  SpinnerGap,
} from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import { getItemById, qrClaimOut, qrDropoffIn, qrViewItem, type ShopDto } from '@/lib/api'
import jsQR from 'jsqr'

interface PartnerScanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shops: ShopDto[]
}

type ScanMode = 'dropoff' | 'pickup'

const PRE_DROPOFF_STATUSES = new Set(['pending_dropoff', 'active'])

export interface PartnerScanStateInput {
  pickupStatus?: string | null
  pickupOption?: string | null
  hasClaimContext: boolean
}

export interface PartnerScanStateResult {
  normalizedStatus: string | null
  dropoffAllowed: boolean
  pickupAllowed: boolean
  actionMode: ScanMode
}

export function normalizeItemStatus(status?: string | null) {
  if (!status) return null
  const normalized = String(status).trim().toLowerCase()
  return normalized || null
}

export function computePartnerScanState({
  pickupStatus,
  pickupOption,
  hasClaimContext,
}: PartnerScanStateInput): PartnerScanStateResult {
  const normalizedStatus = normalizeItemStatus(pickupStatus)
  const normalizedPickupOption = pickupOption ? String(pickupOption).trim().toLowerCase() : null
  const isDonate = normalizedPickupOption === 'donate'
  const isPreDropoffStatus = !normalizedStatus || PRE_DROPOFF_STATUSES.has(normalizedStatus)
  const dropoffAllowed = isDonate && (isPreDropoffStatus || !hasClaimContext)
  const pickupAllowed = normalizedStatus === 'awaiting_collection'
  const actionMode: ScanMode = dropoffAllowed ? 'dropoff' : pickupAllowed ? 'pickup' : 'dropoff'

  return {
    normalizedStatus,
    dropoffAllowed,
    pickupAllowed,
    actionMode,
  }
}

interface ScanRecord {
  id: string
  mode: ScanMode
  reference: string
  notes?: string
  scannedAt: string
  shopId?: string
  shopName?: string | null
  result?: string
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `scan-${Date.now()}-${Math.round(Math.random() * 1e6)}`
}

function formatStatusLabel(status?: string | null) {
  if (!status) return 'unknown'
  return status.replace(/_/g, ' ')
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString()
}

const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/

export function PartnerScanModal({ open, onOpenChange, shops }: PartnerScanModalProps) {
  const [input, setInput] = useState('')
  const [notes, setNotes] = useState('')
  const [history, setHistory] = useKV<ScanRecord[]>('partner-scan-history', [])
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFetchingItem, setIsFetchingItem] = useState(false)

  // Camera scanning state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastDetectedRef = useRef<string | null>(null)
  const detailsRef = useRef<HTMLDivElement | null>(null)

  // Selected item state
  const [itemId, setItemId] = useState<string | null>(null)
  const [itemView, setItemView] = useState<any | null>(null)
  const [itemDetails, setItemDetails] = useState<any | null>(null)

  const shopsById = useMemo(() => {
    return shops.reduce<Record<string, ShopDto>>((acc, shop) => {
      acc[shop.id] = shop
      return acc
    }, {})
  }, [shops])

  const hasShops = shops.length > 0
  const selectedShop = selectedShopId ? shopsById[selectedShopId] : undefined

  const summary = useMemo(() => {
    const total = history.length
    const dropoffs = history.filter(record => record.mode === 'dropoff').length
    const pickups = total - dropoffs
    return { total, dropoffs, pickups }
  }, [history])

  useEffect(() => {
    if (!hasShops) {
      setSelectedShopId(null)
      return
    }
    setSelectedShopId(prev => {
      if (prev && shopsById[prev]) return prev
      return shops[0]?.id ?? null
    })
  }, [hasShops, shops, shopsById])

  useEffect(() => {
    if (!input) {
      lastDetectedRef.current = null
    }
  }, [input])

  useEffect(() => {
    if (!open) {
      lastDetectedRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!itemId) return
    const node = detailsRef.current
    if (!node) return
    const frame = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [itemId])

  const pickupStatus = itemDetails?.status ?? itemView?.status
  const pickupOption = itemDetails?.pickup_option ?? itemView?.pickup_option
  const hasClaimContext = Boolean(
    itemDetails?.claim_id ||
      itemDetails?.claim?.id ||
      itemView?.claim?.id ||
      itemView?.claim_id
  )
  const claimId = useMemo(() => {
    return (
      itemDetails?.claim_id ||
      itemDetails?.claim?.id ||
      itemView?.claim?.id ||
      itemView?.claim_id ||
      null
    )
  }, [itemDetails, itemView])
  const { dropoffAllowed, pickupAllowed, actionMode } = useMemo(
    () => computePartnerScanState({ pickupStatus, pickupOption, hasClaimContext }),
    [pickupStatus, pickupOption, hasClaimContext]
  )
  const hasStatusContext = Boolean(pickupStatus)
  const confirmDisabled =
    isProcessing ||
    !hasShops ||
    !selectedShopId ||
    !itemId ||
    (actionMode === 'dropoff' && !dropoffAllowed) ||
    (actionMode === 'pickup' && (!pickupAllowed || !claimId))

  const extractItemId = useCallback((payload: string): string | null => {
    const match = payload.match(UUID_RE)
    if (match) return match[0]
    // Accept raw payloads like "QR:ITEM:<id>" as a fallback
    const parts = payload.split(':')
    const maybeId = parts[parts.length - 1]
    return UUID_RE.test(maybeId) ? maybeId : null
  }, [])

  const fetchItem = useCallback(async (id: string) => {
    setIsFetchingItem(true)
    setItemId(id)
    let viewData: any = null
    let itemData: any = null
    try {
      const viewRes = await qrViewItem(id)
      viewData = viewRes?.data ?? null
    } catch (err: any) {
      console.error('Failed to fetch QR item context', err)
      toast.error(err?.message || 'Unable to fetch item context')
    }
    try {
      const itemRes = await getItemById(id)
      itemData = (itemRes as any)?.data ?? null
    } catch (err: any) {
      console.error('Failed to fetch item details', err)
      const message = err?.message || 'Item not found'
      toast.error(message)
    }
    setItemView(viewData)
    setItemDetails(itemData)
    setIsFetchingItem(false)
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
  }, [input, itemId, extractItemId, fetchItem])

  // Camera and scanning setup on open
  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function init() {
      try {
        setScanError(null)
        if (!navigator.mediaDevices?.enumerateDevices || !navigator.mediaDevices?.getUserMedia) {
          setScanError('Camera not supported in this browser')
          return
        }
        const devices = await navigator.mediaDevices.enumerateDevices()
        const vids = devices.filter(d => d.kind === 'videoinput')
        setCameras(vids)
        if (!vids.length) {
          setScanError('No cameras detected')
          return
        }
        const preferred =
          (selectedCameraId && vids.some(device => device.deviceId === selectedCameraId)
            ? selectedCameraId
            : vids[0]?.deviceId) || undefined
        const constraints = preferred ? { video: { deviceId: { exact: preferred } } } : { video: true }
        const newStream = await navigator.mediaDevices.getUserMedia(constraints)
        if (cancelled) {
          newStream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current?.getTracks().forEach(track => track.stop())
        streamRef.current = newStream
        if (videoRef.current) {
          videoRef.current.srcObject = newStream
          try {
            await videoRef.current.play()
          } catch (err) {
            console.warn('Camera playback failed to auto-start', err)
          }
        }
      } catch (err: any) {
        console.error('Failed to init camera', err)
        setScanError(err?.message || 'Unable to access camera')
      }
    }

    init()

    const videoElement = videoRef.current
    return () => {
      cancelled = true
      const stream = streamRef.current
      stream?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      if (videoElement) {
        videoElement.srcObject = null
      }
      setScanning(false)
    }
  }, [open, selectedCameraId])

  const switchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId)
  }

  // QR detection: BarcodeDetector with jsQR fallback
  useEffect(() => {
    if (!open) return
    let cancelled = false
    let rafId: number | null = null
    const Detector = (window as any).BarcodeDetector
      ? new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      : null
    const canvas = canvasRef.current || document.createElement('canvas')
    if (!canvasRef.current) {
      canvasRef.current = canvas
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const scheduleNext = () => {
      if (cancelled) return
      rafId = requestAnimationFrame(scanFrame)
    }

    const scanFrame = () => {
      if (cancelled) return
      const video = videoRef.current
      if (!video) {
        scheduleNext()
        return
      }

      if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        scheduleNext()
        return
      }

      setScanning(true)

      const processFrame = async () => {
        let detected: string | null = null

        if (Detector) {
          try {
            const codes = await Detector.detect(video as any)
            if (codes && codes.length > 0) {
              detected = codes[0]?.rawValue ?? null
            }
          } catch (err) {
            console.warn('BarcodeDetector scan failed, falling back to jsQR', err)
          }
        }

        if (!detected && ctx) {
          try {
            const vw = video.videoWidth
            const vh = video.videoHeight
            if (vw && vh) {
              if (canvas.width !== vw) canvas.width = vw
              if (canvas.height !== vh) canvas.height = vh
              ctx.drawImage(video, 0, 0, vw, vh)
              const imageData = ctx.getImageData(0, 0, vw, vh)
              const result = jsQR(imageData.data as Uint8ClampedArray, vw, vh, {
                inversionAttempts: 'attemptBoth',
              })
              detected = result?.data ?? null
            }
          } catch (err) {
            console.error('jsQR scan failed', err)
          }
        }

        if (detected) {
          const normalized = String(detected).trim()
          if (normalized && normalized !== lastDetectedRef.current) {
            lastDetectedRef.current = normalized
            setInput(normalized)
          }
        }

        scheduleNext()
      }

      processFrame().catch(() => {
        scheduleNext()
      })
    }

    scheduleNext()

    return () => {
      cancelled = true
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      setScanning(false)
    }
  }, [open])

  const handleConfirm = async () => {
    const val = input.trim()
    const id = itemId || extractItemId(val)
    if (!id) {
      toast.error('Scan or enter a valid QR/item id')
      return
    }
    if (!selectedShopId) {
      toast.error('Select a partner shop before confirming the scan')
      return
    }
    const currentMode = actionMode
    if (currentMode === 'dropoff' && !dropoffAllowed) {
      toast.error('Item must be pending drop-off before it can be accepted')
      return
    }
    if (currentMode === 'pickup' && !pickupAllowed) {
      toast.error('Item must be awaiting collection before it can be released')
      return
    }
    const trimmedNotes = notes.trim()
    const shopName = selectedShop?.name ?? null
    setIsProcessing(true)
    try {
      if (currentMode === 'dropoff') {
        const res = await qrDropoffIn(id, {
          shop_id: selectedShopId,
          action: 'accept',
          ...(trimmedNotes ? { reason: trimmedNotes } : {}),
        })
        toast.success(res?.data?.scan_result ? `Drop-off ${res.data.scan_result}` : 'Drop-off recorded', {
          description: shopName ? `Logged at ${shopName}` : undefined,
        })
        await fetchItem(id)
        const record: ScanRecord = {
          id: generateId(),
          mode: currentMode,
          reference: id,
          ...(trimmedNotes ? { notes: trimmedNotes } : {}),
          scannedAt: new Date().toISOString(),
          shopId: selectedShopId,
          shopName,
          result: res?.data?.scan_result ?? 'accepted',
        }
        setHistory(prev => [record, ...prev].slice(0, 25))
      } else {
        const res = await qrClaimOut(id, {
          shop_id: selectedShopId,
          ...(claimId ? { claim_id: claimId } : {}),
        })
        toast.success(res?.data?.scan_result ? `Pickup ${res.data.scan_result}` : 'Pickup confirmed', {
          description: shopName ? `Logged at ${shopName}` : undefined,
        })
        await fetchItem(id)
        const record: ScanRecord = {
          id: generateId(),
          mode: currentMode,
          reference: id,
          scannedAt: new Date().toISOString(),
          shopId: selectedShopId,
          shopName,
          result: res?.data?.scan_result ?? 'confirmed',
        }
        setHistory(prev => [record, ...prev].slice(0, 25))
      }
      setNotes('')
    } catch (err: any) {
      console.error('Confirm failed', err)
      toast.error(err?.message || 'Failed to register scan')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearHistory = () => {
    setItemId(null)
    setItemView(null)
    setItemDetails(null)
    setInput('')
    setNotes('')
    lastDetectedRef.current = null
    toast.info('Cleared selected item')
  }

  const shopSelector = (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor="scan-shop">
        Shop
      </label>
      <Select value={selectedShopId ?? undefined} onValueChange={value => setSelectedShopId(value)}>
        <SelectTrigger id="scan-shop" disabled={!hasShops} className="w-full">
          <SelectValue placeholder={hasShops ? 'Select partner shop' : 'Add a partner shop to begin'} />
        </SelectTrigger>
        <SelectContent>
          {shops.map(shop => (
            <SelectItem key={shop.id} value={shop.id}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Scans are recorded against the selected shop.{selectedShop?.address_line ? ` ${selectedShop.address_line}` : ''}
        {selectedShop?.postcode ? `, ${selectedShop.postcode}` : ''}
      </p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-h3">
            <QrCode size={24} className="text-primary" />
            Scan drop-offs & pickups
          </DialogTitle>
          <DialogDescription>
            Use the camera or manual entry to verify items before recording a drop-off acceptance or pickup
            confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
          <div className="space-y-5">
            {/* Camera scanner */}
            <div className="rounded-2xl border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-primary" />
                  <span className="text-sm font-medium">Camera scanner</span>
                  <Badge variant={scanning ? 'secondary' : 'outline'} className="flex items-center gap-1 text-[10px]">
                    {scanning ? <SpinnerGap size={12} className="animate-spin" /> : null}
                    {scanning ? 'Scanning…' : 'Idle'}
                  </Badge>
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
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
              {shopSelector}
              {!hasShops && (
                <p className="mt-2 text-xs text-destructive">
                  Register a shop in the partner console to enable QR confirmations.
                </p>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="scan-input">
                  QR payload or manual code
                </label>
                <Input
                  id="scan-input"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  placeholder="Paste QR payload or item id"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {actionMode === 'dropoff' ? 'Drop-off' : 'Pickup'} mode
                </Badge>
                {itemDetails?.status ? (
                  <Badge
                    variant={actionMode === 'dropoff' ? (dropoffAllowed ? 'secondary' : 'outline') : (pickupAllowed ? 'secondary' : 'outline')}
                    className="capitalize"
                  >
                    {formatStatusLabel(itemDetails.status)}
                  </Badge>
                ) : itemView?.status ? (
                  <Badge variant={pickupAllowed ? 'secondary' : 'outline'} className="capitalize">
                    {formatStatusLabel(itemView.status)}
                  </Badge>
                ) : null}
                {actionMode === 'pickup' && pickupOption && (
                  <Badge variant="outline" className="capitalize">
                    {pickupOption}
                  </Badge>
                )}
                {!dropoffAllowed && actionMode === 'dropoff' && hasStatusContext && (
                  <span className="text-[11px] text-destructive">Waiting for pending drop-off</span>
                )}
                {!pickupAllowed && actionMode === 'pickup' && hasStatusContext && (
                  <span className="text-[11px] text-destructive">Status must be awaiting collection</span>
                )}
                {!hasStatusContext && !itemId && (
                  <span className="text-[11px] text-muted-foreground">Scan an item to determine the action</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleConfirm} disabled={confirmDisabled} aria-busy={isProcessing}>
                {isProcessing ? (
                  <SpinnerGap size={18} className="mr-2 animate-spin" />
                ) : (
                  <CheckCircle size={18} className="mr-2" />
                )}
                {isProcessing ? 'Processing…' : `Confirm ${actionMode === 'dropoff' ? 'drop-off' : 'pickup'}`}
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
            {summary.total > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline">Total scans {summary.total}</Badge>
                <Badge variant="outline">Drop-offs {summary.dropoffs}</Badge>
                <Badge variant="outline">Pickups {summary.pickups}</Badge>
              </div>
            )}
            <div ref={detailsRef}>
              {!itemId ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <Clock size={20} />
                  <p>Scan a QR or paste an item id.</p>
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <div className="space-y-4">
                    {isFetchingItem ? (
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : itemDetails ? (
                    <>
                      <div className="space-y-3 rounded-xl bg-background p-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{itemDetails.title ?? 'Item'}</p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {itemDetails.description?.trim() || 'No description provided.'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {itemDetails.pickup_option && (
                            <Badge variant="outline" className="capitalize">
                              {itemDetails.pickup_option}
                            </Badge>
                          )}
                          {itemDetails.status && (
                            <Badge variant="secondary" className="capitalize">
                              {formatStatusLabel(itemDetails.status)}
                            </Badge>
                          )}
                          {itemDetails.condition && (
                            <Badge variant="outline" className="capitalize">
                              {itemDetails.condition.replace(/_/g, ' ')} condition
                            </Badge>
                          )}
                        </div>
                        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                          <div>
                            <p className="font-medium text-foreground">Category</p>
                            <p className="capitalize">{itemDetails.category ?? '—'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Created</p>
                            <p>{formatDateTime(itemDetails.created_at)}</p>
                          </div>
                          {typeof itemDetails.estimated_co2_saved_kg === 'number' && (
                            <div>
                              <p className="font-medium text-foreground">Estimated CO₂ saved</p>
                              <p>{itemDetails.estimated_co2_saved_kg.toFixed(1)} kg</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {itemDetails.owner && (
                        <div className="space-y-3 rounded-xl border border-border/60 bg-background p-3">
                          <div className="flex items-center gap-2">
                            <UserCircle size={20} className="text-muted-foreground" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{itemDetails.owner?.name ?? 'Neighbour'}</p>
                              {itemDetails.owner?.id && (
                                <p className="text-[11px] font-mono text-muted-foreground">#{itemDetails.owner.id.slice(0, 8)}…</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge
                              variant={itemDetails.owner?.verification?.email_verified ? 'secondary' : 'outline'}
                            >
                              Email {itemDetails.owner?.verification?.email_verified ? 'verified' : 'pending'}
                            </Badge>
                            <Badge
                              variant={itemDetails.owner?.verification?.identity_verified ? 'secondary' : 'outline'}
                            >
                              ID {itemDetails.owner?.verification?.identity_verified ? 'verified' : 'pending'}
                            </Badge>
                            <Badge
                              variant={itemDetails.owner?.verification?.address_verified ? 'secondary' : 'outline'}
                            >
                              Address {itemDetails.owner?.verification?.address_verified ? 'verified' : 'pending'}
                            </Badge>
                            {typeof itemDetails.owner?.rating === 'number' && (
                              <Badge variant="outline">
                                Rating {itemDetails.owner.rating.toFixed(1)} ({itemDetails.owner.reviews_count ?? 0})
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                      Scan an item to load its details.
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
