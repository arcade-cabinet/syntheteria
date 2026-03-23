export type AssetModule = string | number;

export function resolveAssetUri(asset: AssetModule) {
	if (typeof asset === "string") {
		return asset;
	}

	const localRequire = globalThis.eval?.("require") as
		| ((specifier: string) => {
				Asset: { fromModule: (mod: number) => { uri: string } };
		  })
		| undefined;

	if (!localRequire) {
		throw new Error(
			"Asset module resolution requires expo-asset in this runtime.",
		);
	}

	return localRequire("expo-asset").Asset.fromModule(asset).uri;
}
