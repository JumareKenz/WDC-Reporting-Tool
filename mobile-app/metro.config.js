const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper resolution for web
config.resolver.sourceExts = [
  'web.js',
  'web.jsx',
  'web.ts',
  'web.tsx',
  ...config.resolver.sourceExts,
];

module.exports = config;
