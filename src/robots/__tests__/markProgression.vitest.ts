import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyMarkUpgrade, awardXP, getMarkThreshold } from "../../systems";
import { UnitFaction, UnitPos, UnitStats, UnitXP } from "../../traits";
import {
	getMarkSpecEffectValue,
	getMarkSpecializations,
	hasMarkSpecEffect,
	MARK_DEFS,
	MARK_SPECIALIZATIONS,
	MAX_MARK_LEVEL,
} from "../marks";
import type { RobotClass } from "../types";

describe("Mark I-V progression", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnUnit(markLevel = 1, xp = 0) {
		return world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitXP({ xp, markLevel, killCount: 0, harvestCount: 0 }),
		);
	}

	// ─── BotTier / MAX_MARK_LEVEL ──────────────────────────────────────

	describe("tier expansion", () => {
		it("MAX_MARK_LEVEL is 5", () => {
			expect(MAX_MARK_LEVEL).toBe(5);
		});

		it("mark thresholds exist for all 5 levels", () => {
			expect(getMarkThreshold(1)).toBe(0);
			expect(getMarkThreshold(2)).toBe(100);
			expect(getMarkThreshold(3)).toBe(300);
			expect(getMarkThreshold(4)).toBe(700);
			expect(getMarkThreshold(5)).toBe(1500);
		});

		it("applyMarkUpgrade caps at Mark V", () => {
			const entity = spawnUnit(5, 99999);
			const upgraded = applyMarkUpgrade(world, entity.id());
			expect(upgraded).toBe(false);
			expect(entity.get(UnitXP)!.markLevel).toBe(5);
		});

		it("applyMarkUpgrade allows upgrade to Mark V", () => {
			// Mark 4 → 5 requires 800 XP (1500-700)
			const entity = spawnUnit(4, 800);
			const upgraded = applyMarkUpgrade(world, entity.id());
			expect(upgraded).toBe(true);
			expect(entity.get(UnitXP)!.markLevel).toBe(5);
		});

		it("can progress through all 5 marks via auto-upgrade", () => {
			const entity = spawnUnit(1, 0);

			// Award enough XP for all 5 marks via awardXP auto-upgrade
			// Mark 1→2: 100 XP (10 actions)
			// Mark 2→3: 200 XP (20 actions)
			// Mark 3→4: 400 XP (40 actions)
			// Mark 4→5: 800 XP (80 actions)
			// Total: 1500 XP = 150 actions
			for (let i = 0; i < 150; i++) {
				awardXP(world, entity.id(), "worker", "harvest"); // 10 XP each
			}

			// Auto-upgrade should have progressed through all marks
			expect(entity.get(UnitXP)!.markLevel).toBe(5);

			// Mark 5 is the cap — no more upgrades possible
			expect(applyMarkUpgrade(world, entity.id())).toBe(false);
		});
	});

	// ─── Mark definitions ──────────────────────────────────────────────

	describe("mark definitions", () => {
		it("has 7 total marks defined", () => {
			expect(Object.keys(MARK_DEFS)).toHaveLength(7);
		});

		it("power_core requires tier 4", () => {
			expect(MARK_DEFS.power_core.minTier).toBe(4);
			expect(MARK_DEFS.power_core.effects.maxHp).toBe(5);
			expect(MARK_DEFS.power_core.effects.attack).toBe(2);
		});

		it("quantum_processor requires tier 5", () => {
			expect(MARK_DEFS.quantum_processor.minTier).toBe(5);
			expect(MARK_DEFS.quantum_processor.effects.scanRange).toBe(3);
		});
	});

	// ─── Mark specializations ──────────────────────────────────────────

	describe("mark specializations", () => {
		it("6 player robot classes have specializations defined", () => {
			const playerClasses: RobotClass[] = [
				"support",
				"infantry",
				"worker",
				"scout",
				"ranged",
				"cavalry",
			];
			for (const cls of playerClasses) {
				expect(MARK_SPECIALIZATIONS[cls]).toBeDefined();
				expect(MARK_SPECIALIZATIONS[cls]!.length).toBe(3); // Mark III, IV, V
			}
		});

		it("cult classes have no specializations", () => {
			const cultClasses: RobotClass[] = [
				"cult_infantry",
				"cult_ranged",
				"cult_cavalry",
			];
			for (const cls of cultClasses) {
				expect(MARK_SPECIALIZATIONS[cls]).toBeUndefined();
			}
		});

		it("getMarkSpecializations returns empty below Mark III", () => {
			expect(getMarkSpecializations("support", 1)).toEqual([]);
			expect(getMarkSpecializations("support", 2)).toEqual([]);
		});

		it("getMarkSpecializations returns Mark III spec at level 3", () => {
			const specs = getMarkSpecializations("support", 3);
			expect(specs).toHaveLength(1);
			expect(specs[0]!.label).toBe("Auto-Repair Aura");
			expect(specs[0]!.markLevel).toBe(3);
		});

		it("getMarkSpecializations returns Mark III+IV at level 4", () => {
			const specs = getMarkSpecializations("infantry", 4);
			expect(specs).toHaveLength(2);
			expect(specs[0]!.effectType).toBe("component_targeting");
			expect(specs[1]!.effectType).toBe("armor_pierce");
		});

		it("getMarkSpecializations returns all 3 at Mark V", () => {
			const specs = getMarkSpecializations("worker", 5);
			expect(specs).toHaveLength(3);
			expect(specs[2]!.effectType).toBe("instant_build");
		});

		it("hasMarkSpecEffect detects active specializations", () => {
			expect(hasMarkSpecEffect("support", 3, "repair_aura")).toBe(true);
			expect(hasMarkSpecEffect("support", 2, "repair_aura")).toBe(false);
			expect(hasMarkSpecEffect("support", 3, "nonexistent")).toBe(false);
		});

		it("getMarkSpecEffectValue returns correct value", () => {
			expect(getMarkSpecEffectValue("support", 3, "repair_aura")).toBe(2);
			expect(getMarkSpecEffectValue("support", 4, "repair_aura")).toBe(4); // Mark IV overrides
			expect(getMarkSpecEffectValue("scout", 3, "vision_bonus")).toBe(3);
		});

		it("getMarkSpecEffectValue returns 0 for no match", () => {
			expect(getMarkSpecEffectValue("support", 2, "repair_aura")).toBe(0);
			expect(getMarkSpecEffectValue("cult_infantry", 5, "anything")).toBe(0);
		});
	});

	// ─── Per-class specialization content ──────────────────────────────

	describe("per-class specializations", () => {
		it("support: repair aura → enhanced repair aura → transcendent", () => {
			const specs = MARK_SPECIALIZATIONS.support!;
			expect(specs[0]!.effectType).toBe("repair_aura");
			expect(specs[1]!.effectType).toBe("repair_aura");
			expect(specs[2]!.effectType).toBe("repair_aura_range");
		});

		it("infantry: component targeting → armor pierce → double strike", () => {
			const specs = MARK_SPECIALIZATIONS.infantry!;
			expect(specs[0]!.effectType).toBe("component_targeting");
			expect(specs[1]!.effectType).toBe("armor_pierce");
			expect(specs[2]!.effectType).toBe("double_strike");
		});

		it("worker: multi-harvest → efficient harvest → instant build", () => {
			const specs = MARK_SPECIALIZATIONS.worker!;
			expect(specs[0]!.effectType).toBe("multi_harvest");
			expect(specs[1]!.effectType).toBe("harvest_bonus");
			expect(specs[2]!.effectType).toBe("instant_build");
		});

		it("scout: wider vision → stealth → map reveal", () => {
			const specs = MARK_SPECIALIZATIONS.scout!;
			expect(specs[0]!.effectType).toBe("vision_bonus");
			expect(specs[1]!.effectType).toBe("stealth");
			expect(specs[2]!.effectType).toBe("map_reveal");
		});

		it("cavalry: charge strike → evasion → blitz", () => {
			const specs = MARK_SPECIALIZATIONS.cavalry!;
			expect(specs[0]!.effectType).toBe("charge_bonus");
			expect(specs[1]!.effectType).toBe("evasion");
			expect(specs[2]!.effectType).toBe("blitz");
		});
	});
});
