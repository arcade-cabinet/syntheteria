/**
 * Tests for cult escalation system — 3-tier threat ramp.
 *
 * Tests the runtime tick behavior: elapsed time tracking,
 * tier progression, spawn cooldowns, and cult unit caps.
 * Terrain/building dependencies are mocked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Faction, Unit } from "../../ecs/traits";
import { world } from "../../ecs/world";

// Mock terrain so spawn validation always succeeds
vi.mock("../../ecs/terrain", () => ({
	isWalkable: vi.fn(() => true),
	getTerrainHeight: vi.fn(() => 0),
	createFragment: vi.fn(() => ({ id: `frag_${Date.now()}` })),
	getFragment: vi.fn((id: string) => ({ id })),
	WORLD_HALF: 100,
	WORLD_SIZE: 200,
}));

vi.mock("../../ecs/cityLayout", () => ({
	isInsideBuilding: vi.fn(() => false),
}));

import {
	cultEscalationSystem,
	getCurrentTierLevel,
	getElapsedGameSec,
	resetCultEscalation,
} from "../cultEscalation";

function countCultists(): number {
	let count = 0;
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)?.value === "cultist") count++;
	}
	return count;
}

beforeEach(() => {
	resetCultEscalation();
});

afterEach(() => {
	// Clean up any cult units spawned by the system
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)?.value === "cultist") {
			entity.destroy();
		}
	}
});

describe("initial state", () => {
	it("starts at tier 1", () => {
		expect(getCurrentTierLevel()).toBe(1);
	});

	it("elapsed time starts at zero", () => {
		expect(getElapsedGameSec()).toBe(0);
	});
});

describe("time tracking", () => {
	it("accumulates elapsed time", () => {
		cultEscalationSystem(5);
		expect(getElapsedGameSec()).toBe(5);

		cultEscalationSystem(10);
		expect(getElapsedGameSec()).toBe(15);
	});
});

describe("tier progression", () => {
	it("stays at tier 1 before 10 minutes", () => {
		cultEscalationSystem(599); // 9:59
		expect(getCurrentTierLevel()).toBe(1);
	});

	it("advances to tier 2 after 10 minutes", () => {
		cultEscalationSystem(601); // 10:01
		expect(getCurrentTierLevel()).toBe(2);
	});

	it("advances to tier 3 after 25 minutes", () => {
		cultEscalationSystem(1501); // 25:01
		expect(getCurrentTierLevel()).toBe(3);
	});
});

describe("spawning", () => {
	it("does not crash when called with no terrain data", () => {
		expect(() => cultEscalationSystem(1)).not.toThrow();
	});

	it("spawns cult units over time", () => {
		const before = countCultists();
		// Run enough ticks to trigger at least one spawn
		for (let i = 0; i < 100; i++) {
			cultEscalationSystem(1);
		}
		const after = countCultists();
		expect(after).toBeGreaterThan(before);
	});

	it("respects max enemy count per tier", () => {
		// Run a lot of ticks in tier 1
		for (let i = 0; i < 300; i++) {
			cultEscalationSystem(1);
		}
		// Tier 1 max is relatively low (check cultDefs for exact value)
		const count = countCultists();
		// Should be capped, not infinite
		expect(count).toBeLessThanOrEqual(20);
	});
});

describe("reset", () => {
	it("resetCultEscalation returns to initial state", () => {
		cultEscalationSystem(100);
		expect(getElapsedGameSec()).toBe(100);

		resetCultEscalation();
		expect(getElapsedGameSec()).toBe(0);
		expect(getCurrentTierLevel()).toBe(1);
	});
});
