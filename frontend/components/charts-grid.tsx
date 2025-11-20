'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, BarChart, Bar } from 'recharts'
import { useEffect, useState } from 'react'

interface ChartsGridProps {
  data: {
    trends: any[]
    clusters: any[]
    correlationMatrix: any[]
    summary?: {
      total_samples: number
      numeric_columns: number
      categorical_columns: number
      strong_correlations: number
      outliers_count: number
    }
  }
}

const CLUSTER_COLORS: Record<string, string> = {
  'A': 'var(--primary)',
  'B': '#8b5cf6',
  'C': '#ef4444'
}

export default function ChartsGrid({ data }: ChartsGridProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => {
        if (e.message?.includes('origins')) {
          e.preventDefault()
        }
      }, true)
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Trend Forecast */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Trend Forecast</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Historical actuals vs AI forecast</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)', r: 4 }} />
              <Line type="monotone" dataKey="forecast" stroke="var(--muted-foreground)" strokeDasharray="5 5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cluster Visualization - from actual data */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Data Clusters</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {data.clusters.length > 0 ? `${data.clusters.length} data points clustered` : "No cluster data available"}
          </p>
        </CardHeader>
        <CardContent>
          {data.clusters.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" type="number" stroke="var(--muted-foreground)" />
                <YAxis dataKey="y" type="number" stroke="var(--muted-foreground)" />
                <ZAxis dataKey="label" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)'
                  }}
                />
                <Scatter name="Clusters" data={data.clusters} fill="var(--primary)">
                  {data.clusters.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CLUSTER_COLORS[entry.cluster] || 'var(--primary)'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No cluster data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Summary Statistics</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">From actual data analysis</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-muted-foreground">Total Samples</span>
              <span className="font-semibold text-foreground">{data.summary?.total_samples || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-muted-foreground">Numeric Columns</span>
              <span className="font-semibold text-foreground">{data.summary?.numeric_columns || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-muted-foreground">Categorical Columns</span>
              <span className="font-semibold text-foreground">{data.summary?.categorical_columns || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg">
              <span className="text-sm text-muted-foreground">Strong Correlations</span>
              <span className="font-semibold text-foreground">{data.summary?.strong_correlations || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg border border-destructive/30">
              <span className="text-sm text-muted-foreground">Outliers Detected</span>
              <span className="font-semibold text-primary">{data.summary?.outliers_count || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Matrix - from actual data */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Correlation Analysis</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {data.correlationMatrix.length > 0 ? `${data.correlationMatrix.length} correlations found` : "No correlation data available"}
          </p>
        </CardHeader>
        <CardContent>
          {data.correlationMatrix.length > 0 ? (
            <div className="space-y-2">
              {data.correlationMatrix.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <span className="text-sm text-muted-foreground truncate">
                    {item.x} ↔ {item.y}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${Math.abs(item.value) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">
                      {item.value.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No correlation data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
