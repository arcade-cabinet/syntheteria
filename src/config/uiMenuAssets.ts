import loadGameButton from "../../assets/ui/buttons/load_game.png";
import newGameButton from "../../assets/ui/buttons/new_game.png";
import settingsButton from "../../assets/ui/buttons/settings.png";
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
		width: 1536,
		height: 1024,
	},
	load_game: {
		id: "load_game",
		imageAsset: loadGameButton,
		width: 1536,
		height: 1024,
	},
	settings: {
		id: "settings",
		imageAsset: settingsButton,
		width: 1536,
		height: 1024,
	},
};
