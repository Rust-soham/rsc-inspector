import { assert, layer } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import {
  ComponentInspection,
} from "../src/ComponentInspection.js"
import { ComponentRegions } from "../src/ComponentRegions.js"
import type { RenderedComponentTree } from "../src/model.js"
import { ReactComponentTopology } from "../src/ReactComponentTopology.js"

const tree: RenderedComponentTree = {
  revision: 7,
  nodes: [
    {
      id: "server-page",
      parentId: null,
      name: "ServerPage",
      environment: "server",
    },
    {
      id: "client-shell",
      parentId: "server-page",
      name: "ClientShell",
      environment: "client",
    },
    {
      id: "server-slot",
      parentId: "client-shell",
      name: "ServerSlot",
      environment: "server",
    },
  ],
}

const TopologyTestLayer = Layer.succeed(
  ReactComponentTopology,
  ReactComponentTopology.of({
    snapshot: Effect.succeed(tree),
    changes: Stream.empty,
    hostElements: () => Effect.succeed([]),
  }),
)

const RegionsTestLayer = Layer.succeed(
  ComponentRegions,
  ComponentRegions.of({
    invalidations: Stream.empty,
    resolve: () =>
      Effect.succeed(
        new Map([
          [
            "client-shell",
            [{ x: 10, y: 20, width: 200, height: 80 }],
          ],
        ]),
      ),
  }),
)

const ComponentInspectionTestLayer = ComponentInspection.layerNoDeps.pipe(
  Layer.provide([TopologyTestLayer, RegionsTestLayer]),
)

layer(ComponentInspectionTestLayer)((it) => {
  it.effect("locally composes topology and geometry into scene snapshots", () =>
    Effect.gen(function* () {
      const inspection = yield* ComponentInspection
      const session = yield* inspection.open
      const scene = yield* session.snapshots.pipe(Stream.runHead)

      assert.isTrue(Option.isSome(scene))
      if (Option.isNone(scene)) return
      assert.strictEqual(scene.value.revision, 7)
      assert.deepEqual(
        scene.value.nodes.map((node) => node.boundaryKind),
        ["server-subtree", "client-boundary", "server-slot"],
      )
      assert.deepEqual(scene.value.nodes[1]?.rectangles, [
        { x: 10, y: 20, width: 200, height: 80 },
      ])
    }),
  )
})
