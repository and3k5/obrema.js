module.exports = {
    root: true,
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: { "project": ["./tsconfig.json"] },
    plugins: [
        "unused-imports",
        "typescript"
    ],
    rules: {
        "no-unused-vars": 1,
        "no-duplicate-imports": 2,
        "unused-imports/no-unused-imports": 2,
        "no-trailing-spaces": 1,
        "indent": [1, 4],
        "@typescript-eslint/no-var-requires": 0
    },
    ignorePatterns: [
        ".eslintrc.js",
        "*-test.js",
        "*-test.ts",
        "src/**/spec.js",
        "src/**/*-spec.js",
        "src/**/spec.ts",
        "src/**/*-spec.ts",
        "src/**/test.js",
        "src/**/*-test.js",
        "src/**/test.ts",
        "src/**/*-test.ts"
    ],
    env: {
        browser: true,
        node: true,
    },
    overrides: [
        {
            files: ["*.ts"],
            rules: {
                "no-unused-vars": 0,
            }
        }
    ],
};