export const overlayStyles = `
  :host { all: initial; }
  #rsc-inspector-canvas {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    pointer-events: none;
    font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .rsc-inspector-region {
    position: fixed;
    box-sizing: border-box;
    border: 2px dotted var(--rsc-color);
    border-radius: 5px;
    background: transparent;
  }
  .rsc-inspector-region[data-selected="true"] {
    outline: 1px solid color-mix(in srgb, var(--rsc-color) 45%, transparent);
    outline-offset: 2px;
  }
  .rsc-inspector-region[data-compact="true"] {
    width: 12px !important;
    height: 12px !important;
    border-radius: 999px;
    pointer-events: auto;
  }
  .rsc-inspector-label {
    position: absolute;
    left: 8px;
    top: -8px;
    z-index: 1;
    max-width: calc(100% - 12px);
    overflow: hidden;
    padding: 2px 8px;
    border: 1px solid var(--rsc-color);
    border-radius: 4px;
    color: var(--rsc-color);
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    font: 400 12px/16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    text-transform: lowercase;
    white-space: nowrap;
    text-overflow: ellipsis;
    pointer-events: auto;
    cursor: pointer;
  }
  @media (prefers-color-scheme: dark) {
    .rsc-inspector-label { background: rgba(0, 0, 0, 0.72); }
  }
  #rsc-inspector-toggle {
    position: fixed;
    right: 24px;
    bottom: 16px;
    z-index: 2147483647;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border: 1px solid rgba(15, 23, 42, 0.14);
    border-radius: 7px;
    color: #334155;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14);
    font: 600 11px/1 ui-sans-serif, system-ui, sans-serif;
    letter-spacing: 0.02em;
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  #rsc-inspector-toggle::before {
    width: 8px;
    height: 8px;
    box-sizing: border-box;
    border: 2px dotted #64748b;
    border-radius: 2px;
    content: "";
  }
  #rsc-inspector-toggle:hover { background: #fff; }
  #rsc-inspector-toggle[aria-pressed="true"] {
    border-color: rgba(59, 130, 246, 0.45);
    color: #1d4ed8;
  }
  #rsc-inspector-toggle[aria-pressed="true"]::before {
    border-color: #3b82f6;
  }
`
