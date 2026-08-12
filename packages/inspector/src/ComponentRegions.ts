import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import { ReactComponentTopologyLayer } from "./BrowserReactComponentTopology.js"
import { RegionResolutionError } from "./errors.js"
import type { Rectangle, RenderedComponentTree } from "./model.js"
import { ReactComponentTopology } from "./ReactComponentTopology.js"

const rectangleOf = (element: Element): Rectangle => {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  }
}

export class ComponentRegions extends Context.Service<
  ComponentRegions,
  {
    readonly invalidations: Stream.Stream<void>
    readonly resolve: (
      tree: RenderedComponentTree,
    ) => Effect.Effect<
      ReadonlyMap<string, ReadonlyArray<Rectangle>>,
      RegionResolutionError
    >
  }
>()("@rsc-inspector/ComponentRegions") {
  static readonly layerNoDeps = Layer.effect(
    this,
    Effect.gen(function* () {
      const topology = yield* ReactComponentTopology
      const invalidations = yield* PubSub.unbounded<void>()

      const invalidate = (): void => {
        PubSub.publishUnsafe(invalidations, undefined)
      }
      const observer = new ResizeObserver(invalidate)
      observer.observe(document.documentElement)
      window.addEventListener("resize", invalidate)
      window.addEventListener("scroll", invalidate, true)
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          observer.disconnect()
          window.removeEventListener("resize", invalidate)
          window.removeEventListener("scroll", invalidate, true)
        }),
      )

      const resolve = Effect.fn("ComponentRegions.resolve")(function* (
        tree: RenderedComponentTree,
      ) {
        const entries = yield* Effect.forEach(tree.nodes, (node) =>
          topology.hostElements(node.id).pipe(
            Effect.map(
              (elements) => [node.id, elements.map(rectangleOf)] as const,
            ),
            Effect.mapError(
              (cause) =>
                new RegionResolutionError({
                  componentId: node.id,
                  reason: "Unable to resolve component host elements",
                  cause,
                }),
            ),
          ),
        )
        return new Map(entries)
      })

      return ComponentRegions.of({
        invalidations: Stream.fromPubSub(invalidations),
        resolve,
      })
    }),
  )

  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide(ReactComponentTopologyLayer),
  )
}
