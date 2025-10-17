'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Plus, QrCode, Monitor, Tablet } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { QRScannerModal } from './qr-scanner-modal';
import { DeviceApprovalModal } from './device-approval-modal';
import { useWalletStore } from '@/lib/store/wallet';
import { t } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

export const DevicesTab = () => {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingDevice, setPendingDevice] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [pendingDevices, setPendingDevices] = useState([]);
  const { pubkey } = useWalletStore();
  const { toast } = useToast();
  
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  // Load devices (connected + pending)
  useEffect(() => {
    if (pubkey) {
      loadConnectedDevices();
      loadPendingDevices();
    }
  }, [pubkey]);

  const loadPendingDevices = async () => {
    if (!pubkey) return;
    
    try {
      const resp = await fetch(`${apiBase}/api/device-import/pending/${pubkey}`);
      if (resp.ok) {
        const data = await resp.json();
        setPendingDevices(data.pendingShares || []);
      } else if (resp.status === 404) {
        setPendingDevices([]);
      }
    } catch (error) {
      console.error('Failed to load pending devices:', error);
    }
  };

  const loadConnectedDevices = async () => {
    if (!pubkey) return;

    try {
      const resp = await fetch(`${apiBase}/api/device-import/connected/${pubkey}`);
      if (resp.ok) {
        const data = await resp.json();
        setConnectedDevices(data.connectedDevices || []);
      } else if (resp.status === 404) {
        setConnectedDevices([]);
      }
    } catch (error) {
      console.error('Failed to load connected devices:', error);
    }
  };

  const handleQRScanned = async (qrData: string) => {
    console.log('handleQRScanned called with:', qrData);

    if (!pubkey) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet and try again.',
        variant: 'destructive'
      });
      return;
    }

    // Do NOT JSON.parse here. Backend will validate/parse the payload.
    if (!qrData || typeof qrData !== 'string' || qrData === 'undefined') {
      toast({
        title: 'Invalid QR',
        description: 'Could not read QR data. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const resp = await fetch(`${apiBase}/api/device-import/scan-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData,
          walletAddress: pubkey,
          ownerDeviceId: `device_${Date.now()}`
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        setPendingDevice({
          ...data.deviceShare.newDeviceData,
          shareId: data.deviceShare.shareId
        });
        setShowQRScanner(false);
        setShowApprovalModal(true);
      } else {
        const error = await resp.json();
        toast({
          title: 'Scan failed',
          description: error.error || 'Failed to process QR code',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('QR scan processing failed:', error);
      toast({
        title: 'Scan failed',
        description: 'Failed to process QR code',
        variant: 'destructive'
      });
    }
  };

  const handleApprove = async (shareId: string) => {
    try {
      const resp = await fetch(`${apiBase}/api/device-import/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, approved: true })
      });

      if (resp.ok) {
        toast({ title: 'Device approved', description: 'The device has been connected.' });
        await loadPendingDevices();
        await loadConnectedDevices();
      } else {
        const error = await resp.json();
        toast({
          title: 'Approval failed',
          description: error.error || 'Failed to approve device',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Approval failed:', error);
      toast({ title: 'Approval failed', description: 'Failed to approve device', variant: 'destructive' });
    }
  };

  const handleReject = async (shareId: string) => {
    try {
      const resp = await fetch(`${apiBase}/api/device-import/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, approved: false })
      });

      if (resp.ok) {
        toast({ title: 'Device rejected', description: 'The device request has been rejected.' });
        await loadPendingDevices();
      } else {
        const error = await resp.json();
        toast({
          title: 'Rejection failed',
          description: error.error || 'Failed to reject device',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Rejection failed:', error);
      toast({ title: 'Rejection failed', description: 'Failed to reject device', variant: 'destructive' });
    }
  };

  if (!pubkey) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2 text-gray-300">Wallet Not Connected</h4>
          <p className="text-gray-400 text-sm">
            Please connect your wallet to manage devices
          </p>
        </div>
      </div>
    );
  }

  // Build a unified list for simple status rendering
  const unifiedRows = [
    ...connectedDevices.map((d: any) => ({
      id: d._id || d.shareId || Math.random().toString(36).slice(2),
      platform: d.newDeviceData?.platform,
      browser: d.newDeviceData?.browser,
      os: d.newDeviceData?.os,
      date: d.approvedAt ? new Date(d.approvedAt) : null,
      status: 'Connected' as const,
    })),
    ...pendingDevices.map((d: any) => ({
      id: d._id || d.shareId || Math.random().toString(36).slice(2),
      platform: d.platform,
      browser: d.browser,
      os: d.os,
      date: new Date(d.createdAt),
      status: 'Pending approval' as const,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Devices</h3>
        <Button
          onClick={() => setShowQRScanner(true)}
          className="bg-[#16ffbb] hover:bg-[#16ffbb]/90 text-black shadow-lg hover:shadow-[#16ffbb]/25 transition-all duration-200"
        >
          <QrCode className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>

      {/* Unified rows without card layout */}
      {unifiedRows.length === 0 ? (
        <p className="text-gray-400 text-sm py-6 text-center">No devices</p>
      ) : (
        <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900/40">
          {unifiedRows.map((row) => (
            <div key={row.id} className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#16ffbb]/20 to-[#16ffbb]/10 rounded-full flex items-center justify-center shadow-sm">
                  <Smartphone className="h-5 w-5 text-[#16ffbb]" />
                </div>
                <div>
                  <p className="font-medium text-white">{row.platform}</p>
                  <p className="text-sm text-gray-300">{row.browser} on {row.os}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={
                  row.status === 'Connected'
                    ? 'text-xs text-emerald-400 font-medium'
                    : 'text-xs text-orange-400 font-medium'
                }>{row.status}</span>
                <p className="text-xs text-gray-400">{row.date ? row.date.toLocaleDateString() : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <QRScannerModal
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        onQRScanned={handleQRScanned}
      />

      <DeviceApprovalModal
        open={showApprovalModal}
        onOpenChange={setShowApprovalModal}
        deviceData={pendingDevice}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};
