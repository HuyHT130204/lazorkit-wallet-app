'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle2, Clock, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface QRGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrData: {
    qrCode: string;
    shareId: string;
    expiresAt: string;
  } | null;
  onCancel: () => void;
  isPolling?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'expired' | 'failed';
}

export const QRGeneratorModal = ({
  open,
  onOpenChange,
  qrData,
  onCancel,
  isPolling = false,
  status = 'pending',
}: QRGeneratorModalProps) => {
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const qrImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!qrData?.expiresAt) return;

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expires = new Date(qrData.expiresAt).getTime();
      const totalSeconds = Math.max(0, Math.floor((expires - now) / 1000));
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      setTimeRemaining({ hours, minutes, seconds });
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [qrData?.expiresAt]);

  const formatTime = (value: number) => {
    return value.toString().padStart(2, '0');
  };

  const handleExportToPNG = async () => {
    if (!qrImageRef.current || !qrData) return;

    try {
      // Create a canvas to draw the QR code
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size (larger for better quality)
      const size = 512;
      canvas.width = size;
      canvas.height = size;

      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Load and draw QR code image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Draw QR code centered on canvas
            ctx.drawImage(img, 0, 0, size, size);
            
            // Convert to PNG and download
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }
              
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `qr-code-${qrData.shareId.slice(0, 8)}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              resolve(true);
            }, 'image/png');
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
        img.src = qrData.qrCode;
      });
    } catch (error) {
      console.error('Failed to export QR code:', error);
    }
  };

  if (!open || !qrData) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-700 pb-4">
          <CardTitle className="text-xl font-bold text-white">
            Connect to Existing Wallet
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-300 text-sm leading-relaxed">
              Scan this QR code with your existing device to connect this device to your wallet
            </p>
          </div>

          {/* QR Code Display - Clean white/black style, no borders or effects */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg">
              <img
                ref={qrImageRef}
                src={qrData.qrCode}
                alt="Device Import QR Code"
                className="w-64 h-64"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
          </div>

          {/* Status Indicator */}
          {isPolling && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 text-[#16ffbb] animate-spin" />
              <span className="text-gray-300">Waiting for approval...</span>
            </div>
          )}

          {status === 'approved' && (
            <div className="flex items-center justify-center gap-2 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Device approved! Connecting...</span>
            </div>
          )}

          {status === 'rejected' && (
            <div className="flex items-center justify-center gap-2 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <X className="h-4 w-4 text-red-400" />
              <span className="text-red-400 font-medium">Connection rejected</span>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex items-center justify-center gap-2 text-sm bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-orange-400 font-medium">QR code expired</span>
            </div>
          )}

          {status === 'failed' && (
            <div className="flex items-center justify-center gap-2 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <X className="h-4 w-4 text-red-400" />
              <span className="text-red-400 font-medium">Connection failed. Please try again.</span>
            </div>
          )}

          {/* Time Remaining - Simple countdown format 00:00:00 */}
          <div className="flex items-center justify-center gap-3 py-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">Expires in</span>
            <div className="flex items-center gap-1 font-mono text-lg font-semibold text-white">
              <span>{formatTime(timeRemaining.hours)}</span>
              <span className="text-gray-500">:</span>
              <span>{formatTime(timeRemaining.minutes)}</span>
              <span className="text-gray-500">:</span>
              <span>{formatTime(timeRemaining.seconds)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleExportToPNG}
              className="w-full bg-[#16ffbb] hover:bg-[#16ffbb]/90 text-black shadow-lg hover:shadow-[#16ffbb]/25 transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to PNG
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

