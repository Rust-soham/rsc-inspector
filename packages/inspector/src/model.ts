export type ComponentEnvironment = "server" | "client"

export type BoundaryKind =
  | "server-subtree"
  | "client-boundary"
  | "client-subtree"
  | "server-slot"

export interface RenderedComponentNode {
  readonly id: string
  readonly parentId: string | null
  readonly name: string
  readonly environment: ComponentEnvironment
  readonly sourceLocation?: {
    readonly file: string
    readonly line?: number
    readonly column?: number
  }
}

export interface RenderedComponentTree {
  readonly revision: number
  readonly nodes: ReadonlyArray<RenderedComponentNode>
}

export interface Rectangle {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface InspectorNode extends RenderedComponentNode {
  readonly boundaryKind: BoundaryKind
  readonly rectangles: ReadonlyArray<Rectangle>
}

export interface InspectorScene {
  readonly revision: number
  readonly visible: boolean
  readonly selectedId: string | null
  readonly nodes: ReadonlyArray<InspectorNode>
}

export type InspectionCommand =
  | { readonly _tag: "SetVisible"; readonly visible: boolean }
  | { readonly _tag: "Select"; readonly componentId: string | null }

export const emptyScene: InspectorScene = {
  revision: 0,
  visible: false,
  selectedId: null,
  nodes: [],
}

export const deriveBoundaryKind = (
  parent: ComponentEnvironment | undefined,
  child: ComponentEnvironment,
): BoundaryKind => {
  if (child === "client") {
    return parent === "client" ? "client-subtree" : "client-boundary"
  }
  return parent === "client" ? "server-slot" : "server-subtree"
}

export const projectScene = (
  tree: RenderedComponentTree,
  regions: ReadonlyMap<string, ReadonlyArray<Rectangle>>,
  previous: InspectorScene,
): InspectorScene => {
  const environments = new Map(
    tree.nodes.map((node) => [node.id, node.environment] as const),
  )

  return {
    revision: tree.revision,
    visible: previous.visible,
    selectedId:
      previous.selectedId !== null && environments.has(previous.selectedId)
        ? previous.selectedId
        : null,
    nodes: tree.nodes.map((node) => ({
      ...node,
      boundaryKind: deriveBoundaryKind(
        node.parentId === null ? undefined : environments.get(node.parentId),
        node.environment,
      ),
      rectangles: regions.get(node.id) ?? [],
    })),
  }
}

export const applyInspectionCommand = (
  scene: InspectorScene,
  command: InspectionCommand,
): InspectorScene => {
  switch (command._tag) {
    case "SetVisible":
      return { ...scene, visible: command.visible }
    case "Select":
      return {
        ...scene,
        selectedId:
          command.componentId === null ||
          scene.nodes.some((node) => node.id === command.componentId)
            ? command.componentId
            : scene.selectedId,
      }
  }
}
