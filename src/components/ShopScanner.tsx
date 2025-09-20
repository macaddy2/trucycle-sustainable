import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { QrCode, Scan, Package, User, MapPin, CheckCircle, X } from '@phosphor-icons/react'
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
      const globalQRCodes = await spark.kv.get<QRCodeData[]>('global-qr-codes') || []
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
      const globalQRCodes = await spark.kv.get<QRCodeData[]>('global-qr-codes') || []
      const updatedQRCodes = globalQRCodes.map(qr => 
        qr.transactionId === scannedData.transactionId 
          ? { 
              ...qr, 
              status: (scannedData.type === 'donor' ? 'scanned' : 'completed') as const 
            }
          : qr
      )
      await spark.kv.set('global-qr-codes', updatedQRCodes)

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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode size={32} className="text-primary-foreground" />
          </div>
          <h1 className="text-h1 text-foreground">TruCycle Shop Scanner</h1>
          <p className="text-body text-muted-foreground">
            Scan QR codes to process item drop-offs and pickups
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = window.location.pathname}
            className="mt-2"
          >
            Back to Main App
          </Button>
        </div>

        {/* Scanner Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Scan size={20} />
              <span>Scan QR Code</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!scannedData ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      QR Code Data
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Scan or paste QR code data..."
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleManualScan} 
                        disabled={isProcessing || !scanInput.trim()}
                      >
                        {isProcessing ? 'Processing...' : 'Scan'}
                      </Button>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Or upload QR code image
                    </p>
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
                    >
                      Upload Image
                    </Button>
                  </div>
                </div>

                {/* Attendant Name Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Shop Attendant Name
                  </label>
                  <Input
                    placeholder="Enter your name..."
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                  />
                </div>
              </>
            ) : (
              /* Transaction Confirmation */
              <div className="space-y-6">
                <div className="text-center">
                  <Badge 
                    variant={scannedData.type === 'donor' ? 'default' : 'secondary'}
                    className="text-lg py-2 px-4"
                  >
                    {scannedData.type === 'donor' ? 'Item Drop-off' : 'Item Pickup'}
                  </Badge>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Transaction ID:</span>
                      <span className="font-mono text-sm">{scannedData.transactionId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item:</span>
                      <span className="text-sm">{scannedData.itemTitle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer:</span>
                      <span className="text-sm flex items-center space-x-1">
                        <User size={14} />
                        <span>{scannedData.userName}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Category:</span>
                      <span className="text-sm capitalize">{scannedData.metadata.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Condition:</span>
                      <span className="text-sm capitalize">{scannedData.metadata.condition}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">CO₂ Impact:</span>
                      <span className="text-sm text-green-600 font-medium">-{scannedData.metadata.co2Impact}kg</span>
                    </div>
                    {scannedData.dropOffLocation && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center space-x-1">
                          <MapPin size={14} />
                          <span>Location:</span>
                        </span>
                        <span className="text-sm">{scannedData.dropOffLocation}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Shop Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="Any additional notes about the item condition or transaction..."
                    value={shopNotes}
                    onChange={(e) => setShopNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={handleConfirmTransaction}
                    className="flex-1"
                    disabled={!attendantName.trim()}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Confirm {scannedData.type === 'donor' ? 'Item Received' : 'Item Released'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancelScan}
                  >
                    <X size={16} className="mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Package size={20} />
                <span>Recent Transactions</span>
              </span>
              <Badge variant="secondary">{shopTransactions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shopTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={24} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No transactions yet today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shopTransactions.slice(0, 10).map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={transaction.qrData.type === 'donor' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {transaction.qrData.type}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{transaction.qrData.itemTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.qrData.userName} • {transaction.qrData.transactionId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          By: {transaction.shopAttendant}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(transaction.scannedAt)}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        Processed
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}