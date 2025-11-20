'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, BarChart3, Upload, Cpu } from 'lucide-react'

interface NavigationProps {
  isAuthenticated: boolean
  onAuthChange: (state: boolean) => void
}

export default function Navigation({ isAuthenticated, onAuthChange }: NavigationProps) {
  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg hidden sm:inline text-foreground">FlowData</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {isAuthenticated && (
            <>
              <Link href="/analysis" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition">
                <Zap className="w-4 h-4" />
                Insights
              </Link>
              <Link href="/upload" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition">
                <Upload className="w-4 h-4" />
                Upload
              </Link>
              <Link href="/progress" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition">
                <BarChart3 className="w-4 h-4" />
                Progress
              </Link>
              <Link href="/nodes" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition">
                <Cpu className="w-4 h-4" />
                Network
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAuthChange(false)}
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              size="sm"
              onClick={() => onAuthChange(true)}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
