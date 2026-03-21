/**
 * initWorldFromBoard — populate a Koota world from a generated board.
 *
 * Creates:
 *  - Board singleton entity
 *  - One Tile + TileHighlight + TileBiome entity per board tile
 *  - All faction entities
 *  - All robots from placement flags
 */

import type { World } from "koota";
import type { GeneratedBoard } from "./board";
import { initFactions } from "./factions";
import {
	buildPlacementFlags,
	computeSpawnCenters,
	placeRobots,
	type SimpleBoardInfo,
} from "./robots";
import {
	effectiveScanRange,
	placeSalvageProps,
	placeStarterBuildings,
	revealFog,
	runPowerGrid,
} from "./systems";
import { TileBiome, tileBiomeProps } from "./terrain";
import { Board } from "./traits/board";
import { ResourceDeposit } from "./traits/resource";
import { Tile, TileHighlight } from "./traits/tile";
import { UnitPos, UnitStats } from "./traits/unit";
import type {
	ClimateProfile,
	Difficulty,
	FactionSlot,
	GameSpeed,
	StormProfile,
} from "./world/config";

export interface InitOptions {
	climateProfile?: ClimateProfile;
	stormProfile?: StormProfile;
	difficulty?: Difficulty;
	gameSpeed?: GameSpeed;
	/** Faction slots from New Game config. Controls which factions are active and who is the player. */
	factionSlots?: FactionSlot[];
}

export function initWorldFromBoard(
	world: World,
	board: GeneratedBoard,
	opts: InitOptions = {},
): void {
	const { width, height, seed } = board.config;
	const climateProfile = opts.climateProfile ?? "temperate";
	const stormProfile = opts.stormProfile ?? "volatile";
	const difficulty = opts.difficulty ?? "standard";
	const gameSpeed = opts.gameSpeed ?? "standard";
	const factionSlots = opts.factionSlots;

	// Derive player and active faction info from slots
	const playerFactionId =
		factionSlots?.find((s) => s.role === "player")?.factionId ?? null;
	const activeFactionIds = factionSlots
		? factionSlots.filter((s) => s.role !== "off").map((s) => s.factionId)
		: ["reclaimers", "volt_collective", "signal_choir", "iron_creed"];

	// Board singleton
	world.spawn(
		Board({
			width,
			height,
			seed,
			tileSizeM: 2.0,
			turn: 1,
			climateProfile,
			stormProfile,
			difficulty,
			gameSpeed,
		}),
	);

	// Tile entities
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]![x]!;
			const biomeType = tile.biomeType;
			world.spawn(
				Tile({
					x: tile.x,
					z: tile.z,
					elevation: tile.elevation,
					passable: tile.passable,
				}),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
				TileBiome(tileBiomeProps(biomeType, tile.x, tile.z)),
			);

			if (tile.resourceMaterial !== null) {
				world.spawn(
					ResourceDeposit({
						tileX: tile.x,
						tileZ: tile.z,
						material: tile.resourceMaterial,
						amount: tile.resourceAmount,
						depleted: false,
					}),
				);
			}
		}
	}

	// Faction entities
	initFactions(world, difficulty, factionSlots);

	// Salvage props
	placeSalvageProps(world, board);

	// Compute terrain-affinity spawn centers
	const boardInfo: SimpleBoardInfo = {
		width,
		height,
		isPassable: (x, z) => board.tiles[z]?.[x]?.passable ?? false,
		getBiomeType: (x, z) => board.tiles[z]?.[x]?.biomeType,
	};
	computeSpawnCenters(boardInfo, playerFactionId, activeFactionIds);

	// Starter buildings for each faction
	placeStarterBuildings(world, board);

	// Robot placement
	const flags = buildPlacementFlags(playerFactionId, activeFactionIds);
	placeRobots(world, flags, boardInfo);

	// Initial power grid — transmitters power buildings at CYCLE 1
	runPowerGrid(world);

	// Initial fog reveal — each faction's units clear storm interference around spawn
	for (const entity of world.query(UnitPos, UnitStats)) {
		const pos = entity.get(UnitPos);
		const stats = entity.get(UnitStats);
		if (pos && stats) {
			const scanRange = effectiveScanRange(
				world,
				pos.tileX,
				pos.tileZ,
				stats.scanRange,
			);
			revealFog(world, pos.tileX, pos.tileZ, scanRange);
		}
	}
}
