const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@std/testing/mock': false,
            '@std/testing/bdd': false,
            '@gadicc/fetch-mock-cache/runtimes/deno.ts': false,
            '@gadicc/fetch-mock-cache/stores/fs.ts': false,
        };

        config.module.rules.push({
            test: /yahoo-finance2.*\/tests\//,
            use: 'null-loader',
        });

        return config;
    },
};

export default nextConfig;
