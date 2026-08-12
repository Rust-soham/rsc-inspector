import * as Option from "effect/Option"
import {
  parseReactFiber,
  parseReactRendererRoot,
  type ReactFiber,
} from "./ReactFiberTopology.js"

const fiberFromElement = (element: Element): ReactFiber | undefined => {
  // React attaches the owning Fiber under a randomized private property.
  for (const property of Object.getOwnPropertyNames(element)) {
    if (
      !property.startsWith("__reactFiber$") &&
      !property.startsWith("__reactInternalInstance$")
    ) {
      continue
    }
    const candidate = Object.getOwnPropertyDescriptor(element, property)?.value
    const fiber = parseReactFiber(candidate)
    if (Option.isSome(fiber)) return fiber.value
  }
  return undefined
}

const rootFiberOf = (fiber: ReactFiber): ReactFiber => {
  let current = fiber
  const visited = new Set<object>()
  while (true) {
    const parent = parseReactFiber(current.return)
    if (Option.isNone(parent) || visited.has(parent.value)) break
    visited.add(parent.value)
    current = parent.value
  }
  return Option.match(parseReactRendererRoot(current.stateNode), {
    onNone: () => current,
    onSome: (root) => root.current,
  })
}

export const mountedFiberRoots = (): ReadonlyArray<ReactFiber> => {
  const roots = new Set<ReactFiber>()
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
