/**
 * Game speed definitions — controls pacing for all time-dependent systems.
 *
 * Quick:    32×32, 100 turns — fast matches for testing or casual play
 * Standard: 44×44, 200 turns — balanced campaign
 * Epic:     64×64, 400 turns — extended campaign with larger map
 * Marathon:  96×96, 1000 turns — maximum length, strategic depth
 */

export type GameSpeed = "quick" | "standard" | "epic" | "marathon";

export interface SpeedConfig {
	readonly label: string;
	readonly turnCap: number;
	readonly epochTurns: readonly [number, number, number, number];
	readonly buildTimeMultiplier: number;
	readonly upgradeTimeMultiplier: number;
	readonly boardSize: { readonly width: number; readonly height: number };
	readonly startingResources: number;
	readonly victoryScaleMultiplier: number;
}

export const GAME_SPEEDS: Record<GameSpeed, SpeedConfig> = {
	quick: {
		label: "Quick",
		turnCap: 100,
		epochTurns: [5, 15, 30, 50],
		buildTimeMultiplier: 0.5,
		upgradeTimeMultiplier: 0.5,
		boardSize: { width: 32, height: 32 },
		startingResources: 1.5,
		victoryScaleMultiplier: 0.7,
	},
	standard: {
		label: "Standard",
		turnCap: 200,
		epochTurns: [10, 30, 60, 100],
		buildTimeMultiplier: 1.0,
		upgradeTimeMultiplier: 1.0,
		boardSize: { width: 44, height: 44 },
		startingResources: 1.0,
		victoryScaleMultiplier: 1.0,
	},
	epic: {
		label: "Epic",
		turnCap: 400,
		epochTurns: [20, 60, 120, 200],
		buildTimeMultiplier: 1.5,
		upgradeTimeMultiplier: 1.5,
		boardSize: { width: 64, height: 64 },
		startingResources: 0.8,
		victoryScaleMultiplier: 1.3,
	},
	marathon: {
		label: "Marathon",
		turnCap: 1000,
		epochTurns: [50, 150, 300, 500],
		buildTimeMultiplier: 2.0,
		upgradeTimeMultiplier: 2.0,
		boardSize: { width: 96, height: 96 },
		startingResources: 0.6,
		victoryScaleMultiplier: 1.5,
	},
};

export function getSpeedConfig(speed: GameSpeed): SpeedConfig {
	return GAME_SPEEDS[speed];
}
