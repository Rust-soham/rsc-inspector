/// <reference path="./react-devtools-inline.d.ts" />

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import { initialize } from "react-devtools-inline/backend"
import { TopologyUnavailable } from "./errors.js"
import {
  ReactComponentTopology,
  type TopologySnapshot,
} from "./ReactComponentTopology.js"
import {
  isApplicationMutation,
  mountedFiberRoots,
} from "./ReactFiberDom.js"
import {
  buildFiberTopology,
  rendererFiberRoots,
} from "./ReactFiberTopology.js"
import type { ReactDevToolsHook } from "./ReactDevToolsHook.js"

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

    const updates = yield* PubSub.unbounded<TopologySnapshot>({ replay: 1 })
    const ids = new WeakMap<object, string>()
    let revision = 0
    let nextId = 1

    const rebuild = (): TopologySnapshot => {
      const rendererRoots = rendererFiberRoots(hook)
      // Scan DOM only during early injection before a renderer registers roots.
      const roots =
        rendererRoots.length === 0 ? mountedFiberRoots() : rendererRoots
      const built = buildFiberTopology(
        roots,
        revision++,
        ids,
        nextId,
      )
      nextId = built.nextId
      return { tree: built.tree, hostElements: built.hostElements }
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
      // Suspense and streamed RSC reveals can mutate DOM without a hook commit.
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
    })
  }),
)
