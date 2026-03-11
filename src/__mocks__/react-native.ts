/**
 * Minimal react-native stub for Jest.
 *
 * react-native ships as an ESM package which Jest (running in CJS mode via
 * ts-jest + tsconfig.test.json) cannot parse. This stub provides just the
 * symbols used in production code so tests resolve without errors.
 *
 * Add entries here only as needed — keep this minimal.
 */

export const Platform = {
	OS: "web" as const,
	select: <T>(specifics: { web?: T; default?: T }): T | undefined =>
		specifics.web ?? specifics.default,
};

export default { Platform };
