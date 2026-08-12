# next-rsc-inspector

See the server/client composition boundaries in a running Next.js App Router
application. The inspector reads the development React tree, maps logical
components to their rendered DOM regions, and draws a lightweight overlay
without adding wrappers to application markup.

> Experimental: the React development tooling protocol is not a stable public
> API. The initial compatibility target is Next.js 16.3.x with React 19.

## Install

```bash
pnpm add -D next-rsc-inspector
```

## Configure

Wrap the existing Next.js config:

```ts
// next.config.ts
import type { NextConfig } from "next"
import { withRscInspector } from "next-rsc-inspector/plugin"

const nextConfig: NextConfig = {
  // your existing configuration
}

export default withRscInspector(nextConfig)
```

The plugin appends its browser bootstrap through Next.js 16.3's
`instrumentationClientInject` integration. It preserves existing injected
instrumentation and requires no component annotations or DOM wrappers.

Start the ordinary development server, then use the **Boundaries** control in
the lower-right corner or press `Alt + Shift + X`. Press `Escape` to close the
overlay.

## What is displayed

- Blue dotted regions mark Client Components entered from a Server Component.
- Red dotted regions mark server-rendered content passed through a Client
  Component.
- Cards appear only where the environment flips between server and client.
- Components sharing one DOM rectangle are collapsed into one region; clicking
  that region cycles the logical components at that position.

The overlay follows the component's DOM border box. CSS margins are therefore
outside the outline, exactly as they are outside `getBoundingClientRect()`.

## Current limitations

- Development mode only; no inspector runtime is started in production.
- React DevTools internals may require compatibility updates as React and Next
  evolve.
- Components without a host DOM region cannot be outlined.
- The first preview supports Next.js `>=16.3.0 <17`; Turbopack has real-app
  coverage and webpack has fixture-level coverage.

## Programmatic integration

For hosts that cannot use the Next.js config wrapper, import
`makeBrowserInspectorRuntime` from `next-rsc-inspector`, install it during
development before hydration, and dispose it during teardown.

## License

MIT
