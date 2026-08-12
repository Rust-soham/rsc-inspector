import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import { InspectorInput } from "./InspectorInput.js"
import type { InspectionCommand } from "./model.js"

const componentIdFromEvent = (event: MouseEvent): string | undefined => {
  for (const target of event.composedPath()) {
    if (target instanceof HTMLElement) {
      const id = target.dataset.rscComponentId
      if (id !== undefined) return id
    }
  }
  return undefined
}

const isToggleEvent = (event: MouseEvent): boolean =>
  event.composedPath().some(
    (target) =>
      target instanceof HTMLElement &&
      target.dataset.rscInspectorToggle === "true",
  )

export const InspectorInputLayer = Layer.effect(
  InspectorInput,
  Effect.gen(function* () {
    const commands = yield* PubSub.unbounded<InspectionCommand>()
    let visible = false

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.altKey && event.shiftKey && event.code === "KeyX") {
        visible = !visible
        PubSub.publishUnsafe(commands, { _tag: "SetVisible", visible })
      } else if (event.code === "Escape" && visible) {
        visible = false
        PubSub.publishUnsafe(commands, { _tag: "SetVisible", visible: false })
        PubSub.publishUnsafe(commands, { _tag: "Select", componentId: null })
      }
    }

    const onClick = (event: MouseEvent): void => {
      if (isToggleEvent(event)) {
        visible = !visible
        PubSub.publishUnsafe(commands, { _tag: "SetVisible", visible })
        return
      }
      const componentId = componentIdFromEvent(event)
      if (componentId === undefined) return
      PubSub.publishUnsafe(commands, { _tag: "Select", componentId })
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("click", onClick, true)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        document.removeEventListener("keydown", onKeyDown)
        document.removeEventListener("click", onClick, true)
      }),
    )

    return InspectorInput.of({ commands: Stream.fromPubSub(commands) })
  }),
)
