export interface ReactDevToolsHook {
  readonly renderers: ReadonlyMap<number, unknown>
  readonly getFiberRoots: (rendererId: number) => ReadonlySet<unknown>
  onCommitFiberRoot: (
    rendererId: number,
    root: unknown,
    priorityLevel?: number,
    didError?: boolean,
  ) => void
}

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook
  }
}
