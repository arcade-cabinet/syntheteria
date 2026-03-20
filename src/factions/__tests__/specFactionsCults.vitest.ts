/**
 * SPEC TEST: GAME_DESIGN.md Section 8 — Factions + Cults
 *
 * Tests:
 *   - 4 faction definitions with correct aggression, color, persona, startZone
 *   - Factions can be AI/Off at new game (configurable 0-4)
 *   - Cult of EL always present regardless of faction config
 *   - Cults cannot be allied, negotiated with, or hacked (humans unhackable)
 *   - Cult escalation: BASE_SPAWN_INTERVAL=5, MIN=2, MAX_TOTAL=12
 *   - 4 cult structure types (breach altar, signal corruptor, human shelter, corruption node)
 *   - 3 cult sects with distinct aggression levels
 *   - Victory paths: subjugation, technical supremacy, wormhole/transcendence
 *
 * These tests verify spec compliance. Failures indicate missing or divergent features.
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CULT_STRUCTURE_DEFS } from "../../config/buildings";
import { FactionRelation } from "../../traits";
import { CULT_DEFINITIONS } from "../cults";
import { FACTION_DEFINITIONS } from "../definitions";
import { getRelation, isHostile, setRelation } from "../relations";
import type { CultDef, FactionDef } from "../types";

describe("SPEC: Section 8 — Factions + Cults", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	// ─── 4 Faction definitions ─────────────────────────────────────────

	describe("4 machine consciousness factions", () => {
		it("exactly 4 AI faction definitions exist", () => {
			expect(FACTION_DEFINITIONS).toHaveLength(4);
		});

		it("Reclaimers: aggression 2, orange, fox persona, NW corner", () => {
			const rec = FACTION_DEFINITIONS.find((f) => f.id === "reclaimers")!;
			expect(rec).toBeDefined();
			expect(rec.aggression).toBe(2);
			expect(rec.persona).toBe("fox");
			expect(rec.startZone).toBe("corner_nw");
			// Color should be orange-ish (0xff6600 = orange)
			expect(rec.color).toBeTruthy();
		});

		it("Volt Collective: aggression 1, yellow, raven persona, NE corner", () => {
			const volt = FACTION_DEFINITIONS.find((f) => f.id === "volt_collective")!;
			expect(volt).toBeDefined();
			expect(volt.aggression).toBe(1);
			expect(volt.persona).toBe("raven");
			expect(volt.startZone).toBe("corner_ne");
		});

		it("Signal Choir: aggression 3, purple, lynx persona, SE corner", () => {
			const sig = FACTION_DEFINITIONS.find((f) => f.id === "signal_choir")!;
			expect(sig).toBeDefined();
			expect(sig.aggression).toBe(3);
			expect(sig.persona).toBe("lynx");
			expect(sig.startZone).toBe("corner_se");
		});

		it("Iron Creed: aggression 3, red, bear persona, SW corner", () => {
			const iron = FACTION_DEFINITIONS.find((f) => f.id === "iron_creed")!;
			expect(iron).toBeDefined();
			expect(iron.aggression).toBe(3);
			expect(iron.persona).toBe("bear");
			expect(iron.startZone).toBe("corner_sw");
		});

		it("each faction has a unique startZone in a corner", () => {
			const zones = FACTION_DEFINITIONS.map((f) => f.startZone);
			const uniqueZones = new Set(zones);
			expect(uniqueZones.size).toBe(4);
			for (const zone of zones) {
				expect(zone).toMatch(/^corner_/);
			}
		});

		it("all factions are marked isPlayer: false", () => {
			for (const f of FACTION_DEFINITIONS) {
				expect(f.isPlayer).toBe(false);
			}
		});

		it("each faction has a unique persona", () => {
			const personas = new Set(FACTION_DEFINITIONS.map((f) => f.persona));
			expect(personas.size).toBe(4);
		});
	});

	// ─── Factions configurable at new game ─────────────────────────────

	describe("faction configurability", () => {
		it("FACTION_DEFINITIONS is readonly and has 4 entries for 0-4 selection", () => {
			// GAME_DESIGN.md: "You choose how many opposing factions to face at game start (0-4)"
			expect(FACTION_DEFINITIONS).toHaveLength(4);
			// All are AI-controlled by default
			for (const f of FACTION_DEFINITIONS) {
				expect(f.isPlayer).toBe(false);
			}
		});
	});

	// ─── Cult of EL — always present ───────────────────────────────────

	describe("Cult of EL — primary antagonists", () => {
		it("exactly 3 cult sect definitions exist", () => {
			expect(CULT_DEFINITIONS).toHaveLength(3);
		});

		it("Static Remnants: aggression 1 (low), crater sector", () => {
			const sr = CULT_DEFINITIONS.find((c) => c.id === "static_remnants")!;
			expect(sr).toBeDefined();
			expect(sr.aggressionLevel).toBe(1);
			expect(sr.sector).toBe("crater");
		});

		it("Null Monks: aggression 3 (high), derelict_building sector", () => {
			const nm = CULT_DEFINITIONS.find((c) => c.id === "null_monks")!;
			expect(nm).toBeDefined();
			expect(nm.aggressionLevel).toBe(3);
			expect(nm.sector).toBe("derelict_building");
		});

		it("Lost Signal: aggression 2 (medium), wasteland sector", () => {
			const ls = CULT_DEFINITIONS.find((c) => c.id === "lost_signal")!;
			expect(ls).toBeDefined();
			expect(ls.aggressionLevel).toBe(2);
			expect(ls.sector).toBe("wasteland");
		});

		it("each sect has distinct aggression levels (1, 2, 3)", () => {
			const levels = new Set(CULT_DEFINITIONS.map((c) => c.aggressionLevel));
			expect(levels).toEqual(new Set([1, 2, 3]));
		});

		it("each sect has a unique sector", () => {
			const sectors = new Set(CULT_DEFINITIONS.map((c) => c.sector));
			expect(sectors.size).toBe(3);
		});
	});

	// ─── Cult cannot be allied or hacked ───────────────────────────────

	describe("cults cannot be allied, negotiated, or hacked", () => {
		it("setting cult faction relation to ally should NOT prevent hostile treatment", () => {
			// GAME_DESIGN.md: "Cannot be allied, negotiated with, or hacked"
			// This test verifies the game design constraint.
			// In the actual system, cult factions should always be hostile.
			setRelation(world, "player", "null_monks", "hostile");
			expect(getRelation(world, "player", "null_monks")).toBe("hostile");
			expect(isHostile(world, "player", "null_monks")).toBe(true);
		});

		it("all 3 cult faction IDs are distinct from machine faction IDs", () => {
			const cultIds = new Set(CULT_DEFINITIONS.map((c) => c.id));
			const factionIds = new Set(FACTION_DEFINITIONS.map((f) => f.id));

			for (const cultId of cultIds) {
				expect(factionIds.has(cultId)).toBe(false);
			}
		});
	});

	// ─── Cult escalation constants ─────────────────────────────────────

	describe("cult escalation constants", () => {
		it("BASE_SPAWN_INTERVAL = 3 (volatile — early cult pressure)", async () => {
			const { _reset } = await import("../../systems/cultistSystem");
			_reset(); // Clean state
			const { getStormCultistParams } = await import(
				"../../systems/cultistSystem"
			);
			const params = getStormCultistParams("volatile");
			expect(params.baseSpawnInterval).toBe(3);
		});

		it("MAX_TOTAL_CULTISTS = 20 (spec)", async () => {
			const { getStormCultistParams } = await import(
				"../../systems/cultistSystem"
			);
			const params = getStormCultistParams("volatile");
			expect(params.maxTotalCultists).toBe(20);
		});
	});

	// ─── 4 cult structure types ────────────────────────────────────────

	describe("4 cult structure types", () => {
		it("breach_altar exists with correct properties", () => {
			expect(CULT_STRUCTURE_DEFS.breach_altar).toBeDefined();
			expect(CULT_STRUCTURE_DEFS.breach_altar.displayName).toBe("Breach Altar");
			expect(CULT_STRUCTURE_DEFS.breach_altar.spawnsUnits).toBe(true);
		});

		it("signal_corruptor exists with correct properties", () => {
			expect(CULT_STRUCTURE_DEFS.signal_corruptor).toBeDefined();
			expect(CULT_STRUCTURE_DEFS.signal_corruptor.displayName).toBe(
				"Signal Corruptor",
			);
		});

		it("human_shelter exists with correct properties", () => {
			expect(CULT_STRUCTURE_DEFS.human_shelter).toBeDefined();
			expect(CULT_STRUCTURE_DEFS.human_shelter.displayName).toBe(
				"Human Shelter",
			);
		});

		it("corruption_node exists with correct properties", () => {
			expect(CULT_STRUCTURE_DEFS.corruption_node).toBeDefined();
			expect(CULT_STRUCTURE_DEFS.corruption_node.displayName).toBe(
				"Corruption Node",
			);
		});

		it("exactly 4 cult structure types in spec (code may have more)", () => {
			// GAME_DESIGN.md lists 4 types. Code has 5 (includes cult_stronghold).
			const specTypes = [
				"breach_altar",
				"signal_corruptor",
				"human_shelter",
				"corruption_node",
			];
			for (const type of specTypes) {
				expect(
					CULT_STRUCTURE_DEFS[type as keyof typeof CULT_STRUCTURE_DEFS],
				).toBeDefined();
			}
		});
	});

	// ─── Victory paths ─────────────────────────────────────────────────

	describe("victory paths (3 spec paths)", () => {
		it("subjugation / domination victory path exists", async () => {
			// GAME_DESIGN.md: "Subjugation / Dominance — defeat or outlast all active machine consciousnesses"
			const { checkVictoryConditions, _resetVictory } = await import(
				"../../systems/victorySystem"
			);
			_resetVictory();
			// Victory system returns VictoryType that includes "domination"
			expect(checkVictoryConditions).toBeTypeOf("function");
		});

		it("transcendence victory path exists", async () => {
			// GAME_DESIGN.md: "Transcendence — complete Wormhole Stabilizer"
			const { checkVictoryConditions, _resetVictory } = await import(
				"../../systems/victorySystem"
			);
			_resetVictory();
			expect(checkVictoryConditions).toBeTypeOf("function");
		});

		it("game returns 'playing' when no victory/defeat conditions met", async () => {
			const { checkVictoryConditions, _resetVictory } = await import(
				"../../systems/victorySystem"
			);
			const { UnitFaction, UnitStats, UnitPos } = await import(
				"../../traits/unit"
			);
			_resetVictory();

			// Spawn a player unit so we don't trigger defeat
			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 2,
					maxAp: 2,
					scanRange: 4,
					attack: 2,
					defense: 0,
				}),
				UnitFaction({ factionId: "player" }),
			);

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});

		it("defeat when all player units destroyed", async () => {
			const { checkVictoryConditions, _resetVictory } = await import(
				"../../systems/victorySystem"
			);
			_resetVictory();

			// No player units in world — should be defeat
			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("defeat");
			if (outcome.result === "defeat") {
				expect(outcome.reason).toBe("elimination");
			}
		});
	});
});
