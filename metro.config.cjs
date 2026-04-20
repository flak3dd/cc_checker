const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');

// Add alias support from tsconfig.json paths
config.resolver.alias = {
  '@': path.resolve(__dirname, './src/mobile'),
  '@server': path.resolve(__dirname, './src/server'),
  '@automation': path.resolve(__dirname, './src/automation'),
};

module.exports = config;
