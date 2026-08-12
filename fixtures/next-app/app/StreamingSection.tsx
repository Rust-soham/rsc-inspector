export async function StreamingSection() {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return (
    <section className="card server">
      <p className="eyebrow">Suspense reveal</p>
      <h2>Streamed Server Component</h2>
    </section>
  )
}
