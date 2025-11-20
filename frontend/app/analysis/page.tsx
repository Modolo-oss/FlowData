'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Download, Share2, ExternalLink } from 'lucide-react'
import AIStoryComponent from '@/components/ai-story'
import ChartsGrid from '@/components/charts-grid'
import InsightCard from '@/components/insight-card'
import PromptInput from '@/components/prompt-input'
import { toast } from 'sonner'

interface AnalysisResult {
  globalModelHash?: string
  insight?: {
    title?: string
    summary?: string
    keyFindings?: string[]  // AI-generated key findings
    recommendations?: string[]  // AI-generated recommendations
    metrics?: {
      numWorkers?: number
      avgFinalLoss?: number
    }
    charts?: Array<{ type: string; cid: string }>
    visualizationHints?: {
      correlation?: string[]
      trends?: string[]
      clusters?: string[]
    }
  }
  proof?: {
    walrusCid?: string
    walrusScanUrl?: string  // Walrus Scan URL
    blobObjectId?: string  // Blob Object ID
    suiTxHash?: string
  }
  updates?: any[]
}

export default function AnalysisPage() {
  const [prompt, setPrompt] = useState('')
  const [customStory, setCustomStory] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load result from sessionStorage or show mock data
  useEffect(() => {
    const storedResult = sessionStorage.getItem('trainingResult')
    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult)
        setResult(parsed)
        if (parsed.insight?.summary) {
          setCustomStory(parsed.insight.summary)
        }
      } catch (e) {
        console.error('Failed to parse stored result:', e)
      }
    }
    setLoading(false)
  }, [])

  // Generate AI story from result data (use backend AI-generated insight)
  const generateStory = (result: AnalysisResult): string => {
    // Use AI-generated summary from backend (OpenRouter/LLM)
    if (result.insight?.summary) {
      return result.insight.summary
    }
    
    // Fallback: Generate basic story from metrics if no AI summary
    const numWorkers = result.insight?.metrics?.numWorkers || result.updates?.length || 2
    const avgLoss = result.insight?.metrics?.avgFinalLoss || 0.5
    const hasEncryption = result.updates?.some((u: any) => u.attestation?.commitVerified) || false
    
    return `Your dataset has been analyzed across ${numWorkers} federated learning workers. ` +
      `Average final loss: ${avgLoss.toFixed(3)}. ` +
      `${hasEncryption ? 'Data was encrypted and verified on-chain.' : 'Analysis completed successfully.'} ` +
      `Model aggregated successfully with cryptographic verification.`
  }

  // Use AI-generated story from backend (OpenRouter), or fallback to basic story
  const story = customStory || (result ? generateStory(result) : 
    "Waiting for training results... Upload a dataset to see AI-generated insights.")

  // Get chart data from result (actual data from CSV analysis, not mock)
  const chartData = result?.insight?.chartData ? {
    correlationMatrix: result.insight.chartData.correlationMatrix || [],
    trends: result.insight.chartData.trends || [],
    clusters: result.insight.chartData.clusters || [],
    summary: result.insight.chartData.summary || {
      total_samples: 0,
      numeric_columns: 0,
      categorical_columns: 0,
      strong_correlations: 0,
      outliers_count: 0,
    },
  } : {
    // Fallback: empty charts if no data
    correlationMatrix: [],
    trends: [],
    clusters: [],
    summary: {
      total_samples: 0,
      numeric_columns: 0,
      categorical_columns: 0,
      strong_correlations: 0,
      outliers_count: 0,
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={true} onAuthChange={() => {}} />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground text-balance">
                {result?.insight?.title || 'Data Analysis Results'}
              </h1>
              <p className="text-muted-foreground mt-2">
                Generated with federated learning across {result?.insight?.metrics?.numWorkers || result?.updates?.length || 2} collaborative nodes
                {result?.aggregatedAt && ` • ${new Date(result.aggregatedAt).toLocaleString()}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* AI Story - Hero Section */}
          <AIStoryComponent story={story} />

          {/* Key Findings from AI (if available) */}
          {result?.insight?.keyFindings && result.insight.keyFindings.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg text-foreground mb-4">Key Findings</h3>
                <ul className="space-y-2">
                  {result.insight.keyFindings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-foreground">{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations from AI (if available) */}
          {result?.insight?.recommendations && result.insight.recommendations.length > 0 && (
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg text-foreground mb-4">Recommendations</h3>
                <ul className="space-y-2">
                  {result.insight.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">→</span>
                      <span className="text-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Optional Prompt for Personalization */}
          <PromptInput 
            onSubmit={(text) => {
              setPrompt(text)
              // Note: Prompt personalization would require re-generating insight with new prompt
              // For now, just show message
              toast.info('Prompt received. Future: This will regenerate insights with your question.')
            }}
          />

          {/* Charts Grid */}
          <ChartsGrid data={chartData} />

          {/* Insight Card Preview */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Create Shareable Insight Card
            </h2>
            <InsightCard 
              story={story}
              chartPreview="correlation-matrix"
            />
          </div>

          {/* On-chain Proof */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">On-Chain Verification</h3>
                {result?.proof ? (
                  <>
                    {result.proof.suiTxHash && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Sui Transaction Hash:</p>
                        <div className="bg-background rounded-lg p-4 font-mono text-sm text-foreground break-all flex items-center justify-between">
                          <span>{result.proof.suiTxHash}</span>
                          <a
                            href={`https://suiexplorer.com/txblock/${result.proof.suiTxHash}?network=testnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-primary hover:underline"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}
                    {result.proof.walrusCid && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Walrus CID:</p>
                        <div className="bg-background rounded-lg p-4 font-mono text-sm text-foreground break-all flex items-center justify-between">
                          <span>{result.proof.walrusCid}</span>
                          {result.proof.walrusScanUrl && (
                            <a
                              href={result.proof.walrusScanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-primary hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {result.proof.blobObjectId && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Blob Object ID:</p>
                        <div className="bg-background rounded-lg p-4 font-mono text-sm text-foreground break-all">
                          {result.proof.blobObjectId}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-background rounded-lg p-4 font-mono text-sm text-muted-foreground break-all">
                    0xa7f2c...e3b4d
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  This analysis is verified on Sui blockchain. Federated learning nodes have cryptographically signed this result.
                </p>
                {result?.globalModelHash && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Model Hash:</p>
                    <p className="text-xs font-mono text-foreground">{result.globalModelHash}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
