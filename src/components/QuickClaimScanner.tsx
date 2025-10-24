import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { QrCode, Camera, SpinnerGap, CheckCircle, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import jsQR from 'jsqr'
import { createClaim, collectItem } from '@/lib/api'
import { useKV } from '@/hooks/useKV'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type QuickClaimScannerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/

export function QuickClaimScanner({ open, onOpenChange }: QuickClaimScannerProps) {
  const [currentUser] = useKV<any | null>('current-user', null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [cameraId, setCameraId] = useState<string | undefined>(undefined)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const lastDetectedRef = useRef<string | null>(null)
  const [mode, setMode] = useState<'claim' | 'collect'>('claim')
  const claimingRef = useRef<boolean>(false)
  const lastScanTsRef = useRef<number>(0)
  const detectorRef = useRef<any | null>(null)
  const DETECT_INTERVAL_MS = 0 // rAF loop like partner scanner
  const timerRef = useRef<number | null>(null)

  const canScan = open && !claimingId

  const extractItemId = useCallback((payload: string): string | null => {
    if (!payload) return null
    const trimmed = String(payload).trim()
    // First, try JSON with itemId/item_id
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') {
        const id = (parsed as any).itemId || (parsed as any).item_id || (parsed as any).id
        if (typeof id === 'string' && UUID_RE.test(id)) return id
      }
    } catch {}
    // Then, try to match UUID anywhere
    const match = trimmed.match(UUID_RE)
    if (match) return match[0]
    // Fallback: QR:ITEM:<uuid> or similar colon-delimited
    const parts = trimmed.split(':')
    const maybe = parts[parts.length - 1]
    return UUID_RE.test(maybe) ? maybe : null
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop()
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async (deviceId?: string) => {
    stopStream()
    setScanError(null)
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        const el = videoRef.current
        el.srcObject = stream
        // Ensure autoplay after metadata is ready
        await new Promise<void>((resolve) => {
          const onReady = () => {
            el.removeEventListener('loadedmetadata', onReady)
            resolve()
          }
          if (el.readyState >= 1) resolve(); else el.addEventListener('loadedmetadata', onReady)
        })
        await el.play().catch(() => {})
      }
      setScanning(true)
    } catch (err: any) {
      console.error('Camera start failed', err)
      setScanError(err?.message || 'Unable to access camera')
      setScanning(false)
    }
  }, [stopStream])

  const loadCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const vids = devices.filter(d => d.kind === 'videoinput')
      setCameras(vids)
      if (!cameraId && vids[0]) setCameraId(vids[0].deviceId)
    } catch (err) {
      // ignore
    }
  }, [cameraId])

  useEffect(() => {
    if (!open) return
    loadCameras().then(() => startCamera(cameraId)).catch(() => {})
    // Prepare a single BarcodeDetector instance if supported
    try {
      const BD: any = (window as any).BarcodeDetector
      detectorRef.current = BD ? new BD({ formats: ['qr_code'] }) : null
    } catch {
      detectorRef.current = null
    }
    // fresh session markers
    lastDetectedRef.current = null
    return () => {
      setScanning(false)
      stopStream()
      lastDetectedRef.current = null
      lastScanTsRef.current = 0
      detectorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => { claimingRef.current = Boolean(claimingId) }, [claimingId])

  const switchCamera = async (id: string) => {
    setCameraId(id)
    await startCamera(id)
  }

  const attemptAction = useCallback(async (id: string) => {
    if (!id) return
    if (!currentUser) {
      toast.error('Please sign in to claim items')
      return
    }
    setClaimingId(id)
    setResultMessage(null)
    try {
      if (mode === 'claim') {
        const res = await createClaim({ item_id: id })
        const status = String((res as any)?.data?.status || 'pending')
        setResultMessage(`Claim ${status.replace(/_/g, ' ')}`)
        toast.success('Claim requested')
      } else {
        const res = await collectItem(id)
        const status = String((res as any)?.data?.status || (res as any)?.status || 'complete')
        setResultMessage(`Collection ${status.replace(/_/g, ' ')}`)
        toast.success('Collection submitted')
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to create claim'
      setResultMessage(msg)
      toast.error(msg)
    } finally {
      setClaimingId(null)
      // Allow detecting same or next code again after action completes
      setTimeout(() => { lastDetectedRef.current = null }, 200)
    }
  }, [currentUser, mode])

  // Scan loop (rAF-based, modeled after PartnerScanModal)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    let rafId: number | null = null

    const canvas = canvasRef.current || document.createElement('canvas')
    if (!canvasRef.current) canvasRef.current = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true } as any)

    const scheduleNext = () => {
      if (!cancelled) rafId = requestAnimationFrame(scanFrame)
    }

    const scanFrame = () => {
      if (cancelled) return
      const video = videoRef.current
      if (!video) { scheduleNext(); return }
      if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) { scheduleNext(); return }

      const processFrame = async () => {
        if (claimingRef.current) { scheduleNext(); return }
        let detected: string | null = null

        const detector = detectorRef.current
        if (detector) {
          try {
            const codes = await detector.detect(video as any)
            if (Array.isArray(codes) && codes.length > 0) {
              const raw = (codes[0] as any).rawValue ?? (codes[0] as any).rawValue
              detected = raw != null ? String(raw) : null
            }
          } catch {
            // fall back to jsQR
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
              const result = jsQR(imageData.data as Uint8ClampedArray, vw, vh, { inversionAttempts: 'attemptBoth' })
              detected = result?.data ?? null
            }
          } catch {
            // ignore
          }
        }

        if (detected) {
          const normalized = String(detected).trim()
          if (normalized && normalized !== lastDetectedRef.current) {
            lastDetectedRef.current = normalized
            const id = extractItemId(normalized)
            if (id && !claimingId) {
              // Fire and forget to avoid blocking the scan loop
              void attemptAction(id)
            }
          }
        }

        scheduleNext()
      }

      processFrame().catch(() => scheduleNext())
    }

    scheduleNext()
    return () => {
      cancelled = true
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [open])

  const handleManualSubmit = async () => {
    const id = extractItemId(manualInput)
    if (!id) {
      toast.error('Enter a valid QR payload or item id')
      return
    }
    await attemptAction(id)
  }

  const headerStatus = useMemo(() => {
    if (claimingId) return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <SpinnerGap size={12} className="animate-spin" /> Claiming
      </Badge>
    )
    if (scanning) return <Badge variant="outline" className="text-[10px]">Scanning</Badge>
    return <Badge variant="outline" className="text-[10px]">Idle</Badge>
  }, [scanning, claimingId])

  const descriptionText = mode === 'claim'
    ? 'Point your camera at the item QR. We’ll try to create a claim automatically.'
    : 'Point your camera at the item QR. We’ll try to register your collection automatically.'

  const overlayText = mode === 'claim' ? 'Claiming item...' : 'Collecting item...'

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-h3">
              <QrCode size={22} className="text-primary" />
              {mode === 'claim' ? 'Scan to claim' : 'Scan to collect'}
            </DialogTitle>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'claim' | 'collect')}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="claim">Claim</TabsTrigger>
                <TabsTrigger value="collect">Collect</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-primary" />
                <span className="text-sm font-medium">Camera scanner</span>
              </div>
              <div className="flex items-center gap-2">
                {headerStatus}
                {cameras.length > 0 ? (
                  <select
                    className="text-xs rounded-md border bg-background px-2 py-1"
                    value={cameraId || cameras[0]?.deviceId}
                    onChange={(e) => switchCamera(e.target.value)}
                  >
                    {cameras.map((cam) => (
                      <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${cam.deviceId.slice(-4)}`}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[11px] text-muted-foreground">No cameras</span>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-black">
              {scanError ? (
                <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">{scanError}</div>
              ) : (
                <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline autoPlay />
              )}
              {claimingId && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm">
                    <SpinnerGap size={16} className="animate-spin" />
                    {overlayText}
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="manual-qr">QR payload or item id</label>
              <div className="flex gap-2">
                <Input id="manual-qr" value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="Paste QR payload or UUID" />
                <Button onClick={handleManualSubmit} disabled={!!claimingId}>
                  {claimingId ? <SpinnerGap size={16} className="mr-2 animate-spin" /> : null}
                  {claimingId ? (mode === 'claim' ? 'Claiming...' : 'Collecting...') : (mode === 'claim' ? 'Claim' : 'Collect')}
                </Button>
              </div>
              {!currentUser && (
                <p className="text-[11px] text-destructive">Sign in is required to {mode === 'claim' ? 'claim' : 'collect'} items.</p>
              )}
            </div>

            {resultMessage && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2">
                  {resultMessage.toLowerCase().startsWith('claim') || resultMessage.toLowerCase().includes('success')
                    ? <CheckCircle size={16} className="text-emerald-600" />
                    : <XCircle size={16} className="text-destructive" />}
                  <span>{resultMessage}</span>
                </div>
              </div>
            )}

            <div className="text-[11px] text-muted-foreground">
              We’ll attempt a single claim per scan to avoid duplicates. You can scan again if needed.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
