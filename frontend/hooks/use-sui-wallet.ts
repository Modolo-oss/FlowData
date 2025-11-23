/**
 * React hook for Sui Wallet integration using @mysten/dapp-kit (OFFICIAL)
 * Supports ALL Sui wallets via Wallet Standard API (Slush, Sui Wallet, Suiet, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useSignPersonalMessage } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export interface WalletState {
  connected: boolean;
  address?: string;
  chain?: string;
  loading: boolean;
  error?: string;
}

export function useSuiWallet() {
  // Use official dapp-kit hooks
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const wallets = useWallets();
  
  const [error, setError] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - only set mounted after client-side render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Derive state from dapp-kit
  const connected = !!currentAccount;
  const address = currentAccount?.address;
  // Only check wallet availability after mount to prevent hydration mismatch
  const isWalletAvailable = mounted ? wallets.length > 0 : false;

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isWalletAvailable) {
      setError('Sui Wallet not found. Please install a Sui wallet extension (Slush, Sui Wallet, Suiet, etc.).');
      return;
    }

    setError(undefined);

    try {
      // Get first available wallet
      const wallet = wallets[0];
      
      if (!wallet) {
        throw new Error('No wallet available');
      }

      // Connect using dapp-kit
      connectWallet(
        {
          wallet: wallet,
        },
        {
          onSuccess: () => {
            console.log('[WALLET] ✅ Connected:', wallet.name, address);
            setError(undefined);
          },
          onError: (error) => {
            console.error('[WALLET] Connection error:', error);
            setError(error.message || 'Failed to connect wallet');
          },
        }
      );
    } catch (error: any) {
      console.error('[WALLET] Connection error:', error);
      setError(error.message || 'Failed to connect wallet');
    }
  }, [isWalletAvailable, wallets, connectWallet, address]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    disconnectWallet(undefined, {
      onSuccess: () => {
        console.log('[WALLET] ✅ Disconnected');
        setError(undefined);
      },
      onError: (error) => {
        console.error('[WALLET] Disconnect error:', error);
      },
    });
  }, [disconnectWallet]);

  // Sign message (for session key generation)
  const signMessage = useCallback(
    async (message: Uint8Array): Promise<string> => {
      if (!connected || !currentAccount) {
        throw new Error('Wallet not connected');
      }

      try {
        // Convert Uint8Array to string for signPersonalMessage
        const messageString = new TextDecoder().decode(message);

        return new Promise((resolve, reject) => {
          signPersonalMessage(
            {
              message: new TextEncoder().encode(messageString),
            },
            {
              onSuccess: (result) => {
                console.log('[WALLET] ✅ Message signed');
                // signPersonalMessage returns { bytes: string, signature: string }
                if (result.signature) {
                  resolve(result.signature);
                } else {
                  reject(new Error('No signature returned'));
                }
              },
              onError: (error) => {
                console.error('[WALLET] Sign error:', error);
                reject(new Error(`Failed to sign message: ${error.message}`));
              },
            }
          );
        });
      } catch (error: any) {
        throw new Error(`Failed to sign message: ${error.message}`);
      }
    },
    [connected, currentAccount, signPersonalMessage]
  );

  // Log available wallets on mount
  useEffect(() => {
    if (wallets.length > 0) {
      console.log('[WALLET] ✅ Available Sui wallets:', wallets.map(w => w.name));
    } else {
      console.log('[WALLET] ❌ No Sui wallets detected');
      console.log('[WALLET] 💡 Please install a Sui wallet extension (Slush, Sui Wallet, Suiet, etc.)');
    }
  }, [wallets]);

  // Sign and execute transaction (for Walrus upload, etc.)
  const signTransactionBlock = useCallback(
    async (transaction: Transaction) => {
      if (!connected || !currentAccount) {
        throw new Error('Wallet not connected');
      }

      try {
        const result = await signAndExecuteTransaction({
          transaction,
        });
        return result;
      } catch (error: any) {
        throw new Error(`Failed to sign transaction: ${error.message}`);
      }
    },
    [connected, currentAccount, signAndExecuteTransaction]
  );

  return {
    connected,
    address,
    chain: connected ? 'sui:testnet' : undefined,
    loading: isConnecting,
    error,
    isWalletAvailable,
    connect,
    disconnect,
    signMessage,
    signTransactionBlock, // For signing transaction blocks (e.g., Walrus upload)
    wallets, // Expose wallets list for UI
  };
}
