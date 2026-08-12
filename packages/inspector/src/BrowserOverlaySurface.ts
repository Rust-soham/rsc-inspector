import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { OverlayMountError, OverlayRenderError } from "./errors.js"
import type { InspectorScene } from "./model.js"
import { createOverlayElements, renderOverlayScene } from "./OverlayDom.js"
import { OverlaySurface } from "./OverlaySurface.js"

export const OverlaySurfaceLayer = Layer.effect(
  OverlaySurface,
  Effect.gen(function* () {
    const elements = yield* Effect.acquireRelease(
      Effect.try({
        try: createOverlayElements,
        catch: (cause) =>
          new OverlayMountError({
            reason: "Unable to create the inspector Shadow DOM surface",
            cause,
          }),
      }),
      ({ host }) => Effect.sync(() => host.remove()),
    )

    const render = Effect.fn("OverlaySurface.render")((scene: InspectorScene) =>
      Effect.try({
        try: () => renderOverlayScene(elements, scene),
        catch: (cause) =>
          new OverlayRenderError({
            reason: "Unable to render the inspector scene",
            cause,
          }),
      }),
    )

    return OverlaySurface.of({
      handle: Effect.succeed({ root: elements.root }),
      render,
    })
  }),
)
