import { useEffect, useRef, useState } from 'react';
import { 
  registerDevice, 
  sendHeartbeat, 
  HeartbeatManager,
  getOrCreateDeviceId 
} from '@/src/utils/device';

interface UseDeviceManagerOptions {
  accessToken: string;
  enabled?: boolean;
  heartbeatInterval?: number;
}

export const useDeviceManager = ({ 
  accessToken, 
  enabled = true, 
  heartbeatInterval = 120000 
}: UseDeviceManagerOptions) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heartbeatManagerRef = useRef<HeartbeatManager | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  // Register device when component mounts or accessToken changes
  useEffect(() => {
    if (!enabled || !accessToken) return;

    const register = async () => {
      try {
        setIsRegistering(true);
        setError(null);
        
        const deviceId = getOrCreateDeviceId();
        deviceIdRef.current = deviceId;
        
        await registerDevice(accessToken);
        setIsRegistered(true);
        
        console.log('Device registered successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to register device';
        setError(errorMessage);
        console.error('Device registration failed:', err);
      } finally {
        setIsRegistering(false);
      }
    };

    register();
  }, [accessToken, enabled]);

  // Start heartbeat when device is registered
  useEffect(() => {
    if (!enabled || !isRegistered || !accessToken) return;

    // Create heartbeat manager
    heartbeatManagerRef.current = new HeartbeatManager(accessToken, heartbeatInterval);
    heartbeatManagerRef.current.start();

    return () => {
      if (heartbeatManagerRef.current) {
        heartbeatManagerRef.current.stop();
        heartbeatManagerRef.current = null;
      }
    };
  }, [isRegistered, accessToken, enabled, heartbeatInterval]);

  // Update heartbeat manager when accessToken changes
  useEffect(() => {
    if (heartbeatManagerRef.current && accessToken) {
      heartbeatManagerRef.current.updateToken(accessToken);
    }
  }, [accessToken]);

  // Manual heartbeat trigger
  const triggerHeartbeat = async () => {
    if (!accessToken) return false;
    
    try {
      return await sendHeartbeat(accessToken);
    } catch (err) {
      console.error('Manual heartbeat failed:', err);
      return false;
    }
  };

  // Get current device ID
  const getCurrentDeviceId = () => {
    return deviceIdRef.current || getOrCreateDeviceId();
  };

  return {
    isRegistered,
    isRegistering,
    error,
    deviceId: getCurrentDeviceId() || '',
    triggerHeartbeat,
    retryRegistration: () => {
      if (accessToken) {
        setIsRegistered(false);
        setError(null);
      }
    }
  };
};
