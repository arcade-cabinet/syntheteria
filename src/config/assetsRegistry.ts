/**
 * Central assets registry — single entry point for all app asset resolution.
 *
 * - All assets live at repo ROOT under `assets/` (no `public/` directory).
 * - Resolution uses expo-asset via `resolveAssetUri()` so Metro numeric module IDs
 *   and string paths work on both native and web.
 * - Registries: modelAssets, uiBrandAssets, uiMenuAssets, floorTextureAssets (and
 *   floorTextures.json), plus city model manifest and JSON-driven configs.
 *
 * Import from here or from the specific registry; always resolve at use site via
 * resolveAssetUri(asset).
 */

export type { AssetModule } from "./assetUri";
export { resolveAssetUri } from "./assetUri";
export type { FloorTextureSet, FloorZoneId } from "./floorTextureAssets";
export {
	floorTextureAssets,
	floorZoneIds,
	getFloorTextureSet,
} from "./floorTextureAssets";
// Floor textures: config is JSON; actual asset refs are in floorTextureAssets.ts
export { default as floorTexturesConfig } from "./floorTextures.json";
export { modelAssets } from "./modelAssets";
export {
	type UiAtlasDefinition,
	type UiBrandRegionId,
	uiBrandAssets,
} from "./uiBrandAssets";
export {
	type MenuButtonAsset,
	type MenuButtonId,
	uiMenuAssets,
} from "./uiMenuAssets";
