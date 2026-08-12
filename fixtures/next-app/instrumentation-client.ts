import { makeBrowserInspectorRuntime } from "next-rsc-inspector"

declare global {
  interface Window {
    __RSC_INSPECTOR_RUNTIME__?: ReturnType<typeof makeBrowserInspectorRuntime>
  }
}

if (process.env.NODE_ENV === "development") {
  const previous = window.__RSC_INSPECTOR_RUNTIME__
  if (previous !== undefined) {
    void previous.dispose()
  }

  const runtime = makeBrowserInspectorRuntime()
  window.__RSC_INSPECTOR_RUNTIME__ = runtime

  void runtime.install().catch((cause: unknown) => {
    console.error("Failed to install the RSC boundary inspector", cause)
  })
}
