// check-owner.js (CommonJS)
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC = process.env.RPC_URL || 'https://api.devnet.solana.com';
const conn = new Connection(RPC, 'finalized');

async function main() {
  const addr = process.argv[2];
  if (!addr) {
    console.error('Usage: node check-owner.js <ADDRESS> [<EXPECTED_PROGRAM_ID>]');
    process.exit(1);
  }
  const expectedProgram = process.argv[3]; // optional

  try {
    const pub = new PublicKey(addr);
    const info = await conn.getAccountInfo(pub);
    if (!info) {
      console.log('⚠️ Account does NOT exist on-chain (getAccountInfo === null).');
      return;
    }

    const owner = info.owner.toBase58();
    console.log('Account found on-chain:');
    console.log(' - lamports:', info.lamports, `(~${info.lamports/1e9} SOL)`);
    console.log(' - owner:', owner);
    console.log(' - executable:', info.executable);
    console.log(' - dataLength:', info.data.length);

    if (owner === '11111111111111111111111111111111') {
      console.log('➡️ Owner is System Program — this is a regular funded keypair account.');
    } else {
      console.log('➡️ Owner is a program: it is program-owned (possible smart wallet).');
    }

    if (expectedProgram) {
      console.log('Expected program:', expectedProgram);
      console.log('Matches expected program?', owner === expectedProgram ? 'YES' : 'NO');
    }
  } catch (err) {
    console.error('Error:', err.message || err);
  }
}

main();
