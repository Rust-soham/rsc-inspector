import * as Schema from "effect/Schema"

export const InspectorNextConfig = Schema.Struct({
  instrumentationClientInject: Schema.optionalKey(Schema.Array(Schema.String)),
})
export interface InspectorNextConfig
  extends Schema.Schema.Type<typeof InspectorNextConfig> {}

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
