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
import { regenerateInsights, downloadFile } from '@/lib/api'

// New AnalysisResult structure matching backend
interface AnalysisResult {
  // Walrus storage
  blobId?: string
  walrusScanUrl?: string
  
  // Sui blockchain
  suiTx?: string
  suiExplorerUrl?: string
  
  // Analysis results
  analysisSummary?: {
    dataInsights: {
      num_samples: number
      columns: string[]
      numeric_columns?: string[]
      categorical_columns?: string[]
      statistics?: Record<string, any>
      correlations?: Array<{ x: string; y: string; value: number }>
      clusters?: Array<{ x: number; y: number; cluster: string; label: string }>
      trends?: Array<{
        metric: string
        over: string
        direction: string
        change: number
        data_points: Array<{ date: string; value: number }>
      }>
      outliers?: Array<{ column: string; row: number; value: number; deviation: number }>
    }
    chartsData: {
      correlationMatrix: Array<{ x: string; y: string; value: number }>
      trends: Array<{ date: string; value: number }>
      clusters: Array<{ x: number; y: number; cluster: string; label: string }>
      outliers: Array<{ column: string; row: number; value: number; deviation: number }>
      summary: {
        total_samples: number
        numeric_columns: number
        categorical_columns: number
        strong_correlations: number
        outliers_count: number
      }
    }
  }
  
  // AI insights (from LLM with user prompt)
  llmInsights?: {
    title: string
    summary: string
    keyFindings?: string[]
    recommendations?: string[]
    chartRecommendations?: string[]
  }
  
  // File info
  fileHash?: string
  fileName?: string
  fileType?: string
  
  // Chart data (for frontend rendering)
  chartData?: {
    correlationMatrix: Array<{ x: string; y: string; value: number }>
    trends: Array<{ date: string; value: number }>
    clusters: Array<{ x: number; y: number; cluster: string; label: string }>
    outliers: Array<{ column: string; row: number; value: number; deviation: number }>
    summary: {
      total_samples: number
      numeric_columns: number
      categorical_columns: number
      strong_correlations: number
      outliers_count: number
    }
  }
  
  // Legacy support (for backward compatibility)
  insight?: {
    title?: string
    summary?: string
    keyFindings?: string[]
    recommendations?: string[]
    chartData?: any
  }
  proof?: {
    walrusCid?: string
    walrusScanUrl?: string
    blobObjectId?: string
    suiTxHash?: string
  }
  
  // Privacy & Encryption (Seal SDK)
  sealEncrypted?: boolean
  txBytes?: string // Base64 encoded transaction bytes (required for decryption)
}

export default function AnalysisPage() {
  const [prompt, setPrompt] = useState('')
  const [customStory, setCustomStory] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const router = useRouter()

  // Load result from sessionStorage or show mock data
  useEffect(() => {
    const storedResult = sessionStorage.getItem('trainingResult')
    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult)
        console.log('[ANALYSIS] Loaded result from sessionStorage:', {
          hasBlobId: !!parsed.blobId,
          hasSuiTx: !!parsed.suiTx,
          hasAnalysisSummary: !!parsed.analysisSummary,
          hasDataInsights: !!parsed.analysisSummary?.dataInsights,
          num_samples: parsed.analysisSummary?.dataInsights?.num_samples,
          columns: parsed.analysisSummary?.dataInsights?.columns?.length,
          hasLlmInsights: !!parsed.llmInsights,
          hasChartData: !!parsed.chartData,
          fullResult: parsed, // Log full result for debugging
        })
        setResult(parsed)
        // Priority: llmInsights.summary > insight.summary > customStory
        if (parsed.llmInsights?.summary) {
          setCustomStory(parsed.llmInsights.summary)
        } else if (parsed.insight?.summary) {
          setCustomStory(parsed.insight.summary)
        }
      } catch (e) {
        console.error('Failed to parse stored result:', e)
      }
    } else {
      console.warn('[ANALYSIS] No result found in sessionStorage')
    }
    setLoading(false)
  }, [])

  // Generate AI story from result data (use backend AI-generated insight)
  const generateStory = (result: AnalysisResult): string => {
    // Priority 1: Use new llmInsights.summary (from OpenRouter with user prompt)
    if (result.llmInsights?.summary) {
      return result.llmInsights.summary
    }
    
    // Priority 2: Use legacy insight.summary (backward compatibility)
    if (result.insight?.summary) {
      return result.insight.summary
    }
    
    // Fallback: Generate basic story from analysis summary
    const numSamples = result.analysisSummary?.dataInsights?.num_samples || 0
    const numColumns = result.analysisSummary?.dataInsights?.columns?.length || 0
    
    return `Your dataset has been analyzed successfully. ` +
      `Found ${numSamples} samples across ${numColumns} columns. ` +
      `Analysis completed with AI-generated insights and visualizations.`
  }

  // Use AI-generated story from backend (OpenRouter with user prompt), or fallback
  const story = customStory || (result ? generateStory(result) : 
    "Waiting for analysis results... Upload a dataset to see AI-generated insights.")

  // Get chart data from result (new structure: chartData or analysisSummary.chartsData)
  const chartData = result?.chartData || result?.analysisSummary?.chartsData || {
    // Fallback: empty charts if no data
    correlationMatrix: [],
    trends: [],
    clusters: [],
    outliers: [],
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
                {result?.llmInsights?.title || result?.insight?.title || 'Data Analysis Results'}
              </h1>
              <p className="text-muted-foreground mt-2">
                {result?.analysisSummary?.dataInsights?.num_samples 
                  ? `Analyzed ${result.analysisSummary.dataInsights.num_samples} samples with ${result.analysisSummary.dataInsights.columns?.length || 0} columns`
                  : 'Generated with AI-powered data analysis'
                }
                {result?.fileType && ` • ${result.fileType.toUpperCase()} file`}
                {result?.fileName && ` • ${result.fileName}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (result?.blobId && result?.fileName) {
                    try {
                      // Get sessionKey from sessionStorage (stored during upload)
                      const storedSessionKey = sessionStorage.getItem('sessionKey');
                      
                      // Get txBytes from result (for Seal decryption)
                      const txBytes = (result as any).txBytes;
                      
                      const blobUrl = await downloadFile(
                        result.blobId, 
                        result.fileName,
                        txBytes || undefined,
                        storedSessionKey || undefined
                      );
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = result.fileName || 'file';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(blobUrl);
                      toast.success('File downloaded and decrypted successfully!');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to download file. Make sure you have the session key.');
                    }
                  } else {
                    toast.error('File not available for download');
                  }
                }}
                disabled={!result?.blobId}
              >
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* AI Story - Hero Section */}
          <AIStoryComponent story={story} />

          {/* Key Findings from AI (if available) - New structure first, then legacy */}
          {(result?.llmInsights?.keyFindings && result.llmInsights.keyFindings.length > 0) || 
           (result?.insight?.keyFindings && result.insight.keyFindings.length > 0) ? (
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg text-foreground mb-4">Key Findings</h3>
                <ul className="space-y-2">
                  {(result?.llmInsights?.keyFindings || result?.insight?.keyFindings || []).map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-foreground">{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Recommendations from AI (if available) - New structure first, then legacy */}
          {(result?.llmInsights?.recommendations && result.llmInsights.recommendations.length > 0) ||
           (result?.insight?.recommendations && result.insight.recommendations.length > 0) ? (
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg text-foreground mb-4">Recommendations</h3>
                <ul className="space-y-2">
                  {(result?.llmInsights?.recommendations || result?.insight?.recommendations || []).map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">→</span>
                      <span className="text-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* Optional Prompt for Personalization - Now with Regenerate */}
          <PromptInput 
            onSubmit={async (text) => {
              if (!result?.blobId) {
                toast.error('No analysis data available. Please upload a file first.')
                return
              }

              setRegenerating(true)
              setPrompt(text)
              
              try {
                const regenerateResult = await regenerateInsights({
                  blobId: result.blobId,
                  prompt: text,
                })

                if (regenerateResult.success && regenerateResult.result) {
                  // Update result with new insights
                  setResult({
                    ...result,
                    llmInsights: regenerateResult.result.llmInsights,
                    chartData: regenerateResult.result.chartData || result.chartData,
                    analysisSummary: regenerateResult.result.analysisSummary || result.analysisSummary,
                  })
                  
                  // Update custom story
                  setCustomStory(regenerateResult.result.llmInsights.summary)
                  
                  toast.success('Insights regenerated successfully!')
                } else {
                  toast.error(regenerateResult.error || 'Failed to regenerate insights')
                }
              } catch (error: any) {
                console.error('Regenerate error:', error)
                toast.error(error.message || 'Failed to regenerate insights')
              } finally {
                setRegenerating(false)
              }
            }}
            disabled={regenerating || !result?.blobId}
            initialValue={prompt}
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
                {(result?.suiTx || result?.blobId || result?.proof) ? (
                  <>
                    {result.suiTx && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Sui Transaction Hash:</p>
                        <div className="bg-background rounded-lg p-4 font-mono text-sm text-foreground break-all flex items-center justify-between">
                          <span>{result.suiTx}</span>
                          {result.suiExplorerUrl && (
                            <a
                              href={result.suiExplorerUrl}
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
                    {result.blobId && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Walrus Blob ID:</p>
                        <div className="bg-background rounded-lg p-4 font-mono text-sm text-foreground break-all flex items-center justify-between">
                          <span>{result.blobId}</span>
                          {result.walrusScanUrl && (
                            <a
                              href={result.walrusScanUrl}
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
                    {/* Legacy proof support */}
                    {result.proof?.suiTxHash && !result.suiTx && (
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
                    {result.proof?.walrusCid && !result.blobId && (
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
                    {result.fileHash && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">File Hash (SHA256):</p>
                        <div className="bg-background rounded-lg p-4 font-mono text-sm text-foreground break-all">
                          {result.fileHash}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-background rounded-lg p-4 font-mono text-sm text-muted-foreground break-all">
                    No on-chain proof available
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  This analysis is verified on Sui blockchain and stored on Walrus. The audit payload is encrypted with Seal for privacy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
