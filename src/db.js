const mongoose = require('mongoose');
const Order = require('./models/Order');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('MongoDB already connected');
    return;
  }

  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    const conn = await mongoose.connect(mongoUri);

    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Ensure no legacy TTL index remains on orders.expiresAt
    try {
      const ordersCol = mongoose.connection.db.collection('orders');
      const indexes = await ordersCol.indexes();
      for (const idx of indexes) {
        const isExpiresAt = idx.key && idx.key.expiresAt === 1;
        const isTTL = typeof idx.expireAfterSeconds === 'number';
        if (isExpiresAt && isTTL) {
          console.warn(`⚠️  Dropping legacy TTL index on orders.expiresAt: ${idx.name}`);
          await ordersCol.dropIndex(idx.name);
        }
      }
      // Recreate non-TTL index (model also defines this, but ensure immediately)
      await ordersCol.createIndex({ expiresAt: 1 });
    } catch (e) {
      console.warn('Unable to verify/drop legacy TTL index on orders.expiresAt:', e?.message || e);
    }

    // Ensure devices collection does not keep a legacy unique index on deviceId
    try {
      const devicesCol = mongoose.connection.db.collection('devices');
      const dIndexes = await devicesCol.indexes();
      for (const idx of dIndexes) {
        const isDeviceId = idx.key && idx.key.deviceId === 1;
        const isUnique = Boolean(idx.unique);
        if (isDeviceId && isUnique) {
          console.warn(`⚠️  Dropping legacy UNIQUE index on devices.deviceId: ${idx.name}`);
          await devicesCol.dropIndex(idx.name);
        }
      }
      // Create compound unique index and non-unique deviceId index as safety
      await devicesCol.createIndex({ userId: 1, deviceId: 1 }, { unique: true });
      await devicesCol.createIndex({ deviceId: 1 }, { unique: false });
    } catch (e) {
      console.warn('Unable to verify/drop legacy unique index on devices.deviceId:', e?.message || e);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    isConnected = false;
    throw error;
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  disconnectDB,
  isConnected: () => isConnected
};
