# RampFi 🚀

**One-Tap BTC Onramp for Everyone**

Traditional crypto onboarding takes 30 minutes and loses millions of users. RampFi reduces this to 30 seconds. Built with Passkey SDK on Solana, we enable invisible wallet creation via Face ID—no KYC, no app downloads, no seed phrases. Users simply login and buy Bitcoin instantly, unlocking 35M+ new users through zero-friction onboarding.

> Making crypto as easy as buying a sandwich.

[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-14F195?style=flat&logo=solana)](https://solana.com)
[![Powered by LazorKit](https://img.shields.io/badge/Powered%20by-LazorKit-7857FF?style=flat)](https://lazor.sh)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🎯 The Problem

**Current crypto onboarding is broken:**
- 📝 Centralized exchanges: KYC + bank linking = **minutes to hours**
- 💼 Self-custody wallets: Seed phrases + fund transfers = **30+ minutes**
- 📊 Result: **70% of potential users drop off** during setup

**The market impact:**
- Only **17.5M users** can easily access crypto today
- **35M+ potential users** are blocked by friction
- Every **30-minute barrier** costs the ecosystem millions in lost adoption

---

## ✨ Our Solution

**RampFi: 30 seconds from zero to Bitcoin ownership**

### Key Features

🔐 **No KYC Required**
- Instant access without identity verification
- Privacy-first approach

📱 **No App Installation**
- Works directly in browser
- Zero download friction

👤 **Face ID Login**
- Invisible wallet creation using Passkey SDK
- Non-custodial, secured by device biometrics

⚡ **Instant Onramp**
- Buy BTC/SOL/USDC with USD/VND
- Card payments integrated
- 30-second transaction flow

🔄 **Built-in Swap**
- Jupiter-powered token swaps
- Minimal slippage
- One-tap trading

---

## 🏗️ Technical Architecture

### Built With

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain:** Solana (Devnet/Mainnet)
- **Wallet SDK:** [@lazorkit/wallet](https://www.npmjs.com/package/@lazorkit/wallet)
- **Authentication:** Passkey (WebAuthn)
- **Swap Integration:** Jupiter Aggregator
- **State Management:** Zustand with persistence

### How It Works

```
User Journey:
1. Visit RampFi → Login with Face ID (Passkey)
2. Wallet created invisibly on-chain (non-custodial)
3. Select amount & token → Pay with card
4. Receive tokens in 30 seconds ✅
```

### Three User States

**State A:** No Passkey, No Wallet
- Show onboarding: Create Passkey → Create Wallet
- Display Buy Fiat (OnRamp) interface

**State B:** Has Passkey, No Wallet
- Prompt wallet creation
- Enable Buy Fiat functionality

**State C:** Has Passkey + Wallet
- Auto-redirect to `/buy`
- Full on-chain features unlocked
- Display portfolio, swap, send, deposit

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern browser with WebAuthn support

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rampfi.git
cd rampfi

# Install dependencies
npm install
```

### Environment Setup

Create `.env.local` in the root directory:

```env
# Solana Network (Devnet for testing)
NEXT_PUBLIC_LAZORKIT_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_LAZORKIT_PORTAL_URL=https://portal.lazor.sh
NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL=https://kora-9do3.onrender.com
NEXT_PUBLIC_ENABLE_MAINNET=false
```

**For Mainnet:**
```env
NEXT_PUBLIC_LAZORKIT_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_ENABLE_MAINNET=true
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
rampfi/
├── app/
│   ├── page.tsx              # Landing page with state routing
│   ├── buy/page.tsx          # Main Buy/Swap interface
│   ├── account/page.tsx      # User account & portfolio
│   └── callback/             # Payment callbacks
├── components/
│   ├── onramp-screen.tsx     # Onboarding stepper (3 states)
│   ├── onramp-form.tsx       # Buy fiat form (USD/VND)
│   ├── onramp-preview-modal.tsx
│   ├── swap-form.tsx         # Token swap interface
│   ├── wallet-banner.tsx     # Portfolio balance display
│   ├── assets-tab.tsx        # Token list with Jupiter prices
│   ├── assets-activity.tsx   # Recent transactions
│   └── token-detail-modal.tsx
├── lib/
│   ├── store/
│   │   └── wallet.ts         # Zustand store + selectors
│   ├── services/
│   │   └── jupiter.ts        # Jupiter API integration
│   ├── utils/
│   │   └── format.ts         # Currency/number formatting
│   └── i18n/                 # Internationalization (EN/VI)
└── public/                   # Static assets
```

---

## 🎨 Key Features Demo

### 1️⃣ Invisible Wallet Creation
```typescript
// Passkey-based wallet generation
import { useWallet } from '@lazorkit/wallet';

const { createWallet } = useWallet();
const wallet = await createWallet(); // Non-custodial PDA
```

### 2️⃣ Instant Onramp
- Select fiat currency (USD/VND)
- Choose token (BTC, SOL, USDC, USDT)
- Enter amount with quick presets ($20, $50, $100)
- Preview with fee breakdown
- Pay with card → Receive tokens in 30s

### 3️⃣ Swap with Jupiter
- Fetch real-time token prices
- Calculate optimal routes
- Set slippage tolerance (0.1% - 2%)
- One-click execution

---

## 🧪 Testing

### Manual QA Checklist

**State 1: No Passkey, No Wallet**
- [ ] Visit `/` → See "Create Passkey" step
- [ ] Click "Create Passkey" → Face ID prompt (simulated)
- [ ] Passkey created → Advance to "Create Wallet" step

**State 2: Has Passkey, No Wallet**
- [ ] Click "Create Wallet" → Generate public key
- [ ] Wallet created → See OnRamp form

**State 3: Has Passkey + Wallet**
- [ ] Auto-redirect to `/buy`
- [ ] See WalletBanner with balance
- [ ] Buy/Swap tabs functional

**Buy Flow**
- [ ] Enter amount → Validate min ($20) / max ($500)
- [ ] Select token → See preview modal
- [ ] Confirm → Redirect to success page

**Swap Flow**
- [ ] Select from/to tokens → See estimated output
- [ ] Use HALF/MAX buttons → Correct calculation
- [ ] Set slippage → Confirm → See toast + updated balance

**Assets**
- [ ] Token list loads with Jupiter prices
- [ ] Icons display correctly (fallback if missing)
- [ ] Hide zero balances filter works
- [ ] Click token → Detail modal opens

---

## 🎯 Go-to-Market Strategy

### Target: TikTok Viral Flows

**Traditional flow:**
```
TikTok Ad → App Store → Download → Create Account → Setup → Buy
(~5-10 minutes, 80% drop-off)
```

**RampFi flow:**
```
TikTok Ad → RampFi Link → Face ID → Buy
(30 seconds, <20% drop-off)
```

### Traction
- 🎯 **31 dApps** already integrating LazorKit SDK
- 🚀 Targeting **35M+ new users** blocked by current friction
- 💡 Plug-and-play wallet adapter for seamless integration

---

## 👥 Team

**HuyHo** - Founder
- Pioneered RampFi development
- Proved LazorKit SDK's superior integration capabilities

**Chaukhac** - Solana Core Developer
- Deep expertise in Solana Core & LazorKit SDK
- Active Superteam member & hackathon winner

**Kay** - Lead Security Architect
- Leading security with secure signing flows & DeFi
- Ensures safety and integrity of LazorKit SDK

---

## 📚 Documentation

- [LazorKit Wallet SDK](https://www.npmjs.com/package/@lazorkit/wallet)
- [Jupiter Swap API](https://station.jup.ag/docs/apis/swap-api)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [WebAuthn Guide](https://webauthn.guide/)

---

## 🛣️ Roadmap

- [x] Passkey wallet creation (Devnet)
- [x] Fiat onramp UI (demo)
- [x] Jupiter swap integration
- [x] Multi-language support (EN/VI)
- [ ] Real payment gateway integration
- [ ] Mainnet deployment
- [ ] Mobile app (React Native)
- [ ] Multi-chain support (EVM)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🔗 Links

- **Website:** [lazorkit-wallet.app](https://lazorkit-wallet-app.vercel.app)

---

## 🙏 Acknowledgments

- [Solana Foundation](https://solana.org) for the incredible blockchain infrastructure
- [LazorKit](https://lazor.sh) for the Passkey SDK
- [Jupiter](https://jup.ag) for swap aggregation
- [Colosseum Hackathon](https://www.colosseum.org/) for the opportunity

---

## 💡 Built for Colosseum Hackathon

**Theme:** Simplifying crypto onboarding  
**Impact:** From 30 minutes to 30 seconds  
**Vision:** Making Bitcoin accessible to everyone

---

<div align="center">

**RampFi** - One-tap BTC onramp for everyone

Made with ❤️ by the RampFi Team

</div>
