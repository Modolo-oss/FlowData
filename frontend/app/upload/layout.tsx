import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Upload Dataset - FlowData Studio',
  description: 'Upload your dataset for federated learning analysis',
}

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
