import type { AssetModule } from "./assetUri";

// Public-dir assets — served at root path, use string constants (not ?url imports)
const loadGameButton: AssetModule = "/assets/ui/buttons/load_game.webp";
const newGameButton: AssetModule = "/assets/ui/buttons/new_game.webp";
const settingsButton: AssetModule = "/assets/ui/buttons/settings.webp";

export type MenuButtonId = "new_game" | "load_game" | "settings";

export interface MenuButtonAsset {
	id: MenuButtonId;
	imageAsset: AssetModule;
	width: number;
	height: number;
}

export const uiMenuAssets: Record<MenuButtonId, MenuButtonAsset> = {
	new_game: {
		id: "new_game",
		imageAsset: newGameButton,
		width: 768,
		height: 260,
	},
	load_game: {
		id: "load_game",
		imageAsset: loadGameButton,
		width: 768,
		height: 256,
	},
	settings: {
		id: "settings",
		imageAsset: settingsButton,
		width: 768,
		height: 256,
	},
};
