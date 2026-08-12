import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./styles.css"

export const metadata: Metadata = {
  title: "RSC Inspector Fixture",
  description: "Composition fixture for the RSC Boundary Inspector",
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
