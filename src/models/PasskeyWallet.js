const mongoose = require('mongoose');

const passkeyWalletSchema = new mongoose.Schema(
  {
    credentialId: { type: String, index: true },
    publicKey: { type: String, index: true },
    smartWalletId: { type: String },
    walletAddress: { type: String, required: true, index: true },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Một credentialId là duy nhất nếu có
passkeyWalletSchema.index({ credentialId: 1 }, { unique: true, partialFilterExpression: { credentialId: { $type: 'string' } } });
// Một publicKey là duy nhất nếu có
passkeyWalletSchema.index({ publicKey: 1 }, { unique: true, partialFilterExpression: { publicKey: { $type: 'string' } } });

module.exports = mongoose.model('PasskeyWallet', passkeyWalletSchema);


