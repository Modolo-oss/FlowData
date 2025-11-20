import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Network Nodes - FlowData Studio',
  description: 'Monitor your federated learning network',
}

export default function NodesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
