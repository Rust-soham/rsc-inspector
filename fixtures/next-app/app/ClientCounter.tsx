"use client"

import { useState } from "react"

export function ClientCounter() {
  const [count, setCount] = useState(0)

  return (
    <button type="button" onClick={() => setCount((current) => current + 1)}>
      Client boundary count: {count}
    </button>
  )
}
