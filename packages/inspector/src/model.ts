import * as Schema from "effect/Schema"

export const ComponentEnvironment = Schema.Literals(["server", "client"])
export type ComponentEnvironment = typeof ComponentEnvironment.Type

export const BoundaryKind = Schema.Literals([
  "server-subtree",
  "client-boundary",
  "client-subtree",
  "server-slot",
])
export type BoundaryKind = typeof BoundaryKind.Type

export const ComponentSourceLocation = Schema.Struct({
  file: Schema.String,
  line: Schema.optionalKey(Schema.Number),
  column: Schema.optionalKey(Schema.Number),
})
export interface ComponentSourceLocation
  extends Schema.Schema.Type<typeof ComponentSourceLocation> {}

export const RenderedComponentNode = Schema.Struct({
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  name: Schema.String,
  environment: ComponentEnvironment,
  sourceLocation: Schema.optionalKey(ComponentSourceLocation),
})
export interface RenderedComponentNode
  extends Schema.Schema.Type<typeof RenderedComponentNode> {}

export const RenderedComponentTree = Schema.Struct({
  revision: Schema.Number,
  nodes: Schema.Array(RenderedComponentNode),
})
export interface RenderedComponentTree
  extends Schema.Schema.Type<typeof RenderedComponentTree> {}

export const Rectangle = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
})
export interface Rectangle extends Schema.Schema.Type<typeof Rectangle> {}

export const InspectorNode = RenderedComponentNode.pipe(
  Schema.fieldsAssign({
    boundaryKind: BoundaryKind,
    rectangles: Schema.Array(Rectangle),
  }),
)
export interface InspectorNode
  extends Schema.Schema.Type<typeof InspectorNode> {}

export const InspectorScene = Schema.Struct({
  revision: Schema.Number,
  visible: Schema.Boolean,
  selectedId: Schema.NullOr(Schema.String),
  nodes: Schema.Array(InspectorNode),
})
export interface InspectorScene
  extends Schema.Schema.Type<typeof InspectorScene> {}

export const InspectionCommand = Schema.TaggedUnion({
  SetVisible: { visible: Schema.Boolean },
  Select: { componentId: Schema.NullOr(Schema.String) },
})
export type InspectionCommand = typeof InspectionCommand.Type

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
