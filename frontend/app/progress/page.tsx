'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useProgress } from '@/hooks/use-progress'
import { toast } from 'sonner'

export default function ProgressPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const router = useRouter()
  // Only enable SSE if we're actually on progress page (not just visiting)
  const progress = useProgress(true) // Enable SSE connection

  // Use progress percentage from backend, fallback to stage-based calculation
  const getProgressPercentage = () => {
    // Use backend progress percentage if available
    if (progress.progress !== undefined && progress.progress >= 0) {
      return progress.progress
    }
    // Fallback: Calculate from stage
    const stages = ['idle', 'validating', 'splitting', 'encrypting', 'dispatch', 'training', 'aggregating', 'uploading', 'recording', 'complete']
    const currentIndex = stages.indexOf(progress.stage)
    return Math.max(0, Math.min(100, (currentIndex / (stages.length - 1)) * 100))
  }

  // Auto-redirect to analysis when complete
  useEffect(() => {
    if (progress.complete && progress.result) {
      toast.success('Training complete! Redirecting to results...')
      // Store result data in sessionStorage for analysis page
      // This includes AI-generated insight from OpenRouter
      sessionStorage.setItem('trainingResult', JSON.stringify(progress.result))
      console.log('[PROGRESS] Stored result with AI insight:', {
        hasInsight: !!progress.result.insight,
        hasTitle: !!progress.result.insight?.title,
        hasSummary: !!progress.result.insight?.summary,
        hasKeyFindings: !!progress.result.insight?.keyFindings,
        keyFindingsCount: progress.result.insight?.keyFindings?.length || 0,
      })
      setTimeout(() => {
        router.push('/analysis')
      }, 2000)
    }
  }, [progress.complete, progress.result, router])

  // Format stage name for display
  const formatStage = (stage: string) => {
    return stage
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const progressPercentage = getProgressPercentage()

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} onAuthChange={setIsAuthenticated} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-foreground text-balance">
              Training in Progress
            </h1>
            <p className="text-lg text-muted-foreground">
              Your dataset is being analyzed across the federated learning network. Insights will be generated once training completes.
            </p>
          </div>

          {/* Overall Progress */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Training Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {progress.stage !== 'idle' ? formatStage(progress.stage) : 'Waiting...'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <div className="w-full bg-input rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-accent to-blue-500 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {progress.message && (
                  <p className="text-sm text-muted-foreground mt-2">{progress.message}</p>
                )}
              </div>

              {/* Error Display */}
              {progress.error && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-medium">Error: {progress.error}</p>
                </div>
              )}

              {/* Stats Grid */}
              {progress.result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {progress.result.avgFinalLoss !== undefined && (
                    <div className="p-3 bg-input rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Average Loss</p>
                      <p className="text-2xl font-bold text-foreground">{progress.result.avgFinalLoss.toFixed(3)}</p>
                    </div>
                  )}
                  {progress.result.numWorkers !== undefined && (
                    <div className="p-3 bg-input rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Workers</p>
                      <p className="text-2xl font-bold text-accent">{progress.result.numWorkers}</p>
                    </div>
                  )}
                  {progress.result.aggregatedHash && (
                    <div className="p-3 bg-input rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Model Hash</p>
                      <p className="text-xs font-mono text-foreground truncate">{progress.result.aggregatedHash.slice(0, 16)}...</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Worker Status */}
          {progress.workers && progress.workers.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Worker Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progress.workers.map((worker: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-4 border border-border rounded-lg hover:bg-input/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{worker.nodeId || `Worker ${idx + 1}`}</h3>
                          {worker.suiAddress && (
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              {worker.suiAddress.slice(0, 10)}...{worker.suiAddress.slice(-8)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {worker.lossHistory && worker.lossHistory.length > 0 && (
                            <p className="text-sm font-mono text-foreground">
                              Loss: {worker.lossHistory[worker.lossHistory.length - 1].toFixed(3)}
                            </p>
                          )}
                          {worker.numSamples !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {worker.numSamples} samples
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete Status */}
          {progress.complete && (
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl">✅</div>
                  <h3 className="text-xl font-bold text-foreground">Training Complete!</h3>
                  <p className="text-muted-foreground">
                    Your federated learning model has been trained successfully. Redirecting to results...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 pt-4">
            {progress.complete ? (
              <Link href="/analysis" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90 h-12">
                  View Results
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/analysis" className="flex-1">
                  <Button variant="outline" className="w-full h-12">
                    View Preliminary Insights
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12"
                  onClick={() => router.push('/')}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
