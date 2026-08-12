import * as Schema from "effect/Schema"

export class TopologyUnavailable extends Schema.TaggedError<TopologyUnavailable>()(
  "TopologyUnavailable",
  {
    reason: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

export class RegionResolutionError extends Schema.TaggedError<RegionResolutionError>()(
  "RegionResolutionError",
  {
    componentId: Schema.optional(Schema.String),
    reason: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

export class OverlayMountError extends Schema.TaggedError<OverlayMountError>()(
  "OverlayMountError",
  {
    reason: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

export class OverlayRenderError extends Schema.TaggedError<OverlayRenderError>()(
  "OverlayRenderError",
  {
    reason: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {}

export class InspectorInstallError extends Schema.TaggedError<InspectorInstallError>()(
  "InspectorInstallError",
  {
    stage: Schema.Literals(["inspection", "presentation", "runtime"]),
    cause: Schema.Unknown,
  },
) {}
