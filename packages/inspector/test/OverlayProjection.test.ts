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
    assert.strictEqual(regions[0]?.presentation, "card")
    assert.isTrue(regions[0]?.labelVisible)
  })

  it("preserves every rectangle of a multi-root component", () => {
    const rectangles = [
      { x: 10, y: 20, width: 20, height: 20, borderRadius: "50%" },
      { x: 40, y: 20, width: 120, height: 24, borderRadius: "6px" },
      { x: 10, y: 60, width: 200, height: 40 },
    ]
    const regions = projectOverlayRegions({
      ...scene,
      selectedId: "client-shell",
      nodes: [
        scene.nodes[0]!,
        { ...scene.nodes[1]!, rectangles },
      ],
    })

    assert.strictEqual(regions.length, 3)
    assert.deepEqual(
      regions.map(({ rectangle }) => rectangle),
      rectangles,
    )
    assert.deepEqual(
      regions.map(({ presentation }) => presentation),
      ["compact", "card", "card"],
    )
    assert.isTrue(regions.every(({ selected }) => selected))
  })

  it("keeps a wide, short boundary as a card", () => {
    const regions = projectOverlayRegions({
      ...scene,
      nodes: [
        scene.nodes[0]!,
        {
          ...scene.nodes[1]!,
          rectangles: [{ x: 10, y: 40, width: 320, height: 36 }],
        },
      ],
    })

    assert.strictEqual(regions[0]?.presentation, "card")
    assert.isTrue(regions[0]?.labelVisible)
  })

  it("declutters colliding labels without changing boundary cards", () => {
    const regions = projectOverlayRegions({
      ...scene,
      nodes: [
        scene.nodes[0]!,
        { ...scene.nodes[1]!, rectangles: [{ x: 10, y: 40, width: 200, height: 36 }] },
        { ...scene.nodes[2]!, rectangles: [{ x: 20, y: 42, width: 180, height: 36 }] },
      ],
    })

    assert.deepEqual(
      regions.map(({ presentation }) => presentation),
      ["card", "card"],
    )
    assert.strictEqual(
      regions.filter(({ labelVisible }) => labelVisible).length,
      1,
    )
  })

  it("uses a shape-preserving compact outline for a small boundary", () => {
    const regions = projectOverlayRegions({
      ...scene,
      nodes: [
        scene.nodes[0]!,
        {
          ...scene.nodes[1]!,
          rectangles: [
            { x: 10, y: 10, width: 28, height: 28, borderRadius: "50%" },
          ],
        },
      ],
    })

    assert.strictEqual(regions[0]?.presentation, "compact")
    assert.strictEqual(regions[0]?.rectangle.borderRadius, "50%")
  })

  it("does not invent geometry for an unmapped boundary", () => {
    const regions = projectOverlayRegions({
      ...scene,
      nodes: [scene.nodes[0]!, { ...scene.nodes[1]!, rectangles: [] }],
    })

    assert.deepEqual(regions, [])
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
