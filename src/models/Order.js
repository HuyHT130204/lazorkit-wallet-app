const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  provider: {
    type: String,
    required: true,
    default: 'stripe'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  token: {
    type: String,
    default: 'USDC'
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled'],
    default: 'pending'
  },
  checkoutUrl: {
    type: String
  },
  walletAddress: {
    type: String
  },
  passkeyData: {
    type: mongoose.Schema.Types.Mixed
  },
  txSignature: {
    type: String
  },
  creditedAmount: {
    type: Number
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  }
}, {
  timestamps: true
});

// Index for faster queries
orderSchema.index({ reference: 1 });
orderSchema.index({ status: 1 });
// Không dùng TTL để tránh mất dữ liệu; cron sẽ chuyển trạng thái sang failed
orderSchema.index({ expiresAt: 1 });

// Index for wallet lookup
orderSchema.index({ walletAddress: 1, status: 1 });
orderSchema.index({ 'passkeyData.smartWalletAddress': 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
