'use client';

import { useEffect, useRef } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  bgColor?: string;
  fgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  marginSize?: number;
}

export const QRCode = ({ 
  value, 
  size = 200, 
  className = '',
  bgColor = '#ffffff',
  fgColor = '#000000',
  level = 'M',
  includeMargin = true,
  marginSize = 4
}: QRCodeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    // Clear canvas first
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
    }

    // Dynamic import QRCode library to avoid SSR issues
    import('qrcode').then((QRCodeLib) => {
      // Generate real QR code using qrcode library
      QRCodeLib.toCanvas(canvas, value, {
        width: size,
        margin: includeMargin ? marginSize : 0,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: level,
      }).catch((error) => {
        console.error('Error generating QR code:', error);
        
        // Fallback: draw a simple error pattern
        if (ctx) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = fgColor;
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('QR Error', size / 2, size / 2);
        }
      });
    }).catch((error) => {
      console.error('Error loading QR code library:', error);
      
      // Fallback: draw a simple pattern
      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = fgColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', size / 2, size / 2);
      }
    });
  }, [value, size, bgColor, fgColor, level, includeMargin, marginSize]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
    />
  );
};

export const generateQRData = (data: string): string => {
  return data;
};
