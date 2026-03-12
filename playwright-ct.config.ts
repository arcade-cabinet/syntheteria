import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/experimental-ct-react";

const GPU_ARGS = [
	"--no-sandbox",
	"--use-angle=gl",
	"--enable-webgl",
	"--ignore-gpu-blocklist",
	"--disable-background-timer-throttling",
	"--disable-backgrounding-occluded-windows",
	"--disable-renderer-backgrounding",
];

export default defineConfig({
	testDir: "./tests/components",
	timeout: 30_000,
	fullyParallel: true,
	use: {
		...devices["Desktop Chrome"],
		headless: true,
		launchOptions: {
			args: GPU_ARGS,
		},
		viewport: {
			width: 1280,
			height: 900,
		},
		ctPort: 3100,
		ctViteConfig: {
			assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.bin", "**/*.png"],
			resolve: {
				alias: [
					{
						find: "react-native/Libraries/Utilities/codegenNativeComponent",
						replacement: resolve(
							__dirname,
							"tests/components/mocks/codegenNativeComponent.ts",
						),
					},
					{
						find: "react-native-reanimated",
						replacement: resolve(
							__dirname,
							"tests/components/mocks/react-native-reanimated.ts",
						),
					},
					{
						find: "react-native",
						replacement: resolve(
							__dirname,
							"node_modules/react-native-web/dist/index.js",
						),
					},
				],
			},
			define: {
				__DEV__: "true",
				"process.env.NODE_ENV": '"development"',
			},
			optimizeDeps: {
				include: ["react-native-web"],
			},
		},
	},
});
