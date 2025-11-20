import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Training Progress - FlowData Studio',
  description: 'Monitor your federated learning training progress',
}

export default function ProgressLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
