'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/navigation'
import WalletStatus from '@/components/wallet-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const mockChartData = [
  { time: '00:00', accuracy: 0.65, loss: 0.45 },
  { time: '04:00', accuracy: 0.72, loss: 0.38 },
  { time: '08:00', accuracy: 0.78, loss: 0.32 },
  { time: '12:00', accuracy: 0.82, loss: 0.28 },
  { time: '16:00', accuracy: 0.85, loss: 0.24 },
  { time: '20:00', accuracy: 0.88, loss: 0.20 },
]

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [stats, setStats] = useState({
    activeDatasets: 3,
    activeNodes: 12,
    trainingProgress: 65,
    walletBalance: 125.50,
    modelAccuracy: 0.88,
    averageLoss: 0.20,
  })

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} onAuthChange={setIsAuthenticated} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Monitor your federated learning projects and wallet</p>
          </div>

          {/* Wallet Section */}
          <WalletStatus />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Datasets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeDatasets}</div>
                <p className="text-xs text-muted-foreground mt-1">+1 this week</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeNodes}</div>
                <p className="text-xs text-muted-foreground mt-1">100% healthy</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Training Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.trainingProgress}%</div>
                <div className="w-full bg-input rounded-full h-2 mt-2">
                  <div 
                    className="bg-accent h-2 rounded-full" 
                    style={{ width: `${stats.trainingProgress}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Model Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(stats.modelAccuracy * 100).toFixed(1)}%</div>
                <p className="text-xs text-green-400 mt-1">↑ 3% improvement</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Model Accuracy Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.20 0 0)" />
                    <XAxis dataKey="time" stroke="oklch(0.70 0 0)" />
                    <YAxis stroke="oklch(0.70 0 0)" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'oklch(0.12 0 0)', border: '1px solid oklch(0.20 0 0)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="oklch(0.65 0.2 264)" 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Training Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.20 0 0)" />
                    <XAxis dataKey="time" stroke="oklch(0.70 0 0)" />
                    <YAxis stroke="oklch(0.70 0 0)" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'oklch(0.12 0 0)', border: '1px solid oklch(0.20 0 0)' }}
                    />
                    <Bar dataKey="loss" fill="oklch(0.55 0.22 264)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <p className="font-medium text-sm">Dataset Upload: fashion-mnist-v2</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                  <span className="text-xs bg-primary/20 text-accent px-2 py-1 rounded">Completed</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <p className="font-medium text-sm">Training Round 15 Completed</p>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>
                  <span className="text-xs bg-primary/20 text-accent px-2 py-1 rounded">Completed</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-sm">New Node Connected: node-847</p>
                    <p className="text-xs text-muted-foreground">6 hours ago</p>
                  </div>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Connected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
