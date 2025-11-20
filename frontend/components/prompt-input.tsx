'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'

export default function PromptInput({ 
  onSubmit, 
  initialValue = '',
  disabled = false 
}: { 
  onSubmit: (text: string) => void
  initialValue?: string
  disabled?: boolean
}) {
  const [input, setInput] = useState(initialValue)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!input.trim() || disabled) return
    setLoading(true)
    
    // Call onSubmit immediately (no simulation)
    onSubmit(input)
    setLoading(false)
  }

  const suggestions = [
    "Which product is growing fastest?",
    "Show me the high-value customers",
    "What patterns emerge in Q4?"
  ]

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Personalize Your Analysis
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ask a custom question and AI will highlight relevant insights and visualizations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="E.g., Which product segment is growing fastest?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading || disabled}
          />
          <Button 
            className="bg-primary hover:bg-primary/90" 
            onClick={handleSubmit}
            disabled={loading || disabled}
          >
            {loading ? (
              'Analyzing...'
            ) : (
              <>
                Analyze
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Suggestion prompts */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(suggestion)
                }}
                className="text-xs px-3 py-1 bg-input hover:bg-input/80 text-muted-foreground rounded-full transition"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
