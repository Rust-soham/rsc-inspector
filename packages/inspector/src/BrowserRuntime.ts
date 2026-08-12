import * as Effect from "effect/Effect"
import * as ManagedRuntime from "effect/ManagedRuntime"
import { BoundaryInspector } from "./BoundaryInspector.js"

export interface BrowserInspectorRuntime {
  readonly install: () => Promise<ShadowRoot>
  readonly dispose: () => Promise<void>
}

export const makeBrowserInspectorRuntime = (): BrowserInspectorRuntime => {
  const runtime = ManagedRuntime.make(BoundaryInspector.layer)

  return {
    install: () =>
      runtime.runPromise(
        Effect.gen(function* () {
          const inspector = yield* BoundaryInspector
          const handle = yield* inspector.install
          return handle.root
        }),
      ),
    dispose: () => runtime.dispose(),
  }
}
