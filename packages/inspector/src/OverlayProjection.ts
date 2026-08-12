import * as Schema from "effect/Schema"
import {
  InspectorNode,
  type InspectorScene,
  Rectangle,
} from "./model.js"
import {
  isApplicationBoundary,
  isTransitionBoundary,
} from "./OverlayPolicy.js"

export const OverlayRegion = Schema.Struct({
  node: InspectorNode,
  rectangle: Rectangle,
  compact: Schema.Boolean,
  selected: Schema.Boolean,
  nextComponentId: Schema.String,
  stackSize: Schema.Number,
})
export interface OverlayRegion
  extends Schema.Schema.Type<typeof OverlayRegion> {}

const RegionCandidate = Schema.Struct({
  node: InspectorNode,
  rectangle: Rectangle,
})
interface RegionCandidate
  extends Schema.Schema.Type<typeof RegionCandidate> {}

type RegionGroup = [RegionCandidate, ...Array<RegionCandidate>]

const rectangleKey = (rectangle: Rectangle): string =>
  `${rectangle.x}:${rectangle.y}:${rectangle.width}:${rectangle.height}`

export const projectOverlayRegions = (
  scene: InspectorScene,
): ReadonlyArray<OverlayRegion> => {
  if (!scene.visible) return []

  const nodesById = new Map(scene.nodes.map((node) => [node.id, node]))
  const groups = new Map<string, RegionGroup>()

  for (const node of scene.nodes) {
    if (!isApplicationBoundary(node, nodesById)) continue
    for (const rectangle of node.rectangles) {
      if (rectangle.width <= 0 || rectangle.height <= 0) continue
      const compact = rectangle.width < 60 || rectangle.height < 60
      if (compact && node.boundaryKind === "server-subtree") continue
      const key = rectangleKey(rectangle)
      const group = groups.get(key)
      const candidate = { node, rectangle }
      if (group === undefined) groups.set(key, [candidate])
      else group.push(candidate)
    }
  }

  return Array.from(groups.values(), (group): OverlayRegion => {
    // Shared geometry shows a selected node first, then an environment flip.
    const selectedIndex = group.findIndex(
      ({ node }) => node.id === scene.selectedId,
    )
    const transitionIndex = group.findIndex(({ node }) =>
      isTransitionBoundary(node.boundaryKind),
    )
    const visibleIndex =
      selectedIndex >= 0
        ? selectedIndex
        : transitionIndex >= 0
          ? transitionIndex
          : 0
    const visible = group[visibleIndex] ?? group[0]
    const next = group[(visibleIndex + 1) % group.length] ?? group[0]
    return {
      node: visible.node,
      rectangle: visible.rectangle,
      compact:
        visible.rectangle.width < 60 || visible.rectangle.height < 60,
      selected: scene.selectedId === visible.node.id,
      nextComponentId: next.node.id,
      stackSize: group.length,
    }
  })
}
