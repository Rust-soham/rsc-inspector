# Contributing

## Module map

The runtime is intentionally split into functional cores and browser lifecycle
adapters. Start in the module that owns the behavior you want to change.

| Module | Owns | Depends on |
| --- | --- | --- |
| `BoundaryInspector` | Top-level install workflow and scoped lifetime | Inspection and presentation |
| `ComponentInspection` | Joins topology and geometry into scene snapshots | Topology and regions |
| `InspectorPresentation` | Connects scenes, commands, and overlay rendering | Input and overlay surface |
| `BrowserReactComponentTopology` | React hook subscription and cleanup | Fiber topology and DOM fallback |
| `ReactFiberTopology` | Pure Fiber traversal, server-chain extraction, stable IDs, and host-root collection | React hook contract |
| `ReactFiberDom` | Private Fiber discovery from DOM and application-mutation filtering | Browser DOM |
| `ComponentRegions` | Rectangle measurement and resize/scroll invalidation | Topology host elements |
| `OverlayProjection` | Pure filtering, geometry grouping, transition preference, and cycling | Overlay policy |
| `OverlayPolicy` | Boundary visibility, transition meaning, framework filtering, and colors | Domain model |
| `OverlayDom` | Shadow DOM construction and scene rendering | Projection and styles |
| `BrowserOverlaySurface` | Scoped overlay acquisition and typed render failures | Overlay DOM |
| `BrowserInspectorInput` | Shortcut, toggle, selection commands, and listener cleanup | Browser events |
| `plugin` / `client` | Next.js config integration and development bootstrap | Public runtime |

## Change guide

- Change React interpretation in `ReactFiberTopology`, then verify the fixture's
  logical composition cases.
- Change DOM fallback behavior in `ReactFiberDom`; keep inspector-owned mutations
  excluded to prevent rebuild loops.
- Change which boundaries appear in `OverlayPolicy`.
- Change overlap and cycling behavior in `OverlayProjection`; add a unit test.
- Change markup in `OverlayDom` and visuals in `OverlayStyles`.
- Keep Effect adapters responsible for acquisition, subscriptions, typed errors,
  and cleanup. Keep deterministic transformations as ordinary functions.

## Verification

```bash
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

The default Playwright fixture uses Turbopack. Before publishing a change to
Next.js integration, also run the webpack smoke path described in the root
README and install the packed tarball into a separate Next.js application.
