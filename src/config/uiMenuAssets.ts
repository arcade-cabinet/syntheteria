import loadGameButton from "../../assets/ui/buttons/load_game.webp";
import newGameButton from "../../assets/ui/buttons/new_game.webp";
import settingsButton from "../../assets/ui/buttons/settings.webp";
import type { AssetModule } from "./assetUri";

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
