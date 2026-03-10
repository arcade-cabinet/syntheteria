/**
 * Integration Test — Full Core Loop
 *
 * Exercises the entire Syntheteria core game loop using real system
 * functions (no mocks except physics callbacks which are no-ops).
 *
 * Loop: harvest ore → compress into cube → grab → place on grid →
 *       build wall → match blueprint → assemble machine → disassemble
 */

import { describe, it, expect, beforeEach } from "vitest";

// Ore spawning
import {
	spawnOreDeposit,
	getDeposit,
	resetDeposits,
} from "../systems/oreSpawner.ts";

// Harvesting
import {
	startHarvesting,
	updateHarvesting,
	stopHarvesting,
	getPowderStorage,
	_resetHarvestingState,
} from "../systems/harvesting.ts";

// Compression
import {
	startCompression,
	updateCompression,
	getCompressionProgress,
	isCompressing,
	_resetCompressionState,
	DEFAULT_COMPRESSION_CONFIGS,
	type CompressionResult,
} from "../systems/compression.ts";

// Grabber
import {
	grabCube,
	dropCube,
	getHeldCube,
	registerCube,
	getCube,
	_resetGrabberState,
} from "../systems/grabber.ts";

// Held cube sync
import {
	updateHeldCubePosition,
	getCarrySpeedMultiplier,
	type CameraState,
} from "../systems/heldCubeSync.ts";

// Cube placement
import {
	placeCube,
	removeCube,
	getOccupiedSlots,
	getCubeAt,
	checkStructuralIntegrity,
	_resetPlacementGrid,
} from "../systems/cubePlacement.ts";

// Cube stacking
import {
	getPlacementPreview,
	placeHeldCube,
} from "../systems/cubeStacking.ts";

// Grid snap
import {
	gridToWorld,
} from "../systems/gridSnap.ts";

// Wall builder
import {
	calculateWallLine,
	getWallCost,
} from "../systems/wallBuilder.ts";

// Wall placement
import {
	buildWall,
} from "../systems/wallPlacement.ts";

// Pattern matcher
import {
	matchBlueprint,
	type Blueprint,
} from "../systems/patternMatcher.ts";

// Machine assembly
import {
	assembleMachine,
	disassembleMachine,
	getMachine,
	_resetMachineState,
} from "../systems/machineAssembly.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Reset all module states between tests. */
function resetAll(): void {
	resetDeposits();
	_resetHarvestingState();
	_resetCompressionState();
	_resetGrabberState();
	_resetPlacementGrid();
	_resetMachineState();
}

/** Simulate harvesting until we have at least `amount` powder of the given type. */
function harvestUntilPowder(
	depositId: string,
	oreType: string,
	amount: number,
	playerPos: { x: number; y: number; z: number },
	depositPos: { x: number; y: number; z: number },
): void {
	startHarvesting(depositId, playerPos, () => depositPos, 10);

	let safety = 0;
	while ((getPowderStorage().get(oreType) ?? 0) < amount && safety < 10000) {
		updateHarvesting(0.1, playerPos, 10);
		safety++;
	}

	stopHarvesting();
}

/**
 * Run compression to completion using a powder storage Map.
 * Returns the produced cube result, or null if it fails to start.
 */
function compressToCompletion(
	material: string,
	powderStorage: Map<string, number>,
): CompressionResult | null {
	const config = DEFAULT_COMPRESSION_CONFIGS[material];
	if (!config) return null;

	const started = startCompression(material, powderStorage);
	if (!started) return null;

	let result: CompressionResult = { completed: false };
	let safety = 0;
	while (!result.completed && safety < 200) {
		result = updateCompression(config.compressionTime / 10);
		safety++;
	}
	return result;
}

/**
 * Register a cube in the grabber system and grab it near the player.
 */
function registerAndGrab(
	cubeId: string,
	material: string,
	cubePos: { x: number; y: number; z: number },
	playerPos: { x: number; y: number; z: number },
): boolean {
	registerCube({
		id: cubeId,
		position: cubePos,
		traits: ["Grabbable"],
		material,
	});
	return grabCube(cubeId, playerPos);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Core Loop Integration", () => {
	beforeEach(() => {
		resetAll();
	});

	// -----------------------------------------------------------------------
	// Full end-to-end loop
	// -----------------------------------------------------------------------

	it("full loop: harvest → compress → grab → place → wall → machine", () => {
		const playerPos = { x: 5, y: 0, z: 5 };
		const depositPos = { x: 5, y: 0, z: 5 };
		const ironConfig = DEFAULT_COMPRESSION_CONFIGS.scrap_iron;

		// === STEP 1: Spawn ore deposit ===
		const deposit = spawnOreDeposit({
			type: "scrap_iron",
			quantity: 5000,
			position: depositPos,
		});
		expect(deposit.id).toBeDefined();
		expect(deposit.type).toBe("scrap_iron");
		expect(deposit.quantity).toBe(5000);
		expect(getDeposit(deposit.id)).toBeDefined();

		// === STEP 2: Harvest until enough powder for multiple cubes ===
		const targetPowder = ironConfig.powderRequired * 4;
		harvestUntilPowder(deposit.id, "scrap_iron", targetPowder, playerPos, depositPos);

		const powder = getPowderStorage().get("scrap_iron") ?? 0;
		expect(powder).toBeGreaterThanOrEqual(targetPowder);

		// === STEP 3: Compress into cubes ===
		const cubes: Array<{ id: string; material: string; position: { x: number; y: number; z: number } }> = [];
		for (let i = 0; i < 4; i++) {
			const ejectPos = { x: playerPos.x + i * 0.3, y: 0.25, z: playerPos.z };
			const result = compressToCompletion("scrap_iron", getPowderStorage());
			expect(result).not.toBeNull();
			expect(result!.completed).toBe(true);
			expect(result!.cube).toBeDefined();
			expect(result!.cube!.material).toBe("scrap_iron");
			expect(result!.cube!.size).toBe(0.5);
			cubes.push({ ...result!.cube!, position: ejectPos });
		}
		expect(cubes).toHaveLength(4);

		// === STEP 4: Grab first cube and verify held state ===
		const grabbed = registerAndGrab(cubes[0].id, "scrap_iron", cubes[0].position, playerPos);
		expect(grabbed).toBe(true);
		expect(getHeldCube()).toBe(cubes[0].id);

		// Verify carry speed multiplier
		const speedMult = getCarrySpeedMultiplier(true);
		expect(speedMult).toBeLessThan(1.0);
		expect(speedMult).toBeGreaterThan(0);

		// Verify held cube position sync via callback API
		const camera: CameraState = {
			position: playerPos,
			forward: { x: 0, y: 0, z: -1 },
		};
		let capturedPos: { x: number; y: number; z: number } | null = null;
		updateHeldCubePosition(
			camera,
			() => cubes[0].id,
			(_id, pos) => { capturedPos = pos; },
		);
		expect(capturedPos).not.toBeNull();
		expect(capturedPos!.y).toBeLessThan(playerPos.y); // Below eye level

		// === STEP 5: Place first cube on grid ===
		const groundHit = {
			point: { x: 0, y: 0, z: 0 },
			normal: { x: 0, y: 1, z: 0 },
		};
		const preview1 = getPlacementPreview(groundHit, getOccupiedSlots());
		expect(preview1).not.toBeNull();
		expect(preview1!.valid).toBe(true);
		expect(preview1!.coord.y).toBe(0); // Ground level

		const placed1 = placeHeldCube(
			preview1!,
			getHeldCube,
			(pos) => dropCube(pos),
			placeCube,
			getCube,
		);
		expect(placed1).toBe(true);
		expect(getHeldCube()).toBeNull(); // Hands empty after placing
		expect(getCubeAt(preview1!.coord)).toBeDefined();
		expect(getCubeAt(preview1!.coord)!.material).toBe("scrap_iron");

		// === STEP 6: Place remaining 3 cubes in a line for wall ===
		for (let i = 1; i < 4; i++) {
			const cubeData = cubes[i];
			registerAndGrab(cubeData.id, "scrap_iron", cubeData.position, playerPos);
			expect(getHeldCube()).toBe(cubeData.id);

			const coord = { x: i, y: 0, z: 0 };
			const worldPos = gridToWorld(coord);
			const hit = {
				point: worldPos,
				normal: { x: 0, y: 1, z: 0 },
			};
			const preview = getPlacementPreview(hit, getOccupiedSlots());
			expect(preview).not.toBeNull();
			expect(preview!.valid).toBe(true);

			const placed = placeHeldCube(
				preview!,
				getHeldCube,
				(pos) => dropCube(pos),
				placeCube,
				getCube,
			);
			expect(placed).toBe(true);
		}

		// Verify all 4 cubes are placed
		for (let i = 0; i < 4; i++) {
			expect(getCubeAt({ x: i, y: 0, z: 0 })).toBeDefined();
		}

		// === STEP 7: Build wall using buildWall with a stockpile ===
		harvestUntilPowder(deposit.id, "scrap_iron", ironConfig.powderRequired * 6, playerPos, depositPos);

		const wallStockpile: Array<{ id: string; material: string }> = [];
		for (let i = 0; i < 6; i++) {
			const result = compressToCompletion("scrap_iron", getPowderStorage());
			expect(result).not.toBeNull();
			expect(result!.completed).toBe(true);
			wallStockpile.push({ id: result!.cube!.id, material: result!.cube!.material });
		}

		// Build a 3-cell wall, 2 high at z=5
		const wallResult = buildWall(0, 5, 2, 5, 2, "scrap_iron", wallStockpile);
		expect(wallResult.placed).toBe(6); // 3 cells * 2 height
		expect(wallResult.failed).toBe(0);
		expect(wallResult.placedCubeIds).toHaveLength(6);

		// Verify wall cubes are on the grid
		expect(getCubeAt({ x: 0, y: 0, z: 5 })).toBeDefined();
		expect(getCubeAt({ x: 0, y: 1, z: 5 })).toBeDefined();
		expect(getCubeAt({ x: 1, y: 0, z: 5 })).toBeDefined();
		expect(getCubeAt({ x: 1, y: 1, z: 5 })).toBeDefined();
		expect(getCubeAt({ x: 2, y: 0, z: 5 })).toBeDefined();
		expect(getCubeAt({ x: 2, y: 1, z: 5 })).toBeDefined();

		// === STEP 8: Blueprint matching ===
		const furnaceBlueprint: Blueprint = {
			id: "basic_furnace",
			name: "Basic Furnace",
			pattern: [
				[["scrap_iron", "scrap_iron"]],
				[["scrap_iron", "scrap_iron"]],
			],
			result: "furnace",
		};

		const worldGrid = new Map<string, string>();
		for (const key of getOccupiedSlots()) {
			const cubeData = getCubeAt(
				(() => {
					const parts = key.split(",");
					return { x: Number(parts[0]), y: Number(parts[1]), z: Number(parts[2]) };
				})(),
			);
			if (cubeData) {
				worldGrid.set(key, cubeData.material);
			}
		}

		const match = matchBlueprint(worldGrid, { x: 0, y: 0, z: 5 }, [furnaceBlueprint]);
		expect(match).not.toBeNull();
		expect(match!.blueprint.id).toBe("basic_furnace");
		expect(match!.cubeCoords).toHaveLength(4);

		// === STEP 9: Assemble machine ===
		const getCubeMaterial = (coord: { x: number; y: number; z: number }) => {
			const cubeData = getCubeAt(coord);
			return cubeData?.material;
		};

		const machine = assembleMachine(match!, getCubeMaterial, removeCube);
		expect(machine).toBeDefined();
		expect(machine.type).toBe("furnace");
		expect(machine.cubePositions).toHaveLength(4);
		expect(machine.stats.efficiency).toBeGreaterThan(0);
		expect(machine.stats.durability).toBeGreaterThan(0);

		expect(getMachine(machine.id)).toBeDefined();
		expect(getMachine(machine.id)!.type).toBe("furnace");

		expect(getCubeAt({ x: 0, y: 0, z: 5 })).toBeUndefined();
		expect(getCubeAt({ x: 1, y: 0, z: 5 })).toBeUndefined();
		expect(getCubeAt({ x: 0, y: 1, z: 5 })).toBeUndefined();
		expect(getCubeAt({ x: 1, y: 1, z: 5 })).toBeUndefined();

		// === STEP 10: Disassemble machine ===
		const restored = disassembleMachine(machine.id, placeCube);
		expect(restored).not.toBeNull();
		expect(restored!).toHaveLength(4);

		expect(getCubeAt({ x: 0, y: 0, z: 5 })).toBeDefined();
		expect(getCubeAt({ x: 1, y: 0, z: 5 })).toBeDefined();
		expect(getCubeAt({ x: 0, y: 1, z: 5 })).toBeDefined();
		expect(getCubeAt({ x: 1, y: 1, z: 5 })).toBeDefined();

		expect(getMachine(machine.id)).toBeUndefined();
	});

	// -----------------------------------------------------------------------
	// Sub-loop: Harvest depletes deposit to zero
	// -----------------------------------------------------------------------

	it("harvest depletes deposit to zero", () => {
		const playerPos = { x: 0, y: 0, z: 0 };
		const depositPos = { x: 0, y: 0, z: 0 };

		const deposit = spawnOreDeposit({
			type: "rock",
			quantity: 5,
			position: depositPos,
		});

		expect(deposit.quantity).toBe(5);

		const started = startHarvesting(deposit.id, playerPos, () => depositPos, 10);
		expect(started).toBe(true);

		let totalPowder = 0;
		let stopped = false;
		for (let i = 0; i < 100 && !stopped; i++) {
			const result = updateHarvesting(0.1, playerPos, 10);
			totalPowder += result.powderGained;
			if (result.stopped) {
				stopped = true;
			}
		}

		expect(stopped).toBe(true);
		expect(getDeposit(deposit.id)!.quantity).toBe(0);
		expect(totalPowder).toBeCloseTo(5, 5);

		const storedPowder = getPowderStorage().get("rock") ?? 0;
		expect(storedPowder).toBeCloseTo(5, 5);
	});

	// -----------------------------------------------------------------------
	// Sub-loop: Compression requires sufficient powder
	// -----------------------------------------------------------------------

	it("compression requires sufficient powder", () => {
		const ironConfig = DEFAULT_COMPRESSION_CONFIGS.iron;

		// Try to compress with insufficient powder
		const insufficientStorage = new Map<string, number>([
			["iron", ironConfig.powderRequired - 1],
		]);
		const started = startCompression("iron", insufficientStorage);
		expect(started).toBe(false);
		expect(isCompressing()).toBe(false);

		// Compress with exactly enough powder
		const exactStorage = new Map<string, number>([
			["iron", ironConfig.powderRequired],
		]);
		const started2 = startCompression("iron", exactStorage);
		expect(started2).toBe(true);
		expect(isCompressing()).toBe(true);
		expect(getCompressionProgress()).toBe(0);

		// Progress partway
		updateCompression(ironConfig.compressionTime * 0.25);
		expect(isCompressing()).toBe(true);
		expect(getCompressionProgress()).toBeGreaterThan(0);
		expect(getCompressionProgress()).toBeLessThan(1);

		// Cannot start another while in progress
		const anotherStorage = new Map<string, number>([
			["copper", DEFAULT_COMPRESSION_CONFIGS.copper.powderRequired],
		]);
		const started3 = startCompression("copper", anotherStorage);
		expect(started3).toBe(false);

		// Complete compression
		let result: CompressionResult = { completed: false };
		for (let i = 0; i < 100 && !result.completed; i++) {
			result = updateCompression(ironConfig.compressionTime / 10);
		}

		expect(result.completed).toBe(true);
		expect(result.cube).toBeDefined();
		expect(result.cube!.material).toBe("iron");
		expect(isCompressing()).toBe(false);
	});

	// -----------------------------------------------------------------------
	// Sub-loop: Grab → carry → place round-trip
	// -----------------------------------------------------------------------

	it("grab → carry → place round-trip", () => {
		const playerPos = { x: 0, y: 1, z: 0 };

		// Register a cube near the player
		registerCube({
			id: "test_cube_1",
			position: { x: 0.5, y: 0.25, z: 0 },
			traits: ["Grabbable"],
			material: "copper",
		});

		// Grab the cube
		const grabbed = grabCube("test_cube_1", playerPos);
		expect(grabbed).toBe(true);
		expect(getHeldCube()).toBe("test_cube_1");

		// Verify traits changed
		const cube = getCube("test_cube_1");
		expect(cube!.traits).toContain("HeldBy");
		expect(cube!.traits).not.toContain("Grabbable");

		// Carry speed should be reduced
		const speed = getCarrySpeedMultiplier(true);
		expect(speed).toBeLessThan(1.0);

		// Verify held cube position via callback API
		const camera: CameraState = {
			position: playerPos,
			forward: { x: 0, y: 0, z: -1 },
		};
		let heldPos: { x: number; y: number; z: number } | null = null;
		updateHeldCubePosition(
			camera,
			() => "test_cube_1",
			(_id, pos) => { heldPos = pos; },
		);
		expect(heldPos).toBeDefined();

		// Place on the grid at ground level
		const groundHit = {
			point: { x: 2, y: 0, z: 2 },
			normal: { x: 0, y: 1, z: 0 },
		};
		const preview = getPlacementPreview(groundHit, getOccupiedSlots());
		expect(preview).not.toBeNull();
		expect(preview!.valid).toBe(true);

		const placed = placeHeldCube(
			preview!,
			getHeldCube,
			(pos) => dropCube(pos),
			placeCube,
			getCube,
		);
		expect(placed).toBe(true);
		expect(getHeldCube()).toBeNull();

		// Verify cube is in the grid
		const placedCube = getCubeAt(preview!.coord);
		expect(placedCube).toBeDefined();
		expect(placedCube!.material).toBe("copper");

		// Speed should be back to normal
		expect(getCarrySpeedMultiplier(false)).toBe(1.0);
	});

	// -----------------------------------------------------------------------
	// Sub-loop: Wall building consumes stockpile cubes
	// -----------------------------------------------------------------------

	it("wall building consumes stockpile cubes", () => {
		const wallCost = getWallCost(0, 0, 2, 0, 2);
		expect(wallCost).toBe(6);

		const slots = calculateWallLine(0, 0, 2, 0, 2);
		expect(slots).toHaveLength(6);

		const stockpile = Array.from({ length: 6 }, (_, i) => ({
			id: `wall_cube_${i}`,
			material: "scrap_iron",
		}));

		const result = buildWall(0, 0, 2, 0, 2, "scrap_iron", stockpile);
		expect(result.placed).toBe(6);
		expect(result.failed).toBe(0);
		expect(result.placedCubeIds).toHaveLength(6);

		for (let x = 0; x <= 2; x++) {
			for (let y = 0; y < 2; y++) {
				const cubeData = getCubeAt({ x, y, z: 0 });
				expect(cubeData).toBeDefined();
				expect(cubeData!.material).toBe("scrap_iron");
			}
		}

		const unsupported = checkStructuralIntegrity(getOccupiedSlots());
		expect(unsupported).toHaveLength(0);

		_resetPlacementGrid();
		const smallStockpile = [{ id: "one_cube", material: "scrap_iron" }];
		const result2 = buildWall(0, 0, 2, 0, 2, "scrap_iron", smallStockpile);
		expect(result2.placed).toBe(1);
		expect(result2.failed).toBe(5);

		_resetPlacementGrid();
		const wrongMaterial = Array.from({ length: 6 }, (_, i) => ({
			id: `wrong_${i}`,
			material: "copper",
		}));
		const result3 = buildWall(0, 0, 2, 0, 2, "scrap_iron", wrongMaterial);
		expect(result3.placed).toBe(0);
		expect(result3.failed).toBe(6);
	});

	// -----------------------------------------------------------------------
	// Sub-loop: Machine assembly and disassembly preserves materials
	// -----------------------------------------------------------------------

	it("machine assembly and disassembly preserves materials", () => {
		placeCube("cube_a", { x: 0, y: 0, z: 0 }, "scrap_iron");
		placeCube("cube_b", { x: 1, y: 0, z: 0 }, "copper");
		placeCube("cube_c", { x: 0, y: 0, z: 1 }, "scrap_iron");
		placeCube("cube_d", { x: 1, y: 0, z: 1 }, "copper");

		const mixedBlueprint: Blueprint = {
			id: "mixed_machine",
			name: "Mixed Machine",
			pattern: [
				[
					["scrap_iron", "copper"],
					["scrap_iron", "copper"],
				],
			],
			result: "mixed_processor",
		};

		const worldGrid = new Map<string, string>();
		for (const key of getOccupiedSlots()) {
			const parts = key.split(",");
			const coord = { x: Number(parts[0]), y: Number(parts[1]), z: Number(parts[2]) };
			const cubeData = getCubeAt(coord);
			if (cubeData) {
				worldGrid.set(key, cubeData.material);
			}
		}

		const match = matchBlueprint(worldGrid, { x: 0, y: 0, z: 0 }, [mixedBlueprint]);
		expect(match).not.toBeNull();
		expect(match!.blueprint.id).toBe("mixed_machine");
		expect(match!.cubeCoords).toHaveLength(4);

		const getCubeMaterial = (coord: { x: number; y: number; z: number }) =>
			getCubeAt(coord)?.material;

		const machine = assembleMachine(match!, getCubeMaterial, removeCube);

		expect(machine.stats.efficiency).toBeCloseTo(1.1, 1);
		expect(machine.stats.durability).toBeCloseTo(110, 0);
		expect(machine.type).toBe("mixed_processor");

		const retrieved = getMachine(machine.id);
		expect(retrieved).toBeDefined();
		expect(retrieved!.cubePositions).toHaveLength(4);

		const originalMaterials = machine.cubePositions.map((cp) => ({
			coord: { ...cp.coord },
			material: cp.material,
		}));

		_resetPlacementGrid();

		const restored = disassembleMachine(machine.id, placeCube);
		expect(restored).not.toBeNull();
		expect(restored!).toHaveLength(4);

		for (const orig of originalMaterials) {
			const placedCube = getCubeAt(orig.coord);
			expect(placedCube).toBeDefined();
			expect(placedCube!.material).toBe(orig.material);
		}

		expect(getMachine(machine.id)).toBeUndefined();
	});
});
