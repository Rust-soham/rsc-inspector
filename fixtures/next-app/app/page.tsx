import Link from "next/link"
import { ClientShell } from "./ClientShell"
import { MultiRootServer } from "./MultiRootServer"
import { ServerSection } from "./ServerSection"
import { ServerSlot } from "./ServerSlot"
import { StreamingSection } from "./StreamingSection"
import { Suspense } from "react"

export default function Page() {
  return (
    <main>
      <header className="hero">
        <p className="eyebrow">RSC Inspector fixture</p>
        <h1>Every composition edge in one page</h1>
        <Link href="/other">Navigate to the second route</Link>
      </header>

      <ServerSection />

      <ClientShell>
        <ServerSlot />
      </ClientShell>

      <MultiRootServer />

      <Suspense fallback={<section className="card pending">Streaming server section…</section>}>
        <StreamingSection />
      </Suspense>
    </main>
  )
}
