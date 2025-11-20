/**
 * React hook for Sui Wallet integration
 */

import { useState, useEffect, useCallback } from 'react';

export interface WalletState {
  connected: boolean;
  address?: string;
  chain?: string;
  loading: boolean;
  error?: string;
}

export function useSuiWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    loading: false,
  });

  // Check if wallet is available - start with false to prevent hydration mismatch
  const [isWalletAvailable, setIsWalletAvailable] = useState(false);

  // Check wallet availability on client only (after hydration)
  useEffect(() => {
    setIsWalletAvailable(typeof window !== 'undefined' && 'sui' in window);
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isWalletAvailable) {
      setState((prev) => ({
        ...prev,
        error: 'Sui Wallet not found. Please install Sui Wallet extension.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      const suiWallet = (window as any).sui;
      
      // First, try to get existing accounts (might already be connected)
      let accounts: any[] = [];
      if (typeof suiWallet.getAccounts === 'function') {
        try {
          accounts = await suiWallet.getAccounts();
        } catch (e) {
          // getAccounts might fail if not connected, continue to requestPermissions
        }
      }
      
      // If no accounts found, request permissions
      if (!accounts || accounts.length === 0) {
        if (typeof suiWallet.requestPermissions === 'function') {
          accounts = await suiWallet.requestPermissions();
        } else {
          throw new Error('Wallet does not support requestPermissions');
        }
      }
      
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        // Handle different account formats (object with address or string)
        const address = typeof account === 'string' ? account : (account.address || account.accounts?.[0]?.address);
        
        if (!address) {
          throw new Error('No address found in account');
        }
        
        setState({
          connected: true,
          address,
          chain: account.chains?.[0] || account.chain || 'sui:testnet',
          loading: false,
        });
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'No accounts found',
        }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  }, [isWalletAvailable]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState({
      connected: false,
      loading: false,
    });
  }, []);

  // Sign message (for session key generation)
  const signMessage = useCallback(
    async (message: Uint8Array): Promise<string> => {
      if (!state.connected || !isWalletAvailable) {
        throw new Error('Wallet not connected');
      }

      try {
        const suiWallet = (window as any).sui;
        const result = await suiWallet.signMessage({
          message,
        });
        return result.signature;
      } catch (error: any) {
        throw new Error(`Failed to sign message: ${error.message}`);
      }
    },
    [state.connected, isWalletAvailable]
  );

  // Check connection status on mount (try to get accounts silently)
  useEffect(() => {
    if (isWalletAvailable) {
      const suiWallet = (window as any).sui;
      
      // Try to get accounts without requesting permissions (silent check)
      // This checks if wallet is already connected
      if (typeof suiWallet.getAccounts === 'function') {
        suiWallet.getAccounts()
          .then((accounts: any[]) => {
            if (accounts && accounts.length > 0) {
              // Wallet is already connected, update state
              const account = accounts[0];
              setState({
                connected: true,
                address: account.address || account,
                chain: account.chains?.[0] || 'sui:testnet',
                loading: false,
              });
            }
          })
          .catch(() => {
            // Silently fail - wallet not connected or permission not granted
            // User will need to manually connect
          });
      }
    }
  }, [isWalletAvailable]);

  return {
    ...state,
    isWalletAvailable,
    connect,
    disconnect,
    signMessage,
  };
}

