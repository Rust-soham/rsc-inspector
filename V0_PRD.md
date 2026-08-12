# RSC Boundary Inspector — v0 Product Requirements Document

Status: Draft for implementation
Target: Next.js 16 App Router development environments
Working package name: `next-rsc-inspector`

## 0. Source and decision record

This PRD consolidates three project inputs:

1. The workspace research transcript, `so latest nextjs during build time, splits the com.md`.
2. The Codex task titled “Review shared markdown file,” which challenged and corrected several implementation assumptions in that transcript.
3. The subsequent product discussion that narrowed v0 to a boundary visualizer and reserved caching, delivery, and hydration as later evidence layers.

Where those inputs conflict, this PRD follows the later validated decisions:

- Consume the React development component topology; do not inject wrapper components into the application or DevTools tree.
- Treat module edges, rendered component edges, and DOM edges as different relationships.
- Use rendered component edges for v0 nesting and visual composition.
- Use module-graph evidence later to explain why code entered the client bundle.
- Assign identifiers in the inspector’s own store rather than in application source or DOM.
- Fail closed when environment or geometry cannot be established authoritatively.

## 1. Product summary

RSC Boundary Inspector is a development-only visual overlay for Next.js applications. It shows developers where rendered UI crosses between React Server Components and Client Components, including Server Components passed through Client Components as props or slots.

The v0 product answers one question:

> Where are the server/client boundaries in the UI I am currently looking at?

It does not attempt to explain caching, prerendering, streaming, hydration timing, bundle size, or runtime performance in v0.

## 2. Problem

Next.js applications can freely compose Server and Client Components. The source-level `"use client"` directive identifies a client module entry point, but it does not make the resulting runtime composition visually apparent.

This becomes difficult to reason about when:

- A Server Component renders several Client Components.
- A Client Component contains Server Component output passed through `children` or another prop.
- A server slot contains another Client Component boundary.
- Components return fragments, multiple host elements, or other components rather than one DOM element.
- A file belongs to the client module graph transitively without declaring `"use client"` itself.

React DevTools can expose a logical component hierarchy, but developers must leave the page, inspect the tree, and mentally map it back to visible regions. Demo applications can hardcode colored wrappers, but that requires manual annotation and does not generalize to an existing application.

## 3. Product hypothesis

If Next.js developers can toggle an automatic server/client boundary overlay directly on their running application, they will understand RSC composition faster and identify overly broad or surprising Client Component regions without manually tracing source files or adding debug wrappers.

## 4. Target user

The primary user is a developer building or reviewing a Next.js App Router application that uses React Server Components.

They understand basic Server and Client Component concepts but may struggle to see how those concepts compose in a real rendered route.

## 5. Goals

v0 must:

1. Show rendered Server Component regions and Client Component regions on the current page.
2. Preserve arbitrary nesting, including:
   - server to server;
   - server to client;
   - client to client;
   - client to server through a prop or slot.
3. Identify explicit client entry boundaries separately from client descendants when that information is available reliably.
4. Let the developer hover or select a region to see its component name and environment.
5. Operate without requiring developers to manually wrap or annotate application components.
6. Avoid changing application layout, semantics, or production output.
7. Continue updating through navigation, streaming, state updates, and Fast Refresh.
8. Establish a data model that can accept future build, cache, delivery, and hydration evidence without adding those features to v0.

## 6. Non-goals

v0 will not:

- Visualize `"use cache"`, `cacheLife`, cache tags, cache hits, misses, staleness, or revalidation.
- Classify content as static, partially static, request-time, prerendered, or streamed.
- Measure or visualize hydration status, hydration duration, selective hydration, or hydration mismatches.
- Calculate client bundle size or dependency cost.
- Recommend architectural changes automatically.
- Support the Pages Router, Vite, Remix, or other RSC frameworks.
- Run in production by default.
- Replace React DevTools.
- Treat a mixed subtree as a third React component type. Every component remains server or client; “mixed” may only summarize descendants in the UI.
- Depend on the Next.js Deployment Adapter API. Its build outputs may power later route delivery and cache views, but they are not required for v0.

## 7. Core concepts

### 7.1 Component environment

Each rendered component node is classified as:

- `server`: executed as a Server Component.
- `client`: executed as a Client Component.

### 7.2 Boundary relationship

The inspector derives a relationship from a node and its logical parent:

| Parent | Child | Display meaning |
|---|---|---|
| Server | Server | Server subtree |
| Server | Client | Client boundary |
| Client | Client | Client subtree |
| Client | Server | Server slot or donut composition |

A Client-to-Server relationship does not mean the Client Component imported and executed the Server Component. It means server-rendered output was composed into a prop or slot of the Client Component.

These are rendered component edges, not import edges:

```text
Module edge     = imports or depends on
Component edge  = rendered beneath or composed inside
DOM edge        = physically contained by an HTML element
```

The rendered component edge is authoritative for v0’s nested overlay. Module-graph membership may later explain whether a Client Component is an explicit `"use client"` entry or a transitive client descendant, but the basic server/client overlay must not wait for that explanatory layer.

### 7.3 Logical region

A component does not necessarily map to one DOM element. A logical component region may contain zero, one, or multiple host nodes and rectangles.

The inspector must not insert a layout wrapper around every component. It draws into an independent overlay based on the host nodes associated with a logical component instance.

## 8. User experience

### 8.1 Installation

The target setup is no more than one initialization command plus one generated or documented integration point:

```bash
pnpm add -D next-rsc-inspector
pnpm rsc-inspector init
```

The exact integration mechanism is subject to the technical spike. Preferred options, in order, are:

1. A development bootstrap registered through `instrumentation-client.ts` if it can attach early enough.
2. A small generated root-layout integration.
3. A browser-extension delivery mechanism if an in-application package cannot attach to the required React development hook reliably.

The user must not annotate individual components.

### 8.2 Overlay controls

The page displays a compact development-only control with:

- Boundary overlay on/off.
- Server regions on/off.
- Client regions on/off.
- Inspect mode on/off.

The overlay is off or visually quiet by default if it would obstruct normal development. The chosen default should be validated during implementation.

### 8.3 Visual language

Initial visual treatment:

- Server region: red outline and label.
- Client region: blue outline and label.
- Client boundary: emphasized blue label or solid outline.
- Server slot inside a client region: emphasized red label or dashed transition treatment.
- Client descendant: standard blue treatment without implying it contains its own `"use client"` directive.

Colors must be configurable later and must not be the sole carrier of meaning.

### 8.4 Interaction

When inspect mode is active:

1. Hovering visible content highlights the smallest inspectable logical component region associated with it.
2. Nested regions remain discoverable without permanently drawing every overlapping label.
3. Clicking pins the selection.
4. The selection panel shows:
   - component name;
   - `Server Component` or `Client Component`;
   - boundary relationship;
   - source location when exposed by the underlying development metadata;
   - whether the component is an explicit client entry or a client descendant, when known.

For a donut composition, the developer should be able to see:

```text
Page                         Server Component
└── Modal                    Client boundary
    └── Cart                 Server slot
        └── Quantity         Client boundary
```

### 8.5 Unsupported or ambiguous regions

If a component cannot be mapped to visible host nodes, the inspector must not invent a rectangle. It may remain visible in a tree/list view with a message such as:

```text
No directly highlightable host nodes for this render.
```

## 9. Functional requirements

### FR1 — Discover rendered roots

The inspector must discover React roots in the active document and subscribe to logical component-tree changes.

### FR2 — Read Server Component metadata

The inspector must obtain Server Component identity and environment metadata exposed in React’s development tooling path.

### FR3 — Read Client Component metadata

The inspector must obtain mounted Client Component identity, parentage, environment, and associated host nodes.

### FR4 — Build a combined logical hierarchy

The inspector must normalize available server and client information into a single read-only hierarchy representing rendered composition.

It must preserve server content passed through Client Component slots rather than flattening it into the surrounding DOM hierarchy.

### FR5 — Assign inspector identities

Every discovered logical component instance receives an inspector-owned identifier. These identifiers must not require mutations to application source or DOM.

### FR6 — Resolve visual regions

For each inspectable component instance, the inspector must resolve all associated visible host nodes and calculate one or more screen-space rectangles.

### FR7 — Render a non-invasive overlay

The overlay must render in a separate root, preferably isolated with Shadow DOM, and must not intercept application pointer events except while inspect mode is active.

### FR8 — Update continuously

The hierarchy and visual regions must update after:

- initial render and hydration;
- streamed RSC updates;
- client-side navigation;
- state-driven commits;
- Suspense reveal;
- Fast Refresh;
- viewport resize and scroll.

### FR9 — Development-only behavior

Production builds must contain no active inspector UI or runtime subscription by default.

### FR10 — Capability degradation

The inspector must detect missing capabilities and report them clearly. Examples include an unsupported React version, unavailable server metadata, or failure to associate a node with host elements.

It must not silently downgrade an unknown node to `server` or `client` based only on the absence of a directive.

## 10. Normalized data model

v0 should introduce a small provider-neutral model:

```ts
type EvidenceSource =
  | "react-devtools"
  | "compiler"
  | "adapter-output"
  | "server-runtime"
  | "browser-runtime";

type Evidence<T> = {
  value: T;
  source: EvidenceSource;
  confidence: "authoritative" | "inferred";
};

type InspectorNode = {
  id: string;
  parentId: string | null;
  name: string;
  environment: Evidence<"server" | "client">;
  boundaryKind: Evidence<
    | "server-subtree"
    | "client-boundary"
    | "client-subtree"
    | "server-slot"
  >;
  sourceLocation?: {
    file: string;
    line?: number;
    column?: number;
  };
  hostNodes: Element[];
};
```

Only the React topology provider is required in v0. The other evidence-source names reserve clean extension seams; they do not authorize placeholder or inferred cache/hydration claims.

## 11. Proposed v0 architecture

The Effect architecture is designed from its local convergence points rather than from a bottom-up list of possible utilities. The design procedure is:

1. Write the main use-case service as if its required capabilities already exist.
2. Derive its immediate service requirements from that orchestration.
3. Treat each substantial required capability as its own local convergence point.
4. Repeat until the remaining behavior is either a narrow external adapter or a pure function.
5. Compose each subsystem locally and expose only its completed service layer upward.

This follows the pattern demonstrated by [`LabelingCoordinator` in Effect-TS/SlopCop](https://github.com/Effect-TS/slopcop/blob/main/apps/github-events/src/Labeling/LabelingCoordinator.ts): one meaningful coordinator operation reveals its required services; its completed layer supplies and hides those dependencies; pure decision logic remains ordinary functions.

### 11.1 Main local convergence point: `BoundaryInspector`

The browser bootstrap needs one application capability:

> Install an inspection session that continuously turns the current rendered React topology into an interactive boundary overlay until its scope closes.

Conceptual service surface:

```ts
class BoundaryInspector extends Context.Service<
  BoundaryInspector,
  {
    readonly install: Effect.Effect<
      InspectorSession,
      InspectorInstallError,
      Scope.Scope
    >;
  }
>()("@rsc-inspector/BoundaryInspector") {}
```

Conceptual orchestration:

```ts
const install = Effect.fn("BoundaryInspector.install")(function* () {
  const inspection = yield* ComponentInspection;
  const presentation = yield* InspectorPresentation;

  const scene = yield* inspection.open;
  const session = yield* presentation.mount(scene.snapshots);

  yield* session.commands.pipe(
    Stream.runForEach(inspection.dispatch),
    Effect.forkScoped,
  );

  return session.handle;
});
```

This pseudo-implementation derives exactly two immediate service requirements:

1. `ComponentInspection`: produce and update an inspectable boundary scene.
2. `InspectorPresentation`: display that scene and emit user commands.

`BoundaryInspector` does not know about React DevTools protocol messages, DOM rectangles, Shadow DOM, pointer events, Turbopack, or webpack. Those details belong below the next local convergence points or outside the runtime entirely.

### 11.2 Local convergence point: `ComponentInspection`

`ComponentInspection` owns the complete read model of the inspected application:

```ts
class ComponentInspection extends Context.Service<
  ComponentInspection,
  {
    readonly open: Effect.Effect<
      InspectionScene,
      TopologyUnavailable | RegionResolutionError,
      Scope.Scope
    >;
    readonly dispatch: (
      command: InspectionCommand,
    ) => Effect.Effect<void>;
  }
>()("@rsc-inspector/ComponentInspection") {}
```

Writing its pseudo-implementation reveals two external capabilities:

```ts
const open = Effect.fn("ComponentInspection.open")(function* () {
  const topology = yield* ReactComponentTopology;
  const regions = yield* ComponentRegions;

  const initialTree = yield* topology.snapshot;
  const initialScene = yield* projectScene(initialTree, regions);

  const updates = topology.changes.pipe(
    Stream.mapEffect((change) => updateScene(change, regions)),
  );

  return yield* makeInspectionScene(initialScene, updates);
});
```

Derived requirements:

- `ReactComponentTopology`: provide authoritative rendered component identities, parent-child relationships, environments, and topology changes from the React development tooling path.
- `ComponentRegions`: resolve the host nodes and visible rectangles belonging to a logical component instance and report geometry changes.

The following remain pure domain functions, not Effect services:

- Deriving `server-subtree`, `client-boundary`, `client-subtree`, or `server-slot` from parent and child environments.
- Reducing topology changes into the inspector tree.
- Projecting an inspector tree plus regions into an overlay scene.
- Aggregating or clipping rectangles.
- Choosing labels and visual styles from boundary kinds.

The inspection service owns its internal `SubscriptionRef`, queues, or other mutable Effect primitives. Those implementation details are not separate public services unless later evidence proves an independent consumer needs them.

### 11.3 Local convergence point: `InspectorPresentation`

`InspectorPresentation` owns the complete interaction between an inspection scene and the developer:

```ts
class InspectorPresentation extends Context.Service<
  InspectorPresentation,
  {
    readonly mount: (
      scenes: Stream.Stream<InspectorScene>,
    ) => Effect.Effect<
      PresentationSession,
      OverlayMountError,
      Scope.Scope
    >;
  }
>()("@rsc-inspector/InspectorPresentation") {}
```

Its pseudo-implementation derives two browser adapters:

```ts
const mount = Effect.fn("InspectorPresentation.mount")(function* (scenes) {
  const overlay = yield* OverlaySurface;
  const input = yield* InspectorInput;

  yield* scenes.pipe(
    Stream.runForEach(overlay.render),
    Effect.forkScoped,
  );

  return {
    commands: input.commands,
    handle: yield* overlay.handle,
  };
});
```

Derived requirements:

- `OverlaySurface`: acquire and release the isolated overlay root and render complete scene snapshots without mutating application layout.
- `InspectorInput`: convert pointer, keyboard, resize, scroll, and control-panel interactions into semantic inspector commands.

### 11.4 Leaf adapters

The first expected leaf adapters are:

| Adapter | Narrow responsibility |
|---|---|
| `ReactComponentTopology` | Attach to a compatible React development backend and expose decoded topology snapshots/changes. |
| `ComponentRegions` | Translate component instance IDs into host nodes and screen-space regions. |
| `OverlaySurface` | Manage the Shadow DOM or isolated overlay root and paint a scene. |
| `InspectorInput` | Produce semantic commands from browser events. |

These are services because they own external APIs, mutable resources, subscriptions, or replaceable implementations. Pure classification and projection code stays outside `Context`.

### 11.5 Local layer completion

Each local maximum completes and hides its own dependency graph, following the SlopCop pattern:

```text
ReactComponentTopology ─┐
                       ├─> ComponentInspection
ComponentRegions ──────┘

OverlaySurface ─────────┐
                        ├─> InspectorPresentation
InspectorInput ─────────┘

ComponentInspection ────┐
                        ├─> BoundaryInspector
InspectorPresentation ──┘

Next development bootstrap
        └─> one managed Effect runtime exposing BoundaryInspector
```

Conceptual layer composition:

```ts
const runtime = ManagedRuntime.make(BoundaryInspector.layer);
```

Every convergence module exports both forms:

- `Service.layerNoDeps`, whose input type truthfully exposes the services used by the
  service implementation.
- `Service.layer`, which provides the selected concrete dependency layers
  locally and erases the lower-level requirements.

Tests, feasibility probes, and alternate host adapters compose
`Service.layerNoDeps` with their substitute dependency layers. Ordinary runtime
composition uses `Service.layer`. Keeping both layers as `static readonly`
members makes the service class the single discoverable public surface for its
contract and construction recipes.

The concrete API spelling must be compiled against the project-pinned Effect v4 beta during implementation. The architectural invariant is more important than a particular convenience constructor: dependency requirements remain visible in each local maximum, completed subsystem layers hide their lower dependencies, and one runtime is constructed at the browser integration boundary.

The implementation will use the current Effect v4 beta line (`effect@beta`). Any `@effect/*` packages, including `@effect/platform-browser` if its browser integrations are actually needed, must be pinned to the same beta version. SlopCop is a pattern reference rather than a dependency; its current workspace demonstrates aligned Effect v4 packages and locally completed service layers.

Long-lived topology subscriptions, geometry observers, scene rendering, and input streams must be forked into the owning Effect scope. Closing the inspector session or disposing the managed runtime must release every hook, observer, event listener, fiber, and overlay node.

### 11.6 Next.js integration is a host adapter, not the domain architecture

Turbopack and legacy webpack build different module graphs, but v0 does not need to model each bundler as a core service if the React development topology is sufficient.

The preferred integration injects one development bootstrap through a supported Next.js entry such as `instrumentation-client.ts`. That bootstrap constructs a single managed Effect runtime and installs `BoundaryInspector`.

The implemented feasibility spike refined this integration. In Next 16.3,
`instrumentation-client.ts` is early enough to start the inspector before
application hydration, but React's renderer may already have initialized before
an inline DevTools hook imported from that file. The observed hook then contains
zero injected renderers. Therefore the topology adapter uses two isolated
development-only evidence paths:

1. Prefer an already-populated React DevTools global hook and its committed
   roots when one is available.
2. Otherwise discover React's development Fiber attachment on mounted DOM
   elements, climb to the root, and traverse Fiber plus React 19 `_debugInfo`.

Both mechanisms remain private to `ReactComponentTopology`; no Fiber or DevTools
protocol type crosses into the domain model. A `MutationObserver` supplies the
commit-like invalidation signal for the fallback, while filtering mutations
created by the inspector's own Shadow DOM. This was verified in the Next fixture
with a real Chromium development render containing Server Components, Client
Components, and a server slot passed through a client component.

Only if the feasibility spike proves that React tooling lacks required topology or geometry should `NextIntegration` add bundler-specific build instrumentation:

- A Turbopack-compatible loader registered through `turbopack.rules`.
- The same transform registered as a webpack loader for legacy webpack development.

Those loaders would supply a missing evidence adapter; they would not create a second inspector architecture or inject layout wrapper components.

## 12. Future compatibility requirements

The architecture must permit later providers without changing v0’s component topology contract:

- Compilation provider: client entry points, transitive module membership, and dependency paths.
- Build-output provider: route-level static/PPR mode, fallback shells, postponed state, and revalidation configuration from the Next.js Adapter API.
- Server-runtime provider: observed cache generation, lookup, invalidation, hit/miss, and revalidation events.
- Browser-runtime provider: hydration, client rendering, navigation, Suspense reveal, and mismatch events.

Future facts must retain their scope and provenance. A route-level build fact must not be presented as a component-level runtime observation.

The v0 package must not claim or replace the application’s `adapterPath`, because a project may already use a deployment adapter.

## 13. Technical spike and release gate

Before committing to package delivery, the team must prove the following in an unmodified Next.js 16 fixture application:

> Can the React development tooling path expose a combined server/client logical hierarchy and associate Server Component nodes with usable host DOM descendants?

The fixture must include:

1. Server to Server nesting.
2. Server to Client nesting.
3. Client to Client nesting.
4. Server content passed as `children` to a Client Component.
5. A named Server Component slot passed to a Client Component.
6. A Client Component nested inside that server slot.
7. Fragments and multiple root elements.
8. A component returning text or `null`.
9. Suspense with streamed server content.
10. Client-side navigation.
11. Fast Refresh.
12. A portal.

The spike must record:

- Whether every logical node is visible.
- Whether its environment is authoritative.
- Whether parentage preserves slot composition.
- Whether host nodes can be resolved.
- Which React/Next versions were tested.
- Which private APIs or protocols were required.

### Architecture decision after the spike

- If topology and geometry are available: ship an embedded package bootstrap plus overlay.
- If topology is available but Server Component geometry is incomplete: retain React topology and add the narrowest possible development-only geometry instrumentation.
- If an application bootstrap cannot attach early or reliably enough: ship the v0 experience as a browser extension with an optional Next companion package.
- If server/client topology itself is unavailable reliably: stop and redefine v0 rather than presenting inferred boundaries as authoritative.

## 14. Acceptance criteria

v0 is releasable when all of the following are true:

1. A developer can enable the inspector in a Next.js 16 App Router fixture without annotating individual components.
2. The overlay correctly distinguishes server and client nodes in all four parent-child transitions.
3. The donut fixture displays the Client Component containing a Server Component slot, with a nested Client Component inside that slot.
4. Component regions with multiple host nodes are highlighted without adding wrapper elements.
5. Components with no highlightable host nodes are represented honestly without a fabricated rectangle.
6. Clicking a visible region reveals its component name, environment, and boundary relationship.
7. The overlay remains correct after a client navigation, state update, Suspense reveal, and Fast Refresh.
8. The inspector does not change measured application layout or produce invalid application markup.
9. Disabling or removing the inspector restores the ordinary application with no source changes beyond the single bootstrap integration.
10. A default production build does not initialize the inspector.
11. Unsupported React or Next versions produce an actionable capability message rather than incorrect classifications.

## 15. Success measures

For an initial developer preview:

- At least 90% of visible component instances in the reference fixtures can be associated with a correct highlightable region.
- 100% of displayed server/client classifications in supported fixtures are authoritative rather than directive-based guesses.
- Setup takes less than five minutes in a standard Next.js 16 App Router project.
- No layout differences are detected with the overlay enabled but not actively inspecting.
- A developer can identify the four boundary relationships in the reference fixture without opening React DevTools.

These are product-validation targets, not claims about universal React application coverage.

## 16. Principal risks

### Private React tooling dependency

React DevTools protocols and hooks may change outside a stable public contract. Mitigation: isolate them behind versioned topology adapters and capability detection.

### Server Component geometry

Server nodes may appear logically without direct host-instance associations. Mitigation: validate first; add narrow metadata instrumentation only if necessary.

### Overlapping regions

Many nested components may resolve to the same host elements. Mitigation: hover-first inspection, depth cycling, pinned selection, and restrained default labels.

### Incorrect classification

Source directive scanning cannot authoritatively classify transitive client modules. Mitigation: use runtime environment metadata for v0 and label unavailable distinctions as unknown.

### Framework/version drift

Next and React development internals can evolve independently. Mitigation: publish a tested compatibility matrix and fail closed.

## 17. Open implementation questions

1. Can `instrumentation-client.ts` install or connect to the required hook before React initializes?
2. Can an embedded package safely consume an existing React DevTools hook without conflicting with the browser extension?
3. Does the current protocol expose host-node lookup for Server Component nodes in all target compositions?
4. Is a browser extension required for reliable early injection?
5. Can explicit client entry points be distinguished from transitive Client Components using runtime metadata alone?
6. How should users cycle through components whose regions are geometrically identical?
7. Which exact Next.js and React versions constitute the first supported compatibility range?

## 18. Delivery milestones

### Milestone 0 — Feasibility fixture

Build the composition fixture and document React topology/geometry evidence for every required case.

### Milestone 1 — Read-only component explorer

Display the normalized logical tree, environment, parentage, capability status, and associated host-node count without drawing the full overlay.

### Milestone 2 — Spatial overlay

Add hover, selection, multi-rectangle geometry, labels, and boundary-transition styling.

### Milestone 3 — Package integration

Implement the smallest reliable Next.js development bootstrap, production exclusion, version checks, and initialization flow.

### Milestone 4 — Developer preview

Validate against the reference fixture and at least two non-demo Next.js applications, publish limitations, and release v0 as experimental.

## 19. v0 definition of done

v0 is done when a developer can install the inspector, open a real Next.js App Router page, toggle Boundary mode, and accurately see server regions, client boundaries, client descendants, and server slots through arbitrary supported nesting—without manual component annotations or application DOM wrappers.

The default development shortcut for toggling Boundary mode is
`Alt + Shift + X`.

## 20. Current compatibility evidence

The package is exercised as a packed tarball, rather than through a workspace
symlink, so these checks cover the consumer-facing package boundary.

| Application | Next.js | Result | Observed boundary kinds |
| --- | --- | --- | --- |
| Local composition fixture | 16.3.0 | Turbopack Playwright test, webpack development smoke test, and production build pass | Client boundary and server relationships required by the fixture |
| `aurorascharff/next16-social-media` | 16.3.0 | Root and client-side search navigation render; desktop/mobile resize and teardown pass | `server-subtree`, `client-boundary`, `server-slot` |
| `vercel-labs/next-beats` | 16.3.0 | Login, authenticated home, client-side search navigation, desktop/mobile resize, and teardown pass against its documented SQLite development mode | `server-subtree`, `client-boundary`, `server-slot` |
| `aurorascharff/next16-commerce` | 16.3.0-preview.10 | Package integrates, but the page fails before client bootstrap without its Postgres database | Not observable until the application server render succeeds |

The real-application pass also established an important geometry rule: a
logical component resolves to its nearest host roots, not every descendant DOM
element. This preserves multi-root components while avoiding an overlay label
for every element in a component's entire rendered subtree.

The stress harness additionally checks that enabling Boundary mode does not
change application geometry, no rendered region has zero area or a duplicate
environment/rectangle key, framework internals do not leak into the overlay,
and disabling the inspector removes every region. After shared geometry was
collapsed, NextBeats exercised 2 regions on login, 45 after the authenticated
Server Component render, 32 after client navigation to search, and 21 after a
mobile resize, with no page errors. The
social application exercised 22 regions at the root, 27 after search navigation,
and 17 after mobile resize. Its application server reports missing-database and
Next development performance-measure errors independently of the inspector, so
that target validates the rendered application shell rather than its complete
data flows.

The real-app pass also exposed an overlay-noise failure: small server-descendant
leaves produced dozens of low-value dots on icon-heavy pages. Boundary mode now
suppresses compact `server-subtree` leaves while retaining compact
`client-boundary` and `server-slot` markers, because those two represent actual
environment transitions.
