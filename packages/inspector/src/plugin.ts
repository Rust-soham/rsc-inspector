import * as Schema from "effect/Schema"

export const InspectorNextConfig = Schema.Struct({
  instrumentationClientInject: Schema.optionalKey(Schema.Array(Schema.String)),
})
export interface InspectorNextConfig
  extends Schema.Schema.Type<typeof InspectorNextConfig> {}

const clientEntry = "next-rsc-inspector/client"

type Instrumented<Config extends InspectorNextConfig> = Config & {
  readonly instrumentationClientInject: Array<string>
}

const appendClientEntry = <Config extends InspectorNextConfig>(
  nextConfig: Config,
): Instrumented<Config> => {
  const existing = nextConfig.instrumentationClientInject ?? []
  return {
    ...nextConfig,
    instrumentationClientInject: existing.includes(clientEntry)
      ? [...existing]
      : [...existing, clientEntry],
  }
}

export function withRscInspector<Config extends InspectorNextConfig>(
  nextConfig: Config,
): Instrumented<Config>
export function withRscInspector<
  Arguments extends Array<unknown>,
  Config extends InspectorNextConfig,
>(
  nextConfig: (...arguments_: Arguments) => Config | Promise<Config>,
): (...arguments_: Arguments) => Promise<Instrumented<Config>>
export function withRscInspector(
  nextConfig:
    | InspectorNextConfig
    | ((...arguments_: Array<unknown>) =>
        | InspectorNextConfig
        | Promise<InspectorNextConfig>),
):
  | Instrumented<InspectorNextConfig>
  | ((...arguments_: Array<unknown>) =>
      Promise<Instrumented<InspectorNextConfig>>) {
  if (typeof nextConfig !== "function") return appendClientEntry(nextConfig)
  return async (...arguments_) =>
    appendClientEntry(await nextConfig(...arguments_))
}
