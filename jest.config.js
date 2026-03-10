/** @type {import('jest').Config} */
module.exports = {
	testEnvironment: "node",
	testMatch: ["**/src/**/__tests__/**/*.test.{ts,tsx}"],
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.test.json",
			},
		],
	},
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
