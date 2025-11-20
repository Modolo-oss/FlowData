'use client'

import { useState } from 'react'
import Navigation from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import { Download, Share2, Archive } from 'lucide-react'

const mockAccuracyData = [
  { epoch: 1, train: 0.62, test: 0.60 },
  { epoch: 2, train: 0.68, test: 0.65 },
  { epoch: 3, train: 0.73, test: 0.71 },
  { epoch: 4, train: 0.77, test: 0.75 },
  { epoch: 5, train: 0.81, test: 0.79 },
  { epoch: 6, train: 0.84, test: 0.82 },
  { epoch: 7, train: 0.87, test: 0.85 },
  { epoch: 8, train: 0.89, test: 0.87 },
]

const mockConfusionData = [
  { x: 'Cat', 'Predicted Cat': 95, 'Predicted Dog': 5, 'Predicted Other': 0 },
  { x: 'Dog', 'Predicted Cat': 3, 'Predicted Dog': 96, 'Predicted Other': 1 },
  { x: 'Other', 'Predicted Cat': 5, 'Predicted Dog': 2, 'Predicted Other': 93 },
]

export default function ResultsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [selectedModel, setSelectedModel] = useState('current')

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} onAuthChange={setIsAuthenticated} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground text-balance">Model Training Complete</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Your federated model achieved 87.2% accuracy. Generate shareable insights and visualizations.
              </p>
            </div>
            <Link href="/analysis">
              <Button className="bg-primary hover:bg-primary/90">
                Generate AI Story
              </Button>
            </Link>
          </div>

          {/* Model Selection */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Select Model Version</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setSelectedModel('current')}
                  className={`p-4 border rounded-lg transition ${
                    selectedModel === 'current'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">Current Model</div>
                  <div className="text-xs text-muted-foreground mt-1">Training Round 8</div>
                  <div className="text-lg font-bold text-accent mt-2">87.2% Accuracy</div>
                </button>
                
                <button
                  onClick={() => setSelectedModel('previous')}
                  className={`p-4 border rounded-lg transition ${
                    selectedModel === 'previous'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">Previous Model</div>
                  <div className="text-xs text-muted-foreground mt-1">Training Round 6</div>
                  <div className="text-lg font-bold text-foreground mt-2">82.1% Accuracy</div>
                </button>

                <button
                  onClick={() => setSelectedModel('baseline')}
                  className={`p-4 border rounded-lg transition ${
                    selectedModel === 'baseline'
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">Baseline</div>
                  <div className="text-xs text-muted-foreground mt-1">Initial Model</div>
                  <div className="text-lg font-bold text-foreground mt-2">65.0% Accuracy</div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">87.2%</div>
                <p className="text-xs text-green-400 mt-1">↑ 22.2% vs baseline</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Precision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">86.8%</div>
                <p className="text-xs text-muted-foreground mt-1">Weighted average</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recall</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">87.1%</div>
                <p className="text-xs text-muted-foreground mt-1">Weighted average</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">F1 Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">86.9%</div>
                <p className="text-xs text-muted-foreground mt-1">Weighted average</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Training Accuracy Over Epochs</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockAccuracyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.20 0 0)" />
                    <XAxis dataKey="epoch" stroke="oklch(0.70 0 0)" />
                    <YAxis stroke="oklch(0.70 0 0)" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'oklch(0.12 0 0)', border: '1px solid oklch(0.20 0 0)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="train" stroke="oklch(0.65 0.2 264)" dot={false} />
                    <Line type="monotone" dataKey="test" stroke="oklch(0.60 0.20 200)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Class Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-foreground">Cat</span>
                      <span className="text-sm font-semibold">1,234 samples</span>
                    </div>
                    <div className="w-full bg-input rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: '95%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-foreground">Dog</span>
                      <span className="text-sm font-semibold">1,156 samples</span>
                    </div>
                    <div className="w-full bg-input rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '90%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-foreground">Other</span>
                      <span className="text-sm font-semibold">998 samples</span>
                    </div>
                    <div className="w-full bg-input rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '78%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Export & Share</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-primary hover:bg-primary/90">
                  <Download className="w-4 h-4 mr-2" />
                  Download Model
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Results
                </Button>
                <Button variant="outline">
                  Export Metrics
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive/80">
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
