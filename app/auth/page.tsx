"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TokenLogo } from "@/components/ui/token-logo"
import { AppHeader } from "@/components/app-header"
import { DrawerNav } from "@/components/drawer-nav"
import { useWalletStore } from "@/lib/store/wallet"
import { useWallet } from "@/hooks/use-lazorkit-wallet"
import { t } from "@/lib/i18n"

export default function AuthPage() {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQRData] = useState<any>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const { setHasPasskey, setHasWallet, setPubkey } = useWalletStore()
  const wallet = useWallet()

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://localhost:3001"

  const handleLogin = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (!wallet?.connectPasskey) {
        throw new Error("Passkey login not available")
      }
      const passkeyData = await wallet.connectPasskey()
      if (!passkeyData) throw new Error("Failed to login with passkey")

      setHasPasskey?.(true)

      // Create smart wallet immediately on backend
      const resp = await fetch(`${apiBase}/api/orders/create-smart-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkeyData }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}) as any)
        throw new Error(err?.error || "Failed to create smart wallet")
      }
      const data = await resp.json()
      const addr = data?.walletAddress
      if (!addr) throw new Error("No wallet address returned")

      setHasWallet?.(true)
      setPubkey?.(addr)
      router.replace("/account")
    } catch (e: any) {
      console.error("Login failed:", e)
      alert(e?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (!wallet?.connectPasskey) {
        throw new Error("Passkey login not available")
      }
      const passkeyData = await wallet.connectPasskey()
      if (!passkeyData) throw new Error("Failed to login with passkey")

      setHasPasskey?.(true)

      // Get device metadata
      const deviceMetadata = {
        deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: {
          w: window.screen.width,
          h: window.screen.height
        },
        language: navigator.language || navigator.languages?.[0] || 'en-US'
      }

      // Generate QR code for device import
      const resp = await fetch(`${apiBase}/api/device-import/generate-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          passkeyData, 
          deviceMetadata 
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any))
        throw new Error(err?.error || "Failed to generate QR code")
      }
      const data = await resp.json()
      
      // Store QR data for polling
      localStorage.setItem('device-import-shareId', data.shareId)
      localStorage.setItem('device-import-passkeyData', JSON.stringify(passkeyData))
      
      // Show QR code modal and start polling
      setShowQRModal(true)
      setQRData(data)
      startPolling(data.shareId)
      
    } catch (e: any) {
      console.error("Import failed:", e)
      alert(e?.message || "Import failed")
    } finally {
      setLoading(false)
    }
  }

  // Poll for approval status
  const startPolling = (shareId: string) => {
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`${apiBase}/api/device-import/status/${shareId}`)
        if (resp.ok) {
          const data = await resp.json()
          if (data.status === 'approved') {
            // Device approved, get wallet address and login
            const passkeyDataStr = localStorage.getItem('device-import-passkeyData')
            let passkeyData: any = {}
            if (passkeyDataStr && passkeyDataStr !== 'undefined') {
              try {
                passkeyData = JSON.parse(passkeyDataStr)
              } catch (e) {
                console.warn('Invalid device-import-passkeyData; clearing')
                try { localStorage.removeItem('device-import-passkeyData') } catch {}
              }
            }
            setHasWallet?.(true)
            setPubkey?.(data.walletAddress)
            localStorage.removeItem('device-import-shareId')
            localStorage.removeItem('device-import-passkeyData')
            clearInterval(interval)
            setPollingInterval(null)
            setShowQRModal(false)
            router.replace("/account")
          } else if (data.status === 'rejected' || data.status === 'expired') {
            clearInterval(interval)
            setPollingInterval(null)
            setShowQRModal(false)
            alert('Device connection was rejected or expired')
          }
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
    }, 2000) // Poll every 2 seconds
    
    setPollingInterval(interval)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Use TokenLogo component (same as swap) for background tokens
  const tokens = ["SOL", "ORCA", "JitoSOL", "USDC", "USDT", "BONK", "RAY", "JUP"]

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          {tokens.map((symbol, idx) => {
            const positions = [
              "top-10 left-10",
              "top-20 right-12",
              "top-1/3 left-1/4",
              "top-1/3 right-1/4",
              "bottom-1/3 left-8",
              "bottom-1/3 right-8",
              "bottom-20 left-1/3",
              "bottom-10 right-1/3",
            ]
            return (
              <div key={idx} className={`absolute ${positions[idx]} opacity-30`}>
                <TokenLogo symbol={symbol} size={36} />
              </div>
            )
          })}
        </div>
      </div>

      <AppHeader onMenuClick={() => setDrawerOpen(true)} />
      <DrawerNav open={drawerOpen} onOpenChange={setDrawerOpen} />

      <main className="relative z-10 container mx-auto px-4 py-10 min-h-[80vh] flex flex-col items-center justify-center">
        <div className="max-w-sm w-full space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-[#16ffbb] flex items-center justify-center shadow-[0_10px_30px_rgba(22,255,187,0.25)]">
              <span className="text-3xl font-bold text-black">◆</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="text-white">Ramp</span>
              <span className="text-[#16ffbb]">Fi</span>
            </h1>
            <p className="text-sm text-gray-400">{t("app.prototype")}</p>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-6">
            <Button
              className="w-full h-14 text-base font-semibold rounded-full bg-[#16ffbb] hover:bg-[#16ffbb]/90 text-black border-0 shadow-[0_10px_28px_rgba(22,255,187,0.20)] hover:shadow-[0_12px_32px_rgba(22,255,187,0.28)]"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Logging in…" : "Login with Passkey"}
            </Button>
            <Button
              className="w-full h-14 text-base font-semibold rounded-full bg-transparent border-2 border-[#16ffbb] hover:border-[#16ffbb]/90 text-[#16ffbb] hover:bg-[#16ffbb]/10"
              variant="outline"
              onClick={handleImport}
              disabled={loading}
            >
              Import Your Wallet
            </Button>
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-white mb-4">Connect to Existing Wallet</h3>
            <p className="text-gray-300 mb-6 text-sm">
              Scan this QR code with your existing device to connect this device to your wallet
            </p>
            
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <img 
                  src={qrData?.qrCode} 
                  alt="Device Import QR Code"
                  className="w-64 h-64 rounded-lg border-2 border-[#16ffbb]/50 shadow-lg"
                />
                <div className="absolute inset-0 border-2 border-[#16ffbb] rounded-lg pointer-events-none animate-pulse"></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-2">
                Expires in: {qrData?.expiresAt ? Math.ceil((new Date(qrData.expiresAt).getTime() - new Date().getTime()) / 1000 / 60) : 0} minutes
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowQRModal(false)
                  if (pollingInterval) {
                    clearInterval(pollingInterval)
                    setPollingInterval(null)
                  }
                }}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
