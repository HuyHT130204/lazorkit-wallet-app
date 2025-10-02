const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const PasskeyWallet = require('../models/PasskeyWallet');
// Use global fetch available in Node >=18
const { createSmartWalletOnly } = require('../utils/lazorkit');
const { transferSplTokenToUser } = require('../utils/transfer');
const { Connection, PublicKey } = require('@solana/web3.js');

// Helper to compute expiry
const fiveMinutesMs = 5 * 60 * 1000;

router.post('/', async (req, res, next) => {
  try {
    const { amount, currency, token, metadata, passkeyData, orderLines } = req.body || {};
    if (!amount || !currency) {
      return res.status(400).json({ error: 'Missing amount or currency' });
    }

    const reference = `lz_${Date.now()}`;

    const returnSuccess = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/callback/success?status=success&ref=${encodeURIComponent(reference)}&token=${encodeURIComponent(token || '')}&currency=${encodeURIComponent(currency)}&amount=${encodeURIComponent(amount)}`;
    const returnFailed = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/callback/failed?status=failed&ref=${encodeURIComponent(reference)}&token=${encodeURIComponent(token || '')}&currency=${encodeURIComponent(currency)}&amount=${encodeURIComponent(amount)}`;

    // Call provider API (Whatee or your gateway)
    const providerUrl = process.env.WHATEE_API_URL || 'https://onecheckout.sandbox.whatee.io/api/v1.0/orders';
    const providerKey = process.env.WHATEE_API_KEY || '';
    const merchantId = process.env.WHATEE_MERCHANT_ID || '';

    const body = {
      merchantId,
      amount: Number(Number(amount).toFixed(2)),
      currency,
      reference,
      description: `Buy ${token || ''} via LazorKit`,
      metadata: Object.entries({ ...(metadata || {}), token: token || '' }).map(([key, value]) => ({ key, value: String(value) })),
      // Đưa đủ mọi biến thể để provider nào cũng nhận được URL trả về FE
      payment: { provider: 'stripe', method: 'card', flow: 'direct', success_url: returnSuccess, cancel_url: returnFailed, successUrl: returnSuccess, cancelUrl: returnFailed, return_url: returnSuccess, returnUrl: returnSuccess, redirect_url: returnSuccess },
      redirectUrls: { success: returnSuccess, cancel: returnFailed },
      success_url: returnSuccess,
      cancel_url: returnFailed,
      successUrl: returnSuccess,
      cancelUrl: returnFailed,
      return_url: returnSuccess,
      returnUrl: returnSuccess,
      redirect_url: returnSuccess,
      callback_url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/orders/callback/success`,
    };

    // Provider requires order_lines with required keys
    if (Array.isArray(orderLines) && orderLines.length > 0) {
      body.order_lines = orderLines.map((l) => ({
        key: String(l.key || 'item'),
        title: String(l.title || `Buy ${token || 'Token'}`),
        quantity: Number(l.quantity || 1),
        unit_price: Number(l.unit_price ?? amount),
        amount: Number(l.amount ?? amount),
      }));
    } else {
      body.order_lines = [
        { key: 'onramp', title: `Buy ${token || ''}`, quantity: 1, unit_price: Number(Number(amount).toFixed(2)), amount: Number(Number(amount).toFixed(2)) },
      ];
    }

    const payload = {
      ...body,
    };
    console.log('[orders.create] payload =>', JSON.stringify(payload));

    const resp = await fetch(providerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${providerKey}` },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      let text = '';
      try { text = await resp.text(); } catch {}
      // compress provider error body
      const plain = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const short = plain.slice(0, 300);
      return res.status(resp.status).json({ error: 'Provider error', details: short });
    }
    const data = await resp.json();
    let checkoutUrl =
      data?.checkoutUrl ||
      data?.checkout_url ||
      data?.payment?.url ||
      data?.payment?.checkoutUrl ||
      data?.payment?.checkout_url ||
      data?.payment?.session?.url ||
      data?.payment?.session_url ||
      data?.payment?.stripe?.url ||
      data?.payment?.stripe?.checkoutUrl ||
      data?.payment?.stripe?.checkout_url ||
      data?.data?.checkoutUrl ||
      data?.data?.checkout_url ||
      data?.data?.payment?.url ||
      data?.data?.payment?.session?.url ||
      data?.links?.checkout ||
      data?.links?.payment ||
      data?.links?.redirect ||
      data?.hosted_url ||
      data?.hosted?.url ||
      data?.url || '';

    if (!checkoutUrl) {
      const preferFromArray = (arr) => {
        if (!Array.isArray(arr)) return undefined;
        const urls = arr.filter((v) => typeof v === 'string' && String(v).startsWith('http'));
        // Exclude thank-you/receipt pages; prefer real checkout/session URLs
        const notThank = urls.filter((u) => !/thank|receipt|success/i.test(u));
        const prioritized = notThank.filter((u) => /checkout|session|hosted|pay|stripe|onecheckout|whatee/i.test(u));
        return prioritized[1] || prioritized[2] || prioritized[0] || urls[1] || urls[2] || urls[0];
      };
      checkoutUrl =
        preferFromArray(data?.urls) ||
        preferFromArray(data?.links) ||
        preferFromArray(data?.payment?.urls) ||
        preferFromArray(data?.data?.urls) ||
        '';

      if (!checkoutUrl) {
        // Deep scan for any http URLs and pick a likely candidate
        const candidates = [];
        const walk = (obj) => {
          if (!obj) return;
          if (typeof obj === 'string') {
            if (obj.startsWith('http')) candidates.push(obj);
            return;
          }
          if (Array.isArray(obj)) { obj.forEach(walk); return; }
          if (typeof obj === 'object') { Object.values(obj).forEach(walk); }
        };
        walk(data);
        const filtered = candidates.filter((u) => /stripe|checkout|session|hosted|pay|whatee|onecheckout/i.test(u) && !/thank|receipt|success/i.test(u));
        checkoutUrl = filtered[1] || filtered[2] || filtered[0] || candidates[1] || candidates[2] || candidates[0] || '';
      }
    }

    const order = await Order.create({
      reference,
      provider: 'stripe',
      amount: Number(amount),
      currency,
      token,
      status: 'pending',
      checkoutUrl,
      passkeyData: passkeyData || undefined,
      expiresAt: new Date(Date.now() + fiveMinutesMs),
    });

    return res.json({ orderId: order._id, reference, checkoutUrl, status: order.status });
  } catch (err) {
    return next(err);
  }
});

router.post('/callback/success', async (req, res, next) => {
  try {
    const { reference, orderId, walletAddress, passkeyData } = req.body || {};
    const ref = reference || orderId;
    if (!ref) return res.status(400).json({ error: 'Missing reference' });
    const order = await Order.findOne({ reference: ref });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // 1) Ensure wallet exists - SIMPLE CHECK: if provided address exists on-chain, reuse it
    let finalWallet = walletAddress || order.walletAddress || (order.passkeyData && (order.passkeyData.smartWalletAddress || order.passkeyData.address));
    const effectivePasskey = passkeyData || order.passkeyData;

    // Helper: check account exist on chain
    async function accountExistsOnChain(address) {
      try {
        if (!address) return false;
        const rpcUrl = process.env.RPC_URL || process.env.LAZORKIT_RPC_URL || 'https://api.devnet.solana.com';
        const conn = new Connection(rpcUrl, 'confirmed');
        const info = await conn.getAccountInfo(new PublicKey(address));
        return !!info;
      } catch (_) { return false; }
    }
    
    // If no wallet yet, try use smartWalletAddress from passkey and verify on-chain
    if (!finalWallet && effectivePasskey) {
      try {
        console.log('🔍 Simplified check: prefer provided smartWalletAddress if exists on-chain');
        console.log('🔍 effectivePasskey:', JSON.stringify(effectivePasskey, null, 2));
        
        // Extract key identifiers from passkey data
        const currentPublicKey = effectivePasskey.publicKey || effectivePasskey.publickey;
        // Avoid accidentally treating wallet address as credentialId
        const rawCredentialId = effectivePasskey.credentialId;
        const currentCredentialId = (rawCredentialId && typeof rawCredentialId === 'string' && rawCredentialId.length <= 200 && !/^([1-9A-HJ-NP-Za-km-z]{32,48})$/.test(rawCredentialId))
          ? rawCredentialId
          : undefined;
        const providedSmartWallet = effectivePasskey.smartWalletAddress || effectivePasskey.address;
        
        console.log('🔍 Current passkey identifiers:', { publicKey: currentPublicKey, credentialId: currentCredentialId, providedSmartWallet });
        
        // Track resolved wallet to avoid accidental overwrite later
        let resolvedWallet = null;

        // Method A: If client provided smart wallet address and it exists on-chain → reuse
        if (providedSmartWallet && await accountExistsOnChain(providedSmartWallet)) {
          console.log('✅ Reuse provided smartWalletAddress (on-chain exists):', providedSmartWallet);
          resolvedWallet = providedSmartWallet;
          // Persist mapping for future
          try {
            await PasskeyWallet.updateOne(
              {
                $or: [
                  currentCredentialId ? { credentialId: currentCredentialId } : null,
                  currentPublicKey ? { publicKey: currentPublicKey } : null,
                ].filter(Boolean)
              },
              {
                $setOnInsert: { credentialId: currentCredentialId || null, publicKey: currentPublicKey || null, meta: effectivePasskey },
                $set: { walletAddress: finalWallet, smartWalletId: effectivePasskey.smartWalletId }
              },
              { upsert: true }
            );
          } catch {}
        }

        // Method B: Look up from PasskeyWallet mapping collection (most reliable if no provided address)
        let existingOrder = null;
        if (!finalWallet && (currentCredentialId || currentPublicKey)) {
          const mapped = await PasskeyWallet.findOne({
            $or: [
              currentCredentialId ? { credentialId: currentCredentialId } : null,
              currentPublicKey ? { publicKey: currentPublicKey } : null,
            ].filter(Boolean)
          }).sort({ createdAt: -1 });
          if (mapped && mapped.walletAddress) {
            console.log('✅ PasskeyWallet map hit:', mapped.walletAddress);
            resolvedWallet = mapped.walletAddress;
          }
        }

        // Method C: Find by exact credentialId match within Orders (fallback)
        if (currentCredentialId) {
          existingOrder = await Order.findOne({
            'passkeyData.credentialId': currentCredentialId,
            status: 'success',
            walletAddress: { $exists: true, $ne: null }
          }).sort({ createdAt: 1 });
          
          if (existingOrder) {
            console.log('✅ Found existing wallet by credentialId:', existingOrder.walletAddress);
            resolvedWallet = existingOrder.walletAddress;
          }
        }
        
        // Method D: If no credentialId match, try publicKey match
        if (!existingOrder && currentPublicKey) {
          existingOrder = await Order.findOne({
            $or: [
              { 'passkeyData.publicKey': currentPublicKey },
              { 'passkeyData.publickey': currentPublicKey }
            ],
            status: 'success',
            walletAddress: { $exists: true, $ne: null }
          }).sort({ createdAt: 1 });
          
          if (existingOrder) {
            console.log('✅ Found existing wallet by publicKey:', existingOrder.walletAddress);
            resolvedWallet = existingOrder.walletAddress;
          }
        }
        
        // Method E: If still no match, check for smartwalletAddress (without on-chain verify)
        if (!existingOrder && effectivePasskey.smartWalletAddress) {
          existingOrder = await Order.findOne({
            $or: [
              { walletAddress: effectivePasskey.smartWalletAddress },
              { 'passkeyData.smartWalletAddress': effectivePasskey.smartWalletAddress }
            ],
            status: 'success'
          }).sort({ createdAt: -1 });
          
          if (existingOrder) {
            console.log('✅ Found existing wallet by smartWalletAddress:', existingOrder.walletAddress);
            resolvedWallet = existingOrder.walletAddress;
          }
        }

        // Prefer resolved wallet from checks ALWAYS, and lock mapping to it
        if (!finalWallet && resolvedWallet) {
          console.log('🔄 Reusing existing wallet for passkey:', resolvedWallet);
          finalWallet = resolvedWallet;
          // Ensure mapping points to this wallet
          try {
            await PasskeyWallet.updateOne(
              {
                $or: [
                  currentCredentialId ? { credentialId: currentCredentialId } : null,
                  currentPublicKey ? { publicKey: currentPublicKey } : null,
                ].filter(Boolean)
              },
              { $set: { walletAddress: resolvedWallet, smartWalletId: effectivePasskey.smartWalletId || null } },
              { upsert: true }
            );
          } catch (mapErr) {
            console.warn('Could not enforce mapping to resolved wallet:', mapErr?.message);
          }
        }

        // Only create new wallet if after all checks we still don't have any wallet
        if (!finalWallet && !resolvedWallet) {
          console.log('🆕 No existing wallet found, creating new wallet for passkey');
          const created = await createSmartWalletOnly(effectivePasskey);
          finalWallet = created?.address || created?.smartWalletAddress || created?.pubkey || null;

          if (finalWallet) {
            console.log('✅ New wallet created:', finalWallet);
            // Persist mapping so future orders reuse this wallet
            try {
              await PasskeyWallet.updateOne(
                {
                  $or: [
                    currentCredentialId ? { credentialId: currentCredentialId } : null,
                    currentPublicKey ? { publicKey: currentPublicKey } : null,
                  ].filter(Boolean)
                },
                {
                  $setOnInsert: {
                    credentialId: currentCredentialId || null,
                    publicKey: currentPublicKey || null,
                    smartWalletId: effectivePasskey.smartWalletId,
                    walletAddress: finalWallet,
                    meta: effectivePasskey,
                  },
                  $set: {
                    walletAddress: finalWallet,
                  }
                },
                { upsert: true }
              );
            } catch (mapErr) {
              console.warn('Could not upsert PasskeyWallet mapping:', mapErr?.message);
            }
          } else {
            console.error('❌ Failed to create wallet - no address returned');
          }
        }
      } catch (e) {
        console.error('❌ Wallet creation/check failed:', e);
        return res.status(500).json({ error: 'Wallet creation failed', details: e?.message });
      }
    }

    // 2) Update current order with wallet address and passkeyData (if not already set)
    let orderUpdated = false;
    
    if (finalWallet && !order.walletAddress) {
      order.walletAddress = finalWallet;
      console.log('💾 Updated order with wallet address:', finalWallet);
      orderUpdated = true;
    }
    
    if (effectivePasskey && !order.passkeyData) {
      order.passkeyData = effectivePasskey;
      console.log('💾 Updated order with passkeyData');
      orderUpdated = true;
    }
    
    // Also update passkeyData if it's more complete than what we have
    if (effectivePasskey && order.passkeyData) {
      const currentPasskey = order.passkeyData;
      const newPasskey = effectivePasskey;
      
      // Check if new passkey data is more complete
      const shouldUpdate = (
        (!currentPasskey.credentialId && newPasskey.credentialId) ||
        (!currentPasskey.publicKey && !currentPasskey.publickey && (newPasskey.publicKey || newPasskey.publickey)) ||
        (!currentPasskey.smartWalletAddress && newPasskey.smartWalletAddress) ||
        (!currentPasskey.smartWalletId && newPasskey.smartWalletId)
      );
      
      if (shouldUpdate) {
        order.passkeyData = { ...currentPasskey, ...newPasskey };
        console.log('💾 Updated order with more complete passkeyData');
        orderUpdated = true;
      }
    }
    
    if (orderUpdated) {
      await order.save();
    }

    // 3) Transfer SPL tokens from admin to user before marking success
    let txSignature = null;
    let creditedAmount = null;
    try {
      const shouldTransfer = Boolean(finalWallet) && Boolean(process.env.TOKEN_MINT) && Boolean(process.env.PRIVATE_KEY);
      if (shouldTransfer) {
        // derive token amount from order amount; assuming 1:1 with currency for now
        const tokenAmount = Number(order.amount);
        creditedAmount = tokenAmount;
        console.log('[orders.callback.success] transferring', {
          to: finalWallet,
          amount: tokenAmount,
          mint: process.env.TOKEN_MINT,
          rpc: process.env.RPC_URL || process.env.LAZORKIT_RPC_URL,
        });
        const transferResult = await transferSplTokenToUser(finalWallet, tokenAmount);
        txSignature = transferResult.signature;
      }
    } catch (e) {
      // If transfer fails, keep order pending to retry later and bubble reason
      const reason = e?.message || (typeof e?.toString === 'function' ? e.toString() : '') || JSON.stringify(e || {});
      console.error('[orders.callback.success] transfer failed:', reason);
      order.status = 'pending';
      if (finalWallet) order.walletAddress = finalWallet;
      if (passkeyData) order.passkeyData = { ...(order.passkeyData || {}), ...passkeyData };
      await order.save();
      return res.status(202).json({ ok: false, pending: true, reason, reference: order.reference });
    }

    // 4) Mark success only after transfer ok
    order.status = 'success';
    if (finalWallet) order.walletAddress = finalWallet;
    
    // Merge passkeyData properly
    if (passkeyData) {
      order.passkeyData = { ...(order.passkeyData || {}), ...passkeyData };
    }
    
    // Khi thành công, loại bỏ expiresAt để tránh TTL xóa nhầm
    if (order.expiresAt) {
      order.expiresAt = undefined;
    }
    
    if (txSignature) order.txSignature = txSignature;
    if (creditedAmount != null) order.creditedAmount = creditedAmount;
    
    await order.save();
    
    console.log('✅ Order marked as success:', {
      reference: order.reference,
      walletAddress: order.walletAddress,
      passkeyData: order.passkeyData ? {
        credentialId: order.passkeyData.credentialId,
        publicKey: order.passkeyData.publicKey || order.passkeyData.publickey,
        smartWalletAddress: order.passkeyData.smartWalletAddress
      } : null
    });

    return res.json({ ok: true, walletAddress: finalWallet, reference: order.reference, status: order.status, txSignature, creditedAmount });
  } catch (err) { return next(err); }
});

router.post('/callback/failed', async (req, res, next) => {
  try {
    const { reference } = req.body || {};
    if (!reference) return res.status(400).json({ error: 'Missing reference' });
    const order = await Order.findOne({ reference });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'failed';
    await order.save();
    return res.json({ ok: true });
  } catch (err) { return next(err); }
});

// Get order detail by reference to retrieve walletAddress after returning to app
router.get('/:reference', async (req, res, next) => {
  try {
    const reference = req.params.reference;
    if (!reference) return res.status(400).json({ error: 'Missing reference' });
    const order = await Order.findOne({ reference });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json({
      reference: order.reference,
      status: order.status,
      walletAddress: order.walletAddress || order?.passkeyData?.smartWalletAddress || null,
    });
  } catch (err) { return next(err); }
});

// Get wallet balance from backend (sum of all successful orders for a wallet)
router.get('/balance/:walletAddress', async (req, res, next) => {
  try {
    const walletAddress = req.params.walletAddress;
    if (!walletAddress) return res.status(400).json({ error: 'Missing wallet address' });
    
    // Get all successful orders for this wallet
    const orders = await Order.find({ 
      walletAddress: walletAddress,
      status: 'success'
    });
    
    // Sum up credited amounts by token
    const balances = {};
    orders.forEach(order => {
      if (order.creditedAmount && order.token) {
        if (!balances[order.token]) {
          balances[order.token] = 0;
        }
        balances[order.token] += order.creditedAmount;
      }
    });
    
    return res.json({
      walletAddress,
      balances,
      totalOrders: orders.length
    });
  } catch (err) { return next(err); }
});

// Check if wallet exists for given passkey data
router.post('/check-wallet', async (req, res, next) => {
  try {
    const { passkeyData } = req.body || {};
    
    if (!passkeyData) {
      return res.status(400).json({ error: 'Missing passkeyData' });
    }
    
    console.log('🔍 Checking for existing wallet with passkey data:', JSON.stringify(passkeyData, null, 2));
    
    // Extract key identifiers from passkey data
    const currentPublicKey = passkeyData.publicKey || passkeyData.publickey;
    const currentCredentialId = passkeyData.credentialId;
    
    let existingOrder = null;
    
    // Method 1: Find by exact credentialId match (most reliable)
    if (currentCredentialId) {
      existingOrder = await Order.findOne({
        'passkeyData.credentialId': currentCredentialId,
        status: 'success',
        walletAddress: { $exists: true, $ne: null }
      }).sort({ createdAt: -1 });
      
      if (existingOrder) {
        console.log('✅ Found existing wallet by credentialId:', existingOrder.walletAddress);
      }
    }
    
    // Method 2: If no credentialId match, try publicKey match
    if (!existingOrder && currentPublicKey) {
      existingOrder = await Order.findOne({
        $or: [
          { 'passkeyData.publicKey': currentPublicKey },
          { 'passkeyData.publickey': currentPublicKey }
        ],
        status: 'success',
        walletAddress: { $exists: true, $ne: null }
      }).sort({ createdAt: -1 });
      
      if (existingOrder) {
        console.log('✅ Found existing wallet by publicKey:', existingOrder.walletAddress);
      }
    }
    
    // Method 3: If still no match, check for smartwalletAddress in passkeyData
    if (!existingOrder && passkeyData.smartWalletAddress) {
      existingOrder = await Order.findOne({
        $or: [
          { walletAddress: passkeyData.smartWalletAddress },
          { 'passkeyData.smartWalletAddress': passkeyData.smartWalletAddress }
        ],
        status: 'success'
      }).sort({ createdAt: -1 });
      
      if (existingOrder) {
        console.log('✅ Found existing wallet by smartWalletAddress:', existingOrder.walletAddress);
      }
    }
    
    if (existingOrder && existingOrder.walletAddress) {
      return res.json({
        exists: true,
        walletAddress: existingOrder.walletAddress,
        orderReference: existingOrder.reference,
        passkeyData: existingOrder.passkeyData
      });
    } else {
      return res.json({
        exists: false,
        walletAddress: null,
        orderReference: null,
        passkeyData: null
      });
    }
  } catch (err) {
    console.error('❌ Check wallet failed:', err);
    return next(err);
  }
});

module.exports = router;


