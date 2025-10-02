'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Trash2, Plus, MapPin, Clock, Wifi, WifiOff, Monitor, Tablet, ChevronDown } from 'lucide-react';
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
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());

  // Per-account dev token to isolate device list
  const pubkey = typeof window !== 'undefined' ? (window as any).__lz_pubkey || '' : '';
  const accessToken = pubkey ? `dev-${pubkey}` : 'dev-anon';

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

  // Get device icon based on platform
  const getDeviceIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('mobile') || platformLower.includes('phone')) {
      return Smartphone;
    } else if (platformLower.includes('tablet') || platformLower.includes('ipad')) {
      return Tablet;
    }
    return Monitor;
  };

  const toggleExpanded = (deviceId: string) => {
    setExpandedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
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
      <span className='truncate'>
        {isLoading ? 'Loading...' : displayLocation}
      </span>
    );
  };

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between px-1'>
        <div>
          <h3 className='text-lg font-semibold text-white'>{t('devices.title')}</h3>
          <p className='text-xs text-gray-500 mt-0.5'>
            Manage devices connected to your account
          </p>
        </div>
        <Button
          onClick={() => setAddDeviceModalOpen(true)}
          className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 h-9 flex items-center gap-1.5 transition-all duration-200'
        >
          <Plus className='h-4 w-4' />
          <span className='text-sm font-medium'>Add Device</span>
        </Button>
      </div>

      {/* Devices List */}
      <div className='space-y-2.5'>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i}
                className='bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 animate-pulse'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-11 h-11 bg-gray-700/50 rounded-lg flex-shrink-0' />
                  <div className='flex-1 space-y-2'>
                    <div className='h-4 w-2/5 bg-gray-700/50 rounded' />
                    <div className='h-3 w-3/5 bg-gray-700/50 rounded' />
                  </div>
                </div>
              </div>
            ))
          : devices.map((device, index) => {
              const DeviceIcon = getDeviceIcon(device.platform);
              const isExpanded = expandedDevices.has(device.id);
              return (
                <div 
                  key={device.id}
                  className={`
                    group relative backdrop-blur-sm rounded-xl transition-all duration-300
                    ${isCurrentDevice(device) 
                      ? 'bg-gray-800/60 ring-1 ring-indigo-500/40' 
                      : 'bg-gray-800/40 hover:bg-gray-800/60'
                    }
                  `}
                  style={{
                    animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  <div 
                    className='p-4 cursor-pointer'
                    onClick={() => toggleExpanded(device.id)}
                  >
                    <div className='flex items-center gap-3'>
                      {/* Device Icon */}
                      <div className='relative flex-shrink-0'>
                        <div className={`
                          w-11 h-11 rounded-lg flex items-center justify-center
                          transition-all duration-300
                          ${isCurrentDevice(device)
                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600'
                            : 'bg-gray-700/50'
                          }
                        `}>
                          <DeviceIcon className={`
                            h-5 w-5 transition-colors duration-300
                            ${isCurrentDevice(device) ? 'text-white' : 'text-gray-300'}
                          `} />
                        </div>
                        
                        {/* Active Indicator */}
                        {device.isActive && (
                          <div className='absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900' />
                        )}
                      </div>

                      {/* Device Info */}
                      <div className='flex-1 min-w-0'>
                        {/* Header: Device Name + Badges/Buttons - Grid Layout */}
                        <div className='grid grid-cols-[1fr_auto] gap-x-3 mb-2'>
                          {/* Device Name */}
                          <div>
                            <h4 className='font-medium text-white text-sm truncate'>
                              {device.name}
                            </h4>
                          </div>

                          {/* Right Side: Badges and Remove Button */}
                          <div className='flex items-start justify-end gap-2 flex-shrink-0'>
                            {isCurrentDevice(device) && (
                              <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'>
                                Current
                              </span>
                            )}
                            {/* Status */}
                            {device.isActive ? (
                              <div className='flex items-center gap-1'>
                                <Wifi className='h-3 w-3 text-green-500' />
                                <span className='text-xs text-green-500 font-medium'>Active</span>
                              </div>
                            ) : (
                              <div className='flex items-center gap-1'>
                                <WifiOff className='h-3 w-3 text-gray-600' />
                                <span className='text-xs text-gray-500'>Offline</span>
                              </div>
                            )}
                            {/* Remove Button */}
                            {!isCurrentDevice(device) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveDevice(device);
                                }}
                                className='w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100'
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Browser and OS - Full Width */}
                        <div className='flex items-center gap-1.5 text-xs text-gray-400 mb-2'>
                          <span className='truncate'>{device.browser}</span>
                          <span className='text-gray-600'>•</span>
                          <span className='truncate'>{device.os}</span>
                        </div>

                        {/* Last Active and Location - Same Row */}
                        <div className='flex items-center gap-3 text-xs text-gray-400 flex-wrap'>
                          {/* Last Active */}
                          <div className='flex items-center gap-1'>
                            <Clock className='h-3 w-3 flex-shrink-0' />
                            <span className='whitespace-nowrap'>{formatLastSeen(device.lastSeen)}</span>
                          </div>
                          
                          <span className='text-gray-600'>•</span>
                          
                          {/* Location */}
                          <div className='flex items-center gap-1 min-w-0'>
                            <MapPin className='h-3 w-3 flex-shrink-0' />
                            <div className='truncate'>
                              <LocationDisplay device={device} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <div 
                      className={`
                        overflow-hidden transition-all duration-300 ease-in-out
                        ${isExpanded ? 'max-h-32 opacity-100 mt-3' : 'max-h-0 opacity-0'}
                      `}
                    >
                      <div className='pt-3 border-t border-gray-700/50 space-y-1.5 text-xs'>
                        <div className='flex items-start gap-2'>
                          <span className='text-gray-500 min-w-[80px]'>IP Address:</span>
                          <span className='text-gray-400 font-mono'>{device.ip}</span>
                        </div>
                        <div className='flex items-start gap-2'>
                          <span className='text-gray-500 min-w-[80px]'>Last path:</span>
                          <span className='text-gray-400 truncate'>{device.lastActivity.path}</span>
                        </div>
                        {device.location && device.location.lat && device.location.lng && (
                          <div className='flex items-start gap-2'>
                            <span className='text-gray-500 min-w-[80px]'>Coordinates:</span>
                            <span className='text-gray-400'>{device.location.lat.toFixed(4)}, {device.location.lng.toFixed(4)}</span>
                          </div>
                        )}
                        <div className='flex items-start gap-2'>
                          <span className='text-gray-500 min-w-[80px]'>Platform:</span>
                          <span className='text-gray-400 capitalize'>{device.platform}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Empty State */}
      {!loading && devices.length === 0 && (
        <div className='bg-gray-800/30 backdrop-blur-sm rounded-xl p-10 text-center border border-dashed border-gray-700'>
          <div className='w-12 h-12 bg-gray-700/50 rounded-xl flex items-center justify-center mx-auto mb-3'>
            <Smartphone className='h-6 w-6 text-gray-500' />
          </div>
          <h3 className='font-semibold text-base text-white mb-1.5'>No devices connected</h3>
          <p className='text-sm text-gray-400 mb-5 max-w-sm mx-auto'>
            Add a device to manage your wallet across multiple platforms and keep your account secure.
          </p>
          <Button 
            onClick={() => setAddDeviceModalOpen(true)}
            className='bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2 h-9 flex items-center gap-2 mx-auto transition-all duration-200'
          >
            <Plus className='h-4 w-4' />
            <span className='text-sm font-medium'>Add Device</span>
          </Button>
        </div>
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

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};