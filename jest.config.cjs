/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/src/**/*.test.ts"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
	moduleNameMapper: {
		"\\.(png|jpg|jpeg|webp|glb|gltf|bin)$":
			"<rootDir>/src/testing/fileAssetMock.js",
	},
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
