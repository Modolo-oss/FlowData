'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, BarChart, Bar } from 'recharts'
import { useEffect, useState } from 'react'

interface ChartsGridProps {
  data: {
    trends?: Array<{ date: string; value: number; label?: string }>
    clusters?: Array<{ x: number; y: number; cluster: string; label: string }>
    outliers?: Array<{ column: string; row: number; value: number; deviation: number }>
    correlationMatrix?: Array<{ x: string; y: string; value: number }>
    keyValueBarChart?: {
      title: string
      data: Array<{ name: string; value: number }>
    }
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
      {/* Key-Value Bar Chart - Priority if available */}
      {data.keyValueBarChart && data.keyValueBarChart.data.length > 0 && 
       // ✅ Only show if we have meaningful data (not synthetic labels)
       data.keyValueBarChart.data.some(d => !d.name.toLowerCase().includes('outlier') && 
                                            !d.name.toLowerCase().includes('row_') &&
                                            !d.name.toLowerCase().includes('cluster')) && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">{data.keyValueBarChart.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {data.keyValueBarChart.data.length} metrics from your file
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.keyValueBarChart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--muted-foreground)"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
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
                <Bar 
                  dataKey="value" 
                  fill="var(--primary)" 
                  name="Value"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Trend Chart - ONLY if we have time-based trends (not row index!) */}
      {data.trends && data.trends.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              {data.trends[0]?.label || "Trend Analysis"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {data.trends.length} data points from your file
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--muted-foreground)"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
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
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--primary)" 
                  strokeWidth={2} 
                  dot={{ fill: 'var(--primary)', r: 4 }} 
                  name={data.trends[0]?.label || "Value"}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Trend Chart - Hidden if no time-based trends */}

      {/* Cluster Visualization - ONLY if we have meaningful clusters */}
      {data.clusters && data.clusters.length >= 5 && (() => {
        const uniqueClusters = new Set(data.clusters.map(c => c.cluster));
        // ✅ Only show if we have at least 2 clusters AND at least 5 data points
        return uniqueClusters.size >= 2 && data.clusters.length >= 5 ? (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Data Clusters</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {data.clusters.length} data points from your file
              </p>
            </CardHeader>
            <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="x" 
                  type="number" 
                  stroke="var(--muted-foreground)"
                  label={{ value: 'X Axis', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="y" 
                  type="number" 
                  stroke="var(--muted-foreground)"
                  label={{ value: 'Y Axis', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis dataKey="label" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)'
                  }}
                  formatter={(value: any, name: string, props: any) => [
                    `${props.payload.label || name}: (${props.payload.x}, ${props.payload.y})`,
                    name
                  ]}
                />
                <Legend />
                <Scatter name="Clusters" data={data.clusters} fill="var(--primary)">
                  {data.clusters.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CLUSTER_COLORS[entry.cluster] || 'var(--primary)'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null;
      })()}

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

      {/* Correlation Matrix - ONLY if we have meaningful correlations */}
      {data.correlationMatrix && data.correlationMatrix.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Correlation Analysis</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {data.correlationMatrix.length} correlations found
            </p>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
