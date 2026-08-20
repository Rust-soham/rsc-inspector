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
  rectangles: Schema.Array(Rectangle),
  presentation: Schema.Literals(["card", "compact"]),
  labelVisible: Schema.Boolean,
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

const isCompactRectangle = (rectangle: Rectangle): boolean =>
  rectangle.width < 60 && rectangle.height < 60

interface LabelRectangle {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const overlaps = (left: LabelRectangle, right: LabelRectangle): boolean =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y

const placeLabels = (
  regions: ReadonlyArray<OverlayRegion>,
): ReadonlyArray<OverlayRegion> => {
  const occupied: Array<LabelRectangle> = []
  const visible = new Set<number>()
  const candidates = regions
    .map((region, index) => ({ region, index }))
    .filter(
      ({ region }) =>
        region.presentation === "card" && region.rectangle.width >= 56,
    )
    .sort((left, right) => {
      if (left.region.selected !== right.region.selected) {
        return left.region.selected ? -1 : 1
      }
      return (
        right.region.rectangle.width * right.region.rectangle.height -
        left.region.rectangle.width * left.region.rectangle.height
      )
    })

  for (const { region, index } of candidates) {
    const label = {
      x: region.rectangle.x + 8,
      y: region.rectangle.y - 16,
      width: 48,
      height: 16,
    }
    if (occupied.some((rectangle) => overlaps(rectangle, label))) continue
    occupied.push(label)
    visible.add(index)
  }

  return regions.map((region, index) => ({
    ...region,
    labelVisible: visible.has(index),
  }))
}

export const projectOverlayRegions = (
  scene: InspectorScene,
): ReadonlyArray<OverlayRegion> => {
  if (!scene.visible) return []

  const nodesById = new Map(scene.nodes.map((node) => [node.id, node]))
  const groups = new Map<string, RegionGroup>()

  for (const node of scene.nodes) {
    if (!isApplicationBoundary(node, nodesById)) continue
    const rectangles = node.rectangles.filter(
      (rectangle) => rectangle.width > 0 && rectangle.height > 0,
    )
    for (const rectangle of rectangles) {
      const key = rectangleKey(rectangle)
      const group = groups.get(key)
      const candidate = { node, rectangle }
      if (group === undefined) groups.set(key, [candidate])
      else group.push(candidate)
    }
  }

  const exactRegions = Array.from(groups.values(), (group): OverlayRegion => {
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
      rectangles: [visible.rectangle],
      presentation:
        isCompactRectangle(visible.rectangle)
          ? "compact"
          : "card",
      labelVisible: false,
      selected: scene.selectedId === visible.node.id,
      nextComponentId: next.node.id,
      stackSize: group.length,
    }
  })
  return placeLabels(exactRegions)
}
