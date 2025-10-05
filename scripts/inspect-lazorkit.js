/* eslint-disable no-console */
function safeKeys(obj) {
  try { return Object.keys(obj || {}); } catch { return []; }
}

function printModule(label, mod) {
  console.log(`\n=== ${label} ===`);
  console.log('type:', typeof mod);
  console.log('keys:', safeKeys(mod));
  if (mod && typeof mod === 'object') {
    console.log('has.createSmartWallet:', typeof mod.createSmartWallet === 'function');
    if (mod.server) console.log('server.keys:', safeKeys(mod.server));
    if (mod.backend) console.log('backend.keys:', safeKeys(mod.backend));
    if (mod.default) {
      console.log('default.keys:', safeKeys(mod.default));
      console.log('default.has.createSmartWallet:', typeof mod.default.createSmartWallet === 'function');
      if (mod.default.server) console.log('default.server.keys:', safeKeys(mod.default.server));
      if (mod.default.backend) console.log('default.backend.keys:', safeKeys(mod.default.backend));
    }
  }
}

try {
  const b = require('@lazorkit/wallet/backend');
  printModule('@lazorkit/wallet/backend', b);
  try {
    console.log('LazorKit type:', typeof b.LazorKit);
    console.log('LazorKit static keys:', b.LazorKit ? Object.getOwnPropertyNames(b.LazorKit) : []);
    console.log('LazorKit prototype keys:', b.LazorKit ? Object.getOwnPropertyNames(b.LazorKit.prototype) : []);
  } catch {}
} catch (e) {
  console.log('require("@lazorkit/wallet/backend") failed:', e && e.message);
}

try {
  const s = require('@lazorkit/wallet/server');
  printModule('@lazorkit/wallet/server', s);
} catch (e) {
  console.log('require("@lazorkit/wallet/server") failed:', e && e.message);
}

try {
  const m = require('@lazorkit/wallet');
  printModule('@lazorkit/wallet', m);
} catch (e) {
  console.log('require("@lazorkit/wallet") failed:', e && e.message);
}


