'use client';

import { useState } from 'react';
import { Send, Clipboard, QrCode, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useWalletStore, TokenSym } from '@/lib/store/wallet';
import { useWallet } from '@/hooks/use-lazorkit-wallet';
import { TOKEN_ADDRESSES, TOKEN_DECIMALS, defaultConnection } from '@/lib/services/jupiter';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { formatTokenAmount } from '@/lib/utils/format';
import { isValidSolanaAddress } from '@/lib/utils/address';
import { t } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface SendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendModal = ({ open, onOpenChange }: SendModalProps) => {
  const { tokens, pubkey, addActivity } = useWalletStore();
  const lz = useWallet() as any;
  const [selectedToken, setSelectedToken] = useState<TokenSym>('SOL');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);
  const amountNum = parseFloat(amount) || 0;

  const validateForm = () => {
    if (!recipient.trim()) {
      setError('Please enter recipient address');
      return false;
    }

    if (!isValidSolanaAddress(recipient)) {
      setError(t('send.invalidAddress'));
      return false;
    }

    if (!amount || amountNum <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (!selectedTokenData || amountNum > selectedTokenData.amount) {
      setError(t('send.insufficientBalance'));
      return false;
    }

    setError('');
    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      const activeAddress = (lz as any)?.address || pubkey;
      if (!activeAddress) throw new Error('No wallet address');
      const owner = new PublicKey(activeAddress);
      const recipientPk = new PublicKey(recipient);

      if (!lz?.signAndSendTransaction) throw new Error('signAndSendTransaction not available');

      let sig: string;
      if (selectedToken === 'SOL') {
        const lamports = Math.round(amountNum * 1e9);
        const transferIx = SystemProgram.transfer({ fromPubkey: owner, toPubkey: recipientPk, lamports });
        sig = await lz.signAndSendTransaction([transferIx]);
      } else {
        const mint = (TOKEN_ADDRESSES as Record<string, string>)[selectedToken];
        if (!mint) throw new Error('Unsupported token');
        const decimals = TOKEN_DECIMALS[selectedToken as keyof typeof TOKEN_DECIMALS] ?? 6;
        const rawAmount = Math.round(amountNum * Math.pow(10, decimals));
        const mintPk = new PublicKey(mint);

        const fromAta = await (splToken as any).getAssociatedTokenAddress(mintPk, owner, true);
        let toAta;
        try {
          toAta = await (splToken as any).getAssociatedTokenAddress(mintPk, recipientPk, false);
        } catch (err: any) {
          if (err?.name === 'TokenOwnerOffCurveError' || /OffCurve/i.test(String(err?.message))) {
            toAta = await (splToken as any).getAssociatedTokenAddress(mintPk, recipientPk, true);
          } else {
            throw err;
          }
        }

        // Create instructions array
        const instructions = [];

        // Check if recipient ATA exists, if not add create ATA instruction
        const toAtaInfo = await defaultConnection.getAccountInfo(toAta);
        if (!toAtaInfo) {
          const createAtaIx = (splToken as any).createAssociatedTokenAccountInstruction(
            owner, // payer
            toAta, // ata
            recipientPk, // owner
            mintPk // mint
          );
          instructions.push(createAtaIx);
        }

        // Add transfer instruction
        const transferIx = typeof (splToken as any).createTransferInstruction === 'function'
          ? (splToken as any).createTransferInstruction(fromAta, toAta, owner, rawAmount)
          : (splToken as any).createTransferCheckedInstruction(fromAta, mintPk, toAta, owner, rawAmount, decimals);
        instructions.push(transferIx);

        // Send all instructions in one transaction
        sig = await lz.signAndSendTransaction(instructions);
      }

      addActivity?.({
        id: Date.now().toString(),
        kind: 'send',
        ts: new Date().toISOString(),
        summary: `Sent ${amountNum} ${selectedToken} to ${recipient.slice(0,4)}...${recipient.slice(-4)}`,
        amount: amountNum,
        token: selectedToken,
        counterparty: recipient,
        status: 'Success',
        tx: sig,
      } as any);

      toast({ title: 'Transaction sent', description: `${amountNum} ${selectedToken} sent successfully` });

      setRecipient('');
      setAmount('');
      setError('');
      onOpenChange(false);
    } catch (e: any) {
      console.error('Send failed:', e);
      toast({ title: 'Send failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaxClick = () => {
    if (selectedTokenData) {
      setAmount(selectedTokenData.amount.toString());
      setError('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipient(text);
      setError('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to paste from clipboard',
        variant: 'destructive',
      });
    }
  };

  const availableTokens = tokens.filter((t) => t.amount > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center space-x-2'>
            <Send className='h-5 w-5' />
            <span>{t('send.title')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Token Selection */}
          <div className='space-y-2'>
            <Label>{t('send.selectToken')}</Label>
            <Select
              value={selectedToken}
              onValueChange={(value: TokenSym) => setSelectedToken(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTokenData && (
              <p className='text-sm text-muted-foreground'>
                Balance:{' '}
                {formatTokenAmount(
                  selectedTokenData.amount,
                  selectedTokenData.symbol
                )}
              </p>
            )}
          </div>

          {/* Recipient Address */}
          <div className='space-y-2'>
            <Label>{t('send.recipient')}</Label>
            <div className='flex space-x-2'>
              <Input
                placeholder={t('send.enterAddress')}
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setError('');
                }}
                className={error ? 'border-destructive' : ''}
              />
              <Button variant='outline' size='sm' onClick={handlePaste}>
                <Clipboard className='h-4 w-4' />
              </Button>
              <Button variant='outline' size='sm' disabled>
                <QrCode className='h-4 w-4' />
              </Button>
            </div>
            {error && <p className='text-sm text-destructive'>{error}</p>}
          </div>

          {/* Amount */}
          <div className='space-y-2'>
            <Label>{t('send.enterAmount')}</Label>
            <div className='flex space-x-2'>
              <Input
                type='number'
                placeholder='0.00'
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                className={error ? 'border-destructive' : ''}
              />
              <Button variant='outline' size='sm' onClick={handleMaxClick}>
                {t('common.max')}
              </Button>
            </div>
          </div>

          {/* Estimated Fee */}
          <div className='p-3 bg-muted/50 rounded-lg'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>
                {t('send.estimatedFee')}
              </span>
              <span>0.000005 SOL</span>
            </div>
          </div>

          {/* Actions */}
          <div className='flex space-x-2'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='flex-1'
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSend}
              className='flex-1'
              disabled={isProcessing || !!error}
            >
              {isProcessing ? (
                <div className='flex items-center space-x-2'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                  <span>Sending...</span>
                </div>
              ) : (
                <div className='flex items-center space-x-2'>
                  <span>{t('send.confirm')}</span>
                  <ArrowRight className='h-4 w-4' />
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
