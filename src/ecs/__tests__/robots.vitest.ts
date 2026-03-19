import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { CAVALRY_DEFAULTS, spawnCavalry } from "../robots/CavalryBot";
import { CULT_INFANTRY_DEFAULTS, spawnCultInfantry } from "../robots/CultMechs";
import { RANGED_DEFAULTS, spawnRanged } from "../robots/GuardBot";
import { spawnWorker } from "../robots/HarvesterBot";
import type { BotMark } from "../robots/marks";
import { MARK_EFFECTS } from "../robots/marks";
import { buildPlacementFlags } from "../robots/placement";
import { SCOUT_DEFAULTS, spawnScout } from "../robots/ScoutBot";
import { INFANTRY_DEFAULTS, spawnInfantry } from "../robots/SentinelBot";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits/unit";

describe("robot spawning", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("spawnInfantry creates entity at correct position", () => {
		const e = spawnInfantry(world, 5, 3, "player");
		const pos = e.get(UnitPos)!;
		expect(pos.tileX).toBe(5);
		expect(pos.tileZ).toBe(3);
	});

	it("spawnInfantry has correct faction", () => {
		const e = spawnInfantry(world, 5, 3, "player");
		expect(e.get(UnitFaction)!.factionId).toBe("player");
	});

	it("spawnInfantry has correct stats", () => {
		const e = spawnInfantry(world, 5, 3, "player");
		const stats = e.get(UnitStats)!;
		expect(stats.hp).toBe(INFANTRY_DEFAULTS.stats.hp);
		expect(stats.ap).toBe(INFANTRY_DEFAULTS.stats.ap);
		expect(stats.scanRange).toBe(INFANTRY_DEFAULTS.stats.scanRange);
	});

	it("spawnInfantry has correct visual modelId", () => {
		const e = spawnInfantry(world, 0, 0, "player");
		expect(e.get(UnitVisual)!.modelId).toBe("infantry");
	});

	it("spawnWorker has low attack", () => {
		const e = spawnWorker(world, 0, 0, "player");
		expect(e.get(UnitStats)!.attack).toBe(0);
	});

	it("spawnScout has high AP and scan range", () => {
		const e = spawnScout(world, 0, 0, "player");
		const stats = e.get(UnitStats)!;
		expect(stats.ap).toBe(SCOUT_DEFAULTS.stats.ap);
		expect(stats.scanRange).toBe(SCOUT_DEFAULTS.stats.scanRange);
	});

	it("spawnRanged has high HP and attack", () => {
		const e = spawnRanged(world, 0, 0, "player");
		expect(e.get(UnitStats)!.hp).toBe(RANGED_DEFAULTS.stats.hp);
		expect(e.get(UnitStats)!.attack).toBe(RANGED_DEFAULTS.stats.attack);
	});

	it("spawnCavalry has high AP", () => {
		const e = spawnCavalry(world, 0, 0, "player");
		expect(e.get(UnitStats)!.ap).toBe(CAVALRY_DEFAULTS.stats.ap);
	});

	it("spawnCultInfantry has correct defaults", () => {
		const e = spawnCultInfantry(world, 2, 2, "static_remnants");
		expect(e.get(UnitStats)!.hp).toBe(CULT_INFANTRY_DEFAULTS.stats.hp);
		expect(e.get(UnitFaction)!.factionId).toBe("static_remnants");
		expect(e.get(UnitVisual)!.modelId).toBe("cult_infantry");
	});
});

describe("buildPlacementFlags", () => {
	it("player gets 6 faction bots", () => {
		const flags = buildPlacementFlags("reclaimers", [
			"reclaimers",
			"volt_collective",
		]);
		const playerFlags = flags.filter((f) => f.factionId === "player");
		expect(playerFlags).toHaveLength(6);
	});

	it("AI factions get 4 combat bots each", () => {
		const flags = buildPlacementFlags("reclaimers", [
			"reclaimers",
			"volt_collective",
			"signal_choir",
		]);
		const vcFlags = flags.filter((f) => f.factionId === "volt_collective");
		expect(vcFlags).toHaveLength(4);
	});
});

describe("MARK_EFFECTS", () => {
	it("reinforced_hull provides HP", () => {
		expect(MARK_EFFECTS.reinforced_hull.hp).toBe(3);
	});

	it("swift_treads provides MP", () => {
		expect(MARK_EFFECTS.swift_treads.mp).toBe(1);
	});

	it("extended_range provides scanRange", () => {
		expect(MARK_EFFECTS.extended_range.scanRange).toBe(2);
	});

	it("all marks are defined", () => {
		const marks: BotMark[] = [
			"reinforced_hull",
			"extended_range",
			"swift_treads",
			"harvester_arm",
			"shield_emitter",
		];
		for (const mark of marks) {
			expect(MARK_EFFECTS[mark]).toBeDefined();
		}
	});
});
