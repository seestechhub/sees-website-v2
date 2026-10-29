import path from "node:path";
import type { NextConfig } from "next";
const config: NextConfig = {
    poweredByHeader: false,
    serverExternalPackages: [],
    experimental: { serverActions: { bodySizeLimit: "1mb" } },
    webpack: (webpackConfig) => {
        webpackConfig.resolve.alias = {
            ...webpackConfig.resolve.alias,
            '@': path.resolve(__dirname, 'src'),
        };
        return webpackConfig;
    },
};
export default config;
