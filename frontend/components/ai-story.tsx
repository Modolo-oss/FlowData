'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Copy, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function AIStoryComponent({ story }: { story: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(story)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/30 hover:border-primary/50 transition">
      <CardHeader>
        <h2 className="text-2xl font-bold text-foreground text-balance">AI Data Story</h2>
        <p className="text-sm text-muted-foreground mt-1">Natural language insights from your dataset</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-lg leading-relaxed text-foreground text-pretty">
            {story}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            className="w-full"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Story
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
