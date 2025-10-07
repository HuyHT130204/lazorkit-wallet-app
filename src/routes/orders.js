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

// Helper: convert base64url -> standard base64
function fromBase64Url(b64url) {
  try {
    if (!b64url || typeof b64url !== 'string') return b64url;
    let s = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4;
    if (pad) s += '='.repeat(4 - pad);
    return s;
  } catch (_) {
    return b64url;
  }
}

// Helper: compress P-256 point (x,y) to 33-byte compressed key, return base64 string
function compressP256ToBase64(xBn, yBn) {
  if (!xBn || !yBn) return null;
  try {
    const xBuf = Buffer.isBuffer(xBn) ? xBn : Buffer.from(xBn.toArrayLike(Buffer, 'be', 32));
    const yBuf = Buffer.isBuffer(yBn) ? yBn : Buffer.from(yBn.toArrayLike(Buffer, 'be', 32));
    const yIsEven = (yBuf[yBuf.length - 1] % 2) === 0;
    const prefix = Buffer.from([yIsEven ? 0x02 : 0x03]);
    const comp = Buffer.concat([prefix, xBuf]);
    return comp.toString('base64');
  } catch (e) {
    console.error('Failed to compress P-256 pubkey:', e);
    return null;
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

  // CRITICAL: publicKey.x and publicKey.y MUST be Uint8Array
  if (out.publicKey && typeof out.publicKey === 'object') {
    const pk = { ...out.publicKey };
    
    // Convert to Uint8Array regardless of input format
    if (pk.x) {
      const xBytes = toUint8Array(pk.x);
      // Prefer BN if available because some SDK paths expect .toArrayLike()
      pk.x = BN ? new BN(Buffer.from(xBytes)) : makeBnLike(xBytes);
      console.log('✅ Converted publicKey.x to:', BN ? 'BN' : (xBytes?.constructor?.name), 'length:', BN ? 32 : xBytes?.length);
    }
    if (pk.y) {
      const yBytes = toUint8Array(pk.y);
      pk.y = BN ? new BN(Buffer.from(yBytes)) : makeBnLike(yBytes);
      console.log('✅ Converted publicKey.y to:', BN ? 'BN' : (yBytes?.constructor?.name), 'length:', BN ? 32 : yBytes?.length);
    }
    
    out.publicKey = pk;
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

    const returnSuccess = `${process.env.APP_BASE_URL || 'https://localhost:3000'}/callback/success?status=success&ref=${encodeURIComponent(reference)}&token=${encodeURIComponent(token || '')}&currency=${encodeURIComponent(currency)}&amount=${encodeURIComponent(amount)}`;
    const returnFailed = `${process.env.APP_BASE_URL || 'https://localhost:3000'}/callback/failed?status=failed&ref=${encodeURIComponent(reference)}&token=${encodeURIComponent(token || '')}&currency=${encodeURIComponent(currency)}&amount=${encodeURIComponent(amount)}`;

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
      callback_url: `${process.env.APP_BASE_URL || 'https://localhost:3000'}/api/orders/callback/success`,
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

    // Step 2: Prepare wallet data from order
    let finalWallet = order.passkeyData?.smartWalletAddress || order.walletAddress || null;
    const existingWalletId = order.passkeyData?.smartWalletId || order.passkeyData?.walletId || order.passkeyData?.smartWalletID || null;
    console.log('[callback/success] Target wallet (from order if any):', finalWallet, 'walletId:', existingWalletId);

    const rpcUrl = process.env.RPC_URL || process.env.LAZORKIT_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Step 3: Check if wallet exists onchain (only if we have an address)
    let accountInfo = null;
    if (finalWallet) {
      try { accountInfo = await connection.getAccountInfo(new PublicKey(finalWallet)); } catch {}
    }

    // Create when not onchain OR when we don't have a walletId to reliably derive PDA
    if (!accountInfo || !existingWalletId) {
      console.log('[callback/success] Wallet missing info/onchain. Creating smart wallet...');

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

        // Build parameters required by LazorKit backend SDK
        // Expecting these fields persisted from FE passkey registration
        // Use existing walletId if present, else generate a new one (as decimal string)
        let smartWalletIdRaw = order.passkeyData?.smartWalletId || order.passkeyData?.walletId || order.passkeyData?.smartWalletID;
        // credentialId may be base64url; normalize to standard base64
        const credentialIdBase64 = fromBase64Url(order.passkeyData?.credentialId || order.passkeyData?.credentialID);
        // passkeyPublicKey may be provided directly or derivable from x/y
        let passkeyPublicKeyBase64 = order.passkeyData?.passkeyPublicKey || order.passkeyData?.publicKeyBase64 || order.passkeyData?.publicKey;
        if (!passkeyPublicKeyBase64 && order.passkeyData?.publicKey?.x && order.passkeyData?.publicKey?.y) {
          // Use normalized BN values from earlier normalizePasskeyData
          const xBn = order.passkeyData.publicKey.x;
          const yBn = order.passkeyData.publicKey.y;
          passkeyPublicKeyBase64 = compressP256ToBase64(xBn, yBn);
        }

        console.log('[callback/success] Passkey fields prepared:', {
          hasSmartWalletId: !!smartWalletIdRaw,
          credentialIdLen: credentialIdBase64 ? credentialIdBase64.length : 0,
          hasPkB64: !!passkeyPublicKeyBase64,
        });

        if (!smartWalletIdRaw || !credentialIdBase64 || !passkeyPublicKeyBase64) {
          throw new Error('Missing required passkey fields (smartWalletId, credentialId, passkeyPublicKey)');
        }

        // Instantiate SDK and create the wallet transaction with default policy
        let result;
        const LazorKitCls = LazorkitWallet?.LazorKit || LazorkitWallet?.default?.LazorKit;
        if (typeof LazorKitCls !== 'function') {
          throw new Error('LazorKit class not available from @lazorkit/wallet');
        }

        const sdk = new LazorKitCls(connection);
        // If no walletId yet, generate via client internals (8 bytes random)
        if (!smartWalletIdRaw && typeof sdk?.getLazorkitClient === 'function') {
          try {
            const client = sdk.getLazorkitClient();
            const bn = client.generateWalletId();
            smartWalletIdRaw = bn.toString();
          } catch {}
        }

        // If walletId is a hex-like string, convert to BN base16 to avoid BN parsing base10 by default
        let walletIdParam = smartWalletIdRaw;
        if (typeof smartWalletIdRaw === 'string' && /^(0x)?[0-9a-f]+$/i.test(smartWalletIdRaw)) {
          try {
            const hex = smartWalletIdRaw.startsWith('0x') ? smartWalletIdRaw.slice(2) : smartWalletIdRaw;
            walletIdParam = BN ? new BN(hex, 16) : hex; // BN preferred if available
          } catch {}
        }

        // Build transaction with non-zero amount to fund policy init rent
        const client = typeof sdk.getLazorkitClient === 'function' ? sdk.getLazorkitClient() : null;
        if (!client) throw new Error('LazorKit client unavailable');
        let initLamportsNum = Number(process.env.SMART_WALLET_INIT_LAMPORTS);
        if (!Number.isFinite(initLamportsNum) || initLamportsNum <= 0) {
          initLamportsNum = 5_000_000; // fallback ~0.005 SOL to cover InitPolicy rent
        }
        if (initLamportsNum < 3_500_000) {
          initLamportsNum = 3_500_000;
        }
        console.log('[callback/success] Funding smart wallet with lamports:', initLamportsNum);
        const initLamports = BN ? new BN(initLamportsNum) : initLamportsNum;
        const pkBytes = Array.from(Buffer.from(passkeyPublicKeyBase64, 'base64'));
        const walletIdBn = BN && walletIdParam && typeof walletIdParam !== 'string' ? walletIdParam : (BN ? new BN(String(walletIdParam), 10) : walletIdParam);

        // Derive expected PDA for smart wallet (will be owned by LazorKit program)
        let expectedPda = null;
        try {
          expectedPda = client.getSmartWalletPubkey(walletIdBn);
          console.log('[callback/success] Expected smart wallet PDA:', expectedPda?.toBase58?.() || String(expectedPda));
        } catch (_) {}

        const txnOut = await client.createSmartWalletTxn({
          payer: adminKeypair.publicKey,
          passkeyPublicKey: pkBytes,
          credentialIdBase64,
          smartWalletId: walletIdBn,
          amount: initLamports,
        }, { useVersionedTransaction: false });

        result = { transaction: txnOut.transaction, smartWallet: (expectedPda?.toBase58?.() || txnOut.smartWallet?.toBase58?.() || txnOut.smartWallet), smartWalletId: walletIdBn };

        console.log('[callback/success] Smart wallet creation result:', {
          smartWalletAddress: result?.smartWalletAddress || finalWallet,
          hasSignature: !!result?.signature,
          hasTx: !!(result?.transaction || result?.tx)
        });

        // Sign and send transaction (admin signer, no relayer)
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

          // Ensure admin has enough SOL to cover rent/fees when running on devnet/testnet/localnet
          try {
            const url = String(rpcUrl).toLowerCase();
            const isDev = /devnet|localhost|127\.0\.0\.1/.test(url);
            const minLamports = Number(process.env.MIN_FEE_LAMPORTS || 5_000_000); // ~0.005 SOL
            let bal = await connection.getBalance(adminKeypair.publicKey, 'confirmed');
            if (isDev && bal < minLamports) {
              const airdropLamports = Number(process.env.AIRDROP_LAMPORTS || 1_000_000_000); // 1 SOL
              console.log('[callback/success] Low admin balance. Requesting airdrop:', airdropLamports, 'lamports');
              const sig = await connection.requestAirdrop(adminKeypair.publicKey, airdropLamports);
              await connection.confirmTransaction(sig, 'confirmed');
              bal = await connection.getBalance(adminKeypair.publicKey, 'confirmed');
              console.log('[callback/success] New admin balance:', bal);
            }
          } catch (e) {
            console.warn('[callback/success] Airdrop/top-up skipped or failed:', e?.message || e);
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

        // Resolve the ACTUAL PDA smart wallet from chain using multiple strategies
        const lazorkitProgramId = (() => {
          try {
            const c = sdk.getLazorkitClient();
            return c?.programId?.toBase58?.() || c?.programId?.toString?.() || null;
          } catch { return null; }
        })();

        const candidates = [];
        if (expectedPda) candidates.push(expectedPda?.toBase58?.() || String(expectedPda));
        try {
          const byCred = await client.getSmartWalletByCredentialId(credentialIdBase64);
          const p = byCred?.smartWallet?.toBase58?.() || byCred?.smartWallet || null;
          if (p) candidates.push(p);
        } catch (e) { console.warn('[callback/success] getSmartWalletByCredentialId failed:', e?.message || e); }
        try {
          const byPk = await client.getSmartWalletByPasskey(Buffer.from(passkeyPublicKeyBase64, 'base64'));
          const p = byPk?.smartWallet?.toBase58?.() || byPk?.smartWallet || null;
          if (p) candidates.push(p);
        } catch (e) { console.warn('[callback/success] getSmartWalletByPasskey failed:', e?.message || e); }

        let picked = null;
        for (const addr of candidates) {
          try {
            const info = await connection.getAccountInfo(new PublicKey(addr));
            const owner = info?.owner?.toBase58?.() || info?.owner?.toString?.();
            console.log('[callback/success] Candidate PDA owner check:', { addr, owner });
            if (info && lazorkitProgramId && owner === lazorkitProgramId) { picked = addr; break; }
          } catch {}
        }

        if (!picked) {
          console.warn('[callback/success] No Lazorkit-owned PDA confirmed. Proceeding with first candidate (may be System Program).');
          picked = candidates[0] || finalWallet;
        }

        finalWallet = picked;
        order.walletAddress = finalWallet;
        order.passkeyData = { ...(order.passkeyData || {}), smartWalletAddress: finalWallet, smartWalletId: smartWalletIdRaw };
        await order.save();

        console.log('[callback/success] Wallet resolved and saved:', finalWallet);

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