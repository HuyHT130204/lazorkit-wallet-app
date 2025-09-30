'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Trash2, Plus, MapPin, Clock, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AddDeviceModal } from './add-device-modal';
import { RemoveDeviceDialog } from './remove-device-dialog';
import { t } from '@/lib/i18n';
import { getUserDevices, revokeDevice, getOrCreateDeviceId } from '@/src/utils/device';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

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

export const DevicesList = () => {
  const [devices, setDevices] = useState<RealDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const [removeDeviceDialogOpen, setRemoveDeviceDialogOpen] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<RealDevice | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [locationCache, setLocationCache] = useState<Record<string, string>>({});
  const [coordinateCache, setCoordinateCache] = useState<Record<string, string>>({});

  // Mock access token for development
  const accessToken = 'demo-token';

  useEffect(() => {
    setCurrentDeviceId(getOrCreateDeviceId());
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const fetchedDevices = await getUserDevices(accessToken);
      setDevices(fetchedDevices);
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = (device: RealDevice) => {
    setDeviceToRemove(device);
    setRemoveDeviceDialogOpen(true);
  };

  const confirmRemoveDevice = async () => {
    if (!deviceToRemove) return;

    try {
      await revokeDevice(accessToken, deviceToRemove.deviceId);
      
      // Remove from local state
      setDevices(devices.filter(d => d.deviceId !== deviceToRemove.deviceId));
      
      toast({
        title: 'Device revoked',
        description: `${deviceToRemove.name} has been revoked successfully`,
      });

      console.log('device_removed', {
        deviceId: deviceToRemove.deviceId,
        deviceName: deviceToRemove.name,
      });
    } catch (error) {
      console.error('Failed to revoke device:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke device',
        variant: 'destructive',
      });
    } finally {
      setRemoveDeviceDialogOpen(false);
      setDeviceToRemove(null);
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  // Function to get location string from coordinates or IP
  const getLocationString = (device: RealDevice) => {
    if (device.location && device.location.lat && device.location.lng) {
      return `${device.location.lat.toFixed(4)}, ${device.location.lng.toFixed(4)}`;
    }
    return 'Location not available';
  };

  // Function to get city/country from coordinates (reverse geocoding)
  const getLocationFromCoordinates = async (lat: number, lng: number) => {
    const key = `${lat},${lng}`;
    if (coordinateCache[key]) {
      return coordinateCache[key];
    }

    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      
      if (data.city && data.countryName) {
        const location = `${data.city}, ${data.countryName}`;
        setCoordinateCache(prev => ({ ...prev, [key]: location }));
        return location;
      }
    } catch (error) {
      console.log('Failed to get location from coordinates:', error);
    }
    
    return null;
  };

  // Function to get city/country from IP (fallback)
  const getLocationFromIP = async (ip: string) => {
    if (locationCache[ip]) {
      return locationCache[ip];
    }

    try {
      const response = await fetch(`https://ip-api.com/json/${ip}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        const location = `${data.city}, ${data.country}`;
        setLocationCache(prev => ({ ...prev, [ip]: location }));
        return location;
      }
    } catch (error) {
      console.log('Failed to get location from IP:', error);
    }
    
    return null;
  };

  const isCurrentDevice = (device: RealDevice) => {
    return device.deviceId === currentDeviceId;
  };

  // Component to display location with smart fallback
  const LocationDisplay = ({ device }: { device: RealDevice }) => {
    const [displayLocation, setDisplayLocation] = useState<string>('Loading...');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const loadLocation = async () => {
        setIsLoading(true);
        
        // Try coordinates first
        if (device.location && device.location.lat && device.location.lng) {
          const coordKey = `${device.location.lat},${device.location.lng}`;
          
          // Check cache first
          if (coordinateCache[coordKey]) {
            setDisplayLocation(coordinateCache[coordKey]);
            setIsLoading(false);
            return;
          }
          
          // Try reverse geocoding
          const location = await getLocationFromCoordinates(device.location.lat, device.location.lng);
          if (location) {
            setDisplayLocation(location);
            setIsLoading(false);
            return;
          }
        }
        
        // Fallback to IP-based location
        const ipLocation = await getLocationFromIP(device.ip);
        if (ipLocation) {
          setDisplayLocation(ipLocation);
        } else {
          setDisplayLocation('Location not available');
        }
        
        setIsLoading(false);
      };

      loadLocation();
    }, [device.location, device.ip, coordinateCache]);

    return (
      <div className='flex items-center text-sm text-muted-foreground'>
        <MapPin className='h-3 w-3 mr-1' />
        {isLoading ? (
          <span className='animate-pulse'>Loading location...</span>
        ) : (
          <span>{displayLocation}</span>
        )}
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>{t('devices.title')}</h3>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setAddDeviceModalOpen(true)}
        >
          <Plus className='mr-2 h-4 w-4' />
          {t('devices.addDevice')}
        </Button>
      </div>

      {/* Devices List */}
      <div className='space-y-3'>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className='p-4'>
                  <div className='h-5 w-1/2 bg-muted/40 rounded animate-pulse mb-2' />
                  <div className='h-4 w-1/3 bg-muted/30 rounded animate-pulse' />
                </CardContent>
              </Card>
            ))
          : devices.map((device) => (
              <Card key={device.id} className={isCurrentDevice(device) ? 'ring-2 ring-blue-500' : ''}>
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-start space-x-3'>
                      <div className='w-10 h-10 bg-muted rounded-full flex items-center justify-center'>
                        <Smartphone className='h-5 w-5 text-muted-foreground' />
                      </div>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <div className='font-semibold'>{device.name}</div>
                          {isCurrentDevice(device) && (
                            <span className='text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full'>
                              Current
                            </span>
                          )}
                          <div className='flex items-center'>
                            {device.isActive ? (
                              <Wifi className='h-3 w-3 text-green-500' />
                            ) : (
                              <WifiOff className='h-3 w-3 text-gray-400' />
                            )}
                          </div>
                        </div>
                        <div className='text-sm text-muted-foreground mb-2'>
                          {device.browser} on {device.os} • {device.platform}
                        </div>
                        <div className='space-y-1'>
                          <div className='flex items-center text-sm text-muted-foreground'>
                            <Clock className='h-3 w-3 mr-1' />
                            {t('devices.lastActive')}: {formatLastSeen(device.lastSeen)}
                          </div>
                          <LocationDisplay device={device} />
                          <div className='text-xs text-muted-foreground space-y-1'>
                            <div>IP: {device.ip}</div>
                            <div>Last path: {device.lastActivity.path}</div>
                            {device.location && device.location.lat && device.location.lng && (
                              <div className='text-xs opacity-60'>
                                Coordinates: {device.location.lat.toFixed(4)}, {device.location.lng.toFixed(4)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isCurrentDevice(device) && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRemoveDevice(device)}
                        className='text-destructive hover:text-destructive'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Empty State */}
      {!loading && devices.length === 0 && (
        <Card>
          <CardContent className='p-6 text-center'>
            <Smartphone className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='font-semibold mb-2'>No devices connected</h3>
            <p className='text-muted-foreground mb-4'>
              Add a device to manage your wallet across multiple platforms.
            </p>
            <Button onClick={() => setAddDeviceModalOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              {t('devices.addDevice')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AddDeviceModal
        open={addDeviceModalOpen}
        onOpenChange={setAddDeviceModalOpen}
      />

      <RemoveDeviceDialog
        open={removeDeviceDialogOpen}
        onOpenChange={setRemoveDeviceDialogOpen}
        device={deviceToRemove}
        onConfirm={confirmRemoveDevice}
      />
    </div>
  );
};
