import { Asset } from "expo-asset";

export type AssetModule = string | number;

/**
 * Resolve an asset module reference to a URI string.
 *
 * On native, Metro wraps image/model imports as numeric module IDs that need
 * expo-asset to resolve. On web, Metro may produce either a string URL or a
 * numeric ID depending on bundle configuration.
 *
 * This function MUST return a valid URI or throw — silent empty-string
 * fallbacks cause invisible floors and other rendering failures.
 */
export function resolveAssetUri(asset: AssetModule): string {
	if (typeof asset === "string") {
		if (asset.length === 0) {
			throw new Error(
				"resolveAssetUri received an empty string — asset import is misconfigured",
			);
		}
		return asset;
	}

	// Use expo-asset to resolve numeric module IDs (Metro's asset pipeline)
	const resolved = Asset.fromModule(asset);
	if (resolved.localUri) {
		return resolved.localUri;
	}
	if (resolved.uri) {
		return resolved.uri;
	}

	throw new Error(
		`resolveAssetUri: expo-asset could not resolve module ID ${asset}. ` +
			`Check that the file exists and is listed in metro.config.js assetExts.`,
	);
}
