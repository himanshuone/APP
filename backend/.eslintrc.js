module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['node', 'prettier'],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prettier/prettier': 'error',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': ['error', {
      allowModules: ['supertest', 'jest']
    }],
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'node/no-unpublished-import': 'off',
      },
    },
  ],
};
