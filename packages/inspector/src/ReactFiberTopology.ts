import type {
  RenderedComponentNode,
  RenderedComponentTree,
} from "./model.js"
import type { ReactDevToolsHook } from "./ReactDevToolsHook.js"

export type FiberRecord = Record<string, unknown>

export const isFiberRecord = (value: unknown): value is FiberRecord =>
  (typeof value === "object" && value !== null) || typeof value === "function"

const stringProperty = (
  value: unknown,
  property: string,
): string | undefined => {
  if (!isFiberRecord(value)) return undefined
  const candidate = value[property]
  return typeof candidate === "string" ? candidate : undefined
}

const objectProperty = (
  value: unknown,
  property: string,
): FiberRecord | undefined => {
  if (!isFiberRecord(value)) return undefined
  const candidate = value[property]
  return isFiberRecord(candidate) ? candidate : undefined
}

const displayName = (fiber: FiberRecord): string | undefined => {
  const type = fiber.type
  return (
    stringProperty(type, "displayName") ??
    stringProperty(type, "name") ??
    (typeof type === "string"
      ? undefined
      : stringProperty(fiber.elementType, "name"))
  )
}

const locationFrom = (
  value: FiberRecord,
  property: "_debugSource" | "debugStack",
): RenderedComponentNode["sourceLocation"] => {
  const location = objectProperty(value, property)
  const file = stringProperty(location, "fileName")
  if (file === undefined) return undefined
  const line = location?.lineNumber
  const column = location?.columnNumber
  return {
    file,
    ...(typeof line === "number" ? { line } : {}),
    ...(typeof column === "number" ? { column } : {}),
  }
}

export const directFiberChildren = (
  fiber: FiberRecord,
): ReadonlyArray<FiberRecord> => {
  const children: Array<FiberRecord> = []
  let current: unknown = fiber.child
  const visited = new Set<object>()
  while (isFiberRecord(current) && !visited.has(current)) {
    visited.add(current)
    children.push(current)
    current = current.sibling
  }
  return children
}

const collectHostElements = (
  fiber: FiberRecord,
): ReadonlyArray<Element> => {
  const elements: Array<Element> = []
  const visit = (current: FiberRecord): void => {
    if (current.stateNode instanceof Element) {
      // Nearest host roots preserve multi-root components without claiming descendants.
      elements.push(current.stateNode)
      return
    }
    for (const child of directFiberChildren(current)) visit(child)
  }
  visit(fiber)
  return elements
}

const serverEntries = (fiber: FiberRecord): ReadonlyArray<FiberRecord> => {
  // React 19 records the Server Component chain that produced a client Fiber here.
  const debugInfo = fiber._debugInfo
  if (!Array.isArray(debugInfo)) return []
  return debugInfo.filter(
    (entry): entry is FiberRecord =>
      isFiberRecord(entry) && typeof entry.name === "string",
  )
}

interface BuildState {
  readonly nodes: Array<RenderedComponentNode>
  readonly hostElements: Map<string, ReadonlyArray<Element>>
  readonly ids: WeakMap<object, string>
  readonly visitedFibers: Set<object>
  nextId: number
}

const idFor = (state: BuildState, value: object): string => {
  const existing = state.ids.get(value)
  if (existing !== undefined) return existing
  const id = `rsc-${state.nextId++}`
  state.ids.set(value, id)
  return id
}

const appendServerChain = (
  state: BuildState,
  entries: ReadonlyArray<FiberRecord>,
  parentId: string | null,
  elements: ReadonlyArray<Element>,
): string | null => {
  let currentParent = parentId
  for (const entry of entries) {
    const id = idFor(state, entry)
    const sourceLocation = locationFrom(entry, "debugStack")
    state.nodes.push({
      id,
      parentId: currentParent,
      name: stringProperty(entry, "name") ?? "Anonymous Server Component",
      environment: "server",
      ...(sourceLocation === undefined ? {} : { sourceLocation }),
    })
    state.hostElements.set(id, elements)
    currentParent = id
  }
  return currentParent
}

const visitFiber = (
  state: BuildState,
  fiber: FiberRecord,
  parentId: string | null,
): void => {
  if (state.visitedFibers.has(fiber)) return
  state.visitedFibers.add(fiber)

  const elements = collectHostElements(fiber)
  const serverParent = appendServerChain(
    state,
    serverEntries(fiber),
    parentId,
    elements,
  )
  const name = displayName(fiber)
  let childParent = serverParent

  if (name !== undefined) {
    const id = idFor(state, fiber)
    const alternate = fiber.alternate
    if (isFiberRecord(alternate)) state.ids.set(alternate, id)
    const sourceLocation = locationFrom(fiber, "_debugSource")
    state.nodes.push({
      id,
      parentId: serverParent,
      name,
      environment: "client",
      ...(sourceLocation === undefined ? {} : { sourceLocation }),
    })
    state.hostElements.set(id, elements)
    childParent = id
  }

  for (const child of directFiberChildren(fiber)) {
    visitFiber(state, child, childParent)
  }
}

export interface BuiltTopology {
  readonly tree: RenderedComponentTree
  readonly hostElements: ReadonlyMap<string, ReadonlyArray<Element>>
  readonly nextId: number
}

export const buildFiberTopology = (
  roots: ReadonlyArray<FiberRecord>,
  revision: number,
  ids: WeakMap<object, string>,
  nextId: number,
): BuiltTopology => {
  const state: BuildState = {
    nodes: [],
    hostElements: new Map(),
    ids,
    visitedFibers: new Set(),
    nextId,
  }
  for (const root of roots) {
    for (const child of directFiberChildren(root)) visitFiber(state, child, null)
  }

  return {
    tree: { revision, nodes: state.nodes },
    hostElements: state.hostElements,
    nextId: state.nextId,
  }
}

export const rendererFiberRoots = (
  hook: ReactDevToolsHook,
): ReadonlyArray<FiberRecord> => {
  const roots: Array<FiberRecord> = []
  const visited = new Set<object>()
  for (const rendererId of hook.renderers.keys()) {
    for (const root of hook.getFiberRoots(rendererId)) {
      if (!isFiberRecord(root) || !isFiberRecord(root.current)) continue
      if (visited.has(root.current)) continue
      visited.add(root.current)
      roots.push(root.current)
    }
  }
  return roots
}
