/**
 * initWorldFromBoard — populate a Koota world from a generated board.
 *
 * Creates:
 *  - Board singleton entity
 *  - One Tile + TileHighlight + TileFloor entity per board tile
 *  - All faction entities
 *  - All robots from placement flags
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../board/types";
import type {
	ClimateProfile,
	Difficulty,
	FactionSlot,
	StormProfile,
} from "../world/config";
import { initFactions } from "./factions/init";
import {
	buildPlacementFlags,
	computeSpawnCenters,
	placeRobots,
	type SimpleBoardInfo,
} from "./robots/placement";
import { placeStarterBuildings } from "./systems/buildingPlacement";
import { revealFog } from "./systems/fogRevealSystem";
import { runPowerGrid } from "./systems/powerSystem";
import { placeSalvageProps } from "./systems/salvagePlacement";
import { TileFloor, tileFloorProps } from "./terrain";
import { Board } from "./traits/board";
import { ResourceDeposit } from "./traits/resource";
import { Tile, TileHighlight } from "./traits/tile";
import { UnitPos, UnitStats } from "./traits/unit";

export interface InitOptions {
	climateProfile?: ClimateProfile;
	stormProfile?: StormProfile;
	difficulty?: Difficulty;
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
		}),
	);

	// Tile entities
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]![x]!;
			const floorType = tile.floorType;
			world.spawn(
				Tile({
					x: tile.x,
					z: tile.z,
					elevation: tile.elevation,
					passable: tile.passable,
				}),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
				TileFloor(tileFloorProps(floorType, tile.x, tile.z)),
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
		getFloorType: (x, z) => board.tiles[z]?.[x]?.floorType,
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
			revealFog(world, pos.tileX, pos.tileZ, stats.scanRange);
		}
	}
}
