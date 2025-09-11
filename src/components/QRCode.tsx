import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QrCode, Download, Share, Clock, MapPin, Package, User } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

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

interface QRCodeDisplayProps {
  qrData: QRCodeData
  onClose: () => void
}

interface QRCodeGeneratorProps {
  itemId: string
  itemTitle: string
  category: string
  condition: string
  co2Impact: number
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
  const [currentUser] = useKV('current-user', null)
  const [qrImageUrl, setQrImageUrl] = useState<string>('')

  useEffect(() => {
    // Create QR code data string
    const qrDataString = JSON.stringify({
      transactionId: qrData.transactionId,
      type: qrData.type,
      itemId: qrData.itemId,
      itemTitle: qrData.itemTitle,
      userId: qrData.userId,
      userName: qrData.userName,
      metadata: qrData.metadata,
      dropOffLocation: qrData.dropOffLocation,
      timestamp: new Date().toISOString()
    })

    setQrImageUrl(generateQRCodeImage(qrDataString))
  }, [qrData])

  const handleDownload = async () => {
    try {
      const response = await fetch(qrImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `trucycle-qr-${qrData.transactionId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('QR code downloaded successfully')
    } catch (error) {
      toast.error('Failed to download QR code')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const response = await fetch(qrImageUrl)
        const blob = await response.blob()
        const file = new File([blob], `trucycle-qr-${qrData.transactionId}.png`, { type: 'image/png' })
        
        await navigator.share({
          title: `TruCycle ${qrData.type === 'donor' ? 'Drop-off' : 'Pickup'} QR Code`,
          text: `QR code for ${qrData.itemTitle}`,
          files: [file]
        })
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(qrImageUrl)
        toast.success('QR code URL copied to clipboard')
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(qrImageUrl)
      toast.success('QR code URL copied to clipboard')
    }
  }

  const isExpired = new Date() > new Date(qrData.metadata.expiresAt)
  const timeUntilExpiry = new Date(qrData.metadata.expiresAt).getTime() - Date.now()
  const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60))

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <QrCode size={24} />
            <span>{qrData.type === 'donor' ? 'Drop-off' : 'Pickup'} QR Code</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              {qrImageUrl ? (
                <img 
                  src={qrImageUrl} 
                  alt="QR Code"
                  className="w-64 h-64"
                  onError={() => toast.error('Failed to load QR code')}
                />
              ) : (
                <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <QrCode size={64} className="text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge 
              variant={isExpired ? 'destructive' : qrData.status === 'active' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {isExpired ? 'Expired' : qrData.status.charAt(0).toUpperCase() + qrData.status.slice(1)}
            </Badge>
          </div>

          {/* Item Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Package size={20} />
                <span>{qrData.itemTitle}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono">{qrData.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="capitalize">{qrData.metadata.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition:</span>
                <span className="capitalize">{qrData.metadata.condition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CO₂ Impact:</span>
                <span className="text-green-600 font-medium">-{qrData.metadata.co2Impact}kg</span>
              </div>
              {qrData.dropOffLocation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center space-x-1">
                    <MapPin size={14} />
                    <span>Location:</span>
                  </span>
                  <span>{qrData.dropOffLocation}</span>
                </div>
              )}
              {!isExpired && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center space-x-1">
                    <Clock size={14} />
                    <span>Expires:</span>
                  </span>
                  <span className={hoursUntilExpiry < 2 ? 'text-red-600' : 'text-muted-foreground'}>
                    {hoursUntilExpiry < 1 ? 'Soon' : `${hoursUntilExpiry}h`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Instructions</h4>
              <p className="text-sm text-muted-foreground">
                {qrData.type === 'donor' 
                  ? "Show this QR code to the shop attendant when dropping off your item. They will scan it to confirm receipt."
                  : "Show this QR code to the shop attendant to collect your item. They will verify the code and release the item to you."
                }
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleDownload}
              disabled={!qrImageUrl}
            >
              <Download size={16} className="mr-2" />
              Download
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleShare}
              disabled={!qrImageUrl}
            >
              <Share size={16} className="mr-2" />
              Share
            </Button>
          </div>

          {isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                This QR code has expired. Please generate a new one to proceed with the transaction.
              </p>
            </div>
          )}
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
  co2Impact, 
  dropOffLocation, 
  type, 
  onGenerated 
}: QRCodeGeneratorProps) {
  const [currentUser] = useKV('current-user', null)
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
        },
        status: 'active'
      }

      // Save to user's QR codes
      const updatedQRCodes = [...generatedQRCodes, qrData]
      setGeneratedQRCodes(updatedQRCodes)

      // Also save to a global QR codes registry for shop scanning
      const globalQRCodes = await spark.kv.get<QRCodeData[]>('global-qr-codes') || []
      await spark.kv.set('global-qr-codes', [...globalQRCodes, qrData])

      onGenerated?.(qrData)
      toast.success(`${type === 'donor' ? 'Drop-off' : 'Pickup'} QR code generated successfully`)
    } catch (error) {
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
      const globalQRCodes = await spark.kv.get<QRCodeData[]>('global-qr-codes') || []
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
      await spark.kv.set('global-qr-codes', updatedQRCodes)

      setScannedData(foundQR)
      toast.success('QR code scanned successfully')
    } catch (error) {
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