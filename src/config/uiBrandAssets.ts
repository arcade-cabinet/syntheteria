import backgroundImage from "../../assets/ui/background.png?url";
import logosAtlas from "../../assets/ui/logos.png?url";
import brandMarkImage from "../../assets/ui/mark.png?url";
import type { AssetModule } from "./assetUri";

export interface AtlasRegion {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface UiAtlasDefinition {
	id: string;
	imageAsset: AssetModule;
	imageWidth: number;
	imageHeight: number;
	regions: AtlasRegion[];
}

const LOGO_CELL_WIDTH = 768;
const LOGO_CELL_HEIGHT = 512;

export const uiBrandAssets = {
	background: {
		id: "background",
		imageAsset: backgroundImage,
		width: 1536,
		height: 1024,
	},
	mark: {
		id: "mark",
		imageAsset: brandMarkImage,
		width: 1536,
		height: 1024,
	},
	logos: {
		id: "logos",
		imageAsset: logosAtlas,
		imageWidth: 1536,
		imageHeight: 1024,
		regions: [
			{
				id: "brand_mark",
				x: 0,
				y: 0,
				width: LOGO_CELL_WIDTH,
				height: LOGO_CELL_HEIGHT,
			},
			{
				id: "wordmark",
				x: LOGO_CELL_WIDTH,
				y: 0,
				width: LOGO_CELL_WIDTH,
				height: LOGO_CELL_HEIGHT,
			},
			{
				id: "lockup",
				x: 0,
				y: LOGO_CELL_HEIGHT,
				width: LOGO_CELL_WIDTH,
				height: LOGO_CELL_HEIGHT,
			},
			{
				id: "app_icon",
				x: LOGO_CELL_WIDTH,
				y: LOGO_CELL_HEIGHT,
				width: LOGO_CELL_WIDTH,
				height: LOGO_CELL_HEIGHT,
			},
		],
	} satisfies UiAtlasDefinition,
} as const;

export type UiBrandRegionId =
	(typeof uiBrandAssets.logos.regions)[number]["id"];

export function getUiBrandRegion(regionId: UiBrandRegionId) {
	const region = uiBrandAssets.logos.regions.find(
		(candidate) => candidate.id === regionId,
	);

	if (!region) {
		throw new Error(`Unknown UI brand region "${regionId}".`);
	}

	return region;
}
