import type { InspectorScene } from "./model.js"
import { boundaryColors } from "./OverlayPolicy.js"
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

const applyRectangle = (
  element: HTMLElement,
  rectangle: OverlayRegion["rectangle"],
): void => {
  element.style.left = `${rectangle.x}px`
  element.style.top = `${rectangle.y}px`
  element.style.width = `${rectangle.width}px`
  element.style.height = `${rectangle.height}px`
  if (rectangle.borderRadius !== undefined) {
    element.style.borderRadius = rectangle.borderRadius
  }
}

const regionElements = (regionModel: OverlayRegion): ReadonlyArray<HTMLElement> => {
  const {
    node,
    rectangle,
    presentation,
    labelVisible,
    selected,
    nextComponentId,
    stackSize,
  } = regionModel
  const environment =
    node.boundaryKind === "client-boundary" ? "client" : "server"
  const name = node.name === "" ? "" : ` · ${node.name}`
  const stack =
    stackSize > 1 ? ` · click to cycle ${stackSize} components` : ""
  const title = `${environment} component${name}${stack}`

  const region = document.createElement("div")
  region.className = "rsc-inspector-region"
  region.dataset.selected = String(selected)
  region.dataset.rscComponentId = nextComponentId
  region.dataset.rscBoundaryKind = node.boundaryKind
  region.dataset.rscComponentName = node.name
  region.dataset.rscComponentStackSize = String(stackSize)
  region.dataset.presentation = presentation
  region.style.setProperty("--rsc-color", boundaryColors[node.boundaryKind])
  applyRectangle(region, rectangle)
  region.title = title

  if (presentation === "card" && labelVisible) {
    const label = document.createElement("button")
    label.type = "button"
    label.className = "rsc-inspector-label"
    label.dataset.rscComponentId = nextComponentId
    label.dataset.rscBoundaryKind = node.boundaryKind
    label.title = region.title
    label.textContent = environment
    region.append(label)
  }
  return [region]
}

export const renderOverlayScene = (
  elements: OverlayElements,
  scene: InspectorScene,
): void => {
  elements.canvas.replaceChildren()
  elements.toggle.setAttribute("aria-pressed", String(scene.visible))
  const fragment = document.createDocumentFragment()
  for (const region of projectOverlayRegions(scene)) {
    fragment.append(...regionElements(region))
  }
  elements.canvas.append(fragment)
}
