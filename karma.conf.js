const puppeteer = require('puppeteer');

process.env.CHROME_BIN = puppeteer.executablePath();

const webpackConfig = require("./webpack.config.js")(undefined, { mode: "development" })[0];

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
            { pattern: '**/*.js.map', included: false },
            { pattern: 'src/*-test.js', watched: false },
            { pattern: 'src/**/*-test.js', watched: false },
            { pattern: 'src/*-test.ts', watched: false },
            { pattern: 'src/**/*-test.ts', watched: false },
        ],
        preprocessors: {
            'src/*-test.js': ['webpack'],
            'src/**/*-test.js': ['webpack'],
            'src/*-test.ts': ['webpack'],
            'src/**/*-test.ts': ['webpack'],
        },
        webpack: webpackConfig,
        plugins: ["karma-chrome-launcher", 'karma-webpack', 'karma-mocha', "karma-chai"],
    });
};