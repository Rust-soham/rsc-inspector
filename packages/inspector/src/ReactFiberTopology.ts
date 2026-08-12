import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import {
  ComponentSourceLocation,
  type RenderedComponentNode,
  RenderedComponentTree,
} from "./model.js"
import type { ReactDevToolsHook } from "./ReactDevToolsHook.js"

export interface ReactFiber {
  readonly child: unknown
  readonly sibling: unknown
  readonly return: unknown
  readonly stateNode: unknown
  readonly type: unknown
  readonly elementType: unknown
  readonly alternate: unknown
  readonly _debugInfo?: unknown
  readonly _debugSource?: unknown
}
export const ReactFiber = Schema.declare<ReactFiber>(
  (value): value is ReactFiber =>
    Predicate.hasProperty(value, "child") &&
    Predicate.hasProperty(value, "sibling") &&
    Predicate.hasProperty(value, "return") &&
    Predicate.hasProperty(value, "stateNode") &&
    Predicate.hasProperty(value, "type") &&
    Predicate.hasProperty(value, "elementType") &&
    Predicate.hasProperty(value, "alternate"),
  { identifier: "ReactFiber" },
)

export const parseReactFiber = (value: unknown): Option.Option<ReactFiber> =>
  Schema.decodeUnknownOption(ReactFiber)(value)

export interface ComponentIdentity {
  readonly name: string
}
export const ComponentIdentity = Schema.declare<ComponentIdentity>(
  (value): value is ComponentIdentity =>
    Predicate.hasProperty(value, "name") && Predicate.isString(value.name),
  { identifier: "ReactComponentIdentity" },
)

export const SourceLocation = Schema.Struct({
  fileName: Schema.String,
  lineNumber: Schema.optionalKey(Schema.Number),
  columnNumber: Schema.optionalKey(Schema.Number),
})
export interface SourceLocation
  extends Schema.Schema.Type<typeof SourceLocation> {}

export const ServerComponentDebugEntry = Schema.Struct({
  name: Schema.String,
  debugStack: Schema.optionalKey(Schema.Unknown),
  debugLocation: Schema.optionalKey(Schema.Unknown),
})
export interface ServerComponentDebugEntry
  extends Schema.Schema.Type<typeof ServerComponentDebugEntry> {}

export const ReactFiberDebugMetadata = Schema.Struct({
  _debugInfo: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  _debugSource: Schema.optionalKey(Schema.NullOr(SourceLocation)),
})
export interface ReactFiberDebugMetadata
  extends Schema.Schema.Type<typeof ReactFiberDebugMetadata> {}

const parseComponentIdentity = (value: unknown): Option.Option<ComponentIdentity> =>
  Schema.decodeUnknownOption(ComponentIdentity)(value)

const displayName = (fiber: ReactFiber): string | undefined => {
  if (Option.isSome(Schema.decodeUnknownOption(Schema.String)(fiber.type))) {
    return undefined
  }
  return Option.getOrUndefined(
    Option.map(
      Option.orElse(parseComponentIdentity(fiber.type), () =>
        parseComponentIdentity(fiber.elementType),
      ),
      (component) => component.name,
    ),
  )
}

const sourceLocationFrom = (
  location: unknown,
): RenderedComponentNode["sourceLocation"] =>
  Option.getOrUndefined(
    Option.map(
      Schema.decodeUnknownOption(SourceLocation)(location),
      (parsed) => ({
        file: parsed.fileName,
        ...(parsed.lineNumber === undefined ? {} : { line: parsed.lineNumber }),
        ...(parsed.columnNumber === undefined
          ? {}
          : { column: parsed.columnNumber }),
      }),
    ),
  )

export const directFiberChildren = (
  fiber: ReactFiber,
): ReadonlyArray<ReactFiber> => {
  const children: Array<ReactFiber> = []
  let current = parseReactFiber(fiber.child)
  const visited = new Set<ReactFiber>()
  while (Option.isSome(current) && !visited.has(current.value)) {
    const child = current.value
    visited.add(child)
    children.push(child)
    current = parseReactFiber(child.sibling)
  }
  return children
}

const collectHostElements = (
  fiber: ReactFiber,
): ReadonlyArray<Element> => {
  const elements: Array<Element> = []
  const visit = (current: ReactFiber): void => {
    if (
      typeof Element !== "undefined" &&
      current.stateNode instanceof Element
    ) {
      // Nearest host roots preserve multi-root components without claiming descendants.
      elements.push(current.stateNode)
      return
    }
    for (const child of directFiberChildren(current)) visit(child)
  }
  visit(fiber)
  return elements
}

const ServerComponentEntry = Schema.Struct({
  identity: ServerComponentDebugEntry,
  sourceLocation: Schema.optionalKey(ComponentSourceLocation),
})
interface ServerComponentEntry
  extends Schema.Schema.Type<typeof ServerComponentEntry> {}

const serverEntries = (
  fiber: ReactFiber,
): ReadonlyArray<ServerComponentEntry> => {
  const metadata = Schema.decodeUnknownOption(ReactFiberDebugMetadata)(fiber)
  if (Option.isNone(metadata)) return []
  return (metadata.value._debugInfo ?? []).flatMap((entry) => {
    const identity = Schema.decodeUnknownOption(ServerComponentDebugEntry)(entry)
    if (Option.isNone(identity)) return []
    const sourceLocation = sourceLocationFrom(identity.value.debugLocation)
    return [{
      identity: identity.value,
      ...(sourceLocation === undefined ? {} : { sourceLocation }),
    }]
  })
}

interface BuildState {
  readonly nodes: Array<RenderedComponentNode>
  readonly hostElements: Map<string, ReadonlyArray<Element>>
  readonly ids: WeakMap<object, string>
  readonly visitedFibers: Set<ReactFiber>
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
  entries: ReadonlyArray<ServerComponentEntry>,
  parentId: string | null,
  elements: ReadonlyArray<Element>,
): string | null => {
  let currentParent = parentId
  for (const entry of entries) {
    const id = idFor(state, entry.identity)
    state.nodes.push({
      id,
      parentId: currentParent,
      name: entry.identity.name,
      environment: "server",
      ...(entry.sourceLocation === undefined
        ? {}
        : { sourceLocation: entry.sourceLocation }),
    })
    state.hostElements.set(id, elements)
    currentParent = id
  }
  return currentParent
}

const visitFiber = (
  state: BuildState,
  fiber: ReactFiber,
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
    Option.map(parseReactFiber(fiber.alternate), (alternate) =>
      state.ids.set(alternate, id),
    )
    const metadata = Schema.decodeUnknownOption(ReactFiberDebugMetadata)(fiber)
    const sourceLocation = Option.getOrUndefined(
      Option.map(metadata, (value) =>
        sourceLocationFrom(value._debugSource ?? undefined),
      ),
    )
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

const HostElement = Schema.declare<Element>(
  (value): value is Element =>
    typeof Element !== "undefined" && value instanceof Element,
  { identifier: "HostElement" },
)

export const BuiltTopology = Schema.Struct({
  tree: RenderedComponentTree,
  hostElements: Schema.ReadonlyMap(Schema.String, Schema.Array(HostElement)),
  nextId: Schema.Number,
})
export interface BuiltTopology
  extends Schema.Schema.Type<typeof BuiltTopology> {}

export const buildFiberTopology = (
  roots: ReadonlyArray<ReactFiber>,
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

export const ReactRendererRoot = Schema.Struct({ current: ReactFiber })
export interface ReactRendererRoot
  extends Schema.Schema.Type<typeof ReactRendererRoot> {}

export const parseReactRendererRoot = (
  value: unknown,
): Option.Option<ReactRendererRoot> =>
  Schema.decodeUnknownOption(ReactRendererRoot)(value)

export const rendererFiberRoots = (
  hook: ReactDevToolsHook,
): ReadonlyArray<ReactFiber> => {
  const roots: Array<ReactFiber> = []
  const visited = new Set<ReactFiber>()
  for (const rendererId of hook.renderers.keys()) {
    for (const value of hook.getFiberRoots(rendererId)) {
      const root = parseReactRendererRoot(value)
      if (Option.isNone(root) || visited.has(root.value.current)) continue
      visited.add(root.value.current)
      roots.push(root.value.current)
    }
  }
  return roots
}
