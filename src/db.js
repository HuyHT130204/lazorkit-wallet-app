const mongoose = require('mongoose');

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
