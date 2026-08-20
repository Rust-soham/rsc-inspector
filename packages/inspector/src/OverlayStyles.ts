export const overlayStyles = `
  :host { all: initial; }
  #rsc-inspector-canvas {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    pointer-events: none;
    font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  .rsc-inspector-region {
    position: fixed;
    box-sizing: border-box;
    border: 0;
    border-radius: 6px;
    background: transparent;
    box-shadow: inset 0 0 0 2px var(--rsc-color);
  }
  .rsc-inspector-region[data-selected="true"] {
    box-shadow:
      inset 0 0 0 2px var(--rsc-color),
      0 0 0 3px color-mix(in srgb, var(--rsc-color) 24%, transparent);
  }
  .rsc-inspector-region[data-presentation="compact"] {
    border: 2px dotted var(--rsc-color);
    background: transparent;
    box-shadow: none;
    pointer-events: none;
  }
  .rsc-inspector-label {
    position: absolute;
    left: 8px;
    top: 0;
    transform: translateY(-100%);
    z-index: 1;
    max-width: calc(100% - 16px);
    overflow: hidden;
    padding: 1px 6px;
    border: 0;
    border-radius: 4px 4px 0 0;
    color: #fff;
    background: color-mix(in srgb, var(--rsc-color) 72%, transparent);
    box-shadow: none;
    font: 600 10px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    white-space: nowrap;
    text-overflow: ellipsis;
    pointer-events: auto;
    cursor: pointer;
    backdrop-filter: blur(4px);
  }
  .rsc-inspector-label:hover { filter: brightness(1.08); }
  .rsc-inspector-label:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 1px;
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
