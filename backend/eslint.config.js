const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                process: "readonly",
                console: "readonly",
                module: "readonly",
                require: "readonly",
                __dirname: "readonly",
                Buffer: "readonly",
                setTimeout: "readonly",
                fetch: "readonly"
            }
        },
        rules: {
            "no-eval": "error",
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];
