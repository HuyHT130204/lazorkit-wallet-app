'use client';

import { useState, useRef, useEffect } from 'react';
import QrScannerLib from 'qr-scanner';

// Ensure the Web Worker is available for live decoding (faster and more reliable)
// Use a pinned CDN path to avoid bundler path resolution issues
// Note: You can move the worker file into /public and point to it if preferred
if (typeof window !== 'undefined' && (QrScannerLib as any).WORKER_PATH == null) {
  (QrScannerLib as any).WORKER_PATH = 'https://unpkg.com/qr-scanner@1.4.2/qr-scanner-worker.min.js';
}
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Camera, AlertCircle, Upload, Download, Image as ImageIcon } from 'lucide-react';
import QRCode from 'qrcode';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQRScanned: (data: string) => void;
}

export const QRScannerModal = ({ open, onOpenChange, onQRScanned }: QRScannerModalProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'upload'>('scan');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScannerLib | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const setupScanner = async () => {
      if (!open || activeTab !== 'scan') return;
      try {
        // Reset single-shot flag each time modal opens scan tab
        hasScannedRef.current = false;

        // Basic capability check
        const hasCamera = await QrScannerLib.hasCamera();
        if (!hasCamera) {
          setHasPermission(false);
          setError('No camera found on this device');
          return;
        }

        // Probe permission first
        await navigator.mediaDevices.getUserMedia({ video: true });
        if (!isMounted) return;
        setHasPermission(true);
        setError(null);

        // Initialize QrScanner on our own video element
        if (videoRef.current) {
          // Stop any previous scanner
          try { await scannerRef.current?.stop(); } catch {}
          scannerRef.current?.destroy?.();
          scannerRef.current = new QrScannerLib(
            videoRef.current,
            async (result) => {
              const text = typeof result === 'string' ? result : (result as any)?.data || (result as any)?.text;
              if (!text || text === 'undefined') return;
              if (hasScannedRef.current) return;
              hasScannedRef.current = true;
              try {
                // Stop scanning immediately to avoid duplicate submissions
                await scannerRef.current?.stop();
              } catch {}
              onOpenChange(false);
              onQRScanned(text);
            },
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
              maxScansPerSecond: 12,
              preferredCamera: 'environment',
              returnDetailedScanResult: true,
            }
          );

          // Improve detection in dark or inverted codes
          try { (scannerRef.current as any)?.setInversionMode?.('both'); } catch {}
          await scannerRef.current.start();
        }
      } catch (err) {
        console.error('Camera permission denied or scanner failed:', err);
        if (!isMounted) return;
        setHasPermission(false);
        setError('Camera permission is required to scan QR codes');
      }
    };

    setupScanner();

    return () => {
      isMounted = false;
      // Cleanup scanner on unmount or tab close/switch
      try { scannerRef.current?.stop(); } catch {}
      scannerRef.current?.destroy?.();
      scannerRef.current = null;
    };
  }, [open, activeTab, onQRScanned]);

  // Live scanner now handled by QrScannerLib; keep only image upload path below

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsProcessing(true);
      
      // Read the file as data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageDataUrl = e.target?.result as string;
          
          // Use QrScanner to decode the QR code from the image
          const result = await QrScannerLib.scanImage(imageDataUrl);
          
          if (result) {
            // Forward raw string to parent; backend will validate
            onQRScanned(result as string);
            onOpenChange(false);
          } else {
            setError('No QR code found in the image. Please try another image.');
          }
        } catch (scanError) {
          console.error('QR scan error:', scanError);
          setError('Failed to read QR code from image. Please try another image.');
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      setError('Failed to process the uploaded file.');
      setIsProcessing(false);
    }
  };

  const saveQRImage = async (qrData: string) => {
    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#16ffbb',
          light: '#000000'
        }
      });
      
      const link = document.createElement('a');
      link.download = 'qr-code.png';
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Failed to save QR code:', error);
      setError('Failed to save QR code');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-700">
          <CardTitle className="text-lg text-white">QR Code Scanner</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="hover:bg-gray-700 text-gray-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-2 bg-gray-800 rounded-lg p-1">
            <Button
              variant={activeTab === 'scan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('scan')}
              className={`flex-1 ${activeTab === 'scan' 
                ? 'bg-[#16ffbb] text-black hover:bg-[#16ffbb]/90' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan
            </Button>
            <Button
              variant={activeTab === 'upload' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 ${activeTab === 'upload' 
                ? 'bg-[#16ffbb] text-black hover:bg-[#16ffbb]/90' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>

          {activeTab === 'scan' ? (
            <>
              {hasPermission === false ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-300 mb-4">{error}</p>
                  <Button 
                    onClick={() => onOpenChange(false)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Close
                  </Button>
                </div>
              ) : hasPermission === true ? (
                <div className="space-y-4">
                  <div className="relative w-full h-64 bg-gray-800 rounded-lg overflow-hidden border-2 border-[#16ffbb]/30">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    <div className="absolute inset-0 border-2 border-[#16ffbb] rounded-lg pointer-events-none animate-pulse"></div>
                  </div>
                  {error && (
                    <div className="text-center text-red-300 text-sm bg-red-900/20 rounded-lg p-3">
                      {error}
                    </div>
                  )}
                  <p className="text-center text-sm text-gray-300">
                    Point your camera at the QR code from the new device
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-[#16ffbb] mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-300">Requesting camera permission...</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 text-[#16ffbb] mx-auto mb-4" />
                <p className="text-gray-300 mb-4">Upload QR Code Image</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#16ffbb] hover:bg-[#16ffbb]/90 text-black"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Image
                    </>
                  )}
                </Button>
                {isProcessing && (
                  <p className="text-gray-400 text-sm mt-2">
                    Reading QR code from image...
                  </p>
                )}
              </div>
              {error && (
                <div className="text-center text-red-300 text-sm bg-red-900/20 rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Save QR Button */}
          <div className="pt-4 border-t border-gray-700">
            <Button
              onClick={() => {
                const sampleQRData = JSON.stringify({
                  type: 'device_import',
                  shareId: 'sample_' + Date.now(),
                  timestamp: new Date().toISOString()
                });
                saveQRImage(sampleQRData);
              }}
              variant="outline"
              className="w-full border-[#16ffbb]/50 text-[#16ffbb] hover:bg-[#16ffbb]/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Save Sample QR Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
