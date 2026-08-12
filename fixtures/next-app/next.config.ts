import type { NextConfig } from "next";
import { withRscInspector } from "next-rsc-inspector/plugin";

const config: NextConfig = {
  reactStrictMode: true,
};

export default withRscInspector(config);
