const path = require("path");

function createConfig(env, config, modifier) {
    const mode = config.mode;

    const mainConfigBase = {
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
        resolve: {
            fallback: {
                fs: false,
                path: false,
                util: false,
                crypto: require.resolve("crypto-browserify"),
                stream: require.resolve("stream-browserify"),
                //xyz: path.resolve(__dirname, 'path/to/file.js'), // include a polyfill for xyz
            },
            extensions: ['.tsx', '.ts', '.js'],
        },
    };

    return modifier(mainConfigBase);
}

module.exports = function (env, config) {

    var result = [];
    result.push(createConfig(env, config, base => Object.assign({}, base, {
        output: {
            filename: "index.web.js",
            library: {
                type: "commonjs2",
            }
        }, target: "web",
    })));
    result.push(createConfig(env, config, base => Object.assign({}, base, {
        output: {
            filename: "index.node.js",
            library: {
                type: "commonjs2",
            }
        }, target: "node16",
    })));

    return result;
}

const os = require("os");

module.exports.createTestConfig = function () {
    return createConfig(undefined, { mode: "development" }, base =>
        Object.assign({}, base, {
            devtool: 'inline-source-map',
            // output: {
            //     path: path.join(os.tmpdir(), '_karma_webpack_') + Math.floor(Math.random() * 1000000),
            //     filename: "index.test.js",
            //     library: {
            //         type: "module",
            //     }
            // },
            target: "web",
            stats: {
                modules: false,
                colors: true,
            },
            watch: false,
            optimization: {
                runtimeChunk: 'single',
                splitChunks: {
                    chunks: 'all',
                    minSize: 0,
                    cacheGroups: {
                        commons: {
                            name: 'commons',
                            chunks: 'initial',
                            minChunks: 1,
                        },
                    },
                },
            }
        }));
}