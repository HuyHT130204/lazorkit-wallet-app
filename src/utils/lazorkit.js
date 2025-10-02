let lazor;

async function getSdk() {
  if (lazor) return lazor;
  // Dynamic import to avoid SSR quirks
  // eslint-disable-next-line global-require
  lazor = require('@lazorkit/wallet');
  return lazor;
}

// Server-side wallet creation using LazorKit SDK
async function createSmartWalletOnly(passkeyData) {
  const sdk = await getSdk();
  if (!sdk || typeof sdk.createSmartWalletOnly !== 'function') {
    throw new Error('LazorKit SDK createSmartWalletOnly is not available on server');
  }

  const rpcUrl = process.env.LAZORKIT_RPC_URL || process.env.NEXT_PUBLIC_LAZORKIT_RPC_URL;
  const paymasterUrl = process.env.LAZORKIT_PAYMASTER_URL || process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL;
  const ipfsUrl = process.env.LAZORKIT_PORTAL_URL || process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL;

  if (!rpcUrl || !paymasterUrl || !ipfsUrl) {
    throw new Error('Missing LazorKit environment variables');
  }

  // Many SDKs read env internally; if initializer is needed, add here.
  // For now, assume createSmartWalletOnly uses global config
  const result = await sdk.createSmartWalletOnly(passkeyData);
  return result;
}

module.exports = { createSmartWalletOnly };





