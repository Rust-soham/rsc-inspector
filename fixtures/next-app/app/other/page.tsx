import Link from "next/link"
import { ClientCounter } from "../ClientCounter"

export default function OtherPage() {
  return (
    <main>
      <section className="card server">
        <p className="eyebrow">Client navigation</p>
        <h1>Second route</h1>
        <ClientCounter />
        <Link href="/">Return to fixture</Link>
      </section>
    </main>
  )
}
