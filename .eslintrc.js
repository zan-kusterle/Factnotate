module.exports = {
    root: true,
    env: {
        node: true,
    },
    parserOptions: {
        parser: 'babel-eslint',
    },
    plugins: [
        'css-modules',
    ],
    extends: [
        'eslint:recommended',
        'plugin:vue/recommended',
        'plugin:css-modules/recommended',
    ],
    rules: {
        // 'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'css-modules/no-unused-class': [2, { 'camelCase': true }],
        'css-modules/no-undef-class': [2, { 'camelCase': true }],
        'semi': ['error', 'never'],
        'no-multiple-empty-lines': ['error', { 'max': 1 } ],
        'eol-last': ['error', 'always'],
        'no-trailing-spaces': ['error'],
        'space-before-function-paren': ['error', 'always'],
        'indent': ['error', 4],
        'object-curly-spacing': ['error', 'always'],
        'keyword-spacing': 'error',
        'max-len': 0,
        'comma-dangle': ['error', 'always-multiline'],
        'space-before-blocks': 'error',
        'prefer-const': 'error',
        'vue/html-indent': [
            'error', 4,
            {
                'attribute': 1,
                'closeBracket': 0,
                'alignAttributesVertically': true,
                'ignores': [],
            },
        ],
        'vue/max-attributes-per-line': 0,
        'vue/html-self-closing': [
            'error',
            {
                'html': {
                    'void': 'any',
                    'normal': 'any',
                    'component': 'any',
                },
                'svg': 'any',
                'math': 'any',
            },
        ],
    },
}
