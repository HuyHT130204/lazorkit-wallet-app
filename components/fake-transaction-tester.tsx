'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useWalletStore } from '@/lib/store/wallet';
import { TokenSym } from '@/lib/mock-data/types';
import { ArrowRightLeft, Send, Download, RefreshCw } from 'lucide-react';

export const FakeTransactionTester = () => {
  const { 
    hasWallet, 
    pubkey, 
    tokens, 
    createFakeTransaction, 
    swapFake, 
    sendFake, 
    depositFake,
    refreshBalances 
  } = useWalletStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  if (!hasWallet || !pubkey) {
    return null;
  }

  const handleFakeSwap = async () => {
    setIsProcessing(true);
    setLastAction('Swap');
    
    try {
      // Tạo fake swap transaction
      createFakeTransaction('swap', {
        fromToken: 'SOL',
        toToken: 'USDC',
        amount: 1.0
      });
      
      // Thực hiện swap giả
      swapFake('SOL', 'USDC', 1.0);
      
      console.log('✓ Fake swap completed');
    } catch (error) {
      console.error('Fake swap failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFakeSend = async () => {
    setIsProcessing(true);
    setLastAction('Send');
    
    try {
      const fakeRecipient = 'FakeRecipient' + Math.random().toString(36).substr(2, 5);
      
      // Tạo fake send transaction
      createFakeTransaction('send', {
        token: 'USDC',
        amount: 10.0,
        recipient: fakeRecipient
      });
      
      // Thực hiện send giả
      sendFake('USDC', 10.0, fakeRecipient);
      
      console.log('✓ Fake send completed to:', fakeRecipient);
    } catch (error) {
      console.error('Fake send failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFakeDeposit = async () => {
    setIsProcessing(true);
    setLastAction('Deposit');
    
    try {
      // Tạo fake deposit transaction
      createFakeTransaction('deposit', {
        token: 'SOL',
        amount: 2.0
      });
      
      // Thực hiện deposit giả
      depositFake('SOL', 2.0);
      
      console.log('✓ Fake deposit completed');
    } catch (error) {
      console.error('Fake deposit failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefreshBalances = async () => {
    setIsProcessing(true);
    setLastAction('Refresh');
    
    try {
      await refreshBalances();
      console.log('✓ Balances refreshed');
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-4 bg-muted/20 border-dashed">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-primary mb-2">
            🎭 Fake Transaction Tester
          </h3>
          <p className="text-sm text-muted-foreground">
            Test các chức năng với ví giả: {pubkey}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFakeSwap}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Swap SOL→USDC
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFakeSend}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send 10 USDC
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFakeDeposit}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Deposit 2 SOL
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshBalances}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {isProcessing && (
          <div className="text-center text-sm text-muted-foreground">
            Đang xử lý {lastAction}...
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Token balances:</div>
          {tokens.slice(0, 3).map((token) => (
            <div key={token.symbol} className="flex justify-between">
              <span>{token.symbol}:</span>
              <span>{token.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

