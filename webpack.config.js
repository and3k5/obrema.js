const path = require("path");

module.exports = function (env, config) {
    const mode = config.mode;

    const mainConfig = {
        mode: mode,
        devtool: mode === "development" ? "source-map" : undefined,
        entry: {
            main: "./src/index.ts",
        },
        infrastructureLogging: {
            level: 'verbose',
        },
        module: {
            rules: [
                {
                    test: /\.wasm$/,
                    type: "asset/resource",
                },
                {
                    resourceQuery: /raw/,
                    type: 'asset/source',
                },
                {
                    resourceQuery: /file/,
                    type: "asset/resource",
                },
                {
                    resourceQuery: /url/,
                    type: "asset/inline",
                },
                {
                    test: /\.tsx?$/,
                    include: path.resolve(__dirname, 'src'),
                    exclude: /(node_modules|bower_components)/,
                    use: 'ts-loader',
                },
                {
                    test: /\.m?js$/,
                    include: path.resolve(__dirname, 'src'),
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                            plugins: [
                                "@babel/plugin-transform-runtime"
                            ]
                        }
                    }
                }
            ]
        },
        output: {
            library: "main",
        },
        resolve: {
            fallback: {
                fs: false,
                path: false,
                util: false,
                crypto: "crypto-browserify",
                stream: "stream-browserify",
                //xyz: path.resolve(__dirname, 'path/to/file.js'), // include a polyfill for xyz
            },
            extensions: ['.tsx', '.ts', '.js'],
        },
    };

    return [
        mainConfig,
    ];
}