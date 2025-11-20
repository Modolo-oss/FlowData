'use client'

import React from 'react'

export function ThemeProvider({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      {children}
    </div>
  )
}
