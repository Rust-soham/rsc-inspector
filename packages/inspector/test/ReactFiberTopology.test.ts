import { assert, describe, it } from "@effect/vitest"
import {
  buildFiberTopology,
  type ReactFiber,
} from "../src/ReactFiberTopology.js"

const fiber = (overrides: Partial<ReactFiber> = {}): ReactFiber => ({
  child: null,
  sibling: null,
  return: null,
  stateNode: null,
  type: "div",
  elementType: "div",
  alternate: null,
  ...overrides,
})

describe("React Fiber topology", () => {
  it("keeps named server entries when React interleaves timing metadata", () => {
    function PrefetchLink() {}
    const client = fiber({
      type: PrefetchLink,
      elementType: PrefetchLink,
      _debugInfo: undefined,
    })
    const boundary = fiber({
      child: client,
      _debugInfo: [
        { time: 1 },
        { name: "GenreCard" },
        { time: 2 },
      ],
    })
    const root = fiber({ child: boundary })

    const built = buildFiberTopology(
      [root],
      1,
      new WeakMap<object, string>(),
      1,
    )

    assert.deepEqual(
      built.tree.nodes.map(({ name, environment }) => [name, environment]),
      [
        ["GenreCard", "server"],
        ["PrefetchLink", "client"],
      ],
    )
  })
})
