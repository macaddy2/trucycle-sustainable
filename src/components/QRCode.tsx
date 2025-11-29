import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QrCode, Clock, MapPin, Package } from '@phosphor-icons/react'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'
import { kvGet, kvSet } from '@/lib/kvStore'

interface QRCodeData {
  id: string
  type: 'donor' | 'collector'
  itemId: string
  itemTitle: string
  itemDescription?: string
  itemImage?: string
  userId: string
  userName: string
  transactionId: string
  dropOffLocation?: string
  qrImageUrl?: string
  metadata: {
    category: string
    condition: string
    estimatedWeight?: number
    co2Impact: number
    createdAt: string
    expiresAt: string
    actionType: 'donate' | 'exchange' | 'recycle'
  }
  status: 'active' | 'scanned' | 'expired' | 'completed'
}

export type { QRCodeData }

interface QRCodeDisplayProps {
  qrData: QRCodeData
  onClose: () => void
}

interface QRCodeGeneratorProps {
  itemId: string
  itemTitle: string
  category: string
  condition: string
  actionType: 'donate' | 'exchange' | 'recycle'
  co2Impact: number
  description?: string
  primaryImageUrl?: string
  dropOffLocation?: string
  type: 'donor' | 'collector'
  onGenerated?: (qrCode: QRCodeData) => void
}

// Simple QR Code generation using qr-server.com API (free public service)
const generateQRCodeImage = (data: string): string => {
  const encodedData = encodeURIComponent(data)
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&bgcolor=ffffff&color=000000&qzone=2&format=png`
}

// Generate unique transaction ID
const generateTransactionId = (): string => {
  return `TC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
}

export function QRCodeDisplay({ qrData, onClose }: QRCodeDisplayProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string>('')

  useEffect(() => {
    if (qrData.qrImageUrl) {
      setQrImageUrl(qrData.qrImageUrl)
      return
    }

    // Create QR code data string
    const qrDataString = JSON.stringify({
      transactionId: qrData.transactionId,
      type: qrData.type,
      itemId: qrData.itemId,
      itemTitle: qrData.itemTitle,
      itemDescription: qrData.itemDescription,
      itemImage: qrData.itemImage,
      userId: qrData.userId,
      userName: qrData.userName,
      metadata: qrData.metadata,
      dropOffLocation: qrData.dropOffLocation,
      timestamp: new Date().toISOString()
    })

    setQrImageUrl(generateQRCodeImage(qrDataString))
  }, [qrData])

  const isExpired = new Date() > new Date(qrData.metadata.expiresAt)
  const expiryDate = new Date(qrData.metadata.expiresAt)
  const timeUntilExpiry = expiryDate.getTime() - Date.now()
  const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60))

  const displayLocation = qrData.dropOffLocation ?? 'Shared privately once a hand-off is arranged.'

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Congratulations 🎉</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                {qrData.itemImage ? (
                  <img src={qrData.itemImage} alt={qrData.itemTitle} className="h-full w-full object-cover" />
                ) : (
                  <Package size={28} className="text-muted-foreground" />
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold leading-tight">{qrData.itemTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {qrData.itemDescription?.trim() || 'No additional description provided.'}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="capitalize">Category: {qrData.metadata.category}</Badge>
                  <Badge variant="outline" className="capitalize">Condition: {qrData.metadata.condition}</Badge>
                  <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                    -{qrData.metadata.co2Impact}kg CO₂ saved
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background/60 p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <MapPin size={14} /> {qrData.dropOffLocation ? 'Partner shop' : 'Pickup location'}
                </div>
                <p className="text-sm text-foreground">{displayLocation}</p>
              </div>
              <div className="rounded-lg border bg-background/60 p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <Clock size={14} /> Expiry
                </div>
                <p className={`text-sm ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                  {isExpired
                    ? 'Expired'
                    : hoursUntilExpiry < 1
                      ? 'Expires in <1 hour'
                      : `Expires in ${hoursUntilExpiry}h`}
                </p>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export function QRCodeGenerator({
  itemId,
  itemTitle,
  category,
  condition,
  actionType,
  co2Impact,
  description,
  primaryImageUrl,
  dropOffLocation,
  type,
  onGenerated
}: QRCodeGeneratorProps) {
  const [currentUser] = useKV<{ id: string; name: string } | null>('current-user', null)
  const [generatedQRCodes, setGeneratedQRCodes] = useKV<QRCodeData[]>('user-qr-codes', [])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateQRCode = async () => {
    if (!currentUser) {
      toast.error('Please sign in to generate QR codes')
      return
    }

    setIsGenerating(true)

    try {
      const qrData: QRCodeData = {
        id: `qr_${Date.now()}`,
        type,
        itemId,
        itemTitle,
        itemDescription: description,
        itemImage: primaryImageUrl,
        userId: currentUser.id,
        userName: currentUser.name,
        transactionId: generateTransactionId(),
        dropOffLocation,
        metadata: {
          category,
          condition,
          co2Impact,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          actionType,
        },
        status: 'active'
      }

      // Save to user's QR codes
      const updatedQRCodes = [...generatedQRCodes, qrData]
      setGeneratedQRCodes(updatedQRCodes)

      // Also save to a global QR codes registry for shop scanning
      const globalQRCodes = await kvGet<QRCodeData[]>('global-qr-codes') || []
      await kvSet('global-qr-codes', [...globalQRCodes, qrData])

      onGenerated?.(qrData)
      toast.success(`${type === 'donor' ? 'Drop-off' : 'Pickup'} QR code generated successfully`)
    } catch (error) {
      console.error('Failed to generate QR code', error)
      toast.error('Failed to generate QR code')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button 
      onClick={generateQRCode} 
      disabled={isGenerating}
      className="w-full"
    >
      <QrCode size={16} className="mr-2" />
      {isGenerating ? 'Generating...' : `Generate ${type === 'donor' ? 'Drop-off' : 'Pickup'} QR Code`}
    </Button>
  )
}

// QR Code Scanner Component for shop attendants
export function QRCodeScanner() {
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null)
  const [scanInput, setScanInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleManualScan = async () => {
    if (!scanInput.trim()) {
      toast.error('Please enter QR code data')
      return
    }

    setIsProcessing(true)
    try {
      const qrData = JSON.parse(scanInput)
      
      // Verify the QR code exists in global registry
      const globalQRCodes = await kvGet<QRCodeData[]>('global-qr-codes') || []
      const foundQR = globalQRCodes.find(qr => qr.transactionId === qrData.transactionId)

      if (!foundQR) {
        toast.error('Invalid QR code')
        return
      }

      if (new Date() > new Date(foundQR.metadata.expiresAt)) {
        toast.error('QR code has expired')
        return
      }

      if (foundQR.status !== 'active') {
        toast.error('QR code has already been used')
        return
      }

      // Mark QR code as scanned
      const updatedQRCodes = globalQRCodes.map(qr => 
        qr.transactionId === foundQR.transactionId 
          ? { ...qr, status: 'scanned' as const }
          : qr
      )
      await kvSet('global-qr-codes', updatedQRCodes)

      setScannedData(foundQR)
      toast.success('QR code scanned successfully')
    } catch (error) {
      console.error('Failed to process manual QR code input', error)
      toast.error('Invalid QR code format')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Scan or paste QR code data..."
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <Button onClick={handleManualScan} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Scan'}
        </Button>
      </div>

      {scannedData && (
        <Card>
          <CardHeader>
            <CardTitle>Scanned Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Transaction ID:</span>
              <span className="font-mono">{scannedData.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span>Type:</span>
              <Badge>{scannedData.type}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Item:</span>
              <span>{scannedData.itemTitle}</span>
            </div>
            <div className="flex justify-between">
              <span>User:</span>
              <span>{scannedData.userName}</span>
            </div>
            <Button 
              className="w-full mt-4"
              onClick={() => {
                toast.success('Transaction confirmed')
                setScannedData(null)
                setScanInput('')
              }}
            >
              Confirm {scannedData.type === 'donor' ? 'Item Received' : 'Item Released'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
