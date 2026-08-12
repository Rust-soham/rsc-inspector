import { assert, describe, it } from "@effect/vitest"
import type { InspectorScene } from "../src/model.js"
import { projectOverlayRegions } from "../src/OverlayProjection.js"

const scene: InspectorScene = {
  revision: 1,
  visible: true,
  selectedId: null,
  nodes: [
    {
      id: "page",
      parentId: null,
      name: "Page",
      environment: "server",
      boundaryKind: "server-subtree",
      rectangles: [{ x: 0, y: 0, width: 600, height: 400 }],
    },
    {
      id: "client-shell",
      parentId: "page",
      name: "ClientShell",
      environment: "client",
      boundaryKind: "client-boundary",
      rectangles: [{ x: 20, y: 20, width: 300, height: 200 }],
    },
    {
      id: "server-slot",
      parentId: "client-shell",
      name: "ServerSlot",
      environment: "server",
      boundaryKind: "server-slot",
      rectangles: [{ x: 20, y: 20, width: 300, height: 200 }],
    },
  ],
}

describe("overlay projection", () => {
  it("collapses shared geometry and prefers the first transition", () => {
    const regions = projectOverlayRegions(scene)

    assert.strictEqual(regions.length, 1)
    assert.strictEqual(regions[0]?.node.id, "client-shell")
    assert.strictEqual(regions[0]?.nextComponentId, "server-slot")
    assert.strictEqual(regions[0]?.stackSize, 2)
  })

  it("cycles to the selected component on the same rectangle", () => {
    const regions = projectOverlayRegions({ ...scene, selectedId: "server-slot" })

    assert.strictEqual(regions[0]?.node.id, "server-slot")
    assert.strictEqual(regions[0]?.nextComponentId, "client-shell")
    assert.isTrue(regions[0]?.selected)
  })

  it("hides framework roots and compact server leaves", () => {
    const regions = projectOverlayRegions({
      ...scene,
      nodes: [
        {
          id: "framework",
          parentId: null,
          name: "AppRouter",
          environment: "server",
          boundaryKind: "server-subtree",
          rectangles: [{ x: 0, y: 0, width: 600, height: 400 }],
        },
        {
          id: "leaf",
          parentId: "framework",
          name: "Icon",
          environment: "server",
          boundaryKind: "server-subtree",
          rectangles: [{ x: 10, y: 10, width: 16, height: 16 }],
        },
      ],
    })

    assert.deepEqual(regions, [])
  })
})
