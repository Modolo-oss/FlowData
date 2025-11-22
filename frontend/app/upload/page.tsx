'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle2, AlertCircle, Wallet } from 'lucide-react'
import { uploadFile } from '@/lib/api'
import { generateSessionKey, generateEphemeralSessionKey } from '@/lib/sessionKey'
import { useSuiWallet } from '@/hooks/use-sui-wallet'
import PromptInput from '@/components/prompt-input'
import { toast } from 'sonner'

export default function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [datasetName, setDatasetName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const router = useRouter()
  const wallet = useSuiWallet()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      // Accept multiple file types
      const allowedTypes = [
        'text/csv', 'application/json', 'text/plain',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'
      ]
      const allowedExtensions = ['.csv', '.json', '.txt', '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp']
      
      const isValidType = allowedTypes.includes(file.type) || 
        allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      
      if (isValidType) {
        setUploadedFile(file)
      } else {
        toast.error('Unsupported file type. Please upload CSV, JSON, PDF, Word, or Image files.')
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      // Accept multiple file types
      const allowedTypes = [
        'text/csv', 'application/json', 'text/plain',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'
      ]
      const allowedExtensions = ['.csv', '.json', '.txt', '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp']
      
      const isValidType = allowedTypes.includes(file.type) || 
        allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      
      if (isValidType) {
        setUploadedFile(file)
      } else {
        toast.error('Unsupported file type. Please upload CSV, JSON, PDF, Word, or Image files.')
      }
    }
  }

  const handleGenerateSessionKey = async () => {
    try {
      if (wallet.connected && wallet.signMessage) {
        const keyPair = await generateSessionKey(wallet.signMessage)
        setSessionKey(keyPair.sessionKey)
        toast.success('Session key generated with wallet')
      } else {
        const keyPair = await generateEphemeralSessionKey()
        setSessionKey(keyPair.sessionKey)
        toast.info('Ephemeral session key generated (no wallet)')
      }
    } catch (error: any) {
      toast.error(`Failed to generate session key: ${error.message}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setIsLoading(true)
    
    try {
      // Generate session key if not already generated
      let finalSessionKey = sessionKey
      if (!finalSessionKey) {
        if (wallet.connected && wallet.signMessage) {
          const keyPair = await generateSessionKey(wallet.signMessage)
          finalSessionKey = keyPair.sessionKey
        } else {
          const keyPair = await generateEphemeralSessionKey()
          finalSessionKey = keyPair.sessionKey
        }
      }

      const result = await uploadFile(
        uploadedFile,
        prompt || undefined,
        finalSessionKey || undefined,
        wallet.address || undefined
      )

      if (result.success) {
        toast.success('File uploaded successfully! Redirecting to progress...')
        // Store jobId in sessionStorage for progress page
        if (result.jobId) {
          sessionStorage.setItem('currentJobId', result.jobId)
        }
        router.push('/progress')
      } else {
        toast.error(result.error || 'Upload failed')
        setIsLoading(false)
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Upload failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} onAuthChange={setIsAuthenticated} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-foreground text-balance">
              Upload Your Data
            </h1>
            <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              Upload your dataset for AI-powered analysis. Get natural language insights, interactive visualizations, and on-chain verified results—all while keeping your data private.
            </p>
          </div>

          {/* Wallet Connection & Session Key */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Encryption Setup (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!wallet.connected ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect your Sui Wallet for encrypted data analysis, or use ephemeral encryption.
                  </p>
                  <Button
                    type="button"
                    onClick={wallet.connect}
                    disabled={Boolean(!wallet.isWalletAvailable || wallet.loading)}
                    variant="outline"
                    className="w-full"
                  >
                    {wallet.loading ? 'Connecting...' : wallet.isWalletAvailable ? 'Connect Sui Wallet' : 'Sui Wallet Not Found'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">Wallet Connected</p>
                      <p className="text-xs text-muted-foreground font-mono">{wallet.address?.slice(0, 10)}...{wallet.address?.slice(-8)}</p>
                    </div>
                    <Button
                      type="button"
                      onClick={wallet.disconnect}
                      variant="ghost"
                      size="sm"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}
              
              <Button
                type="button"
                onClick={handleGenerateSessionKey}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                {sessionKey ? 'Session Key Generated ✓' : 'Generate Session Key'}
              </Button>
              
              {sessionKey && (
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Session Key (truncated):</p>
                  <p className="text-xs font-mono text-foreground break-all">
                    {sessionKey.slice(0, 32)}...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dataset Name */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Dataset Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Dataset Name
                  </label>
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="e.g., Q4 Sales Data, Customer Analysis v2"
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this dataset contains, time period, key metrics..."
                    rows={3}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </CardContent>
            </Card>

            {/* File Upload Area */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Upload Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition ${
                    dragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50 hover:bg-background'
                  }`}
                >
                  <input
                    type="file"
                    id="file-input"
                    onChange={handleFileInput}
                    className="hidden"
                    accept=".csv,.json,.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                  />
                  <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-primary opacity-60" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">Drag files here or click to browse</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        CSV, JSON, PDF, Word, Images • Up to 200MB per file
                      </p>
                    </div>
                  </label>
                </div>

                {/* Uploaded File */}
                {uploadedFile && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Selected File
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="text-xs text-destructive hover:text-destructive/80 transition ml-4"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Optional Prompt Input */}
            <PromptInput 
              onSubmit={(text) => {
                setPrompt(text)
              }}
              disabled={isLoading}
            />

            {/* Privacy Notice */}
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="pt-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p className="font-medium mb-1">Your data stays private</p>
                  <p className="text-muted-foreground">
                    Raw data is analyzed securely. Audit payloads are encrypted with Seal before storing on Walrus. All insights are verified on-chain.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={!datasetName || !uploadedFile || isLoading}
                className="flex-1 bg-primary hover:bg-primary/90 h-12 text-lg font-semibold"
              >
                {isLoading ? 'Uploading...' : 'Start Analysis'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => router.push('/')}
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-border">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">What Happens Next?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Data is securely analyzed in the backend</p>
                <p>2. AI generates natural language insights from your data</p>
                <p>3. Interactive charts and visualizations are created</p>
                <p>4. Results encrypted and stored on Walrus, verified on Sui blockchain</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Supported Formats</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• CSV — Comma-separated values</p>
                <p>• JSON — Structured data</p>
                <p>• PDF — Document files</p>
                <p>• Word — .doc, .docx documents</p>
                <p>• Images — PNG, JPEG, GIF, WebP</p>
                <p>• Text — Plain text files</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
