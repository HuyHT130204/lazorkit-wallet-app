const express = require('express');
const router = express.Router();
let Device;
try {
  Device = require('../models/Device');
} catch (_) {
  Device = null;
}
const { isConnected } = require('../db');
const isDbConnected = () => {
  try { return typeof isConnected === 'function' ? isConnected() : false; } catch { return false; }
};

// In-memory fallback store when MongoDB is unavailable (dev only)
const memoryStore = {
  devices: [],
  findOneAndUpdate: async (query, update, options) => {
    let device = memoryStore.devices.find(d => d.userId === query.userId && d.deviceId === query.deviceId && (query.revoked === undefined || d.revoked === query.revoked));
    if (!device && options?.upsert) {
      device = { _id: `${Date.now()}`, revoked: false, createdAt: new Date(), lastSeen: new Date(), lastActivity: { path: '/', at: new Date() }, ...update };
      memoryStore.devices.push(device);
    } else if (device) {
      Object.assign(device, update);
    }
    return options?.new ? device : null;
  },
  find: async (query) => {
    return memoryStore.devices.filter(d => d.userId === query.userId && (query.revoked === undefined || d.revoked === query.revoked));
  }
};
const { authenticate } = require('../middleware/authenticate');

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         '127.0.0.1';
};

// Helper function to parse user agent
const parseUserAgent = (userAgent) => {
  const browser = userAgent.includes('Chrome') ? 'Chrome' :
                  userAgent.includes('Firefox') ? 'Firefox' :
                  userAgent.includes('Safari') ? 'Safari' :
                  userAgent.includes('Edge') ? 'Edge' : 'Unknown';
  
  const os = userAgent.includes('Windows') ? 'Windows' :
             userAgent.includes('Mac') ? 'macOS' :
             userAgent.includes('Linux') ? 'Linux' :
             userAgent.includes('Android') ? 'Android' :
             userAgent.includes('iOS') ? 'iOS' : 'Unknown';
  
  return { browser, os };
};

// POST /api/devices/register
router.post('/register', authenticate, async (req, res) => {
  try {
    const { deviceId, userAgent, platform, screen, language, location } = req.body;
    const userId = req.user.id;
    const ip = getClientIP(req);
    
    if (!deviceId || !userAgent || !platform || !screen || !language) {
      return res.status(400).json({
        error: 'Missing required fields: deviceId, userAgent, platform, screen, language'
      });
    }

    const { browser, os } = parseUserAgent(userAgent);
    
    // Generate device name
    const deviceName = `${browser} on ${os}`;
    
    // Upsert device
    const model = (!Device || !isDbConnected()) ? memoryStore : Device;
    // Use compound key (userId + deviceId); avoid unique conflicts on deviceId alone
    const device = await model.findOneAndUpdate(
      { userId, deviceId, revoked: false },
      {
        userId,
        deviceId,
        name: deviceName,
        userAgent,
        browser,
        os,
        platform,
        screen,
        language,
        ip,
        location: location || null,
        lastSeen: new Date(),
        lastActivity: {
          path: '/',
          at: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      device: {
        id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        platform: device.platform,
        browser: device.browser,
        os: device.os,
        isActive: device.isActive
      }
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({
      error: 'Failed to register device'
    });
  }
});

// POST /api/devices/heartbeat
router.post('/heartbeat', authenticate, async (req, res) => {
  try {
    const { deviceId, path } = req.body;
    const userId = req.user.id;
    
    if (!deviceId) {
      return res.status(400).json({
        error: 'Missing required field: deviceId'
      });
    }

    const model = (!Device || !isDbConnected()) ? memoryStore : Device;
    const device = await model.findOneAndUpdate(
      { userId, deviceId, revoked: false },
      {
        lastSeen: new Date(),
        lastActivity: {
          path: path || '/',
          at: new Date()
        }
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        error: 'Device not found or revoked'
      });
    }

    res.status(200).json({
      success: true,
      isActive: device.isActive
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      error: 'Failed to update heartbeat'
    });
  }
});

// GET /api/devices
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let devices;
    if (!Device || !isDbConnected()) {
      devices = (await memoryStore.find({ userId, revoked: false }))
        .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    } else {
      devices = await Device.find({ userId, revoked: false })
        .sort({ lastSeen: -1 })
        .select('-refreshTokenHash -__v');
    }

    const devicesWithActive = devices.map(device => ({
      id: device._id,
      deviceId: device.deviceId,
      name: device.name,
      platform: device.platform,
      browser: device.browser,
      os: device.os,
      ip: device.ip,
      location: device.location,
      createdAt: device.createdAt,
      lastSeen: device.lastSeen,
      lastActivity: device.lastActivity,
      isActive: device.isActive
    }));

    res.status(200).json({
      success: true,
      devices: devicesWithActive
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      error: 'Failed to fetch devices'
    });
  }
});

// POST /api/devices/:deviceId/revoke
router.post('/:deviceId/revoke', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    
    const model = (!Device || !isDbConnected()) ? memoryStore : Device;
    const device = await model.findOneAndUpdate(
      { userId, deviceId },
      { 
        revoked: true,
        refreshTokenHash: null // Clear refresh token if exists
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        error: 'Device not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Device revoked successfully'
    });
  } catch (error) {
    console.error('Revoke device error:', error);
    res.status(500).json({
      error: 'Failed to revoke device'
    });
  }
});

// POST /api/devices/:deviceId/signout
router.post('/:deviceId/signout', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    
    const model = (!Device || !isDbConnected()) ? memoryStore : Device;
    const device = await model.findOneAndUpdate(
      { userId, deviceId },
      { 
        revoked: true,
        refreshTokenHash: null
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        error: 'Device not found'
      });
    }

    // In a real implementation, you would also invalidate the session
    // For now, we just mark the device as revoked
    
    res.status(200).json({
      success: true,
      message: 'Device signed out successfully'
    });
  } catch (error) {
    console.error('Signout device error:', error);
    res.status(500).json({
      error: 'Failed to sign out device'
    });
  }
});

module.exports = router;
