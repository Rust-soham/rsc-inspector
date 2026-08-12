import { makeBrowserInspectorRuntime } from "./BrowserRuntime.js"

declare global {
  interface Window {
    __RSC_INSPECTOR_RUNTIME__?: ReturnType<typeof makeBrowserInspectorRuntime>
  }
}

const install = async (): Promise<void> => {
  await window.__RSC_INSPECTOR_RUNTIME__?.dispose()
  const runtime = makeBrowserInspectorRuntime()
  window.__RSC_INSPECTOR_RUNTIME__ = runtime
  await runtime.install()
}

if (process.env.NODE_ENV === "development") {
  void install().catch((cause: unknown) => {
    console.error("Failed to install the RSC boundary inspector", cause)
  })
}
