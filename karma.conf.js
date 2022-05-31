const puppeteer = require('puppeteer');

process.env.CHROME_BIN = puppeteer.executablePath();

const webpackConfig = require("./webpack.config.js").createTestConfig();

delete webpackConfig.entry;

module.exports = function (config) {
    config.set({
        frameworks: ['webpack', "mocha", "chai"],
        browsers: ['ChromeHeadlessNoSandbox'],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox']
            }
        },
        files: [
            { pattern: 'dist/**/*.js.map', included: false },
            { pattern: 'src/*-test.js', watched: false },
            { pattern: 'src/**/*-test.js', watched: false },
            { pattern: 'src/*-test.ts', watched: false },
            { pattern: 'src/**/*-test.ts', watched: false },
        ],
        preprocessors: {
            'src/*-test.js': ['webpack', 'sourcemap'],
            'src/**/*-test.js': ['webpack', 'sourcemap'],
            'src/*-test.ts': ['webpack', 'sourcemap'],
            'src/**/*-test.ts': ['webpack', 'sourcemap'],
        },
        webpack: webpackConfig,
        plugins: ["karma-chrome-launcher", 'karma-webpack', 'karma-mocha', "karma-chai", "karma-sourcemap-loader"],
    });
};