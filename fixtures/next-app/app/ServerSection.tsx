import { ClientCounter } from "./ClientCounter"

export function ServerSection() {
  return (
    <section className="card server">
      <p className="eyebrow">Server → Client</p>
      <h2>Server section</h2>
      <ClientCounter />
    </section>
  )
}
