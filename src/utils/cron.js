const Order = require('../models/Order');

/**
 * Cron job to mark expired orders as failed
 * Should run every 5 minutes
 */
async function markExpiredOrdersAsFailed() {
  try {
    console.log('🕐 Running cron job: Marking expired orders as failed...');
    
    const now = new Date();
    
    // Find all pending orders whose expiresAt has passed
    const expiredOrders = await Order.find({
      status: 'pending',
      expiresAt: { $lte: now }
    });
    
    if (expiredOrders.length === 0) {
      console.log('✅ No expired orders found');
      return;
    }
    
    console.log(`📋 Found ${expiredOrders.length} expired orders`);
    
    // Update all expired orders to failed status
    const result = await Order.updateMany(
      { status: 'pending', expiresAt: { $lte: now } },
      { $set: { status: 'failed', updatedAt: new Date() } }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} orders as failed`);
    
    // Log details of expired orders
    expiredOrders.forEach(order => {
      console.log(`❌ Expired order: ${order.reference} (${order.amount} ${order.currency}) - Expired at: ${order.expiresAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error in cron job:', error);
  }
}

/**
 * Start the cron job
 * Runs every 5 minutes (300,000 ms)
 */
function startCronJob() {
  console.log('🚀 Starting cron job for expired orders (every 5 minutes)');
  
  // Run immediately on startup
  markExpiredOrdersAsFailed();
  
  // Then run every 5 minutes
  setInterval(markExpiredOrdersAsFailed, 5 * 60 * 1000);
}

module.exports = {
  markExpiredOrdersAsFailed,
  startCronJob
};


