import { assert, describe, it } from "@effect/vitest"
import { withRscInspector } from "../src/plugin.js"

describe("Next.js plugin", () => {
  it("preserves existing instrumentation and installs once", () => {
    const initial = withRscInspector({
      instrumentationClientInject: ["existing-observability/client"],
      reactStrictMode: true,
    })
    const repeated = withRscInspector(initial)

    assert.deepEqual(repeated.instrumentationClientInject, [
      "existing-observability/client",
      "next-rsc-inspector/client",
    ])
    assert.isTrue(repeated.reactStrictMode)
  })
})
