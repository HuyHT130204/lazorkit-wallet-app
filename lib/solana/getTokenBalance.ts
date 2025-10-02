// lib/solana/getTokenBalance.ts
export async function getSplTokenBalance(owner: string, mint: string, rpcUrl?: string): Promise<{ amount: number; decimals: number } | null> {
  try {
    const { Connection, PublicKey } = await import('@solana/web3.js');
    const { getAssociatedTokenAddress, getAccount, getMint } = await import('@solana/spl-token');

    const connection = new Connection(rpcUrl || process.env.NEXT_PUBLIC_LAZORKIT_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const ownerPk = new PublicKey(owner);
    const mintPk = new PublicKey(mint);
    const ata = await getAssociatedTokenAddress(mintPk, ownerPk, true);
    const [acc, mintInfo] = await Promise.all([
      getAccount(connection, ata).catch(() => null),
      getMint(connection, mintPk),
    ]);
    const decimals = Number(mintInfo.decimals);
    if (!acc) return { amount: 0, decimals };
    const amount = Number(acc.amount) / 10 ** decimals;
    return { amount, decimals };
  } catch {
    return null;
  }
}



