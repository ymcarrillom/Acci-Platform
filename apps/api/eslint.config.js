import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-undef': 'error',
      'prefer-const': 'warn',
      'eqeqeq': ['error', 'always'],
    },
  },
  // Scripts de CLI/seed pueden usar console (output intencional)
  {
    files: ['prisma/**', 'src/config/env.js'],
    rules: {
      'no-console': 'off',
    },
  },
  // Archivos de test — globals de Vitest
  {
    files: ['src/tests/**'],
    languageOptions: {
      globals: {
        ...globals.node,
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
      },
    },
  },
  {
    ignores: ['node_modules/**', 'prisma/migrations/**'],
  },
];
