/**
 * Stub for expo-asset in Playwright CT (Vite) builds.
 * CT tests don't need real asset loading for image/texture assets.
 */
export const Asset = {
	loadAsync: async () => ({}),
	downloadAsync: async () => ({}),
};
export default Asset;
