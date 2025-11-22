import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Upload Dataset - FlowData Studio',
  description: 'Upload your dataset for AI-powered data analysis',
}

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
