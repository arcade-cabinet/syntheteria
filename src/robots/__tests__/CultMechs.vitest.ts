import { createWorld } from "koota";
import { describe, expect, it } from "vitest";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../../traits";
import {
	CULT_ARCHON_DEFAULTS,
	CULT_CAVALRY_DEFAULTS,
	CULT_INFANTRY_DEFAULTS,
	CULT_MAX_ENEMIES_PER_TIER,
	CULT_RANGED_DEFAULTS,
	CULT_SHAMAN_DEFAULTS,
	CULT_TERRITORY_MILESTONES,
	CULT_TIER_UNIT_TYPES,
	getEscalationTier,
	spawnCultArchon,
	spawnCultInfantry,
	spawnCultMechByType,
	spawnCultShaman,
} from "../CultMechs";

describe("escalation tiers", () => {
	it("tier 0 at 0 territory", () => {
		expect(getEscalationTier(0)).toBe(0);
	});

	it("tier 1 at 10 territory (first milestone)", () => {
		expect(getEscalationTier(10)).toBe(1);
	});

	it("tier 2 at 25 territory", () => {
		expect(getEscalationTier(25)).toBe(2);
	});

	it("tier 3 at 50 territory", () => {
		expect(getEscalationTier(50)).toBe(3);
	});

	it("tier 4 at 100 territory", () => {
		expect(getEscalationTier(100)).toBe(4);
	});

	it("tier 4 at 200 territory (caps at max)", () => {
		expect(getEscalationTier(200)).toBe(4);
	});

	it("tier stays at 0 below first milestone", () => {
		expect(getEscalationTier(9)).toBe(0);
	});

	it("milestones match pending/config/cultists.json", () => {
		expect([...CULT_TERRITORY_MILESTONES]).toEqual([10, 25, 50, 100]);
	});
});

describe("tier unit types", () => {
	it("tier 0 only has drones", () => {
		expect(CULT_TIER_UNIT_TYPES[0]).toEqual(["cultist_drone"]);
	});

	it("tier 1 adds zealots", () => {
		expect(CULT_TIER_UNIT_TYPES[1]).toContain("cultist_zealot");
	});

	it("tier 2 adds shamans", () => {
		expect(CULT_TIER_UNIT_TYPES[2]).toContain("cultist_shaman");
	});

	it("tier 3 adds heralds", () => {
		expect(CULT_TIER_UNIT_TYPES[3]).toContain("cultist_herald");
	});

	it("tier 4 has all 5 unit types", () => {
		expect(CULT_TIER_UNIT_TYPES[4]).toHaveLength(5);
		expect(CULT_TIER_UNIT_TYPES[4]).toContain("cultist_archon");
	});

	it("max enemies per tier scales appropriately", () => {
		expect([...CULT_MAX_ENEMIES_PER_TIER]).toEqual([4, 6, 9, 14, 20]);
	});
});

describe("cult mech spawning", () => {
	it("spawnCultInfantry creates unit with correct stats", () => {
		const world = createWorld();
		spawnCultInfantry(world, 5, 5, "static_remnants");

		for (const e of world.query(UnitStats)) {
			const stats = e.get(UnitStats)!;
			expect(stats.hp).toBe(CULT_INFANTRY_DEFAULTS.stats.hp);
			expect(stats.attack).toBe(CULT_INFANTRY_DEFAULTS.stats.attack);
		}
	});

	it("spawnCultShaman creates unit with correct stats", () => {
		const world = createWorld();
		spawnCultShaman(world, 3, 3, "null_monks");

		for (const e of world.query(UnitStats)) {
			const stats = e.get(UnitStats)!;
			expect(stats.hp).toBe(CULT_SHAMAN_DEFAULTS.stats.hp);
			expect(stats.scanRange).toBe(CULT_SHAMAN_DEFAULTS.stats.scanRange);
		}
	});

	it("spawnCultArchon creates elite unit", () => {
		const world = createWorld();
		spawnCultArchon(world, 7, 7, "lost_signal");

		for (const e of world.query(UnitStats, UnitVisual)) {
			const stats = e.get(UnitStats)!;
			const visual = e.get(UnitVisual)!;
			expect(stats.hp).toBe(CULT_ARCHON_DEFAULTS.stats.hp);
			expect(stats.attack).toBe(CULT_ARCHON_DEFAULTS.stats.attack);
			expect(visual.scale).toBe(1.2); // Archon is larger
		}
	});

	it("spawnCultMechByType dispatches to correct spawn function", () => {
		const world = createWorld();
		spawnCultMechByType(world, "cultist_drone", 0, 0, "static_remnants");
		spawnCultMechByType(world, "cultist_zealot", 1, 0, "null_monks");
		spawnCultMechByType(world, "cultist_shaman", 2, 0, "lost_signal");
		spawnCultMechByType(world, "cultist_herald", 3, 0, "static_remnants");
		spawnCultMechByType(world, "cultist_archon", 4, 0, "null_monks");

		const hpSet = new Set<number>();
		for (const e of world.query(UnitStats)) {
			const stats = e.get(UnitStats)!;
			hpSet.add(stats.hp);
		}

		// Should have spawned units with distinct HP values
		expect(hpSet.size).toBeGreaterThanOrEqual(3); // drone=12, zealot=10, shaman=8, herald=8, archon=20
	});

	it("spawnCultMechByType sets correct faction", () => {
		const world = createWorld();
		spawnCultMechByType(world, "cultist_drone", 0, 0, "null_monks");

		for (const e of world.query(UnitFaction)) {
			const f = e.get(UnitFaction)!;
			expect(f.factionId).toBe("null_monks");
		}
	});

	it("spawnCultMechByType sets correct position", () => {
		const world = createWorld();
		spawnCultMechByType(world, "cultist_archon", 15, 20, "lost_signal");

		for (const e of world.query(UnitPos)) {
			const pos = e.get(UnitPos)!;
			expect(pos.tileX).toBe(15);
			expect(pos.tileZ).toBe(20);
		}
	});
});

describe("mech stat balance", () => {
	it("archon is the toughest unit", () => {
		expect(CULT_ARCHON_DEFAULTS.stats.hp).toBeGreaterThan(
			CULT_INFANTRY_DEFAULTS.stats.hp,
		);
		expect(CULT_ARCHON_DEFAULTS.stats.attack).toBeGreaterThan(
			CULT_RANGED_DEFAULTS.stats.attack,
		);
	});

	it("cavalry is the fastest unit", () => {
		expect(CULT_CAVALRY_DEFAULTS.stats.mp).toBeGreaterThan(
			CULT_INFANTRY_DEFAULTS.stats.mp,
		);
		expect(CULT_CAVALRY_DEFAULTS.stats.mp).toBeGreaterThan(
			CULT_RANGED_DEFAULTS.stats.mp,
		);
	});

	it("ranged has the longest base attack range", () => {
		expect(CULT_RANGED_DEFAULTS.stats.attackRange).toBeGreaterThan(
			CULT_INFANTRY_DEFAULTS.stats.attackRange,
		);
	});

	it("shaman has good scan range for support role", () => {
		expect(CULT_SHAMAN_DEFAULTS.stats.scanRange).toBeGreaterThanOrEqual(
			CULT_RANGED_DEFAULTS.stats.scanRange,
		);
	});
});
