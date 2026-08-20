import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { initialize } from "react-devtools-inline/backend"
import { makeBrowserInspectorRuntime } from "./BrowserRuntime.js"

declare global {
  interface Window {
    __RSC_INSPECTOR_RUNTIME__?: ReturnType<typeof makeBrowserInspectorRuntime>
  }
}

// Next evaluates injected instrumentation modules before hydration. Install the
// hook synchronously here so React cannot register its renderer during the
// asynchronous runtime assembly below.
initialize(window)

const install = async (): Promise<void> => {
  await window.__RSC_INSPECTOR_RUNTIME__?.dispose()
  const runtime = makeBrowserInspectorRuntime()
  window.__RSC_INSPECTOR_RUNTIME__ = runtime
  await runtime.install()
}

const ProcessEnvironment = Schema.Struct({
  env: Schema.Struct({
    NODE_ENV: Schema.optionalKey(Schema.String),
  }),
})

const processEnvironment = Schema.decodeUnknownOption(ProcessEnvironment)(
  Reflect.get(globalThis, "process"),
)
const isDevelopment = Option.match(processEnvironment, {
  onNone: () => true,
  onSome: ({ env }) =>
    env.NODE_ENV === undefined || env.NODE_ENV === "development",
})

if (isDevelopment) {
  void install().catch((cause: unknown) => {
    console.error("Failed to install the RSC boundary inspector", cause)
  })
}
