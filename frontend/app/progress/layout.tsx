import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analysis Progress - FlowData Studio',
  description: 'Monitor your data analysis progress',
}

export default function ProgressLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
