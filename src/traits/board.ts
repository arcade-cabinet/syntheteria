import { trait } from "koota";
import type { ClimateProfile, Difficulty, StormProfile } from "../world/config";

export const Board = trait({
	width: 0,
	height: 0,
	seed: "",
	tileSizeM: 2.0,
	turn: 1,
	climateProfile: "temperate" as ClimateProfile,
	stormProfile: "volatile" as StormProfile,
	difficulty: "standard" as Difficulty,
});
