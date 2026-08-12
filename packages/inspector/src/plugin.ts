export interface InspectorNextConfig {
  readonly instrumentationClientInject?: Array<string>
}

const clientEntry = "next-rsc-inspector/client"

export const withRscInspector = <Config extends InspectorNextConfig>(
  nextConfig: Config,
): Config & { readonly instrumentationClientInject: Array<string> } => {
  const existing = nextConfig.instrumentationClientInject ?? []
  return {
    ...nextConfig,
    instrumentationClientInject: existing.includes(clientEntry)
      ? [...existing]
      : [...existing, clientEntry],
  }
}
