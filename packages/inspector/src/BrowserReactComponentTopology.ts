/// <reference path="./react-devtools-inline.d.ts" />

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import { initialize } from "react-devtools-inline/backend"
import { TopologyUnavailable } from "./errors.js"
import type {
  RenderedComponentNode,
  RenderedComponentTree,
} from "./model.js"
import { ReactComponentTopology } from "./ReactComponentTopology.js"
import type { ReactDevToolsHook } from "./ReactDevToolsHook.js"

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  (typeof value === "object" && value !== null) || typeof value === "function"

const stringProperty = (
  value: unknown,
  property: string,
): string | undefined => {
  if (!isRecord(value)) return undefined
  const candidate = value[property]
  return typeof candidate === "string" ? candidate : undefined
}

const objectProperty = (
  value: unknown,
  property: string,
): UnknownRecord | undefined => {
  if (!isRecord(value)) return undefined
  const candidate = value[property]
  return isRecord(candidate) ? candidate : undefined
}

const displayName = (fiber: UnknownRecord): string | undefined => {
  const type = fiber.type
  return (
    stringProperty(type, "displayName") ??
    stringProperty(type, "name") ??
    (typeof type === "string" ? undefined : stringProperty(fiber.elementType, "name"))
  )
}

const sourceLocation = (
  value: UnknownRecord,
): RenderedComponentNode["sourceLocation"] => {
  const debugSource = objectProperty(value, "_debugSource")
  const file = stringProperty(debugSource, "fileName")
  if (file === undefined) return undefined

  const line = debugSource?.lineNumber
  const column = debugSource?.columnNumber
  return {
    file,
    ...(typeof line === "number" ? { line } : {}),
    ...(typeof column === "number" ? { column } : {}),
  }
}

const serverSourceLocation = (
  value: UnknownRecord,
): RenderedComponentNode["sourceLocation"] => {
  const location = objectProperty(value, "debugStack")
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

interface TopologyBuildState {
  readonly nodes: Array<RenderedComponentNode>
  readonly hostElements: Map<string, ReadonlyArray<Element>>
  readonly ids: WeakMap<object, string>
  readonly visitedFibers: Set<object>
  nextId: number
}

const idFor = (state: TopologyBuildState, value: object): string => {
  const existing = state.ids.get(value)
  if (existing !== undefined) return existing
  const id = `rsc-${state.nextId++}`
  state.ids.set(value, id)
  return id
}

const directChildren = (fiber: UnknownRecord): ReadonlyArray<UnknownRecord> => {
  const children: Array<UnknownRecord> = []
  let current: unknown = fiber.child
  const visited = new Set<object>()
  while (isRecord(current) && !visited.has(current)) {
    visited.add(current)
    children.push(current)
    current = current.sibling
  }
  return children
}

const reactFiberFromElement = (element: Element): UnknownRecord | undefined => {
  // React attaches the owning Fiber under a randomized private property.
  for (const property of Object.getOwnPropertyNames(element)) {
    if (!property.startsWith("__reactFiber$") && !property.startsWith("__reactInternalInstance$")) {
      continue
    }
    const candidate = Object.getOwnPropertyDescriptor(element, property)?.value
    if (isRecord(candidate)) return candidate
  }
  return undefined
}

const rootFiberOf = (fiber: UnknownRecord): UnknownRecord => {
  let current = fiber
  const visited = new Set<object>()
  while (isRecord(current.return) && !visited.has(current.return)) {
    visited.add(current)
    current = current.return
  }
  const rootState = current.stateNode
  if (isRecord(rootState) && isRecord(rootState.current)) {
    return rootState.current
  }
  return current
}

const mountedRootsFromDom = (): ReadonlyArray<UnknownRecord> => {
  const roots = new Set<UnknownRecord>()
  for (const element of document.querySelectorAll("*")) {
    if (element.closest("[data-rsc-inspector-root]") !== null) continue
    const fiber = reactFiberFromElement(element)
    if (fiber !== undefined) roots.add(rootFiberOf(fiber))
  }
  return Array.from(roots)
}

const belongsToInspector = (node: Node): boolean => {
  if (node instanceof Element) {
    return (
      node.matches("[data-rsc-inspector-root]") ||
      node.closest("[data-rsc-inspector-root]") !== null
    )
  }
  return node.parentElement?.closest("[data-rsc-inspector-root]") !== null
}

const isApplicationMutation = (mutation: MutationRecord): boolean => {
  if (belongsToInspector(mutation.target)) return false
  return (
    Array.from(mutation.addedNodes).some((node) => !belongsToInspector(node)) ||
    Array.from(mutation.removedNodes).some((node) => !belongsToInspector(node))
  )
}

const collectHostElements = (fiber: UnknownRecord): ReadonlyArray<Element> => {
  const elements: Array<Element> = []
  const visit = (current: UnknownRecord): void => {
    if (current.stateNode instanceof Element) {
      // Stop at each nearest host root so a component does not claim its full subtree.
      elements.push(current.stateNode)
      return
    }
    for (const child of directChildren(current)) visit(child)
  }
  visit(fiber)
  return elements
}

const serverEntries = (fiber: UnknownRecord): ReadonlyArray<UnknownRecord> => {
  // React 19 records the Server Component chain that produced a client Fiber here.
  const debugInfo = fiber._debugInfo
  if (!Array.isArray(debugInfo)) return []
  return debugInfo.filter(
    (entry): entry is UnknownRecord =>
      isRecord(entry) && typeof entry.name === "string",
  )
}

const appendServerChain = (
  state: TopologyBuildState,
  entries: ReadonlyArray<UnknownRecord>,
  parentId: string | null,
  elements: ReadonlyArray<Element>,
): string | null => {
  let currentParent = parentId
  for (const entry of entries) {
    const id = idFor(state, entry)
    const location = serverSourceLocation(entry)
    state.nodes.push({
      id,
      parentId: currentParent,
      name: stringProperty(entry, "name") ?? "Anonymous Server Component",
      environment: "server",
      ...(location === undefined ? {} : { sourceLocation: location }),
    })
    state.hostElements.set(id, elements)
    currentParent = id
  }
  return currentParent
}

const visitFiber = (
  state: TopologyBuildState,
  fiber: UnknownRecord,
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
    if (isRecord(alternate)) state.ids.set(alternate, id)
    const location = sourceLocation(fiber)
    state.nodes.push({
      id,
      parentId: serverParent,
      name,
      environment: "client",
      ...(location === undefined ? {} : { sourceLocation: location }),
    })
    state.hostElements.set(id, elements)
    childParent = id
  }

  for (const child of directChildren(fiber)) {
    visitFiber(state, child, childParent)
  }
}

const buildTopology = (
  hook: ReactDevToolsHook,
  revision: number,
  ids: WeakMap<object, string>,
  nextId: number,
): {
  readonly tree: RenderedComponentTree
  readonly hostElements: ReadonlyMap<string, ReadonlyArray<Element>>
  readonly nextId: number
} => {
  const state: TopologyBuildState = {
    nodes: [],
    hostElements: new Map(),
    ids,
    visitedFibers: new Set(),
    nextId,
  }

  let foundHookRoot = false
  const visitedRoots = new Set<object>()
  for (const rendererId of hook.renderers.keys()) {
    for (const root of hook.getFiberRoots(rendererId)) {
      if (!isRecord(root)) continue
      const current = root.current
      if (!isRecord(current)) continue
      if (visitedRoots.has(current)) continue
      visitedRoots.add(current)
      foundHookRoot = true
      for (const child of directChildren(current)) visitFiber(state, child, null)
    }
  }

  if (!foundHookRoot) {
    // Early injection can precede renderer registration; mounted DOM Fibers are a safe fallback.
    for (const root of mountedRootsFromDom()) {
      for (const child of directChildren(root)) visitFiber(state, child, null)
    }
  }

  return {
    tree: { revision, nodes: state.nodes },
    hostElements: state.hostElements,
    nextId: state.nextId,
  }
}

export const ReactComponentTopologyLayer = Layer.effect(
  ReactComponentTopology,
  Effect.gen(function* () {
    yield* Effect.sync(() => initialize(window))
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__
    if (hook === undefined) {
      return yield* new TopologyUnavailable({
        reason: "React DevTools hook could not be initialized",
      })
    }

    const updates = yield* PubSub.unbounded<RenderedComponentTree>({ replay: 1 })
    const ids = new WeakMap<object, string>()
    let revision = 0
    let nextId = 1
    let currentHostElements: ReadonlyMap<string, ReadonlyArray<Element>> = new Map()

    const rebuild = (): RenderedComponentTree => {
      const built = buildTopology(hook, revision++, ids, nextId)
      nextId = built.nextId
      currentHostElements = built.hostElements
      return built.tree
    }

    const originalCommit = hook.onCommitFiberRoot
    const onCommit: ReactDevToolsHook["onCommitFiberRoot"] = (
      rendererId,
      root,
      priorityLevel,
      didError,
    ) => {
      originalCommit(rendererId, root, priorityLevel, didError)
      PubSub.publishUnsafe(updates, rebuild())
    }
    hook.onCommitFiberRoot = onCommit

    const domObserver = new MutationObserver((mutations) => {
      // Suspense and streamed RSC reveals can mutate DOM without a fresh hook commit.
      if (!mutations.some(isApplicationMutation)) return
      PubSub.publishUnsafe(updates, rebuild())
    })
    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        if (hook.onCommitFiberRoot === onCommit) {
          hook.onCommitFiberRoot = originalCommit
        }
        domObserver.disconnect()
      }),
    )

    const initial = rebuild()
    PubSub.publishUnsafe(updates, initial)

    return ReactComponentTopology.of({
      snapshot: Effect.sync(rebuild),
      changes: Stream.fromPubSub(updates),
      hostElements: (componentId) =>
        Effect.sync(() => currentHostElements.get(componentId) ?? []),
    })
  }),
)
