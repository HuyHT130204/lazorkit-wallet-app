const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { transferSplTokenToUser } = require('../utils/transfer');
const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const bs58 = require('bs58');
let BN;
try { BN = require('bn.js'); } catch (_) { BN = null; }

// Import SDK package - prefer backend server API when available
let LazorkitWalletBackend = null;
const backendCandidates = [
  '@lazorkit/wallet/backend',
  '@lazorkit/wallet/server',
  '@lazorkit/wallet/dist/backend',
  '@lazorkit/wallet/dist/server',
];
for (const mod of backendCandidates) {
  if (LazorkitWalletBackend) break;
  try {
    const loaded = require(mod);
    if (loaded) {
      LazorkitWalletBackend = loaded;
    }
  } catch (_) {
    // ignore; try next candidate
  }
}

const LazorkitWallet = LazorkitWalletBackend || require('@lazorkit/wallet');

const fiveMinutesMs = 5 * 60 * 1000;

// Helper: Convert any format to Uint8Array
function toUint8Array(input) {
  if (!input) return input;
  
  // Already Uint8Array
  if (input instanceof Uint8Array) return input;
  
  // Buffer
  if (Buffer.isBuffer(input)) return new Uint8Array(input);
  
  // Array or array-like object {0: 1, 1: 2, ...}
  if (typeof input === 'object') {
    // Check if it's array-like
    if (Array.isArray(input)) {
      return new Uint8Array(input);
    }
    // Check if it's object with numeric keys
    const keys = Object.keys(input);
    if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
      const arr = [];
      for (let i = 0; i < keys.length; i++) {
        arr.push(input[i]);
      }
      return new Uint8Array(arr);
    }
  }
  
  // Base64url string
  if (typeof input === 'string') {
    try {
      let s = input.replace(/-/g, '+').replace(/_/g, '/');
      const pad = s.length % 4;
      if (pad) s += '='.repeat(4 - pad);
      const buf = Buffer.from(s, 'base64');
      return new Uint8Array(buf);
    } catch (err) {
      console.error('Failed to decode base64url:', err);
    }
  }
  
  return input;
}

// Minimal BN-like shim when bn.js is unavailable
function makeBnLike(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  return {
    toArrayLike(Type, endian, length) {
      const b = Buffer.from(buf);
      // Default big-endian behavior similar to BN
      let out = b;
      if (length) {
        if (b.length > length) out = b.slice(b.length - length);
        else if (b.length < length) out = Buffer.concat([Buffer.alloc(length - b.length, 0), b]);
      }
      if (Type === Buffer) return out;
      if (Type === Uint8Array) return new Uint8Array(out);
      return Array.from(out);
    }
  };
}

// Helper: encode Uint8Array/Buffer to base64url string
function toBase64Url(input) {
  try {
    if (!input) return input;
    let buf;
    if (input instanceof Uint8Array) buf = Buffer.from(input);
    else if (Buffer.isBuffer(input)) buf = input;
    else return input;
    return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  } catch (_) {
    return input;
  }
}

// Normalize passkey data for SDK backend
// CRITICAL: Backend SDK expects publicKey.x/y as Uint8Array
function normalizePasskeyData(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  
  console.log('🔍 Normalizing passkey data, input types:', {
    credentialId: typeof raw.credentialId,
    userId: typeof raw.userId,
    hasPublicKey: !!raw.publicKey,
    publicKeyX: raw.publicKey?.x ? (raw.publicKey.x.constructor?.name || typeof raw.publicKey.x) : 'missing',
    publicKeyY: raw.publicKey?.y ? (raw.publicKey.y.constructor?.name || typeof raw.publicKey.y) : 'missing'
  });
  
  const out = { ...raw };
  
  // credentialId and userId can be base64url strings
  if (out.credentialId && typeof out.credentialId !== 'string') {
    out.credentialId = toBase64Url(out.credentialId);
  }
  if (out.userId && typeof out.userId !== 'string') {
    out.userId = toBase64Url(out.userId);
  }

  // Prefer FE-provided JWK x/y if exists
  const jwk = out.publicKeyJwk;
  if (jwk?.x && jwk?.y) {
    const toBytes = (s) => {
      try {
        let t = String(s).replace(/-/g, '+').replace(/_/g, '/');
        const pad = t.length % 4; if (pad) t += '='.repeat(4 - pad);
        const buf = Buffer.from(t, 'base64');
        return new Uint8Array(buf);
      } catch { return null; }
    };
    const xb = toBytes(jwk.x);
    const yb = toBytes(jwk.y);
    if (xb && yb) {
      const pk = {
        x: BN ? new BN(Buffer.from(xb)) : makeBnLike(xb),
        y: BN ? new BN(Buffer.from(yb)) : makeBnLike(yb),
      };
      out.publicKey = pk;
      console.log('✅ Used FE-provided publicKeyJwk x/y');
    }
  }

  // CRITICAL: LazorKit backend expects publicKey.x and publicKey.y as BN-like
  if (out.publicKey) {
    let pk = out.publicKey;

    // If pk is a base64/base64url string or a raw byte array, try to derive x/y
    const maybeBytes = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return toUint8Array(val);
      if (val instanceof Uint8Array) return val;
      if (Buffer.isBuffer(val)) return new Uint8Array(val);
      if (Array.isArray(val)) return new Uint8Array(val);
      return null;
    };

    // If x/y missing, attempt to parse from pk itself
    if (!pk.x || !pk.y) {
      const rawPkBytes = maybeBytes(pk);
      if (rawPkBytes) {
        let extracted = null;
        if (rawPkBytes.length === 65 || rawPkBytes.length === 64) {
          // Uncompressed EC pubkey or raw X||Y
          const hasPrefix = rawPkBytes.length === 65 && rawPkBytes[0] === 0x04;
          const start = hasPrefix ? 1 : 0;
          extracted = rawPkBytes.slice(start, start + 64);
        } else if (rawPkBytes.length > 65) {
          // Try to detect ASN.1 SPKI: look for 0x03 <len> 0x00 0x04 then 64 bytes
          for (let i = 0; i < rawPkBytes.length - 67; i++) {
            if (rawPkBytes[i] === 0x03) {
              const len = rawPkBytes[i + 1];
              const zero = rawPkBytes[i + 2];
              const marker = rawPkBytes[i + 3];
              if (zero === 0x00 && marker === 0x04) {
                const remain = rawPkBytes.length - (i + 4);
                if (remain >= 64) {
                  extracted = rawPkBytes.slice(i + 4, i + 4 + 64);
                  break;
                }
              }
            }
          }
          // Fallback: search the last 65 bytes block starting with 0x04
          if (!extracted) {
            for (let i = rawPkBytes.length - 65; i >= 0; i--) {
              if (rawPkBytes[i] === 0x04) {
                const slice = rawPkBytes.slice(i + 1, i + 1 + 64);
                if (slice.length === 64) { extracted = slice; break; }
              }
            }
          }
        }

        if (extracted && extracted.length === 64) {
          const xBytes = extracted.slice(0, 32);
          const yBytes = extracted.slice(32, 64);
          pk = { x: xBytes, y: yBytes };
          console.log('✅ Derived X/Y from DER/SPKI or raw publicKey buffer');
        }
      } else if (typeof pk === 'object' && (pk.x || pk.y)) {
        // JWK-like with base64url x/y strings
        const xb = maybeBytes(pk.x);
        const yb = maybeBytes(pk.y);
        if (xb && yb) pk = { x: xb, y: yb };
      }
    }

    // After best-effort parsing, coerce x/y to BN-like
    if (pk && typeof pk === 'object') {
      const coerced = { ...pk };
      if (coerced.x && !(coerced.x instanceof BN)) {
        const xBytes = toUint8Array(coerced.x);
        coerced.x = BN ? new BN(Buffer.from(xBytes)) : makeBnLike(xBytes);
        console.log('✅ Converted/derived publicKey.x to BN-like');
      }
      if (coerced.y && !(coerced.y instanceof BN)) {
        const yBytes = toUint8Array(coerced.y);
        coerced.y = BN ? new BN(Buffer.from(yBytes)) : makeBnLike(yBytes);
        console.log('✅ Converted/derived publicKey.y to BN-like');
      }
      out.publicKey = coerced;
    }
  }
  
  console.log('✅ Normalized passkey data:', {
    credentialId: out.credentialId?.slice(0, 10) + '...',
    publicKeyXType: out.publicKey?.x?.constructor?.name,
    publicKeyYType: out.publicKey?.y?.constructor?.name,
    // Length logs only for byte-like; BN does not expose length, skip
  });
  
  return out;
}

router.post('/', async (req, res, next) => {
  try {
    const { amount, currency, token, metadata, passkeyData, orderLines } = req.body || {};
    if (!amount || !currency) {
      return res.status(400).json({ error: 'Missing amount or currency' });
    }

    const reference = `lz_${Date.now()}`;

    const returnSuccess = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/callback/success?status=success&ref=${encodeURIComponent(reference)}&token=${encodeURIComponent(token || '')}&currency=${encodeURIComponent(currency)}&amount=${encodeURIComponent(amount)}`;
    const returnFailed = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/callback/failed?status=failed&ref=${encodeURIComponent(reference)}&token=${encodeURIComponent(token || '')}&currency=${encodeURIComponent(currency)}&amount=${encodeURIComponent(amount)}`;

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
      payment: { 
        provider: 'stripe', 
        method: 'card', 
        flow: 'direct', 
        success_url: returnSuccess, 
        cancel_url: returnFailed, 
        successUrl: returnSuccess, 
        cancelUrl: returnFailed, 
        return_url: returnSuccess, 
        returnUrl: returnSuccess, 
        redirect_url: returnSuccess 
      },
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

    const payload = { ...body };
    console.log('[orders.create] Creating order with reference:', reference);

    const resp = await fetch(providerUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        Authorization: `Bearer ${providerKey}` 
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      let text = '';
      try { text = await resp.text(); } catch {}
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

    // Save order to DB with passkeyData
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

    console.log('[orders.create] Order saved to DB:', {
      reference: order.reference,
      hasPasskeyData: !!order.passkeyData,
      smartWalletAddress: order.passkeyData?.smartWalletAddress
    });

    return res.json({ orderId: order._id, reference, checkoutUrl, status: order.status });
  } catch (err) {
    return next(err);
  }
});

router.post('/callback/success', async (req, res, next) => {
  try {
    const { reference, orderId } = req.body || {};
    const ref = reference || orderId;
    if (!ref) return res.status(400).json({ error: 'Missing reference' });
    
    console.log('[callback/success] Processing payment for reference:', ref);
    
    // Step 1: Get order from DB
    const order = await Order.findOne({ reference: ref });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    console.log('[callback/success] Order found:', {
      reference: order.reference,
      hasPasskeyData: !!order.passkeyData,
      smartWalletAddress: order.passkeyData?.smartWalletAddress
    });

    // Step 2: Get wallet address from order's passkeyData
    const finalWallet = order.passkeyData?.smartWalletAddress;
    
    if (!finalWallet) {
      return res.status(400).json({ error: 'No wallet address found in order' });
    }

    console.log('[callback/success] Target wallet:', finalWallet);

    const rpcUrl = process.env.RPC_URL || process.env.LAZORKIT_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Step 3: Check if wallet exists onchain
    let accountInfo = await connection.getAccountInfo(new PublicKey(finalWallet));

    if (!accountInfo) {
      console.log('[callback/success] Wallet not onchain, creating smart wallet...');

      try {
        // Get admin keypair
        const adminSecret = process.env.PRIVATE_KEY;
        if (!adminSecret) {
          throw new Error('Missing PRIVATE_KEY for admin signer');
        }
        const adminKeypair = Keypair.fromSecretKey(bs58.decode(adminSecret));
        console.log('[callback/success] Admin keypair:', adminKeypair.publicKey.toString());

        // Normalize passkey data from DB
        const passkeyDataToUse = normalizePasskeyData(order.passkeyData);
        if (!passkeyDataToUse) {
          throw new Error('Missing passkey data for smart wallet creation');
        }

        // Find SDK function
        let result;
        const LazorKitCls = LazorkitWallet?.LazorKit || LazorkitWallet?.default?.LazorKit;

        if (typeof LazorKitCls === 'function' && typeof LazorKitCls.prototype?.createSmartWallet === 'function') {
          console.log('[callback/success] Using LazorKit class');
          const sdk = new LazorKitCls({
            backend: true,
            rpcUrl,
            connection,
            commitment: 'confirmed',
            adminSigner: adminKeypair,
          });
          result = await sdk.createSmartWallet(passkeyDataToUse, {
            walletAddress: finalWallet,
            returnTransactionOnly: true,
            returnTx: true,
          });
        } else {
          console.log('[callback/success] Using standalone function');
          const serverCreateFn =
            (typeof LazorkitWallet === 'function' ? LazorkitWallet : null) ||
            LazorkitWallet?.createSmartWallet ||
            LazorkitWallet?.server?.createSmartWallet ||
            LazorkitWallet?.backend?.createSmartWallet ||
            LazorkitWallet?.default?.createSmartWallet ||
            LazorkitWallet?.default?.server?.createSmartWallet ||
            LazorkitWallet?.default?.backend?.createSmartWallet;

          if (typeof serverCreateFn !== 'function') {
            throw new Error('createSmartWallet is not available on @lazorkit/wallet');
          }

          result = await serverCreateFn(passkeyDataToUse, {
            backend: true,
            rpcUrl,
            connection,
            commitment: 'confirmed',
            adminSigner: adminKeypair,
            walletAddress: finalWallet,
            returnTransactionOnly: true,
            returnTx: true,
          });
        }

        console.log('[callback/success] Smart wallet creation result:', {
          smartWalletAddress: result?.smartWalletAddress || finalWallet,
          hasSignature: !!result?.signature,
          hasTx: !!(result?.transaction || result?.tx)
        });

        // Sign and send transaction
        if (result?.signature) {
          console.log('[callback/success] Transaction already signed:', result.signature);
        } else if (result?.transaction || result?.tx) {
          const transaction = result.transaction || result.tx;
          
          if (!transaction.recentBlockhash) {
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
          }

          if (!transaction.feePayer) {
            transaction.feePayer = adminKeypair.publicKey;
          }

          transaction.sign(adminKeypair);
          
          const rawTransaction = transaction.serialize();
          const signature = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });

          console.log('[callback/success] Transaction sent:', signature);
          
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          
          if (confirmation.value.err) {
            throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
          }
          
          console.log('[callback/success] Transaction confirmed');
        }

        // Verify wallet is now onchain
        accountInfo = await connection.getAccountInfo(new PublicKey(finalWallet));
        if (!accountInfo) {
          throw new Error('Wallet still not onchain after creation');
        }

        console.log('[callback/success] Wallet verified onchain');

      } catch (e) {
        const reason = e?.message || String(e);
        console.error('[callback/success] Smart wallet creation failed:', reason);
        console.error('[callback/success] Full error:', e);
        return res.status(400).json({ 
          error: 'Backend smart wallet creation failed', 
          reason,
          details: e?.stack 
        });
      }
    } else {
      console.log('[callback/success] Wallet already exists onchain');
    }

    // Step 4: Transfer tokens
    order.walletAddress = finalWallet;

    let txSignature = null;
    let creditedAmount = null;
    
    try {
      const shouldTransfer = Boolean(process.env.TOKEN_MINT) && Boolean(process.env.PRIVATE_KEY);
      if (shouldTransfer) {
        const tokenAmount = Number(order.amount);
        creditedAmount = tokenAmount;
        
        console.log('[callback/success] Transferring tokens:', {
          to: finalWallet,
          amount: tokenAmount,
          mint: process.env.TOKEN_MINT,
        });
        
        const transferResult = await transferSplTokenToUser(finalWallet, tokenAmount);
        txSignature = transferResult.signature;
        
        console.log('[callback/success] Token transfer completed:', txSignature);
      }
    } catch (e) {
      const reason = e?.message || 'Transfer failed';
      console.error('[callback/success] Token transfer failed:', reason);
      
      order.status = 'pending';
      await order.save();
      
      return res.status(202).json({ 
        ok: false, 
        pending: true, 
        reason, 
        reference: order.reference 
      });
    }

    // Step 5: Update order status
    order.status = 'success';
    if (txSignature) order.txSignature = txSignature;
    if (creditedAmount != null) order.creditedAmount = creditedAmount;
    if (order.expiresAt) order.expiresAt = undefined;
    
    await order.save();
    
    console.log('[callback/success] Order completed:', {
      reference: order.reference,
      walletAddress: order.walletAddress,
      txSignature,
      creditedAmount
    });

    return res.json({ 
      ok: true, 
      walletAddress: finalWallet, 
      reference: order.reference, 
      status: order.status, 
      txSignature, 
      creditedAmount 
    });
    
  } catch (err) { 
    console.error('[callback/success] Error:', err);
    return next(err); 
  }
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

router.get('/balance/:walletAddress', async (req, res, next) => {
  try {
    const walletAddress = req.params.walletAddress;
    if (!walletAddress) return res.status(400).json({ error: 'Missing wallet address' });
    
    const orders = await Order.find({ 
      walletAddress: walletAddress,
      status: 'success'
    });
    
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

router.post('/check-wallet', async (req, res, next) => {
  try {
    const { passkeyData } = req.body || {};
    
    if (!passkeyData) {
      return res.status(400).json({ error: 'Missing passkeyData' });
    }
    
    const smartWalletAddress = passkeyData.smartWalletAddress;
    
    if (!smartWalletAddress) {
      return res.json({
        exists: false,
        walletAddress: null,
        orderReference: null,
        passkeyData: null
      });
    }
    
    const rpcUrl = process.env.RPC_URL || process.env.LAZORKIT_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const accountInfo = await connection.getAccountInfo(new PublicKey(smartWalletAddress));
    
    if (accountInfo) {
      const existingOrder = await Order.findOne({
        walletAddress: smartWalletAddress,
        status: 'success'
      }).sort({ createdAt: -1 });
      
      return res.json({
        exists: true,
        walletAddress: smartWalletAddress,
        orderReference: existingOrder?.reference || null,
        passkeyData: existingOrder?.passkeyData || passkeyData
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
    console.error('Check wallet failed:', err);
    return next(err);
  }
});

module.exports = router;