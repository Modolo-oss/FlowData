'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, BarChart3, Zap, ArrowRight, Wallet } from 'lucide-react'
import { useSuiWallet } from '@/hooks/use-sui-wallet'

export default function Home() {
  const wallet = useSuiWallet()
  const isAuthenticated = wallet.connected

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} onAuthChange={() => {}} />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              FlowData Studio
            </h1>
            <p className="text-xl text-muted-foreground">
              AI-Powered Data Analysis Platform
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transform your data into AI-powered insights with privacy-preserving analysis. 
              Upload your dataset, get natural language stories, interactive visualizations, and on-chain verified results.
            </p>
            
            {/* Wallet Connection Prompt */}
            {!wallet.connected && (
              <div className="pt-4">
                <Card className="bg-primary/10 border-primary/30 max-w-md mx-auto">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Wallet className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Connect Your Wallet</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect your Sui Wallet to enable encrypted file uploads. Your data will be protected with Seal SDK encryption.
                    </p>
                    <Button
                      onClick={async () => {
                        // Try to connect
                        await wallet.connect()
                      }}
                      disabled={wallet.loading}
                      className="w-full"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      {wallet.loading ? 'Connecting...' : 'Connect Sui Wallet'}
                    </Button>
                    {wallet.error && (
                      <div className="space-y-2">
                        <p className="text-xs text-destructive text-center">{wallet.error}</p>
                        <p className="text-xs text-muted-foreground text-center">
                          💡 Tips: Buka Console (F12) dan ketik: <code className="bg-background px-1 rounded">window.sui</code> atau <code className="bg-background px-1 rounded">window.suiWallet</code>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Quick Navigation Links - Simple and Visible */}
          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <Link href="/upload">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                <Upload className="w-5 h-5 mr-2" />
                Upload Data
              </Button>
            </Link>
            <Link href="/analysis">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                <Zap className="w-5 h-5 mr-2" />
                View Insights
              </Button>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/upload">
              <Card className="bg-card border-border hover:border-primary/50 transition cursor-pointer h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">Upload Data</h3>
                      <p className="text-sm text-muted-foreground">Start analyzing your CSV dataset</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/analysis">
              <Card className="bg-card border-border hover:border-primary/50 transition cursor-pointer h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">View Insights</h3>
                      <p className="text-sm text-muted-foreground">See AI-generated data stories</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>


            <Link href="/analysis">
              <Card className="bg-card border-border hover:border-primary/50 transition cursor-pointer h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">Analysis Results</h3>
                      <p className="text-sm text-muted-foreground">View your data insights</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* CTA Button */}
          <div className="text-center pt-8">
            <Link href="/upload">
              <Button size="lg" className="bg-primary hover:bg-primary/90 h-14 px-8 text-lg">
                <Upload className="w-5 h-5 mr-2" />
                Get Started - Upload Your Data
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
