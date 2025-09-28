'use client';

import { useState } from 'react';
import { Smartphone, QrCode, Copy, Link } from 'lucide-react';
import { Button } from './ui/button';
import { ViewportModal } from './ui/viewport-modal';
import { Card, CardContent } from './ui/card';
import { CopyButton } from './ui/copy-button';
import { QRCode } from '@/lib/utils/qr';
import { useWalletStore } from '@/lib/store/wallet';
import { t } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface AddDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddDeviceModal = ({ open, onOpenChange }: AddDeviceModalProps) => {
  const { addDevice } = useWalletStore();
  const [pairingLink] = useState('https://lazorkit.com/pair/abc123xyz');

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pairingLink);
      console.log('device_link_copied', { pairingLink });
      toast({
        title: t('devices.linkCopied'),
        description: 'Pairing link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy pairing link',
        variant: 'destructive',
      });
    }
  };

  const handleAddDemoDevice = () => {
    const newDevice = {
      id: Date.now().toString(),
      name: 'Demo Device',
      platform: 'Web' as const,
      lastActive: 'Just now',
      location: 'Current Location',
    };

    addDevice(newDevice);
    console.log('device_add_opened', {
      deviceId: newDevice.id,
      deviceName: newDevice.name,
    });

    toast({
      title: 'Device added',
      description: 'Demo device has been added successfully',
    });

    onOpenChange(false);
  };

  return (
    <ViewportModal open={open} onOpenChange={onOpenChange} title={t('devices.addDevice')} className='max-w-md'>
        <div className='space-y-4 p-6'>
          {/* Instructions */}
          <div className='text-center space-y-2'>
            <p className='text-muted-foreground mobile-text-xs'>
              {t('devices.addDeviceInstructions')}
            </p>
          </div>

          {/* QR Code */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex justify-center mb-3'>
                <div className='bg-white p-3 rounded-lg'>
                  <QRCode value={pairingLink} size={140} />
                </div>
              </div>
              <p className='text-xs text-muted-foreground text-center mobile-text-xs'>
                {t('devices.qrCode')}
              </p>
            </CardContent>
          </Card>

          {/* Pairing Link */}
          <div className='space-y-2'>
            <label className='text-sm font-medium mobile-text-xs'>
              {t('devices.pairingLink')}
            </label>
            <div className='flex items-center space-x-2'>
              <div className='flex-1 p-2 bg-muted/50 rounded-lg'>
                <p className='text-xs font-mono break-all mobile-text-xs'>{pairingLink}</p>
              </div>
              <CopyButton text={pairingLink} />
            </div>
          </div>

          {/* Demo Button */}
          <div className='p-3 bg-muted/50 rounded-lg'>
            <Button
              onClick={handleAddDemoDevice}
              className='w-full'
              size='sm'
            >
              <Smartphone className='mr-2 h-4 w-4' />
              {t('devices.addDemoDevice')}
            </Button>
          </div>

          {/* Actions */}
          <div className='flex space-x-2'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='flex-1'
              size='sm'
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleCopyLink} 
              className='flex-1'
              size='sm'
            >
              <Copy className='mr-2 h-4 w-4' />
              {t('devices.copyLink')}
            </Button>
          </div>
        </div>
    </ViewportModal>
  );
};
