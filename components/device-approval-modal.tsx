'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Smartphone, Monitor, Tablet, X, Check, XCircle } from 'lucide-react';

interface DeviceApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceData: any;
  onApprove: (shareId: string) => void;
  onReject: (shareId: string) => void;
}

export const DeviceApprovalModal = ({ 
  open, 
  onOpenChange, 
  deviceData, 
  onApprove, 
  onReject 
}: DeviceApprovalModalProps) => {
  const [loading, setLoading] = useState(false);

  if (!open || !deviceData) return null;

  const getDeviceIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('mobile') || platformLower.includes('phone')) {
      return Smartphone;
    } else if (platformLower.includes('tablet') || platformLower.includes('ipad')) {
      return Tablet;
    }
    return Monitor;
  };

  const DeviceIcon = getDeviceIcon(deviceData.platform);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(deviceData.shareId);
      onOpenChange(false);
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(deviceData.shareId);
      onOpenChange(false);
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-700">
          <CardTitle className="text-lg text-white">Device Connection Request</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="hover:bg-gray-700 text-gray-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#16ffbb]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <DeviceIcon className="h-8 w-8 text-[#16ffbb]" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">New Device Wants to Connect</h3>
            <p className="text-sm text-gray-300">
              A new device wants to access your wallet. Review the details below.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Device Type</span>
                <Badge variant="outline" className="text-xs border-[#16ffbb]/50 text-[#16ffbb]">
                  {deviceData.platform}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Browser</span>
                <span className="text-sm text-gray-400">{deviceData.browser}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Operating System</span>
                <span className="text-sm text-gray-400">{deviceData.os}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Screen Resolution</span>
                <span className="text-sm text-gray-400">
                  {deviceData.screen?.w} × {deviceData.screen?.h}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Language</span>
                <span className="text-sm text-gray-400">{deviceData.language}</span>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-300">
                <strong>Security Note:</strong> Only approve devices you trust. 
                This device will have full access to your wallet.
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={loading}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-[#16ffbb] hover:bg-[#16ffbb]/90 text-black"
            >
              <Check className="h-4 w-4 mr-2" />
              {loading ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

