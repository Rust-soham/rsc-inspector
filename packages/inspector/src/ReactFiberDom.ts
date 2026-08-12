import {
  type FiberRecord,
  isFiberRecord,
} from "./ReactFiberTopology.js"

const fiberFromElement = (element: Element): FiberRecord | undefined => {
  // React attaches the owning Fiber under a randomized private property.
  for (const property of Object.getOwnPropertyNames(element)) {
    if (
      !property.startsWith("__reactFiber$") &&
      !property.startsWith("__reactInternalInstance$")
    ) {
      continue
    }
    const candidate = Object.getOwnPropertyDescriptor(element, property)?.value
    if (isFiberRecord(candidate)) return candidate
  }
  return undefined
}

const rootFiberOf = (fiber: FiberRecord): FiberRecord => {
  let current = fiber
  const visited = new Set<object>()
  while (isFiberRecord(current.return) && !visited.has(current.return)) {
    visited.add(current)
    current = current.return
  }
  const rootState = current.stateNode
  return isFiberRecord(rootState) && isFiberRecord(rootState.current)
    ? rootState.current
    : current
}

export const mountedFiberRoots = (): ReadonlyArray<FiberRecord> => {
  const roots = new Set<FiberRecord>()
  for (const element of document.querySelectorAll("*")) {
    if (element.closest("[data-rsc-inspector-root]") !== null) continue
    const fiber = fiberFromElement(element)
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

export const isApplicationMutation = (mutation: MutationRecord): boolean => {
  if (belongsToInspector(mutation.target)) return false
  return (
    Array.from(mutation.addedNodes).some((node) => !belongsToInspector(node)) ||
    Array.from(mutation.removedNodes).some((node) => !belongsToInspector(node))
  )
}
