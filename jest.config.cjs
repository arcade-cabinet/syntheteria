/** @type {import('jest').Config} */
module.exports = {
	projects: [
		{
			displayName: "unit",
			preset: "ts-jest",
			testEnvironment: "node",
			transform: {
				"^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
			},
			testMatch: ["**/src/**/*.test.ts", "**/src/**/*.test.tsx"],
			testPathIgnorePatterns: ["/node_modules/", "/src/ui/__tests__/"],
			moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
			moduleNameMapper: {
				"\\.(png|jpg|jpeg|webp|glb|gltf|bin)$":
					"<rootDir>/src/testing/fileAssetMock.js",
			},
			setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
		},
		{
			displayName: "ui",
			preset: "jest-expo",
			testMatch: ["**/src/ui/__tests__/**/*.test.tsx"],
			moduleNameMapper: {
				"\\.(png|jpg|jpeg|webp|glb|gltf|bin)$":
					"<rootDir>/src/testing/fileAssetMock.js",
			},
			setupFilesAfterEnv: ["<rootDir>/jest.setup.ui.ts"],
		},
	],
};
