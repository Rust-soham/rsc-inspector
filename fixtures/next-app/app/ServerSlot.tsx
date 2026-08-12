import { NestedClientBoundary } from "./NestedClientBoundary"

export function ServerSlot() {
  return (
    <article className="slot server">
      <p className="eyebrow">Server slot → Client</p>
      <h3>Server-rendered slot content</h3>
      <p>This component was created by the server parent and passed through the client shell.</p>
      <NestedClientBoundary />
    </article>
  )
}
