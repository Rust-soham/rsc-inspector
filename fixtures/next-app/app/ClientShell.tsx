"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { ClientShellDetails } from "./ClientShellDetails"

export function ClientShell({ children }: { readonly children: ReactNode }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <section className="card client">
      <p className="eyebrow">Client → Server slot</p>
      <h2>Interactive client shell</h2>
      <ClientShellDetails expanded={expanded} />
      <button type="button" onClick={() => setExpanded((current) => !current)}>
        {expanded ? "Hide" : "Show"} server slot
      </button>
      {expanded ? children : null}
    </section>
  )
}
