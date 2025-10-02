const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { 
  transfer, 
  getOrCreateAssociatedTokenAccount,
  getAccount
} = require('@solana/spl-token');
const bs58 = require('bs58');

// Environment variables
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TOKEN_MINT = process.env.TOKEN_MINT;
const TOKEN_DECIMALS = process.env.TOKEN_DECIMALS ? parseInt(process.env.TOKEN_DECIMALS) : undefined;

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

if (!TOKEN_MINT) {
  throw new Error('TOKEN_MINT environment variable is required');
}

const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Transfer SPL tokens from admin wallet to recipient
 * @param {string} recipientAddress - Recipient's wallet address
 * @param {number} amount - Amount to transfer (in token units, not raw)
 * @param {string} tokenMint - Token mint address (optional, uses env var if not provided)
 * @param {number} decimals - Token decimals (optional, uses env var if not provided)
 * @returns {Promise<{signature: string, amount: number}>}
 */
async function transferSplTokenToUser(recipientAddress, amount, tokenMint = TOKEN_MINT, decimals = TOKEN_DECIMALS) {
  try {
    console.log('=== SPL Token Transfer Started ===');
    console.log('RPC URL:', RPC_URL);
    console.log('Token Mint:', tokenMint);
    console.log('Recipient:', recipientAddress);
    console.log('Amount:', amount);
    console.log('Decimals:', decimals);

    // Parse admin private key
    const adminKeypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    const adminPubkey = adminKeypair.publicKey;
    console.log('Admin wallet:', adminPubkey.toString());

    // Parse recipient public key
    const recipientPubkey = new PublicKey(recipientAddress);
    const tokenMintPubkey = new PublicKey(tokenMint);

    // Get or create admin's token account
    console.log('Getting admin token account...');
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,
      tokenMintPubkey,
      adminPubkey
    );
    console.log('Admin ATA:', adminTokenAccount.address.toString());

    // Get admin token account info
    const adminAccountInfo = await getAccount(connection, adminTokenAccount.address);
    console.log('Admin token balance:', adminAccountInfo.amount.toString());

    // Get or create recipient's token account (with allowOwnerOffCurve for smart wallets)
    console.log('Getting recipient token account...');
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      adminKeypair,
      tokenMintPubkey,
      recipientPubkey,
      true // allowOwnerOffCurve for smart wallets (PDAs)
    );
    console.log('Recipient ATA:', recipientTokenAccount.address.toString());

    // Convert amount to raw units
    let rawAmount;
    if (decimals !== undefined) {
      rawAmount = Math.floor(amount * Math.pow(10, decimals));
    } else {
      // Try to get decimals from on-chain if not provided
      console.log('Decimals not provided, fetching from on-chain...');
      try {
        const mintInfo = await connection.getParsedAccountInfo(tokenMintPubkey);
        if (mintInfo.value?.data?.parsed?.info?.decimals !== undefined) {
          decimals = mintInfo.value.data.parsed.info.decimals;
          rawAmount = Math.floor(amount * Math.pow(10, decimals));
          console.log('Fetched decimals from chain:', decimals);
        } else {
          throw new Error('Could not fetch decimals from chain');
        }
      } catch (error) {
        console.error('Error fetching decimals:', error);
        throw new Error('Could not determine token decimals');
      }
    }

    console.log('Raw amount to transfer:', rawAmount);

    // Check if admin has sufficient balance
    if (adminAccountInfo.amount < BigInt(rawAmount)) {
      throw new Error(`Insufficient token balance. Admin has ${adminAccountInfo.amount.toString()}, trying to transfer ${rawAmount}`);
    }

    // Check if admin has enough SOL for transaction fees
    const adminSolBalance = await connection.getBalance(adminPubkey);
    console.log('Admin SOL balance:', adminSolBalance / 1e9, 'SOL');
    if (adminSolBalance < 5000) { // Minimum 0.000005 SOL for fees
      throw new Error(`Insufficient SOL for transaction fees. Admin has ${adminSolBalance / 1e9} SOL`);
    }

    // Perform the transfer
    console.log('Executing transfer...');
    const signature = await transfer(
      connection,
      adminKeypair,
      adminTokenAccount.address,
      recipientTokenAccount.address,
      adminPubkey,
      rawAmount
    );

    console.log('Transfer signature:', signature);
    console.log('=== SPL Token Transfer Completed ===');

    return {
      signature,
      amount: amount,
      decimals: decimals
    };

  } catch (error) {
    console.error('SPL Token transfer failed:', error);
    throw error;
  }
}

module.exports = {
  transferSplTokenToUser
};
