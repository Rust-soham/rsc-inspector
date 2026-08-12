import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { OverlayMountError, OverlayRenderError } from "./errors.js"
import type { BoundaryKind, InspectorScene } from "./model.js"
import { OverlaySurface } from "./OverlaySurface.js"

const colors: Readonly<Record<BoundaryKind, string>> = {
  "server-subtree": "#8b5cf6",
  "client-boundary": "#f97316",
  "client-subtree": "#06b6d4",
  "server-slot": "#ec4899",
}

const stylesheet = `
  :host { all: initial; }
  #rsc-inspector-canvas {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    pointer-events: none;
    font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .rsc-inspector-region {
    position: fixed;
    box-sizing: border-box;
    border: 2px solid var(--rsc-color);
    background: color-mix(in srgb, var(--rsc-color) 8%, transparent);
  }
  .rsc-inspector-region[data-selected="true"] {
    border-width: 3px;
    background: color-mix(in srgb, var(--rsc-color) 18%, transparent);
  }
  .rsc-inspector-label {
    position: absolute;
    left: -2px;
    top: 0;
    transform: translateY(-100%);
    padding: 3px 5px;
    color: white;
    background: var(--rsc-color);
    white-space: nowrap;
    pointer-events: auto;
    cursor: pointer;
  }
`

const regionElement = (
  node: InspectorScene["nodes"][number],
  rectangle: InspectorScene["nodes"][number]["rectangles"][number],
  selected: boolean,
): HTMLDivElement => {
  const region = document.createElement("div")
  region.className = "rsc-inspector-region"
  region.dataset.selected = String(selected)
  region.style.setProperty("--rsc-color", colors[node.boundaryKind])
  region.style.left = `${rectangle.x}px`
  region.style.top = `${rectangle.y}px`
  region.style.width = `${rectangle.width}px`
  region.style.height = `${rectangle.height}px`

  const label = document.createElement("button")
  label.type = "button"
  label.className = "rsc-inspector-label"
  label.dataset.rscComponentId = node.id
  label.textContent = `${node.name} · ${node.boundaryKind}`
  region.append(label)
  return region
}

export const OverlaySurfaceLayer = Layer.effect(
  OverlaySurface,
  Effect.gen(function* () {
    const acquired = yield* Effect.acquireRelease(
      Effect.try({
        try: () => {
          const host = document.createElement("div")
          host.dataset.rscInspectorRoot = "true"
          const root = host.attachShadow({ mode: "open" })
          const style = document.createElement("style")
          style.textContent = stylesheet
          const canvas = document.createElement("div")
          canvas.id = "rsc-inspector-canvas"
          root.append(style, canvas)
          document.documentElement.append(host)
          return { host, root, canvas }
        },
        catch: (cause) =>
          new OverlayMountError({
            reason: "Unable to create the inspector Shadow DOM surface",
            cause,
          }),
      }),
      ({ host }) =>
        Effect.sync(() => {
          host.remove()
        }),
    )

    const render = Effect.fn("OverlaySurface.render")((scene: InspectorScene) =>
      Effect.try({
        try: () => {
          acquired.canvas.replaceChildren()
          if (!scene.visible) return
          const fragment = document.createDocumentFragment()
          for (const node of scene.nodes) {
            for (const rectangle of node.rectangles) {
              if (rectangle.width <= 0 || rectangle.height <= 0) continue
              fragment.append(
                regionElement(node, rectangle, scene.selectedId === node.id),
              )
            }
          }
          acquired.canvas.append(fragment)
        },
        catch: (cause) =>
          new OverlayRenderError({
            reason: "Unable to render the inspector scene",
            cause,
          }),
      }),
    )

    return OverlaySurface.of({
      handle: Effect.succeed({ root: acquired.root }),
      render,
    })
  }),
)
