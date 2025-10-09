'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { t } from '@/lib/i18n';

// Real device type based on API response
interface RealDevice {
  id: string;
  deviceId: string;
  name: string;
  platform: string;
  browser: string;
  os: string;
  ip: string;
  location?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  lastSeen: string;
  lastActivity: {
    path: string;
    at: string;
  };
  isActive: boolean;
}

interface RemoveDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: RealDevice | null;
  onConfirm: () => void;
}

export const RemoveDeviceDialog = ({
  open,
  onOpenChange,
  device,
  onConfirm,
}: RemoveDeviceDialogProps) => {
  if (!device) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center space-x-2'>
            <AlertTriangle className='h-5 w-5 text-destructive' />
            <span>{t('devices.removeDevice')}</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('devices.confirmRemove')}
            <br />
            <br />
            <strong>Device:</strong> {device.name} ({device.platform})
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {t('devices.removeDevice')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
