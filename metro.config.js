const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable watchman — falls back to fs polling. Avoids watchman recrawl
// issues when many projects share the same arcade-cabinet parent dir.
config.resolver.useWatchman = false;

// Ensure node_modules resolution still starts from the project directory
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Support WASM for Rapier physics
config.resolver.assetExts.push('wasm');

// Support GLB 3D model imports
config.resolver.assetExts.push('glb', 'gltf');

// Support JSON imports (already default, but explicit)
config.resolver.sourceExts.push('json');

module.exports = config;
