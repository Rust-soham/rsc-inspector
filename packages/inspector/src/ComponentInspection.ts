import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { ReactComponentTopologyLayer } from "./BrowserReactComponentTopology.js"
import { ComponentRegions } from "./ComponentRegions.js"
import type {
  RegionResolutionError,
  TopologyUnavailable,
} from "./errors.js"
import {
  applyInspectionCommand,
  type InspectionCommand,
  type InspectorScene,
  projectScene,
} from "./model.js"
import { ReactComponentTopology } from "./ReactComponentTopology.js"

export interface InspectionSession {
  readonly snapshots: Stream.Stream<InspectorScene>
  readonly dispatch: (command: InspectionCommand) => Effect.Effect<void>
}

export class ComponentInspection extends Context.Service<
  ComponentInspection,
  {
    readonly open: Effect.Effect<
      InspectionSession,
      TopologyUnavailable | RegionResolutionError
    >
  }
>()("@rsc-inspector/ComponentInspection") {
  static readonly layerNoDeps = Layer.effect(
    this,
    Effect.gen(function* () {
      const topology = yield* ReactComponentTopology
      const regions = yield* ComponentRegions
      const scope = yield* Scope.Scope

      const open = Effect.fn("ComponentInspection.open")(function* () {
        const initialSnapshot = yield* topology.snapshot
        const initialRegions = yield* regions.resolve(initialSnapshot)
        const initialScene = projectScene(initialSnapshot.tree, initialRegions, {
          revision: 0,
          visible: false,
          selectedId: null,
          nodes: [],
        })
        const state = yield* SubscriptionRef.make(initialScene)
        const currentSnapshot = yield* Ref.make(initialSnapshot)

        const reconcile = Effect.fn("ComponentInspection.reconcile")(function* (
          snapshot: typeof initialSnapshot,
        ) {
          const resolved = yield* regions.resolve(snapshot)
          yield* SubscriptionRef.update(state, (previous) =>
            projectScene(snapshot.tree, resolved, previous),
          )
        })

        yield* topology.changes.pipe(
          Stream.runForEach((snapshot) =>
            Effect.gen(function* () {
              yield* Ref.set(currentSnapshot, snapshot)
              yield* reconcile(snapshot)
            }),
          ),
          Effect.forkIn(scope),
        )

        yield* regions.invalidations.pipe(
          Stream.runForEach(() =>
            Ref.get(currentSnapshot).pipe(Effect.flatMap(reconcile)),
          ),
          Effect.forkIn(scope),
        )

        return {
          snapshots: Stream.concat(
            Stream.succeed(initialScene),
            SubscriptionRef.changes(state),
          ),
          dispatch: (command: InspectionCommand) =>
            SubscriptionRef.update(state, (scene) =>
              applyInspectionCommand(scene, command),
            ),
        }
      })

      return ComponentInspection.of({ open: open() })
    }),
  )

  static readonly layer = this.layerNoDeps.pipe(
    Layer.provide([ComponentRegions.layer, ReactComponentTopologyLayer]),
  )
}
