import type { InspectorScene } from "./model.js"
import { boundaryColors, isTransitionBoundary } from "./OverlayPolicy.js"
import {
  type OverlayRegion,
  projectOverlayRegions,
} from "./OverlayProjection.js"
import { overlayStyles } from "./OverlayStyles.js"

export interface OverlayElements {
  readonly host: HTMLDivElement
  readonly root: ShadowRoot
  readonly canvas: HTMLDivElement
  readonly toggle: HTMLButtonElement
}

export const createOverlayElements = (): OverlayElements => {
  const host = document.createElement("div")
  host.dataset.rscInspectorRoot = "true"
  const root = host.attachShadow({ mode: "open" })
  const style = document.createElement("style")
  style.textContent = overlayStyles
  const canvas = document.createElement("div")
  canvas.id = "rsc-inspector-canvas"
  const toggle = document.createElement("button")
  toggle.id = "rsc-inspector-toggle"
  toggle.type = "button"
  toggle.dataset.rscInspectorToggle = "true"
  toggle.title = "Toggle server/client boundaries (Alt + Shift + X)"
  toggle.setAttribute("aria-label", toggle.title)
  toggle.setAttribute("aria-pressed", "false")
  toggle.textContent = "Boundaries"
  root.append(style, canvas, toggle)
  document.documentElement.append(host)
  return { host, root, canvas, toggle }
}

const regionElement = (regionModel: OverlayRegion): HTMLDivElement => {
  const { node, rectangle, compact, selected, nextComponentId, stackSize } =
    regionModel
  const region = document.createElement("div")
  region.className = "rsc-inspector-region"
  region.dataset.selected = String(selected)
  region.dataset.rscComponentId = nextComponentId
  region.dataset.rscBoundaryKind = node.boundaryKind
  region.dataset.rscComponentName = node.name
  region.dataset.rscComponentStackSize = String(stackSize)
  region.dataset.compact = String(compact)
  region.style.setProperty("--rsc-color", boundaryColors[node.boundaryKind])
  region.style.left = `${compact ? rectangle.x + rectangle.width - 6 : rectangle.x}px`
  region.style.top = `${compact ? rectangle.y - 6 : rectangle.y}px`
  region.style.width = `${rectangle.width}px`
  region.style.height = `${rectangle.height}px`
  const environment =
    node.boundaryKind === "client-boundary" ? "client" : "server"
  const name = node.name === "" ? "" : ` · ${node.name}`
  const stack =
    stackSize > 1 ? ` · click to cycle ${stackSize} components` : ""
  region.title = `${environment} component${name}${stack}`

  if (compact || !isTransitionBoundary(node.boundaryKind)) return region

  const label = document.createElement("button")
  label.type = "button"
  label.className = "rsc-inspector-label"
  label.dataset.rscComponentId = nextComponentId
  label.dataset.rscBoundaryKind = node.boundaryKind
  label.title = node.name
  label.textContent = `${environment} component`
  region.append(label)
  return region
}

export const renderOverlayScene = (
  elements: OverlayElements,
  scene: InspectorScene,
): void => {
  elements.canvas.replaceChildren()
  elements.toggle.setAttribute("aria-pressed", String(scene.visible))
  const fragment = document.createDocumentFragment()
  for (const region of projectOverlayRegions(scene)) {
    fragment.append(regionElement(region))
  }
  elements.canvas.append(fragment)
}
