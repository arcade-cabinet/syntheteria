import type { MenuButtonId } from "../config/uiMenuAssets";

export interface TitleMenuLayoutItem {
	id: MenuButtonId;
	label: string;
	meta: string;
}

export function getTitleMenuLayout(
	saveGameCount: number,
): TitleMenuLayoutItem[] {
	return saveGameCount > 0
		? [
				{
					id: "new_game",
					label: "New Game",
					meta: "generate persistent world",
				},
				{
					id: "load_game",
					label: "Continue",
					meta: "resume latest save",
				},
				{
					id: "settings",
					label: "Settings",
					meta: "display • audio • input",
				},
			]
		: [
				{
					id: "new_game",
					label: "New Game",
					meta: "generate persistent world",
				},
				{
					id: "settings",
					label: "Settings",
					meta: "display • audio • input",
				},
			];
}
