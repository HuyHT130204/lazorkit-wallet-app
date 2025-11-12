'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Plus, QrCode, Monitor, Tablet, Loader2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { QRScannerModal } from './qr-scanner-modal';
import { QRGeneratorModal } from './qr-generator-modal';
import { DeviceApprovalModal } from './device-approval-modal';
import { useWalletStore } from '@/lib/store/wallet';
import { useWallet } from '@/hooks/use-lazorkit-wallet';
import { t } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export const DevicesTab = () => {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingDevice, setPendingDevice] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [pendingDevices, setPendingDevices] = useState([]);
  const [failedDevices, setFailedDevices] = useState([]);
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  const [failedDeviceInfo, setFailedDeviceInfo] = useState<any>(null);
  const [qrData, setQRData] = useState<any>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [qrStatus, setQrStatus] = useState<'pending' | 'approved' | 'rejected' | 'expired' | 'failed'>('pending');
  const { pubkey, setHasWallet, setPubkey, setHasPasskey } = useWalletStore();
  const wallet = useWallet();
  const router = useRouter();
  const { toast } = useToast();
  
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  // Load devices (connected + pending + failed)
  useEffect(() => {
    if (pubkey) {
      const loadAllDevices = async () => {
        await Promise.all([
          loadConnectedDevices(),
          loadPendingDevices(),
          loadFailedDevices()
        ]);
      };
      
      loadAllDevices();
      
      // Poll for device status changes periodically
      const pollInterval = setInterval(() => {
        // Reload all devices to catch status changes
        loadConnectedDevices();
        loadPendingDevices();
        loadFailedDevices();
      }, 3000); // Check every 3 seconds
      
      return () => clearInterval(pollInterval);
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
        const connected = data.connectedDevices || [];
        
        // Filter out any devices that might be in failed state (safety check)
        // This prevents race conditions where status hasn't been updated yet
        const validConnected = connected.filter((device: any) => {
          // Only include devices that are truly approved (not failed)
          return device.status !== 'failed';
        });
        
        setConnectedDevices(validConnected);
      } else if (resp.status === 404) {
        setConnectedDevices([]);
      }
    } catch (error) {
      console.error('Failed to load connected devices:', error);
    }
  };

  const loadFailedDevices = async () => {
    if (!pubkey) return;
    
    try {
      const resp = await fetch(`${apiBase}/api/device-import/failed/${pubkey}`);
      if (resp.ok) {
        const data = await resp.json();
        const newFailedDevices = data.failedDevices || [];
        
        // Check if there are new failed devices (compare by shareId)
        const currentFailedIds = new Set(failedDevices.map((d: any) => d.shareId || d._id));
        const newFailedIds = new Set(newFailedDevices.map((d: any) => d.shareId || d._id));
        const trulyNewFailed = newFailedDevices.filter((d: any) => {
          const id = d.shareId || d._id;
          return !currentFailedIds.has(id);
        });
        
        if (trulyNewFailed.length > 0) {
          // Show dialog for newly failed device
          const newestFailed = trulyNewFailed[0];
          setFailedDeviceInfo(newestFailed);
          setShowFailedDialog(true);
          
          // Also reload connected devices to remove the failed one
          await loadConnectedDevices();
        }
        
        setFailedDevices(newFailedDevices);
      } else if (resp.status === 404) {
        setFailedDevices([]);
      }
    } catch (error) {
      console.error('Failed to load failed devices:', error);
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
        body: JSON.stringify({ 
          shareId, 
          approved: true,
          walletAddress: pubkey // Send wallet address when approving
        })
      });

      if (resp.ok) {
        toast({ title: 'Device approved', description: 'Waiting for device to connect...' });
        await loadPendingDevices();
        // Don't load connected devices immediately - wait for verification
        // Start polling for status changes
        setTimeout(async () => {
          await loadConnectedDevices();
          await loadFailedDevices();
        }, 3000); // Check after 3 seconds
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

  // Generate QR for new device
  const handleGenerateQR = async () => {
    if (isGeneratingQR) return;
    setIsGeneratingQR(true);

    try {
      if (!wallet?.connectPasskey) {
        throw new Error('Passkey login not available');
      }

      const passkeyData = await wallet.connectPasskey();
      if (!passkeyData) throw new Error('Failed to login with passkey');

      setHasPasskey?.(true);

      // Get device metadata
      const deviceMetadata = {
        deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: {
          w: window.screen.width,
          h: window.screen.height
        },
        language: navigator.language || navigator.languages?.[0] || 'en-US'
      };

      // Generate QR code for device import
      const resp = await fetch(`${apiBase}/api/device-import/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passkeyData,
          deviceMetadata
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to generate QR code');
      }

      const data = await resp.json();
      
      // Store QR data for polling
      localStorage.setItem('device-import-shareId', data.shareId);
      localStorage.setItem('device-import-passkeyData', JSON.stringify(passkeyData));
      
      // Show QR code modal and start polling
      setShowQRGenerator(true);
      setQRData(data);
      setQrStatus('pending');
      startPolling(data.shareId, passkeyData);
      
    } catch (e: any) {
      console.error('Generate QR failed:', e);
      toast({
        title: 'Failed to generate QR',
        description: e?.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Poll for approval status
  const startPolling = (shareId: string, passkeyData: any) => {
    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`${apiBase}/api/device-import/status/${shareId}`);
        if (resp.ok) {
          const data = await resp.json();
          setQrStatus(data.status as any);
          
          if (data.status === 'approved') {
            // Device approved, verify passkey address on chain
            const walletAddress = data.walletAddress;
            console.log('✅ Device approved, walletAddress:', walletAddress);
            
            if (walletAddress) {
              // Verify passkey address exists on chain
              console.log('🔍 Starting verification...');
              const verified = await verifyPasskeyAddressOnChain(passkeyData, walletAddress);
              
              if (verified) {
                // Connect successful
                console.log('✅ Verification successful, connecting device...');
                setHasWallet?.(true);
                setPubkey?.(walletAddress);
                localStorage.removeItem('device-import-shareId');
                localStorage.removeItem('device-import-passkeyData');
                clearInterval(interval);
                setPollingInterval(null);
                setIsPolling(false);
                setShowQRGenerator(false);
                toast({
                  title: 'Device connected',
                  description: 'Your device has been successfully connected to your wallet.',
                });
                router.push('/buy');
              } else {
                // Report verification failure to backend
                console.error('❌ Verification failed, reporting to backend...');
                try {
                  const reportResp = await fetch(`${apiBase}/api/device-import/report-verification-failure`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      shareId,
                      reason: 'Could not verify wallet address on chain'
                    })
                  });
                  
                  if (reportResp.ok) {
                    console.log('✅ Failure reported successfully');
                  } else {
                    console.error('❌ Failed to report failure:', await reportResp.json().catch(() => ({})));
                  }
                } catch (reportError) {
                  console.error('❌ Error reporting verification failure:', reportError);
                }
                
                clearInterval(interval);
                setPollingInterval(null);
                setIsPolling(false);
                setQrStatus('failed');
                toast({
                  title: 'Verification failed',
                  description: 'Could not verify wallet address on chain. Please try again.',
                  variant: 'destructive'
                });
              }
            } else {
              console.error('❌ No walletAddress in approval response');
              toast({
                title: 'Approval error',
                description: 'Wallet address not provided in approval response.',
                variant: 'destructive'
              });
            }
          } else if (data.status === 'rejected' || data.status === 'expired') {
            clearInterval(interval);
            setPollingInterval(null);
            setIsPolling(false);
            toast({
              title: data.status === 'rejected' ? 'Connection rejected' : 'QR code expired',
              description: data.status === 'rejected' 
                ? 'The device connection was rejected.' 
                : 'The QR code has expired. Please generate a new one.',
              variant: 'destructive'
            });
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000); // Poll every 2 seconds
    
    setPollingInterval(interval);
  };

  // Verify passkey address on Solana chain
  const verifyPasskeyAddressOnChain = async (passkeyData: any, walletAddress: string): Promise<boolean> => {
    try {
      console.log('🔍 Verifying passkey address on chain:', {
        walletAddress,
        hasPasskeyData: !!passkeyData,
        hasSmartWalletAddress: !!passkeyData?.smartWalletAddress
      });

      // Call backend to verify passkey address on chain
      const resp = await fetch(`${apiBase}/api/device-import/verify-passkey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passkeyData,
          walletAddress
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        console.log('📊 Verify response:', data);
        
        if (data.verified === true) {
          console.log('✅ Verification successful!');
          // If walletAddress was updated by backend, use the new one
          if (data.walletAddress && data.walletAddress !== walletAddress) {
            console.log('🔄 Wallet address updated:', {
              old: walletAddress,
              new: data.walletAddress
            });
          }
          return true;
        } else {
          console.warn('❌ Verification failed:', data.message || 'Unknown reason');
          return false;
        }
      } else {
        const errorData = await resp.json().catch(() => ({}));
        console.error('❌ Verify request failed:', resp.status, errorData);
        
        // Log detailed error for debugging
        if (errorData?.error || errorData?.message) {
          console.error('Error details:', {
            error: errorData.error,
            message: errorData.message,
            details: errorData.details
          });
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Verify passkey address error:', error);
      return false;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Cleanup on modal close
  const handleCancelQR = () => {
    setShowQRGenerator(false);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsPolling(false);
    localStorage.removeItem('device-import-shareId');
    localStorage.removeItem('device-import-passkeyData');
  };

  // New device - show generate QR option
  if (!pubkey) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 space-y-4">
          <div className="relative inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#16ffbb]/20 to-[#16ffbb]/10 rounded-full blur opacity-75 animate-pulse"></div>
            <Smartphone className="relative h-16 w-16 text-[#16ffbb] mx-auto" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-semibold text-white">Connect to Existing Wallet</h4>
            <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
              Generate a QR code to connect this device to your existing smart wallet
            </p>
          </div>
          <Button
            onClick={handleGenerateQR}
            disabled={isGeneratingQR}
            className="bg-[#16ffbb] hover:bg-[#16ffbb]/90 text-black shadow-lg hover:shadow-[#16ffbb]/25 transition-all duration-200 mt-4"
          >
            {isGeneratingQR ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating QR...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Generate QR Code
              </>
            )}
          </Button>
        </div>

        <QRGeneratorModal
          open={showQRGenerator}
          onOpenChange={setShowQRGenerator}
          qrData={qrData}
          onCancel={handleCancelQR}
          isPolling={isPolling}
          status={qrStatus}
        />
      </div>
    );
  }

  // Build a unified list for simple status rendering
  // IMPORTANT: Filter out any devices that appear in both connected and failed lists
  // This prevents showing a device as "Connected" when it has actually failed
  const connectedShareIds = new Set(connectedDevices.map((d: any) => d.shareId || d._id));
  const failedShareIds = new Set(failedDevices.map((d: any) => d.shareId || d._id));
  
  // Remove failed devices from connected list
  const validConnectedDevices = connectedDevices.filter((d: any) => {
    const shareId = d.shareId || d._id;
    return !failedShareIds.has(shareId);
  });
  
  const unifiedRows = [
    ...validConnectedDevices.map((d: any) => ({
      id: d._id || d.shareId || Math.random().toString(36).slice(2),
      shareId: d.shareId,
      platform: d.newDeviceData?.platform,
      browser: d.newDeviceData?.browser,
      os: d.newDeviceData?.os,
      date: d.approvedAt ? new Date(d.approvedAt) : null,
      status: 'Connected' as const,
    })),
    ...pendingDevices.map((d: any) => ({
      id: d._id || d.shareId || Math.random().toString(36).slice(2),
      shareId: d.shareId,
      platform: d.platform || d.newDeviceData?.platform,
      browser: d.browser || d.newDeviceData?.browser,
      os: d.os || d.newDeviceData?.os,
      date: new Date(d.createdAt),
      status: 'Pending approval' as const,
    })),
    ...failedDevices.map((d: any) => ({
      id: d._id || d.shareId || Math.random().toString(36).slice(2),
      shareId: d.shareId,
      platform: d.newDeviceData?.platform,
      browser: d.newDeviceData?.browser,
      os: d.newDeviceData?.os,
      date: d.failedAt ? new Date(d.failedAt) : null,
      status: 'Connection failed' as const,
      failureReason: d.failureReason,
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
                    : row.status === 'Connection failed'
                    ? 'text-xs text-red-400 font-medium'
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

      {/* Failed Device Dialog */}
      {showFailedDialog && failedDeviceInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-red-500/30 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-red-500/30 pb-4">
              <CardTitle className="text-xl font-bold text-red-400">
                Connection Failed
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFailedDialog(false)}
                className="h-8 w-8 hover:bg-gray-700 text-gray-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                  <X className="h-6 w-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Device connection failed</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {failedDeviceInfo.newDeviceData?.platform || 'Unknown device'}
                  </p>
                </div>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-gray-300 mb-2">
                  <span className="font-medium text-red-400">Reason:</span>
                </p>
                <p className="text-sm text-gray-400">
                  {failedDeviceInfo.failureReason || 'Could not verify wallet address on chain'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFailedDialog(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowFailedDialog(false);
                    // Optionally retry or remove failed device
                  }}
                  className="flex-1 bg-[#16ffbb] hover:bg-[#16ffbb]/90 text-black"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
