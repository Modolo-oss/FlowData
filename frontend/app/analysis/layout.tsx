import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Insights - FlowData Studio',
  description: 'AI-generated data insights and visualizations',
}

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
