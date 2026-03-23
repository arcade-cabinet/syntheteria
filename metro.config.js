const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add support for importing 3D models and SQLite wasm files
config.resolver.assetExts = Array.from(
	new Set([
		...(config.resolver.assetExts || []),
		"wasm",
		"glb",
		"gltf",
		"bin",
		"png",
		"jpg",
		"jpeg",
		"webp",
	]),
);
config.resolver.sourceExts = (config.resolver.sourceExts || []).filter(
	(ext) => ext !== "wasm",
);

// Exclude playwright from metro
config.resolver.blockList = [
	...(Array.isArray(config.resolver.blockList)
		? config.resolver.blockList
		: []),
	/node_modules\/@playwright\/.*/,
	/node_modules\/playwright\/.*/,
	/node_modules\/playwright-core\/.*/,
];

const finalConfig = withNativeWind(config, {
	input: "./global.css",
	inlineRem: 16,
});

const tslibCJS = path.resolve(__dirname, "node_modules/tslib/tslib.js");
const r3fWebEntry = path.resolve(
	__dirname,
	"node_modules/@react-three/fiber/dist/react-three-fiber.esm.js",
);

const _nativeWindResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
	if (moduleName === "tslib") {
		return { filePath: tslibCJS, type: "sourceFile" };
	}
	// Redirect @react-three/fiber to its web entry on web platform
	if (moduleName === "@react-three/fiber" && platform === "web") {
		return { filePath: r3fWebEntry, type: "sourceFile" };
	}
	if (_nativeWindResolveRequest) {
		return _nativeWindResolveRequest(context, moduleName, platform);
	}
	return context.resolveRequest(context, moduleName, platform);
};

// Enable cross-origin isolation for expo-sqlite OPFS backend (SharedArrayBuffer + Atomics.wait)
// Required for web platform — browsers block SharedArrayBuffer without COEP/COOP headers.
// This middleware handles the dev server; app.json expo-router plugin handles static export;
// assets/coi-serviceworker.js (repo root assets/, no public/) handles GitHub Pages (which can't set custom response headers).
finalConfig.server = {
	...finalConfig.server,
	enhanceMiddleware: (middleware) => {
		return (req, res, next) => {
			res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
			res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
			middleware(req, res, next);
		};
	},
};

module.exports = finalConfig;
