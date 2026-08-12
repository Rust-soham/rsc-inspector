import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import { ComponentInspection } from "./ComponentInspection.js"
import { InspectorInstallError } from "./errors.js"
import { InspectorPresentation } from "./InspectorPresentation.js"
import type { InspectorHandle } from "./OverlaySurface.js"

export class BoundaryInspector extends Context.Service<
  BoundaryInspector,
  {
    readonly install: Effect.Effect<
      InspectorHandle,
      InspectorInstallError
    >
  }
>()("@rsc-inspector/BoundaryInspector") {
  // The no-deps layer models this workflow; `layer` below closes its local graph.
  static readonly layerNoDeps = Layer.effect(
    this,
    Effect.gen(function* () {
      const inspection = yield* ComponentInspection
      const presentation = yield* InspectorPresentation
      const scope = yield* Scope.Scope

      const install = Effect.fn("BoundaryInspector.install")(function* () {
        const inspected = yield* inspection.open
        const presented = yield* presentation.mount(inspected.snapshots)
        yield* presented.commands.pipe(
          Stream.runForEach(inspected.dispatch),
          Effect.forkIn(scope),
        )
        return presented.handle
      })

      return BoundaryInspector.of({
        install: install().pipe(
          Effect.mapError(
            (cause) => new InspectorInstallError({ stage: "runtime", cause }),
          ),
        ),
      })
    }),
  )

  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide([ComponentInspection.layer, InspectorPresentation.layer]),
  )
}
