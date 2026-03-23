/**
 * Stub for Vite build. Phase 5 uses public/ URLs; this keeps build from pulling in expo-asset.
 */
export const Asset = {
	fromModule: (moduleId: number) => ({
		uri: `/assets/placeholder-${moduleId}.glb`,
		downloadAsync: async () => {},
	}),
};
