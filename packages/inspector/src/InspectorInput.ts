import * as Context from "effect/Context"
import type * as Stream from "effect/Stream"
import type { InspectionCommand } from "./model.js"

export class InspectorInput extends Context.Service<
  InspectorInput,
  {
    readonly commands: Stream.Stream<InspectionCommand>
  }
>()("@rsc-inspector/InspectorInput") {}
