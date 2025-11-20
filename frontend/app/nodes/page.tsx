'use client'

import { useState, useMemo, useEffect } from 'react'
import Navigation from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react'
import { getMonitorNodes, WorkerNode } from '@/lib/api'
import { toast } from 'sonner'

export default function NodesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'error'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'uptime' | 'contributions'>('name')
  const [nodes, setNodes] = useState<WorkerNode[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNodes = async () => {
    setLoading(true)
    try {
      const response = await getMonitorNodes()
      if (response.ok && response.workers) {
        setNodes(response.workers)
      } else {
        toast.error('Failed to fetch nodes')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch nodes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNodes()
    // Refresh every 10 seconds
    const interval = setInterval(fetchNodes, 10000)
    return () => clearInterval(interval)
  }, [])

  const mockNodes: WorkerNode[] = nodes.length > 0 ? nodes : [
  ]

  const filteredAndSorted = useMemo(() => {
    let filtered = nodes.length > 0 ? nodes : mockNodes
    
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(node => node.ok)
      } else if (filterStatus === 'error') {
        filtered = filtered.filter(node => node.error)
      } else if (filterStatus === 'inactive') {
        filtered = filtered.filter(node => !node.ok && !node.error)
      }
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'uptime':
          // For WorkerNode, we don't have uptime, so sort by ok status
          return (b.ok ? 1 : 0) - (a.ok ? 1 : 0)
        case 'contributions':
          // We don't have contributions in WorkerNode, so sort by nodeId
          return (a.nodeId || '').localeCompare(b.nodeId || '')
        default:
          return (a.nodeId || a.worker || '').localeCompare(b.nodeId || b.worker || '')
      }
    })
  }, [filterStatus, sortBy, nodes])

  const stats = {
    totalNodes: nodes.length || mockNodes.length,
    activeNodes: (nodes.length > 0 ? nodes : mockNodes).filter(n => n.ok).length,
    inactiveNodes: (nodes.length > 0 ? nodes : mockNodes).filter(n => !n.ok && !n.error).length,
    errorNodes: (nodes.length > 0 ? nodes : mockNodes).filter(n => n.error).length,
    avgUptime: 'N/A', // WorkerNode doesn't have uptime
  }

  const getStatusColor = (node: WorkerNode) => {
    if (node.ok) return 'text-green-400'
    if (node.error) return 'text-destructive'
    return 'text-gray-400'
  }

  const getStatusBg = (node: WorkerNode) => {
    if (node.ok) return 'bg-green-500/20'
    if (node.error) return 'bg-red-500/20'
    return 'bg-gray-500/20'
  }

  const getStatusText = (node: WorkerNode) => {
    if (node.ok) return 'Active'
    if (node.error) return 'Error'
    return 'Inactive'
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} onAuthChange={setIsAuthenticated} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-foreground text-balance">
                Federated Network
              </h1>
              <p className="text-lg text-muted-foreground">
                Monitor your collaborative learning nodes. {stats.activeNodes} of {stats.totalNodes} nodes active.
              </p>
            </div>
            <Button
              onClick={fetchNodes}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalNodes}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">{stats.activeNodes}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-400">{stats.inactiveNodes}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{stats.errorNodes}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{stats.avgUptime}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Controls */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Filters & Sorting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex gap-2">
                    {(['all', 'active', 'inactive', 'error'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1 text-sm rounded transition ${
                          filterStatus === status
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-input text-muted-foreground hover:bg-input/80'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 ml-auto">
                  <label className="text-sm font-medium text-muted-foreground">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="name">Name</option>
                    <option value="uptime">Uptime</option>
                    <option value="contributions">Contributions</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nodes List */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Network Nodes ({filteredAndSorted.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Node ID</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Sui Address</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Health</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">CPU Cores</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Signature</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && filteredAndSorted.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          Loading nodes...
                        </td>
                      </tr>
                    ) : filteredAndSorted.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No nodes found
                        </td>
                      </tr>
                    ) : (
                      filteredAndSorted.map((node, idx) => (
                        <tr key={node.worker || idx} className="border-b border-border hover:bg-input/50 transition">
                          <td className="py-3 px-4 font-mono text-foreground">{node.nodeId || node.worker || `Node ${idx + 1}`}</td>
                          <td className="py-3 px-4 font-mono text-muted-foreground text-xs">
                            {node.suiAddress ? `${node.suiAddress.slice(0, 10)}...${node.suiAddress.slice(-8)}` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBg(node)}`}>
                              <span className={getStatusColor(node)}>
                                {getStatusText(node)}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {node.ok ? (
                              <span className="text-green-400 font-semibold">✓</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-foreground">
                            {node.cpuCores ? (
                              <span>{node.cpuCores} cores</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {node.signatureAvailable ? (
                              <span className="text-green-400">✓ Verified</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-xs text-muted-foreground">{node.display || '-'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Node Distribution Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Network Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-foreground">Network Load</span>
                  <span className="text-sm font-semibold text-accent">68%</span>
                </div>
                <div className="w-full bg-input rounded-full h-3">
                  <div className="bg-accent h-3 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-foreground">Average Latency</span>
                  <span className="text-sm font-semibold">62ms</span>
                </div>
                <div className="w-full bg-input rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-foreground">Consensus Agreement</span>
                  <span className="text-sm font-semibold text-green-400">97%</span>
                </div>
                <div className="w-full bg-input rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: '97%' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
