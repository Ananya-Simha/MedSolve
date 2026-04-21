import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
    // 1. Use standard JavaScript rules
    js.configs.recommended,

    // 2. Turn off any ESLint rules that conflict with Prettier
    prettierConfig,

    // 3. Our custom project rules
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                process: 'readonly',
                console: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
        },
    },
];
