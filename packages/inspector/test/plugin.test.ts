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

  it("composes with asynchronous Next.js config factories", async () => {
    const withWorkflow = async (phase: string) => ({
      instrumentationClientInject: ["workflow/client"],
      phase,
    })
    const configured = await withRscInspector(withWorkflow)("development")

    assert.deepEqual(configured.instrumentationClientInject, [
      "workflow/client",
      "next-rsc-inspector/client",
    ])
    assert.strictEqual(configured.phase, "development")
  })
})
