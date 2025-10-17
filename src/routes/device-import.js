const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { Connection, PublicKey } = require('@solana/web3.js');
const mongoose = require('mongoose');

// New schema for device sharing and wallet association
const DeviceShareSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: false }, // Will be set when approved
  ownerDeviceId: { type: String, required: false }, // Will be set when approved
  newDeviceData: {
    passkeyData: { type: mongoose.Schema.Types.Mixed },
    publicKey: { type: String },
    deviceId: { type: String },
    userAgent: { type: String },
    platform: { type: String },
    screen: { type: mongoose.Schema.Types.Mixed },
    language: { type: String },
    ip: { type: String },
    location: { type: mongoose.Schema.Types.Mixed }
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'expired'], 
    default: 'pending' 
  },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) }, // 10 minutes
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const DeviceShare = mongoose.models.DeviceShare || mongoose.model('DeviceShare', DeviceShareSchema);

// Generate unique share ID
const generateShareId = () => {
  return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// POST /api/device-import/generate-qr
// Generate QR code for new device to connect to existing wallet
router.post('/generate-qr', async (req, res, next) => {
  try {
    const { passkeyData, deviceMetadata } = req.body || {};
    
    if (!passkeyData || !deviceMetadata) {
      return res.status(400).json({ error: 'Missing passkeyData or deviceMetadata' });
    }

    const shareId = generateShareId();
    
    // Create device share record
    const deviceShare = new DeviceShare({
      shareId,
      walletAddress: null, // Will be set when approved
      ownerDeviceId: null, // Will be set when approved
      newDeviceData: {
        passkeyData,
        publicKey: passkeyData?.smartWalletAddress || passkeyData?.publicKey,
        deviceId: deviceMetadata.deviceId,
        userAgent: deviceMetadata.userAgent,
        platform: deviceMetadata.platform,
        screen: deviceMetadata.screen,
        language: deviceMetadata.language,
        ip: req.ip || req.connection.remoteAddress,
        location: deviceMetadata.location
      }
    });

    await deviceShare.save();

    // Generate QR code data
    const qrData = {
      type: 'device_import',
      shareId,
      timestamp: Date.now(),
      deviceInfo: {
        platform: deviceMetadata.platform,
        userAgent: deviceMetadata.userAgent
      }
    };

    // Generate QR code as base64 image
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#16ffbb',
        light: '#000000'
      }
    });

    res.json({
      success: true,
      shareId,
      qrCode: qrCodeDataURL,
      expiresAt: deviceShare.expiresAt
    });

  } catch (err) {
    console.error('Generate QR error:', err);
    return next(err);
  }
});

// POST /api/device-import/scan-qr
// Handle QR code scan from existing device
router.post('/scan-qr', async (req, res, next) => {
  try {
    const { qrData, walletAddress, ownerDeviceId } = req.body || {};
    
    if (!qrData || !walletAddress || !ownerDeviceId) {
      return res.status(400).json({ error: 'Missing qrData, walletAddress, or ownerDeviceId' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid QR code data' });
    }

    if (parsedData.type !== 'device_import' || !parsedData.shareId) {
      return res.status(400).json({ error: 'Invalid QR code type' });
    }

    // Find the device share
    const deviceShare = await DeviceShare.findOne({ 
      shareId: parsedData.shareId,
      status: 'pending'
    });

    if (!deviceShare) {
      return res.status(404).json({ error: 'Device share not found or expired' });
    }

    if (new Date() > deviceShare.expiresAt) {
      deviceShare.status = 'expired';
      await deviceShare.save();
      return res.status(400).json({ error: 'QR code has expired' });
    }

    // Update with owner info
    deviceShare.walletAddress = walletAddress;
    deviceShare.ownerDeviceId = ownerDeviceId;
    await deviceShare.save();

    res.json({
      success: true,
      deviceShare: {
        shareId: deviceShare.shareId,
        newDeviceData: deviceShare.newDeviceData,
        expiresAt: deviceShare.expiresAt
      }
    });

  } catch (err) {
    console.error('Scan QR error:', err);
    return next(err);
  }
});

// POST /api/device-import/approve
// Approve device connection from existing device
router.post('/approve', async (req, res, next) => {
  try {
    const { shareId, approved } = req.body || {};
    
    if (!shareId || typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Missing shareId or approved status' });
    }

    const deviceShare = await DeviceShare.findOne({ shareId });
    
    if (!deviceShare) {
      return res.status(404).json({ error: 'Device share not found' });
    }

    if (deviceShare.status !== 'pending') {
      return res.status(400).json({ error: 'Device share is not pending' });
    }

    if (new Date() > deviceShare.expiresAt) {
      deviceShare.status = 'expired';
      await deviceShare.save();
      return res.status(400).json({ error: 'Device share has expired' });
    }

    if (approved) {
      deviceShare.status = 'approved';
      deviceShare.approvedAt = new Date();
      
      // Here you would typically:
      // 1. Create the smart wallet for the new device using the existing wallet address
      // 2. Associate the new device with the existing wallet
      // 3. Send notification to new device that connection is approved
      
      await deviceShare.save();
      
      res.json({
        success: true,
        message: 'Device connection approved',
        walletAddress: deviceShare.walletAddress
      });
    } else {
      deviceShare.status = 'rejected';
      await deviceShare.save();
      
      res.json({
        success: true,
        message: 'Device connection rejected'
      });
    }

  } catch (err) {
    console.error('Approve device error:', err);
    return next(err);
  }
});

// GET /api/device-import/status/:shareId
// Check status of device import request
router.get('/status/:shareId', async (req, res, next) => {
  try {
    const { shareId } = req.params;
    
    const deviceShare = await DeviceShare.findOne({ shareId });
    
    if (!deviceShare) {
      return res.status(404).json({ error: 'Device share not found' });
    }

    res.json({
      success: true,
      status: deviceShare.status,
      walletAddress: deviceShare.walletAddress,
      approvedAt: deviceShare.approvedAt
    });

  } catch (err) {
    console.error('Check status error:', err);
    return next(err);
  }
});

// GET /api/device-import/pending/:walletAddress
// Get pending device import requests for a wallet
router.get('/pending/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    
    const pendingShares = await DeviceShare.find({
      walletAddress,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      pendingShares: pendingShares.map(share => ({
        shareId: share.shareId,
        newDeviceData: share.newDeviceData,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt
      }))
    });

  } catch (err) {
    console.error('Get pending shares error:', err);
    return next(err);
  }
});

// GET /api/device-import/connected/:walletAddress
// Get connected (approved) devices for a wallet
router.get('/connected/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    const approvedShares = await DeviceShare.find({
      walletAddress,
      status: 'approved'
    }).sort({ approvedAt: -1 });

    res.json({
      success: true,
      connectedDevices: approvedShares.map(share => ({
        shareId: share.shareId,
        newDeviceData: share.newDeviceData,
        createdAt: share.createdAt,
        approvedAt: share.approvedAt
      }))
    });

  } catch (err) {
    console.error('Get connected devices error:', err);
    return next(err);
  }
});

module.exports = router;

