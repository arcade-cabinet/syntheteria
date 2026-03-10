const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Watch the parent syntheteria/ directory so Metro can resolve imports
// to ../../../config/ (the shared JSON config directory outside game/)
const monorepoRoot = path.resolve(__dirname, '..');
config.watchFolders = [monorepoRoot];

// Ensure node_modules resolution still starts from the game/ directory
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
