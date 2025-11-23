'use client'

import { WalletProvider } from '@mysten/dapp-kit'
import { SuiClientProvider, createNetworkConfig } from '@mysten/dapp-kit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getFullnodeUrl } from '@mysten/sui/client'
import { ReactNode, useEffect } from 'react'

const queryClient = new QueryClient()

// Create network configuration
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
})

export function WalletProviderWrapper({ children }: { children: ReactNode }) {
  // Suppress MetaMask extension errors (not from our code)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalError = console.error
      console.error = (...args: any[]) => {
        // Suppress MetaMask private field access errors
        const errorStr = args.join(' ')
        if (errorStr.includes('Cannot read from private field') && 
            errorStr.includes('chrome-extension://') &&
            errorStr.includes('isMetaMask')) {
          // Suppress this error - it's from MetaMask extension, not our code
          return
        }
        // Log other errors normally
        originalError.apply(console, args)
      }

      return () => {
        console.error = originalError
      }
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider
          features={['sui:signAndExecuteTransactionBlock']}
          autoConnect
        >
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
