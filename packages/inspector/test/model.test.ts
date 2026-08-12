import { assert, describe, it } from "@effect/vitest"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import {
  InspectionCommand,
  InspectorScene,
  applyInspectionCommand,
  deriveBoundaryKind,
  emptyScene,
  projectScene,
  type RenderedComponentTree,
} from "../src/model.js"

describe("boundary projection", () => {
  it("parses scenes and commands from the shared contracts", () => {
    assert.isTrue(
      Option.isSome(
        Schema.decodeUnknownOption(InspectorScene)({
          revision: 0,
          visible: false,
          selectedId: null,
          nodes: [],
        }),
      ),
    )
    assert.isTrue(
      Option.isSome(
        Schema.decodeUnknownOption(InspectionCommand)({
          _tag: "SetVisible",
          visible: true,
        }),
      ),
    )
  })

  it("classifies all server/client transitions", () => {
    assert.strictEqual(deriveBoundaryKind(undefined, "server"), "server-subtree")
    assert.strictEqual(deriveBoundaryKind("server", "server"), "server-subtree")
    assert.strictEqual(deriveBoundaryKind("server", "client"), "client-boundary")
    assert.strictEqual(deriveBoundaryKind("client", "client"), "client-subtree")
    assert.strictEqual(deriveBoundaryKind("client", "server"), "server-slot")
  })

  it("preserves valid selection and clears a removed selection", () => {
    const tree: RenderedComponentTree = {
      revision: 1,
      nodes: [
        {
          id: "server",
          parentId: null,
          name: "ServerPage",
          environment: "server",
        },
        {
          id: "client",
          parentId: "server",
          name: "ClientShell",
          environment: "client",
        },
      ],
    }
    const visible = applyInspectionCommand(emptyScene, {
      _tag: "SetVisible",
      visible: true,
    })
    const projected = projectScene(tree, new Map(), {
      ...visible,
      selectedId: "client",
    })

    assert.isTrue(projected.visible)
    assert.strictEqual(projected.selectedId, "client")
    assert.deepEqual(
      projected.nodes.map((node) => node.boundaryKind),
      ["server-subtree", "client-boundary"],
    )

    const removed = projectScene(
      { revision: 2, nodes: tree.nodes.slice(0, 1) },
      new Map(),
      projected,
    )
    assert.isNull(removed.selectedId)
  })
})
