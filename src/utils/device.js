// Device management utilities for frontend

const DEVICE_ID_KEY = 'device_id';
const API_BASE_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
  : 'http://localhost:3001';

// Generate or get device ID from localStorage
export const getOrCreateDeviceId = () => {
  if (typeof window === 'undefined') return null;
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate a new device ID (UUID-like)
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};

// Get device metadata
export const getDeviceMetadata = () => {
  if (typeof window === 'undefined') return null;
  
  return {
    deviceId: getOrCreateDeviceId(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screen: {
      w: window.screen.width,
      h: window.screen.height
    },
    language: navigator.language || navigator.languages?.[0] || 'en-US'
  };
};

// Request geolocation permission and get coordinates
export const getLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.log('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

// Register device with backend
export const registerDevice = async (accessToken) => {
  try {
    const metadata = getDeviceMetadata();
    if (!metadata) {
      throw new Error('Unable to get device metadata');
    }

    // Try to get location (optional)
    const location = await getLocation();
    
    const response = await fetch(`${API_BASE_URL}/api/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        ...metadata,
        location: location ? {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy
        } : null
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register device');
    }

    const result = await response.json();
    console.log('Device registered successfully:', result.device);
    return result.device;
  } catch (error) {
    console.error('Device registration failed:', error);
    throw error;
  }
};

// Send heartbeat to backend
export const sendHeartbeat = async (accessToken, path = null) => {
  try {
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) {
      throw new Error('No device ID available');
    }

    const response = await fetch(`${API_BASE_URL}/api/devices/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        deviceId,
        path: path || window.location.pathname
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send heartbeat');
    }

    const result = await response.json();
    return result.isActive;
  } catch (error) {
    console.error('Heartbeat failed:', error);
    return false;
  }
};

// Get user's devices
export const getUserDevices = async (accessToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/devices`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch devices');
    }

    const result = await response.json();
    return result.devices;
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    throw error;
  }
};

// Revoke device
export const revokeDevice = async (accessToken, deviceId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/revoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to revoke device');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to revoke device:', error);
    throw error;
  }
};

// Sign out device
export const signOutDevice = async (accessToken, deviceId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/devices/${deviceId}/signout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sign out device');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to sign out device:', error);
    throw error;
  }
};

// Heartbeat manager class
export class HeartbeatManager {
  constructor(accessToken, intervalMs = 60000) {
    this.accessToken = accessToken;
    this.intervalMs = intervalMs;
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Send immediate heartbeat
    sendHeartbeat(this.accessToken);
    
    // Set up interval
    this.intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(this.accessToken);
      }
    }, this.intervalMs);

    // Handle visibility change
    this.handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(this.accessToken);
      }
    };

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.handleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.handleVisibilityChange = null;
    }
  }

  updateToken(newAccessToken) {
    this.accessToken = newAccessToken;
  }
}
