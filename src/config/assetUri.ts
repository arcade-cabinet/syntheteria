export type AssetModule = string | number;

/**
 * Resolve an asset module reference to a URI string.
 *
 * On native, Metro wraps image/model imports as numeric module IDs that need
 * expo-asset to resolve. On web, Metro *may* produce either a string URL or a
 * numeric ID depending on bundle configuration. When the expo-asset runtime is
 * unavailable (common on web), we fall back gracefully instead of crashing the
 * entire R3F Canvas.
 */
export function resolveAssetUri(asset: AssetModule): string {
	if (typeof asset === "string") {
		return asset;
	}

	// Try expo-asset resolution for numeric module IDs (native + some web configs)
	try {
		const localRequire = (
			globalThis as typeof globalThis & {
				require?: (specifier: string) => {
					Asset: { fromModule: (mod: string | number) => { uri: string } };
				};
			}
		).require;

		if (localRequire) {
			const resolvedUri = localRequire("expo-asset").Asset.fromModule(asset).uri;
			if (typeof resolvedUri === "string" && resolvedUri.length > 0) {
				return resolvedUri;
			}
		}
	} catch {
		// expo-asset not available or resolution failed — fall through to fallback
	}

	// On web without expo-asset, numeric IDs can't be resolved. Return empty
	// string so THREE.TextureLoader gets a no-op source rather than crashing
	// the Canvas. The floor renderer already handles missing textures with
	// fallback solid colors.
	return "";
}
