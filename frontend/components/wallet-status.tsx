'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function WalletStatus() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Wallet Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Address</p>
            <p className="font-mono text-sm text-foreground truncate">0x7c8...a4c2</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Network</p>
            <p className="text-sm text-foreground">Sui Mainnet</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Balance</p>
            <p className="text-sm text-accent font-semibold">125.50 SUI</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <p className="text-sm text-green-400">Connected</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
