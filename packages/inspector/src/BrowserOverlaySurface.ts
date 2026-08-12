import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { OverlayMountError, OverlayRenderError } from "./errors.js"
import type { BoundaryKind, InspectorScene } from "./model.js"
import { OverlaySurface } from "./OverlaySurface.js"

const colors: Readonly<Record<BoundaryKind, string>> = {
  "server-subtree": "#ef4444",
  "client-boundary": "#3b82f6",
  "client-subtree": "#06b6d4",
  "server-slot": "#ef4444",
}

const visibleBoundaryKinds: ReadonlySet<BoundaryKind> = new Set([
  "server-subtree",
  "client-boundary",
  "server-slot",
])

const transitionBoundaryKinds: ReadonlySet<BoundaryKind> = new Set([
  "client-boundary",
  "server-slot",
])

const frameworkComponents: ReadonlySet<string> = new Set([
  "AppRouter",
  "ErrorBoundary",
  "ErrorBoundaryHandler",
  "HeadManagerContext",
  "InnerLayoutRouter",
  "OuterLayoutRouter",
  "RedirectBoundary",
  "RedirectErrorBoundary",
  "Root",
  "RootErrorBoundary",
  "RootLayout",
  "Router",
  "ServerRoot",
])

const isApplicationBoundary = (
  node: InspectorScene["nodes"][number],
  nodesById: ReadonlyMap<string, InspectorScene["nodes"][number]>,
): boolean => {
  if (!visibleBoundaryKinds.has(node.boundaryKind)) return false
  if (frameworkComponents.has(node.name)) return false
  if (node.name === "Page") return true
  if (node.parentId === null) return false
  const parent = nodesById.get(node.parentId)
  return parent !== undefined && !frameworkComponents.has(parent.name)
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
    border: 2px dotted var(--rsc-color);
    border-radius: 5px;
    background: transparent;
  }
  .rsc-inspector-region[data-selected="true"] {
    outline: 1px solid color-mix(in srgb, var(--rsc-color) 45%, transparent);
    outline-offset: 2px;
  }
  .rsc-inspector-region[data-compact="true"] {
    width: 12px !important;
    height: 12px !important;
    border-radius: 999px;
    pointer-events: auto;
  }
  .rsc-inspector-label {
    position: absolute;
    left: 8px;
    top: -8px;
    z-index: 1;
    max-width: calc(100% - 12px);
    overflow: hidden;
    padding: 2px 8px;
    border: 1px solid var(--rsc-color);
    border-radius: 4px;
    color: var(--rsc-color);
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    font: 400 12px/16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    text-transform: lowercase;
    white-space: nowrap;
    text-overflow: ellipsis;
    pointer-events: auto;
    cursor: pointer;
  }
  @media (prefers-color-scheme: dark) {
    .rsc-inspector-label {
      background: rgba(0, 0, 0, 0.72);
    }
  }
  #rsc-inspector-toggle {
    position: fixed;
    right: 24px;
    bottom: 16px;
    z-index: 2147483647;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border: 1px solid rgba(15, 23, 42, 0.14);
    border-radius: 7px;
    color: #334155;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14);
    font: 600 11px/1 ui-sans-serif, system-ui, sans-serif;
    letter-spacing: 0.02em;
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  #rsc-inspector-toggle::before {
    width: 8px;
    height: 8px;
    box-sizing: border-box;
    border: 2px dotted #64748b;
    border-radius: 2px;
    content: "";
  }
  #rsc-inspector-toggle:hover {
    background: #fff;
  }
  #rsc-inspector-toggle[aria-pressed="true"] {
    border-color: rgba(59, 130, 246, 0.45);
    color: #1d4ed8;
  }
  #rsc-inspector-toggle[aria-pressed="true"]::before {
    border-color: #3b82f6;
  }
`

const regionElement = (
  node: InspectorScene["nodes"][number],
  rectangle: InspectorScene["nodes"][number]["rectangles"][number],
  selected: boolean,
  nextComponentId: string,
  stackSize: number,
): HTMLDivElement => {
  const region = document.createElement("div")
  region.className = "rsc-inspector-region"
  region.dataset.selected = String(selected)
  region.dataset.rscComponentId = nextComponentId
  region.dataset.rscBoundaryKind = node.boundaryKind
  region.dataset.rscComponentName = node.name
  region.dataset.rscComponentStackSize = String(stackSize)
  region.style.setProperty("--rsc-color", colors[node.boundaryKind])
  const compact = rectangle.width < 60 || rectangle.height < 60
  region.dataset.compact = String(compact)
  region.style.left = `${compact ? rectangle.x + rectangle.width - 6 : rectangle.x}px`
  region.style.top = `${compact ? rectangle.y - 6 : rectangle.y}px`
  region.style.width = `${rectangle.width}px`
  region.style.height = `${rectangle.height}px`
  const environment =
    node.boundaryKind === "client-boundary" ? "client" : "server"
  region.title = `${environment} component${node.name === "" ? "" : ` · ${node.name}`}${stackSize > 1 ? ` · click to cycle ${stackSize} components` : ""}`

  if (compact || !transitionBoundaryKinds.has(node.boundaryKind)) return region

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
          acquired.toggle.setAttribute("aria-pressed", String(scene.visible))
          if (!scene.visible) return
          const fragment = document.createDocumentFragment()
          const nodesById = new Map(scene.nodes.map((node) => [node.id, node]))
          const groupedRegions = new Map<
            string,
            Array<{
              readonly node: InspectorScene["nodes"][number]
              readonly rectangle: InspectorScene["nodes"][number]["rectangles"][number]
            }>
          >()
          for (const node of scene.nodes) {
            if (!isApplicationBoundary(node, nodesById)) continue
            for (const rectangle of node.rectangles) {
              if (rectangle.width <= 0 || rectangle.height <= 0) continue
              const compact = rectangle.width < 60 || rectangle.height < 60
              if (compact && node.boundaryKind === "server-subtree") continue
              const regionKey = `${rectangle.x}:${rectangle.y}:${rectangle.width}:${rectangle.height}`
              const group = groupedRegions.get(regionKey)
              const entry = { node, rectangle }
              if (group === undefined) groupedRegions.set(regionKey, [entry])
              else group.push(entry)
            }
          }

          for (const group of groupedRegions.values()) {
            // One DOM rectangle can represent several logical components. Prefer a
            // real environment flip, then cycle the stack when the region is clicked.
            const selectedIndex = group.findIndex(
              ({ node }) => node.id === scene.selectedId,
            )
            const transitionIndex = group.findIndex(({ node }) =>
              transitionBoundaryKinds.has(node.boundaryKind),
            )
            const visibleIndex =
              selectedIndex >= 0
                ? selectedIndex
                : transitionIndex >= 0
                  ? transitionIndex
                  : 0
            const visible = group[visibleIndex]
            if (visible === undefined) continue
            const next = group[(visibleIndex + 1) % group.length]
            if (next === undefined) continue
            fragment.append(
              regionElement(
                visible.node,
                visible.rectangle,
                scene.selectedId === visible.node.id,
                next.node.id,
                group.length,
              ),
            )
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
