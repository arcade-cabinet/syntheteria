export type AssetModule = string | number;

export function resolveAssetUri(asset: AssetModule) {
	const localRequire = (
		globalThis as typeof globalThis & {
			require?: (specifier: string) => {
				Asset: { fromModule: (mod: string | number) => { uri: string } };
			};
		}
	).require;

	try {
		if (typeof asset === "string") {
			return asset;
		}
		if (localRequire) {
			const resolvedUri = localRequire("expo-asset").Asset.fromModule(asset).uri;
			if (typeof resolvedUri === "string" && resolvedUri.length > 0) {
				return resolvedUri;
			}
		}
	} catch (_error) {
		// Fall through to direct string handling below.
	}

	if (typeof asset === "string") {
		return asset;
	}

	if (!localRequire) {
		throw new Error("Asset module resolution requires a module runtime.");
	}

	return localRequire("expo-asset").Asset.fromModule(asset).uri;
}
