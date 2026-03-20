/**
 * Model path validation test — verifies all model paths referenced in config
 * resolve to actual GLB files on disk.
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { BUILDING_DEFS } from "../config/buildings";
import {
	BIOME_SCATTER_MODELS,
	IMPROVEMENT_MODELS,
	RUIN_POI_MODELS,
} from "../config/models";
import { SALVAGE_DEFS } from "../config/resources";

const PUBLIC_DIR = resolve(__dirname, "../../public");

function assertModelExists(relPath: string, context: string) {
	const fullPath = resolve(PUBLIC_DIR, relPath.replace(/^\//, ""));
	expect(
		existsSync(fullPath),
		`${context}: missing model at ${relPath} (resolved: ${fullPath})`,
	).toBe(true);
}

describe("Model Path Validation", () => {
	it("all robot model paths resolve to existing GLB files", () => {
		const robotPaths: Record<string, string> = {
			scout: "assets/models/robots/factions/ReconBot.glb",
			infantry: "assets/models/robots/factions/FieldFighter.glb",
			cavalry: "assets/models/robots/factions/Arachnoid.glb",
			ranged: "assets/models/robots/factions/QuadrupedTank.glb",
			support: "assets/models/robots/factions/Companion-bot.glb",
			worker: "assets/models/robots/factions/MobileStorageBot.glb",
			cult_infantry: "assets/models/robots/cult/MechaTrooper.glb",
			cult_ranged: "assets/models/robots/cult/MechaGolem.glb",
			cult_cavalry: "assets/models/robots/cult/Mecha01.glb",
		};

		for (const [modelId, relPath] of Object.entries(robotPaths)) {
			assertModelExists(relPath, `Robot ${modelId}`);
		}
	});

	it("all building model paths resolve", () => {
		for (const [type, def] of Object.entries(BUILDING_DEFS)) {
			if (def.assetPath) {
				assertModelExists(`assets/models/${def.assetPath}`, `Building ${type}`);
			}
		}
	});

	it("all salvage model paths resolve", () => {
		const modelBase = "assets/models/";
		const salvageModelPaths: Record<string, string> = {
			props_chest: "city/Props_Chest.glb",
			props_container_full: "city/Props_ContainerFull.glb",
			props_crate: "city/Props_Crate.glb",
			props_crate_long: "city/Props_CrateLong.glb",
			props_base: "city/Props_Base.glb",
			props_capsule: "city/Props_Capsule.glb",
			props_computer: "city/Props_Computer.glb",
			props_computer_small: "city/Props_ComputerSmall.glb",
			props_pod: "city/Props_Pod.glb",
			props_statue: "city/Props_Statue.glb",
			props_teleporter_1: "city/Props_Teleporter_1.glb",
			props_teleporter_2: "city/Props_Teleporter_2.glb",
			props_laser: "city/Props_Laser.glb",
			barrel: "industrial/barrel.glb",
			barrel_01: "industrial/Barrel_01.glb",
			barrel_stove: "industrial/barrel_stove.glb",
			barrels: "industrial/barrels.glb",
			barrels_rail: "industrial/barrels_rail.glb",
			machine_barrel: "industrial/machine_barrel.glb",
			machine_barrel_large: "industrial/machine_barrelLarge.glb",
			robot_arm_a: "industrial/robot-arm-a.glb",
			robot_arm_b: "industrial/robot-arm-b.glb",
			conveyor: "industrial/conveyor.glb",
			conveyor_long: "industrial/conveyor-long.glb",
			conveyor_sides: "industrial/conveyor-sides.glb",
		};

		for (const [modelId, relPath] of Object.entries(salvageModelPaths)) {
			assertModelExists(`${modelBase}${relPath}`, `Salvage ${modelId}`);
		}
	});

	it("all ruin POI model paths resolve", () => {
		for (const [poiType, models] of Object.entries(RUIN_POI_MODELS)) {
			for (const modelPath of models) {
				assertModelExists(`assets/models/${modelPath}`, `Ruin POI ${poiType}`);
			}
		}
	});

	it("all biome scatter model paths resolve", () => {
		for (const [biome, models] of Object.entries(BIOME_SCATTER_MODELS)) {
			for (const modelPath of models) {
				assertModelExists(
					`assets/models/${modelPath}`,
					`Biome scatter ${biome}`,
				);
			}
		}
	});

	it("all improvement model paths resolve", () => {
		for (const [category, models] of Object.entries(IMPROVEMENT_MODELS)) {
			for (const modelPath of models) {
				assertModelExists(
					`assets/models/${modelPath}`,
					`Improvement ${category}`,
				);
			}
		}
	});
});
