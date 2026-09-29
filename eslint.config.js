const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'coverage/', 'android/', 'ios/'],
  },
  {
    rules: {
      'import/no-unresolved': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'unicode-bom': 'off',
      'import/first': 'off',
    },
  },
]);
