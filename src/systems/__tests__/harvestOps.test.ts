/**
 * T14: HarvestOp Koota entity API
 *
 * Verifies that startHarvest / startFloorHarvest spawn HarvestOp entities,
 * cancelHarvest and resetHarvestSystem destroy them. Does not test tick logic
 * (covered by harvestSystem.test.ts). Uses real Koota world — no entity mocks.
 */

import { HarvestOp as HarvestOpTrait } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	cancelHarvest,
	resetHarvestSystem,
	startFloorHarvest,
	startHarvest,
} from "../harvestSystem";

// ── Minimal mocks for harvestSystem side-dependencies ────────────────────────

jest.mock("../resources", () => ({ addResource: jest.fn() }));
jest.mock("../harvestEvents", () => ({
	expireHarvestEvents: jest.fn(),
	pushHarvestYield: jest.fn(),
}));
jest.mock("../narrative", () => ({ queueThought: jest.fn() }));
jest.mock("../turnSystem", () => ({
	getTurnState: jest.fn(() => ({ turnNumber: 0 })),
}));
jest.mock("../../db/runtime", () => ({ getDatabaseSync: jest.fn() }));
jest.mock("../../world/session", () => ({
	getActiveWorldSession: jest.fn(() => null),
}));
jest.mock("../../world/gen/persist", () => ({ writeTileDelta: jest.fn() }));
jest.mock("../../world/gen/worldGrid", () => ({ invalidateChunk: jest.fn() }));
jest.mock("../../world/gen/types", () => ({
	tileKey3D: (x: number, z: number, l: number) => `${x},${z},${l}`,
	CHUNK_SIZE: 16,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function queryHarvestOps() {
	return Array.from(world.query(HarvestOpTrait));
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

afterEach(() => {
	resetHarvestSystem();
	// Clean up any stray entities
	for (const e of world.query(HarvestOpTrait)) {
		if (e.isAlive()) e.destroy();
	}
});

// ── Tests ────────────────────────────────────────────────────────────────────

test("startHarvest spawns a HarvestOp entity with harvestType structure", () => {
	const ok = startHarvest("bot_1", 101, "building_wall", "wall", 10, 10);
	expect(ok).toBe(true);
	const ops = queryHarvestOps();
	expect(ops.length).toBe(1);
	const b = ops[0].get(HarvestOpTrait)!;
	expect(b.harvesterId).toBe("bot_1");
	expect(b.harvestType).toBe("structure");
	expect(b.structureId).toBe(101);
	expect(b.ticksRemaining).toBeGreaterThan(0);
});

test("startFloorHarvest spawns a HarvestOp entity with harvestType floor", () => {
	const ok = startFloorHarvest("bot_2", 5, 5, 0, "metal_panel");
	expect(ok).toBe(true);
	const ops = queryHarvestOps();
	expect(ops.length).toBe(1);
	const b = ops[0].get(HarvestOpTrait)!;
	expect(b.harvesterId).toBe("bot_2");
	expect(b.harvestType).toBe("floor");
});

test("cancelHarvest destroys the HarvestOp entity", () => {
	startFloorHarvest("bot_3", 3, 3, 0, "metal_panel");
	expect(queryHarvestOps().length).toBe(1);
	cancelHarvest("bot_3");
	expect(queryHarvestOps().length).toBe(0);
});

test("resetHarvestSystem destroys all HarvestOp entities", () => {
	startFloorHarvest("bot_4", 1, 1, 0, "metal_panel");
	startFloorHarvest("bot_5", 2, 2, 0, "metal_panel");
	expect(queryHarvestOps().length).toBe(2);
	resetHarvestSystem();
	expect(queryHarvestOps().length).toBe(0);
});

test("duplicate harvest on same harvester does not spawn a second entity", () => {
	startFloorHarvest("bot_6", 7, 7, 0, "metal_panel");
	const ok2 = startFloorHarvest("bot_6", 8, 8, 0, "metal_panel");
	expect(ok2).toBe(false);
	expect(queryHarvestOps().length).toBe(1);
});
