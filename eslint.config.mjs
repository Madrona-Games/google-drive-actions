import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import unicorn from 'eslint-plugin-unicorn';
import github from 'eslint-plugin-github';

const githubFlatConfigs = github.getFlatConfigs();

export default defineConfig([
  globalIgnores(['lib/', 'dist/', 'node_modules/']),

  // Base config for all files
  {
    extends: [
      ...tseslint.configs.recommended,
      unicorn.configs.recommended,
      eslintPluginPrettierRecommended,

      // GitHub plugin recommended rules
      githubFlatConfigs.recommended,
      ...githubFlatConfigs.typescript,
    ],
  },

  // Main config for all TS files
  {
    files: ['**/*.ts'],
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Error out for code formatting errors
      'prettier/prettier': 'error',

      // Namespaces are sometimes needed
      'import/no-namespace': 'off',

      // Properly format comments
      'spaced-comment': ['error', 'always'],
      'lines-around-comment': [
        'error',
        {
          beforeBlockComment: true,
          beforeLineComment: true,
          allowBlockStart: true,
          allowObjectStart: true,
          allowArrayStart: true,
          allowClassStart: true,
          ignorePattern: 'pragma|ts-ignore',
        },
      ],

      // Mandatory spacing
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
        {
          blankLine: 'always',
          prev: 'directive',
          next: '*',
        },
        {
          blankLine: 'any',
          prev: 'directive',
          next: 'directive',
        },
      ],

      // Enforce camelCase
      camelcase: 'error',

      // Allow forOfStatements
      'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],

      // Continue is viable in forOf loops in generators
      'no-continue': 'off',

      // From experience, named exports are almost always desired
      'import/prefer-default-export': 'off',

      // For this project only use kebab-case
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            kebabCase: true,
          },
        },
      ],

      // Don't force renaming abbreviations like utils -> utilities
      'unicorn/prevent-abbreviations': 'off',

      'i18n-text/no-en': 'off',
    },
  },
]);
