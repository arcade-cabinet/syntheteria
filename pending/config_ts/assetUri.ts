/**
 * Asset URI resolution for the Vite/Capacitor build.
 * All assets live in public/assets/ and are referenced by string paths (/assets/...).
 * Numeric Metro module IDs are not used in this build.
 */

export type AssetModule = string;

/**
 * Resolve an asset module reference to a URI string.
 * In Vite, assets are always string paths — this validates and returns them.
 */
export function resolveAssetUri(asset: AssetModule): string {
	if (typeof asset !== "string" || asset.length === 0) {
		throw new Error(
			`resolveAssetUri: expected a non-empty string path, got ${JSON.stringify(asset)}. ` +
				"All assets must be string paths in the Vite build (e.g. /assets/models/foo.glb).",
		);
	}
	return asset;
}
