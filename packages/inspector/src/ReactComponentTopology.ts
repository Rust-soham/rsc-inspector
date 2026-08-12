import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Stream from "effect/Stream"
import type { TopologyUnavailable } from "./errors.js"
import type { RenderedComponentTree } from "./model.js"

export class ReactComponentTopology extends Context.Service<
  ReactComponentTopology,
  {
    readonly snapshot: Effect.Effect<
      RenderedComponentTree,
      TopologyUnavailable
    >
    readonly changes: Stream.Stream<
      RenderedComponentTree,
      TopologyUnavailable
    >
    readonly hostElements: (
      componentId: string,
    ) => Effect.Effect<ReadonlyArray<Element>>
  }
>()("@rsc-inspector/ReactComponentTopology") {}
