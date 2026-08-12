import type { BoundaryKind, InspectorNode } from "./model.js"

interface BoundaryColors {
  readonly "server-subtree": string
  readonly "client-boundary": string
  readonly "client-subtree": string
  readonly "server-slot": string
}

export const boundaryColors: BoundaryColors = {
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

export const isTransitionBoundary = (kind: BoundaryKind): boolean =>
  kind === "client-boundary" || kind === "server-slot"

// These are React/Next infrastructure frames, not application boundaries.
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

export const isApplicationBoundary = (
  node: InspectorNode,
  nodesById: ReadonlyMap<string, InspectorNode>,
): boolean => {
  if (!visibleBoundaryKinds.has(node.boundaryKind)) return false
  if (frameworkComponents.has(node.name)) return false
  if (node.name === "Page") return true
  if (node.parentId === null) return false
  const parent = nodesById.get(node.parentId)
  return parent !== undefined && !frameworkComponents.has(parent.name)
}
