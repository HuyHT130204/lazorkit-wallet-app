'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useDeviceManager } from '@/hooks/use-device-manager';
import { useWalletStore } from '@/lib/store/wallet';

interface DeviceManagerContextType {
  isRegistered: boolean;
  isRegistering: boolean;
  error: string | null;
  deviceId: string;
  triggerHeartbeat: () => Promise<boolean>;
  retryRegistration: () => void;
}

const DeviceManagerContext = createContext<DeviceManagerContextType | null>(null);

interface DeviceManagerProviderProps {
  children: ReactNode;
}

export const DeviceManagerProvider = ({ children }: DeviceManagerProviderProps) => {
  const { hasWallet } = useWalletStore();
  
  // Derive a per-wallet dev token so mỗi tài khoản có luồng thiết bị riêng
  const pubkey = useWalletStore.getState().pubkey;
  const accessToken = hasWallet && pubkey ? `dev-${pubkey}` : null;

  const deviceManager = useDeviceManager({
    accessToken: accessToken || 'dev-anon',
    enabled: hasWallet, // Only register device when user has wallet
    heartbeatInterval: 120000 // 120 seconds
  });

  return (
    <DeviceManagerContext.Provider value={deviceManager}>
      {children}
    </DeviceManagerContext.Provider>
  );
};

export const useDeviceManagerContext = () => {
  const context = useContext(DeviceManagerContext);
  if (!context) {
    throw new Error('useDeviceManagerContext must be used within DeviceManagerProvider');
  }
  return context;
};
