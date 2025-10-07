const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { connectDB } = require('./src/db');
const { startCronJob } = require('./src/utils/cron');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS: allow origins from env ALLOWED_ORIGINS (comma separated), plus localhost in dev
const parseAllowedOrigins = () => {
  const list = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    list.push('https://localhost:3000', 'https://127.0.0.1:3000');
  }
  return Array.from(new Set(list));
};

const allowedOrigins = parseAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server / curl
    const ok = allowedOrigins.some((o) => {
      if (o === origin) return true;
      // support wildcard for vercel preview: https://*.vercel.app
      if (o.startsWith('https://*.') && origin.endsWith(o.slice('https://*.'.length))) return true;
      return false;
    });
    callback(ok ? null : new Error('CORS not allowed'), ok);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  maxAge: 86400,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Routes
const devicesRouter = require('./src/routes/devices');
const ordersRouter = require('./src/routes/orders');
const jupiterRouter = require('./src/routes/jupiter');
app.use('/api/devices', devicesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/jupiter', jupiterRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server (HTTPS enforced)
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.warn('⚠️  MongoDB not connected. Running in in-memory fallback mode for devices API.');
    // Do not exit; routes will use in-memory storage when DB is unavailable
  }

  const keyPath = process.env.SSL_KEY_PATH || path.resolve(__dirname, 'certs', 'localhost.key');
  const certPath = process.env.SSL_CERT_PATH || path.resolve(__dirname, 'certs', 'localhost.crt');

  let key;
  let cert;
  try {
    key = fs.readFileSync(keyPath);
    cert = fs.readFileSync(certPath);
  } catch (e) {
    console.error('❌ SSL certificates not found. Expected at:', { keyPath, certPath });
    console.error('Please generate local trusted certs (e.g., with mkcert) and set SSL_KEY_PATH/SSL_CERT_PATH.');
    process.exit(1);
  }

  const httpsServer = https.createServer({ key, cert }, app);
  httpsServer.listen(PORT, () => {
    console.log(`🔐 HTTPS API Server running on https://localhost:${PORT}`);
    console.log(`📊 Health check: https://localhost:${PORT}/api/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start cron job for expired orders
    startCronJob();
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

startServer();
