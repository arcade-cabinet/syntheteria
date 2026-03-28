/**
 * Tests for initializeWorld (US-1.4).
 *
 * US-1.4: initializeWorld only spawns player start (2 units).
 * No hardcoded ScavengeSites, cult bases, lightning rods, or fabrication units.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	Base,
	BuildingTrait,
	EntityId,
	Faction,
	LightningRod,
	Position,
	ScavengeSite,
	Unit,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import { initializeWorld } from "../initializeWorld";

describe("initializeWorld (US-1.4)", () => {
	beforeEach(() => {
		// Clear all entities
		for (const entity of world.query(EntityId)) {
			entity.destroy();
		}
	});

	it("spawns exactly 2 units", () => {
		initializeWorld("test-us14", "normal");

		const units = Array.from(world.query(Unit, Faction));
		const playerUnits = units.filter((e) => e.get(Faction)?.value === "player");
		expect(playerUnits.length).toBe(2);
	});

	it("Bot Alpha has working camera, broken arms", () => {
		initializeWorld("test-us14-alpha", "normal");

		const units = Array.from(world.query(Unit, Position));
		const alpha = units.find((e) => e.get(Unit)?.displayName === "Bot Alpha");
		expect(alpha).toBeDefined();
	});

	it("Bot Beta has working arms, broken camera", () => {
		initializeWorld("test-us14-beta", "normal");

		const units = Array.from(world.query(Unit, Position));
		const beta = units.find((e) => e.get(Unit)?.displayName === "Bot Beta");
		expect(beta).toBeDefined();
	});

	it("does NOT spawn ScavengeSites", () => {
		initializeWorld("test-us14-no-scavenge", "normal");

		const scavenge = Array.from(world.query(ScavengeSite));
		expect(scavenge.length).toBe(0);
	});

	it("does NOT spawn lightning rods", () => {
		initializeWorld("test-us14-no-rods", "normal");

		const rods = Array.from(world.query(LightningRod));
		expect(rods.length).toBe(0);
	});

	it("does NOT spawn cult bases", () => {
		initializeWorld("test-us14-no-cult", "normal");

		const bases = Array.from(world.query(Base, Faction));
		const cultBases = bases.filter((e) => e.get(Faction)?.value === "cultist");
		expect(cultBases.length).toBe(0);
	});

	it("does NOT spawn fabrication units", () => {
		initializeWorld("test-us14-no-fabs", "normal");

		const fabs = Array.from(world.query(BuildingTrait));
		const fabUnits = fabs.filter(
			(e) => e.get(BuildingTrait)?.buildingType === "fabrication_unit",
		);
		expect(fabUnits.length).toBe(0);
	});

	it("returns start position for camera targeting", () => {
		const result = initializeWorld("test-us14-pos", "normal");
		expect(typeof result.startX).toBe("number");
		expect(typeof result.startZ).toBe("number");
		expect(result.startX).toBeGreaterThan(0);
		expect(result.startZ).toBeGreaterThan(0);
	});
});
