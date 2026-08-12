import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { OverlayMountError, OverlayRenderError } from "./errors.js"
import type { InspectorScene } from "./model.js"

export interface InspectorHandle {
  readonly root: ShadowRoot
}

export class OverlaySurface extends Context.Service<
  OverlaySurface,
  {
    readonly handle: Effect.Effect<InspectorHandle, OverlayMountError>
    readonly render: (
      scene: InspectorScene,
    ) => Effect.Effect<void, OverlayRenderError>
  }
>()("@rsc-inspector/OverlaySurface") {}
