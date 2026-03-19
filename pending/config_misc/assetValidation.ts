/**
 * @module assetValidation
 *
 * Startup check that validates all config-referenced assets are resolvable
 * before world generation begins. If ANY asset fails to resolve, throws a
 * single error listing ALL missing/broken assets so the developer can fix
 * them in one pass instead of playing whack-a-mole.
 *
 * Controlled by the `skipAssetValidation` flag — enabled by default,
 * can be disabled for hot-reload development workflows.
 */

import { type AssetModule, resolveAssetUri } from "./assetUri";
import floorTexturesConfig from "./floorTextures.json";
import { modelAssets } from "./modelAssets";
import { uiBrandAssets } from "./uiBrandAssets";
import { uiMenuAssets } from "./uiMenuAssets";
import unitsConfig from "./units.json";

// ─── Config flag ─────────────────────────────────────────────────────────────
let _skipValidation = false;

export function setSkipAssetValidation(skip: boolean): void {
	_skipValidation = skip;
}

export function getSkipAssetValidation(): boolean {
	return _skipValidation;
}

// ─── Extraction helpers ──────────────────────────────────────────────────────

interface AssetEntry {
	source: string;
	asset: AssetModule;
}

/**
 * Walk an arbitrary JSON value and collect every string that looks like a
 * file-asset path (has a recognizable asset extension).
 */
const ASSET_EXTENSION_RE = /\.(glb|gltf|png|jpg|jpeg|webp|svg|mp3|ogg|wav)$/i;

function collectJsonAssetPaths(
	value: unknown,
	sourceLabel: string,
	keyPath: string = "",
): AssetEntry[] {
	const results: AssetEntry[] = [];

	if (typeof value === "string" && ASSET_EXTENSION_RE.test(value)) {
		results.push({
			source: `${sourceLabel}${keyPath}`,
			asset: value,
		});
	} else if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			results.push(
				...collectJsonAssetPaths(value[i], sourceLabel, `${keyPath}[${i}]`),
			);
		}
	} else if (value !== null && typeof value === "object") {
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			results.push(...collectJsonAssetPaths(v, sourceLabel, `${keyPath}.${k}`));
		}
	}

	return results;
}

/**
 * Gather every asset reference from all known config sources.
 */
export function collectAllAssetEntries(): AssetEntry[] {
	const entries: AssetEntry[] = [];

	// 1. Model assets registry
	for (const [key, asset] of Object.entries(modelAssets)) {
		entries.push({ source: `modelAssets["${key}"]`, asset });
	}

	// 2. UI menu button assets
	for (const [buttonId, def] of Object.entries(uiMenuAssets)) {
		entries.push({
			source: `uiMenuAssets["${buttonId}"].imageAsset`,
			asset: def.imageAsset,
		});
	}

	// 3. UI brand assets
	entries.push({
		source: "uiBrandAssets.background.imageAsset",
		asset: uiBrandAssets.background.imageAsset,
	});
	entries.push({
		source: "uiBrandAssets.mark.imageAsset",
		asset: uiBrandAssets.mark.imageAsset,
	});
	entries.push({
		source: "uiBrandAssets.logos.imageAsset",
		asset: uiBrandAssets.logos.imageAsset,
	});

	// 4. Floor texture paths from JSON config
	entries.push(
		...collectJsonAssetPaths(floorTexturesConfig, "floorTextures.json"),
	);

	// 5. Unit model cross-reference — every units.json model key must exist in modelAssets
	const units = unitsConfig as Record<string, { model?: string }>;
	for (const [unitId, unitDef] of Object.entries(units)) {
		if (unitDef.model) {
			const resolved = modelAssets[unitDef.model];
			if (resolved !== undefined) {
				entries.push({
					source: `units.json["${unitId}"].model -> modelAssets["${unitDef.model}"]`,
					asset: resolved,
				});
			} else {
				// Push the raw model string so it will fail validation with a clear message
				entries.push({
					source: `units.json["${unitId}"].model (missing from modelAssets: "${unitDef.model}")`,
					asset: "" as AssetModule,
				});
			}
		}
	}

	return entries;
}

/**
 * Validate that every config-referenced asset can be resolved.
 * Throws a single Error listing ALL failures if any are found.
 *
 * Call this before world generation begins.
 */
export function validateAssetManifest(): void {
	if (_skipValidation) {
		return;
	}

	const entries = collectAllAssetEntries();
	const failures: string[] = [];

	for (const entry of entries) {
		try {
			resolveAssetUri(entry.asset);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			failures.push(`  ${entry.source}: ${message}`);
		}
	}

	if (failures.length > 0) {
		throw new Error(
			`Asset manifest validation failed — ${failures.length} asset(s) could not be resolved:\n${failures.join("\n")}`,
		);
	}
}
