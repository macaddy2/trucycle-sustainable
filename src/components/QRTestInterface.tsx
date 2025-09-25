import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QRCodeGenerator, QRCodeDisplay, QRCodeData, QRCodeScanner } from './QRCode'
import QRFlowGuide from './QRFlowGuide'
import { useKV } from '@/hooks/useKV'
import { toast } from 'sonner'

export function QRTestInterface() {
  const [currentUser] = useKV('current-user', null)
  const [showQRCode, setShowQRCode] = useState<QRCodeData | null>(null)
  const [testItemTitle, setTestItemTitle] = useState('Test Item - Vintage Chair')
  
  const handleQRGenerated = (qrData: QRCodeData) => {
    setShowQRCode(qrData)
    toast.success('QR code generated successfully!')
  }

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Please sign in to test QR code functionality</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="guide" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="guide">Test Guide</TabsTrigger>
          <TabsTrigger value="generator">QR Generator</TabsTrigger>
          <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
        </TabsList>
        
        <TabsContent value="guide">
          <QRFlowGuide />
        </TabsContent>
        
        <TabsContent value="generator">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Generator Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Test Item Title</label>
                <Input
                  value={testItemTitle}
                  onChange={(e) => setTestItemTitle(e.target.value)}
                  placeholder="Enter test item title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-3">Generate Donor QR</h3>
                  <QRCodeGenerator
                    itemId="test-item-001"
                    itemTitle={testItemTitle}
                    category="furniture"
                    condition="good"
                    co2Impact={15}
                    dropOffLocation="TruCycle Test Shop - Camden Market, London NW1 8AH"
                    type="donor"
                    onGenerated={handleQRGenerated}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Generate Collector QR</h3>
                  <QRCodeGenerator
                    itemId="test-item-001"
                    itemTitle={testItemTitle}
                    category="furniture"
                    condition="good"
                    co2Impact={15}
                    dropOffLocation="TruCycle Test Shop - Camden Market, London NW1 8AH"
                    type="collector"
                    onGenerated={handleQRGenerated}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scanner">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Scanner Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">How to Test:</h4>
                <ol className="text-sm text-green-800 space-y-1">
                  <li>1. Go to the "QR Generator" tab above</li>
                  <li>2. Generate a QR code (donor or collector)</li>
                  <li>3. Copy the QR code data from the generated QR dialog</li>
                  <li>4. Come back to this tab and paste it in the scanner below</li>
                  <li>5. Or use the pre-loaded sample data</li>
                </ol>
              </div>
              <QRCodeScanner />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showQRCode && (
        <QRCodeDisplay
          qrData={showQRCode}
          onClose={() => setShowQRCode(null)}
        />
      )}
    </div>
  )
}
