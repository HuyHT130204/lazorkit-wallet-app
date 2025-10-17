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

    // Create device shares collection indexes
    try {
      const deviceSharesCol = mongoose.connection.db.collection('deviceshares');
      await deviceSharesCol.createIndex({ shareId: 1 }, { unique: true });
      await deviceSharesCol.createIndex({ walletAddress: 1, status: 1 });
      await deviceSharesCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    } catch (e) {
      console.warn('Unable to create device shares indexes:', e?.message || e);
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
