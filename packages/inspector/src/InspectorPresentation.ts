import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import { InspectorInputLayer } from "./BrowserInspectorInput.js"
import { OverlaySurfaceLayer } from "./BrowserOverlaySurface.js"
import type { OverlayMountError, OverlayRenderError } from "./errors.js"
import { InspectorInput } from "./InspectorInput.js"
import type { InspectionCommand, InspectorScene } from "./model.js"
import { type InspectorHandle, OverlaySurface } from "./OverlaySurface.js"

export interface PresentationSession {
  readonly commands: Stream.Stream<InspectionCommand>
  readonly handle: InspectorHandle
}

export class InspectorPresentation extends Context.Service<
  InspectorPresentation,
  {
    readonly mount: (
      scenes: Stream.Stream<InspectorScene>,
    ) => Effect.Effect<
      PresentationSession,
      OverlayMountError | OverlayRenderError
    >
  }
>()("@rsc-inspector/InspectorPresentation") {
  static readonly layerNoDeps = Layer.effect(
    this,
    Effect.gen(function* () {
      const overlay = yield* OverlaySurface
      const input = yield* InspectorInput
      const scope = yield* Scope.Scope

      const mount = Effect.fn("InspectorPresentation.mount")(function* (
        scenes: Stream.Stream<InspectorScene>,
      ) {
        const handle = yield* overlay.handle
        yield* scenes.pipe(
          Stream.runForEach(overlay.render),
          Effect.forkIn(scope),
        )
        return { commands: input.commands, handle }
      })

      return InspectorPresentation.of({ mount })
    }),
  )

  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide([OverlaySurfaceLayer, InspectorInputLayer]),
  )
}
