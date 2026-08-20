import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Stream from "effect/Stream"
import type { TopologyUnavailable } from "./errors.js"
import type { RenderedComponentTree } from "./model.js"

export interface TopologySnapshot {
  readonly tree: RenderedComponentTree
  readonly hostElements: ReadonlyMap<string, ReadonlyArray<Element>>
}

export class ReactComponentTopology extends Context.Service<
  ReactComponentTopology,
  {
    readonly snapshot: Effect.Effect<
      TopologySnapshot,
      TopologyUnavailable
    >
    readonly changes: Stream.Stream<
      TopologySnapshot,
      TopologyUnavailable
    >
  }
>()("@rsc-inspector/ReactComponentTopology") {}
