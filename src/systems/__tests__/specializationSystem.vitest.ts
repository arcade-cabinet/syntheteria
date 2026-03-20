/**
 * Tests for specialization system integration.
 *
 * Covers:
 * - UnitSpecialization trait
 * - Track registry
 * - Specialization-aware fabrication
 * - Specialization passives runtime
 * - Track-specific actions
 * - Save/Load round-trip
 * - AI track selection
 * - Tech tree merge
 */

import { createWorld, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pickAITrack, pickAITrackVersion } from "../../ai/trackSelection";
import { TECH_BY_ID, TECH_TREE } from "../../config/techTreeDefs";
import { applyUnits, serializeUnits } from "../../db/serialize";
import { getActionsForUnit } from "../../robots/classActions";
import {
	getAllTrackTechs,
	getSpecializedActions,
	getTracksForClass,
	TRACK_REGISTRY,
} from "../../robots/specializations/trackRegistry";
import {
	BotFabricator,
	Building,
	Faction,
	Powered,
	ResourcePool,
	UnitFaction,
	UnitPos,
	UnitSpecialization,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../../traits";
import {
	FabricationJob,
	queueFabrication,
	runFabrication,
} from "../fabricationSystem";
import { runSpecializationPassives } from "../specializationSystem";

// ─── Helpers ────────────────────────────────────────────────────────────────

let world: World;

function seedResources(factionId: string) {
	world.spawn(
		Faction({
			id: factionId,
			displayName: factionId,
			color: 0xffffff,
			isPlayer: false,
		}),
		ResourcePool({
			stone: 100,
			iron_ore: 100,
			steel: 100,
			glass: 100,
			timber: 100,
			circuits: 100,
			fuel: 100,
			coal: 100,
			quantum_crystal: 100,
			alloy: 100,
			sand: 100,
		}),
	);
}

function spawnMotorPool(factionId: string) {
	const e = world.spawn(
		Building({
			buildingType: "motor_pool",
			factionId,
			tileX: 5,
			tileZ: 5,
			hp: 20,
			maxHp: 20,
		}),
		BotFabricator({ fabricationSlots: 3, queueSize: 0 }),
	);
	e.add(Powered());
	return e;
}

beforeEach(() => {
	world = createWorld();
});

afterEach(() => {
	world.destroy();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("UnitSpecialization trait", () => {
	it("can be added to a unit entity", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitFaction({ factionId: "player" }),
			UnitSpecialization({ trackId: "pathfinder", trackVersion: 1 }),
		);

		const spec = e.get(UnitSpecialization);
		expect(spec).toBeTruthy();
		expect(spec!.trackId).toBe("pathfinder");
		expect(spec!.trackVersion).toBe(1);
	});

	it("defaults to empty trackId and version 1", () => {
		const e = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitSpecialization({}),
		);
		const spec = e.get(UnitSpecialization);
		expect(spec!.trackId).toBe("");
		expect(spec!.trackVersion).toBe(1);
	});
});

describe("Track Registry", () => {
	it("contains entries for all 6 robot classes", () => {
		const classes = new Set<string>();
		for (const entry of TRACK_REGISTRY.values()) {
			classes.add(entry.robotClass);
		}
		expect(classes).toContain("scout");
		expect(classes).toContain("infantry");
		expect(classes).toContain("cavalry");
		expect(classes).toContain("ranged");
		expect(classes).toContain("support");
		expect(classes).toContain("worker");
	});

	it("has 14 total tracks (2+2+2+2+3+3)", () => {
		expect(TRACK_REGISTRY.size).toBe(14);
	});

	it("getTracksForClass returns correct count per class", () => {
		expect(getTracksForClass("scout")).toHaveLength(2);
		expect(getTracksForClass("infantry")).toHaveLength(2);
		expect(getTracksForClass("cavalry")).toHaveLength(2);
		expect(getTracksForClass("ranged")).toHaveLength(2);
		expect(getTracksForClass("support")).toHaveLength(3);
		expect(getTracksForClass("worker")).toHaveLength(3);
	});

	it("getSpecializedActions returns actions for known tracks", () => {
		expect(getSpecializedActions("pathfinder").length).toBeGreaterThan(0);
		expect(getSpecializedActions("sniper").length).toBeGreaterThan(0);
		expect(getSpecializedActions("field_medic").length).toBeGreaterThan(0);
		expect(getSpecializedActions("nonexistent")).toHaveLength(0);
	});
});

describe("Tech Tree Merge", () => {
	it("TECH_TREE includes base techs", () => {
		expect(TECH_BY_ID.has("advanced_harvesting")).toBe(true);
		expect(TECH_BY_ID.has("reinforced_chassis")).toBe(true);
		expect(TECH_BY_ID.has("mark_v_transcendence")).toBe(true);
	});

	it("TECH_TREE includes track specialization techs", () => {
		expect(TECH_BY_ID.has("advanced_recon_optics")).toBe(true);
		expect(TECH_BY_ID.has("combat_chassis_specialization")).toBe(true);
		expect(TECH_BY_ID.has("arachnoid_motor_suite")).toBe(true);
		expect(TECH_BY_ID.has("precision_targeting")).toBe(true);
		expect(TECH_BY_ID.has("advanced_support_protocols")).toBe(true);
		expect(TECH_BY_ID.has("industrial_specialization")).toBe(true);
	});

	it("has no duplicate tech IDs", () => {
		const ids = TECH_TREE.map((t) => t.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it("all track tech prerequisites reference existing techs", () => {
		const allIds = new Set(TECH_TREE.map((t) => t.id));
		const trackTechs = getAllTrackTechs();
		for (const tech of trackTechs) {
			for (const prereq of tech.prerequisites) {
				expect(allIds.has(prereq)).toBe(true);
			}
		}
	});
});

describe("Specialization-aware fabrication", () => {
	it("queues fabrication with trackId and trackVersion", () => {
		seedResources("player");
		const pool = spawnMotorPool("player");

		const result = queueFabrication(world, pool, "scout", "pathfinder", 1);
		expect(result.ok).toBe(true);

		// Check the job entity
		const jobs = [...world.query(FabricationJob)];
		expect(jobs).toHaveLength(1);
		const job = jobs[0]!.get(FabricationJob)!;
		expect(job.trackId).toBe("pathfinder");
		expect(job.trackVersion).toBe(1);
	});

	it("spawns a specialized unit when fabrication completes", () => {
		seedResources("player");
		const pool = spawnMotorPool("player");

		queueFabrication(world, pool, "scout", "infiltrator", 2);

		// Fast-forward: set turnsRemaining to 1 so next tick completes
		for (const e of world.query(FabricationJob)) {
			const j = e.get(FabricationJob)!;
			e.set(FabricationJob, { ...j, turnsRemaining: 1 });
		}

		runFabrication(world);

		// Check spawned unit has UnitSpecialization
		const units = [...world.query(UnitPos, UnitFaction, UnitStats)];
		expect(units.length).toBeGreaterThanOrEqual(1);

		const specialized = units.find((u) => u.has(UnitSpecialization));
		expect(specialized).toBeTruthy();
		const spec = specialized!.get(UnitSpecialization)!;
		expect(spec.trackId).toBe("infiltrator");
		expect(spec.trackVersion).toBe(2);
	});

	it("spawns unspecialized unit when no trackId is provided", () => {
		seedResources("player");
		const pool = spawnMotorPool("player");

		queueFabrication(world, pool, "infantry");

		for (const e of world.query(FabricationJob)) {
			const j = e.get(FabricationJob)!;
			e.set(FabricationJob, { ...j, turnsRemaining: 1 });
		}

		runFabrication(world);

		const units = [...world.query(UnitPos, UnitFaction, UnitStats)];
		const hasSpec = units.some(
			(u) =>
				u.has(UnitSpecialization) && u.get(UnitSpecialization)!.trackId !== "",
		);
		expect(hasSpec).toBe(false);
	});
});

describe("Track-specific actions", () => {
	it("getActionsForUnit merges base + track actions", () => {
		const baseOnly = getActionsForUnit("scout", "");
		const withTrack = getActionsForUnit("scout", "pathfinder");

		expect(withTrack.length).toBeGreaterThan(baseOnly.length);

		// Track actions should be present
		const hasSwep = withTrack.some((a) => a.id === "sweep_reveal");
		expect(hasSwep).toBe(true);

		// Base actions still present
		const hasMove = withTrack.some((a) => a.id === "move");
		expect(hasMove).toBe(true);
	});

	it("returns base actions only when trackId is empty", () => {
		const actions = getActionsForUnit("infantry", "");
		const hasRush = actions.some((a) => a.id === "rush");
		expect(hasRush).toBe(false);
	});
});

describe("Specialization passives runtime", () => {
	it("field medic regen aura heals adjacent friendlies", () => {
		// Spawn a field medic at (5,5) with Mark III
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 7,
				maxHp: 7,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 1,
				defense: 0,
			}),
			UnitSpecialization({ trackId: "field_medic", trackVersion: 1 }),
			UnitXP({ xp: 0, markLevel: 3, killCount: 0, harvestCount: 0 }),
		);

		// Spawn a damaged ally at (5,6) — adjacent
		const ally = world.spawn(
			UnitPos({ tileX: 5, tileZ: 6 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 5,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		runSpecializationPassives(world);

		const allyStats = ally.get(UnitStats)!;
		expect(allyStats.hp).toBe(6); // healed +1 from regen aura
	});

	it("does not heal enemies", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 7,
				maxHp: 7,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 1,
				defense: 0,
			}),
			UnitSpecialization({ trackId: "field_medic", trackVersion: 1 }),
			UnitXP({ xp: 0, markLevel: 3, killCount: 0, harvestCount: 0 }),
		);

		const enemy = world.spawn(
			UnitPos({ tileX: 5, tileZ: 6 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 5,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		runSpecializationPassives(world);

		const enemyStats = enemy.get(UnitStats)!;
		expect(enemyStats.hp).toBe(5); // unchanged
	});

	it("signal booster amplifies scan range of nearby friendlies", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 7,
				maxHp: 7,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 1,
				defense: 0,
			}),
			UnitSpecialization({ trackId: "signal_booster", trackVersion: 1 }),
			UnitXP({ xp: 0, markLevel: 2, killCount: 0, harvestCount: 0 }),
		);

		const ally = world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		runSpecializationPassives(world);

		const allyStats = ally.get(UnitStats)!;
		expect(allyStats.scanRange).toBe(6); // +2 from relay amplifier
	});
});

describe("Save/Load round-trip", () => {
	it("serializes and restores specialization", () => {
		world.spawn(
			UnitPos({ tileX: 3, tileZ: 4 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitVisual({ modelId: "scout", scale: 1.0, facingAngle: 0 }),
			UnitSpecialization({ trackId: "pathfinder", trackVersion: 2 }),
		);

		const records = serializeUnits(world, "test-game-1");
		expect(records).toHaveLength(1);
		expect(records[0]!.trackId).toBe("pathfinder");
		expect(records[0]!.trackVersion).toBe(2);

		// Destroy all units and recreate from records
		for (const e of world.query(UnitPos)) {
			e.destroy();
		}

		applyUnits(world, records);

		// Check the restored unit
		const restored = [...world.query(UnitPos, UnitFaction, UnitStats)];
		expect(restored).toHaveLength(1);
		expect(restored[0]!.has(UnitSpecialization)).toBe(true);

		const spec = restored[0]!.get(UnitSpecialization)!;
		expect(spec.trackId).toBe("pathfinder");
		expect(spec.trackVersion).toBe(2);
	});

	it("does not add UnitSpecialization for unspecialized units", () => {
		world.spawn(
			UnitPos({ tileX: 3, tileZ: 4 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitVisual({ modelId: "infantry", scale: 1.0, facingAngle: 0 }),
		);

		const records = serializeUnits(world, "test-game-2");
		expect(records[0]!.trackId).toBeUndefined();

		for (const e of world.query(UnitPos)) {
			e.destroy();
		}

		applyUnits(world, records);

		const restored = [...world.query(UnitPos, UnitFaction, UnitStats)];
		expect(restored).toHaveLength(1);
		// Should not have UnitSpecialization (or have empty trackId)
		const hasSpec = restored[0]!.has(UnitSpecialization);
		if (hasSpec) {
			expect(restored[0]!.get(UnitSpecialization)!.trackId).toBe("");
		}
	});
});

describe("AI track selection", () => {
	it("picks preferred track when gate tech is researched", () => {
		const researched = new Set(["advanced_recon_optics"]);
		const gateTechs = new Map<string, string>();
		for (const entry of TRACK_REGISTRY.values()) {
			gateTechs.set(entry.trackId, entry.gateTechId);
		}

		const track = pickAITrack("reclaimers", "scout", researched, gateTechs);
		expect(track).toBe("pathfinder"); // reclaimers prefer pathfinder
	});

	it("returns empty when gate tech is not researched", () => {
		const researched = new Set<string>();
		const gateTechs = new Map<string, string>();
		for (const entry of TRACK_REGISTRY.values()) {
			gateTechs.set(entry.trackId, entry.gateTechId);
		}

		const track = pickAITrack("reclaimers", "scout", researched, gateTechs);
		expect(track).toBe("");
	});

	it("picks v2 when upgrade tech is researched", () => {
		const v2Techs = new Map<string, string>();
		for (const entry of TRACK_REGISTRY.values()) {
			v2Techs.set(entry.trackId, entry.v2TechId);
		}

		const version1 = pickAITrackVersion("pathfinder", new Set(), v2Techs);
		expect(version1).toBe(1);

		const version2 = pickAITrackVersion(
			"pathfinder",
			new Set(["deep_signal_processing"]),
			v2Techs,
		);
		expect(version2).toBe(2);
	});

	it("never gives cult bots a track", () => {
		const researched = new Set(["advanced_recon_optics"]);
		const gateTechs = new Map<string, string>();

		const track = pickAITrack(
			"static_remnants",
			"cult_infantry",
			researched,
			gateTechs,
		);
		expect(track).toBe("");
	});

	it("faction preferences differ between factions", () => {
		const researched = new Set([
			"advanced_recon_optics",
			"combat_chassis_specialization",
		]);
		const gateTechs = new Map<string, string>();
		for (const entry of TRACK_REGISTRY.values()) {
			gateTechs.set(entry.trackId, entry.gateTechId);
		}

		const reclScout = pickAITrack("reclaimers", "scout", researched, gateTechs);
		const voltScout = pickAITrack(
			"volt_collective",
			"scout",
			researched,
			gateTechs,
		);
		expect(reclScout).toBe("pathfinder");
		expect(voltScout).toBe("infiltrator");

		const reclInf = pickAITrack(
			"reclaimers",
			"infantry",
			researched,
			gateTechs,
		);
		const signInf = pickAITrack(
			"signal_choir",
			"infantry",
			researched,
			gateTechs,
		);
		expect(reclInf).toBe("vanguard");
		expect(signInf).toBe("shock_trooper");
	});
});
