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
    enum: ['pending', 'approved', 'rejected', 'expired', 'failed'], 
    default: 'pending' 
  },
  failedAt: { type: Date },
  failureReason: { type: String },
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

    // Generate QR code as base64 image - Professional white/black style (NO COLORS)
    console.log('🔲 Generating QR code with black/white colors only');
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',  // Black for QR code - MUST BE BLACK
        light: '#FFFFFF'   // White background - MUST BE WHITE
      },
      errorCorrectionLevel: 'M'
    });
    console.log('✅ QR code generated (first 100 chars):', qrCodeDataURL.substring(0, 100));

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
    const { shareId, approved, walletAddress } = req.body || {};
    
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
      // Set wallet address from request (provided by existing device)
      if (walletAddress) {
        deviceShare.walletAddress = walletAddress;
      }
      
      deviceShare.status = 'approved';
      deviceShare.approvedAt = new Date();
      
      console.log('✅ Device approved:', {
        shareId,
        walletAddress: deviceShare.walletAddress,
        newDevicePlatform: deviceShare.newDeviceData?.platform
      });
      
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

    // Only return walletAddress if status is 'approved' (not 'failed')
    const walletAddress = deviceShare.status === 'approved' ? deviceShare.walletAddress : null;

    res.json({
      success: true,
      status: deviceShare.status,
      walletAddress: walletAddress, // Only return if approved
      createdAt: deviceShare.createdAt,
      expiresAt: deviceShare.expiresAt,
      approvedAt: deviceShare.approvedAt,
      failedAt: deviceShare.failedAt,
      failureReason: deviceShare.failureReason
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

// GET /api/device-import/failed/:walletAddress
// Get failed device connections for a wallet
router.get('/failed/:walletAddress', async (req, res, next) => {
  try {
    const { walletAddress } = req.params;

    const failedShares = await DeviceShare.find({
      walletAddress,
      status: 'failed'
    }).sort({ failedAt: -1 });

    res.json({
      success: true,
      failedDevices: failedShares.map(share => ({
        shareId: share.shareId,
        newDeviceData: share.newDeviceData,
        createdAt: share.createdAt,
        failedAt: share.failedAt,
        failureReason: share.failureReason
      }))
    });

  } catch (err) {
    console.error('Get failed devices error:', err);
    return next(err);
  }
});

// Helper functions from orders.js
function compressP256ToBase64(xBn, yBn) {
  const BN = require('bn.js');
  const x = BN.isBN(xBn) ? xBn : new BN(xBn);
  const y = BN.isBN(yBn) ? yBn : new BN(yBn);
  const xBytes = x.toArrayLike(Buffer, 'be', 32);
  const yBytes = y.toArrayLike(Buffer, 'be', 32);
  const uncompressed = Buffer.concat([Buffer.from([0x04]), xBytes, yBytes]);
  return uncompressed.toString('base64');
}

function normalizePasskeyDataForVerify(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };
  
  // Extract passkey public key - try multiple formats
  let passkeyPublicKeyBase64 = out.passkeyPublicKey || out.publicKeyBase64 || out.publicKey;
  
  // If not directly available, try to construct from x/y coordinates
  if (!passkeyPublicKeyBase64 && out.publicKey?.x && out.publicKey?.y) {
    try {
      const BN = require('bn.js');
      const xBn = BN.isBN(out.publicKey.x) ? out.publicKey.x : new BN(out.publicKey.x);
      const yBn = BN.isBN(out.publicKey.y) ? out.publicKey.y : new BN(out.publicKey.y);
      passkeyPublicKeyBase64 = compressP256ToBase64(xBn, yBn);
      console.log('✅ Constructed passkeyPublicKey from x/y coordinates');
    } catch (e) {
      console.warn('⚠️ Failed to construct passkeyPublicKey from x/y:', e);
    }
  }
  
  return { ...out, passkeyPublicKeyBase64 };
}

// POST /api/device-import/verify-passkey
// Verify passkey address exists on Solana chain
router.post('/verify-passkey', async (req, res, next) => {
  console.log('📥 POST /api/device-import/verify-passkey - Request received');
  console.log('📦 Request body keys:', Object.keys(req.body || {}));
  
  try {
    const { passkeyData, walletAddress } = req.body || {};
    
    console.log('🔍 Extracted data:', {
      hasPasskeyData: !!passkeyData,
      hasWalletAddress: !!walletAddress,
      walletAddress: walletAddress ? `${walletAddress.substring(0, 8)}...` : 'none',
      passkeyDataKeys: passkeyData ? Object.keys(passkeyData) : []
    });
    
    if (!passkeyData || !walletAddress) {
      console.error('❌ Missing required data:', {
        hasPasskeyData: !!passkeyData,
        hasWalletAddress: !!walletAddress
      });
      return res.status(400).json({ 
        error: 'Missing passkeyData or walletAddress',
        received: {
          hasPasskeyData: !!passkeyData,
          hasWalletAddress: !!walletAddress
        }
      });
    }

    console.log('🔍 Verifying passkey address on chain:', {
      walletAddress,
      hasPasskeyData: !!passkeyData,
      hasSmartWalletAddress: !!passkeyData?.smartWalletAddress
    });

    // Import Solana Web3.js to verify wallet address on chain
    let Connection, PublicKey;
    try {
      const solanaWeb3 = require('@solana/web3.js');
      Connection = solanaWeb3.Connection;
      PublicKey = solanaWeb3.PublicKey;
    } catch (importError) {
      console.error('❌ Failed to import Solana Web3.js:', importError);
      return res.status(500).json({ 
        error: 'Failed to load Solana Web3.js',
        message: importError.message 
      });
    }
    
    // Get RPC endpoint from environment
    const rpcUrl = process.env.LAZORKIT_RPC_URL || process.env.RPC_URL || 'https://api.devnet.solana.com';
    let connection;
    try {
      connection = new Connection(rpcUrl, 'confirmed');
      console.log('✅ Solana connection created:', rpcUrl);
    } catch (connError) {
      console.error('❌ Failed to create Connection:', connError);
      return res.status(500).json({ 
        error: 'Failed to create Solana connection',
        message: connError.message 
      });
    }
    
    // Verify wallet address exists on chain
    try {
      const walletPubkey = new PublicKey(walletAddress);
      console.log('🔍 Checking account info for:', walletAddress);
      
      const accountInfo = await connection.getAccountInfo(walletPubkey);
      
      console.log('📊 Account info result:', {
        walletAddress,
        exists: accountInfo !== null,
        owner: accountInfo?.owner?.toString(),
        lamports: accountInfo?.lamports,
        executable: accountInfo?.executable,
        dataLength: accountInfo?.data?.length
      });
      
      if (accountInfo) {
        // Account exists on chain - verify it's a valid account
        // Even if lamports is 0, account still exists (might be a PDA)
        console.log('✅ Account exists on chain - verification successful');
        return res.json({
          success: true,
          verified: true,
          walletAddress: walletAddress,
          method: 'account_check',
          accountInfo: {
            lamports: accountInfo.lamports,
            owner: accountInfo.owner.toString(),
            executable: accountInfo.executable
          }
        });
      } else {
        console.warn('❌ Wallet address not found on chain:', walletAddress);
        return res.json({
          success: true,
          verified: false,
          message: 'Wallet address not found on chain',
          walletAddress: walletAddress
        });
      }
    } catch (e) {
      console.error('❌ Error checking account info:', e);
      console.error('Full error stack:', e.stack);
      
      // Check if response was already sent
      if (res.headersSent) {
        console.error('⚠️ Response already sent, cannot send error response');
        return;
      }
      
      // If it's an invalid address format, return false
      if (e.message && e.message.includes('Invalid public key')) {
        return res.json({
          success: true,
          verified: false,
          message: 'Invalid wallet address format'
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to verify wallet address on chain',
        message: e.message || 'Unknown error'
      });
    }
  } catch (err) {
    console.error('❌ Verify passkey error (outer catch):', err);
    console.error('Full error stack:', err.stack);
    
    // Ensure we always return a JSON response
    // Check if response was already sent
    if (res.headersSent) {
      console.error('⚠️ Response already sent, cannot send error response');
      return;
    }
    
    // Try to return a proper error response instead of calling next(err)
    // This prevents unhandled errors
    try {
      const walletAddr = walletAddress || (req.body && req.body.walletAddress);
      
      // Last resort: just check if address is valid format
      if (walletAddr) {
        try {
          const { PublicKey } = require('@solana/web3.js');
          new PublicKey(walletAddr);
          // Address is valid format, but we couldn't verify it
          return res.status(500).json({ 
            error: 'Verification service unavailable',
            message: err.message || 'Unknown error',
            walletAddress: walletAddr
          });
        } catch (pkError) {
          return res.status(400).json({ 
            error: 'Invalid wallet address format',
            message: pkError.message || 'Invalid address'
          });
        }
      } else {
        return res.status(500).json({ 
          error: 'Internal server error during verification',
          message: err.message || 'Unknown error',
          details: 'No wallet address provided'
        });
      }
    } catch (finalError) {
      console.error('❌ Final error handler failed:', finalError);
      // Last resort - send basic error
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: 'Internal server error during verification',
          message: err.message || 'Unknown error'
        });
      }
    }
  }
});

// POST /api/device-import/report-verification-failure
// Report verification failure from new device
router.post('/report-verification-failure', async (req, res, next) => {
  try {
    const { shareId, reason } = req.body || {};
    
    if (!shareId) {
      return res.status(400).json({ error: 'Missing shareId' });
    }

    const deviceShare = await DeviceShare.findOne({ shareId });
    
    if (!deviceShare) {
      return res.status(404).json({ error: 'Device share not found' });
    }

    // Rollback status from 'approved' to 'failed'
    if (deviceShare.status === 'approved') {
      const oldStatus = deviceShare.status;
      deviceShare.status = 'failed';
      deviceShare.failedAt = new Date();
      deviceShare.failureReason = reason || 'Verification failed on chain';
      
      // IMPORTANT: Clear walletAddress to prevent it from appearing in connected devices
      // The walletAddress should only be set when verification succeeds
      const oldWalletAddress = deviceShare.walletAddress;
      deviceShare.walletAddress = null;
      
      await deviceShare.save();
      
      console.log('❌ Device connection failed after approval - status rolled back:', {
        shareId,
        oldStatus,
        newStatus: deviceShare.status,
        oldWalletAddress,
        failureReason: deviceShare.failureReason
      });
      
      return res.json({
        success: true,
        message: 'Verification failure reported',
        status: 'failed',
        shareId: deviceShare.shareId
      });
    } else {
      console.warn('⚠️ Attempted to report failure for non-approved device:', {
        shareId,
        currentStatus: deviceShare.status
      });
      return res.status(400).json({ error: 'Device share is not in approved status' });
    }
  } catch (err) {
    console.error('Report verification failure error:', err);
    return next(err);
  }
});

module.exports = router;

