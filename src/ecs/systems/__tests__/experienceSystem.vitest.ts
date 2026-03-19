import { createWorld } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import type { RobotClass } from "../../robots/types";
import { UnitFaction, UnitPos, UnitStats, UnitXP } from "../../traits/unit";
import {
	BASE_XP,
	CLASS_ROLE,
	OFF_ROLE_MULTIPLIER,
	ROLE_ACTIONS,
	applyMarkUpgrade,
	awardXP,
	calculateXPForAction,
	getMarkThreshold,
	getXPForNextMark,
	getXPProgress,
	isRoleAligned,
	recordHarvest,
	recordKill,
	resetAllXP,
} from "../experienceSystem";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWorld() {
	return createWorld();
}

function spawnUnit(
	world: ReturnType<typeof createWorld>,
	factionId = "player",
) {
	return world.spawn(
		UnitPos({ tileX: 0, tileZ: 0 }),
		UnitFaction({ factionId }),
		UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4, attack: 2, defense: 0 }),
		UnitXP({ xp: 0, markLevel: 1, killCount: 0, harvestCount: 0 }),
	);
}

// ─── Mark thresholds ──────────────────────────────────────────────────────────

describe("Mark thresholds", () => {
	it("Mark 1 requires 0 XP (starting level)", () => {
		expect(getMarkThreshold(1)).toBe(0);
	});

	it("Mark 2 requires 100 XP", () => {
		expect(getMarkThreshold(2)).toBe(100);
	});

	it("thresholds grow exponentially", () => {
		const m2 = getXPForNextMark(1); // Mark 1 → 2
		const m3 = getXPForNextMark(2); // Mark 2 → 3
		const m4 = getXPForNextMark(3); // Mark 3 → 4

		expect(m2).toBe(100);
		expect(m3).toBe(200);
		expect(m4).toBe(400);
		expect(m4).toBeGreaterThan(m3);
		expect(m3).toBeGreaterThan(m2);
	});
});

// ─── Role alignment ──────────────────────────────────────────────────────────

describe("role alignment", () => {
	it("worker (industry) aligns with harvest, build, repair", () => {
		expect(isRoleAligned("worker", "harvest")).toBe(true);
		expect(isRoleAligned("worker", "build")).toBe(true);
		expect(isRoleAligned("worker", "repair")).toBe(true);
	});

	it("infantry (combat) aligns with combat, hack, breach", () => {
		expect(isRoleAligned("infantry", "combat")).toBe(true);
		expect(isRoleAligned("infantry", "hack")).toBe(true);
		expect(isRoleAligned("infantry", "breach")).toBe(true);
	});

	it("scout (utility) aligns with explore, survey, relay", () => {
		expect(isRoleAligned("scout", "explore")).toBe(true);
		expect(isRoleAligned("scout", "survey")).toBe(true);
		expect(isRoleAligned("scout", "relay")).toBe(true);
	});

	it("support (expansion) aligns with build, repair, fortify", () => {
		expect(isRoleAligned("support", "build")).toBe(true);
		expect(isRoleAligned("support", "repair")).toBe(true);
		expect(isRoleAligned("support", "fortify")).toBe(true);
	});

	it("off-role actions are not aligned", () => {
		expect(isRoleAligned("worker", "combat")).toBe(false);
		expect(isRoleAligned("infantry", "harvest")).toBe(false);
		expect(isRoleAligned("scout", "build")).toBe(false);
	});

	it("all robot classes have a role family", () => {
		const classes: RobotClass[] = [
			"scout", "infantry", "cavalry", "ranged", "support", "worker",
			"cult_infantry", "cult_ranged", "cult_cavalry",
		];
		for (const cls of classes) {
			expect(CLASS_ROLE[cls]).toBeDefined();
		}
	});
});

// ─── XP calculation ──────────────────────────────────────────────────────────

describe("XP calculation", () => {
	it("role-aligned actions give full XP (10)", () => {
		expect(calculateXPForAction("worker", "harvest")).toBe(BASE_XP);
	});

	it("off-role actions give 50% XP (5)", () => {
		expect(calculateXPForAction("worker", "combat")).toBe(
			Math.floor(BASE_XP * OFF_ROLE_MULTIPLIER),
		);
	});

	it("bonus multiplier scales XP", () => {
		expect(calculateXPForAction("worker", "harvest", 2)).toBe(20);
	});

	it("bonus multiplier applies to off-role too", () => {
		expect(calculateXPForAction("worker", "combat", 2)).toBe(10);
	});
});

// ─── XP accumulation via entity ──────────────────────────────────────────────

describe("XP accumulation", () => {
	it("awards XP and tracks per unit via entity trait", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		const result = awardXP(world, entity.id(), "worker", "harvest");

		expect(result.xpEarned).toBe(10);
		expect(result.upgradeEligible).toBe(false);
		expect(result.newMarkLevel).toBe(1);

		const xp = entity.get(UnitXP);
		expect(xp?.xp).toBe(10);
		expect(xp?.markLevel).toBe(1);
	});

	it("accumulates XP across multiple actions", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		for (let i = 0; i < 5; i++) {
			awardXP(world, entity.id(), "worker", "harvest");
		}
		expect(entity.get(UnitXP)?.xp).toBe(50);
	});

	it("auto-upgrades at threshold and returns new mark level", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		// Mark 1 → 2 needs 100 XP at 10 per action = 10 actions
		for (let i = 0; i < 9; i++) {
			awardXP(world, entity.id(), "worker", "harvest");
		}
		// 10th action hits 100 XP threshold — auto-upgrades to Mark 2
		const result = awardXP(world, entity.id(), "worker", "harvest");
		expect(result.upgradeEligible).toBe(true);
		expect(result.newMarkLevel).toBe(2);
		expect(entity.get(UnitXP)?.markLevel).toBe(2);
	});

	it("returns defaults for nonexistent entity", () => {
		const world = makeWorld();
		const result = awardXP(world, 99999, "worker", "harvest");
		expect(result.xpEarned).toBe(10);
		expect(result.upgradeEligible).toBe(false);
		expect(result.newMarkLevel).toBe(1);
	});
});

// ─── Mark upgrades ───────────────────────────────────────────────────────────

describe("Mark upgrades", () => {
	it("auto-applies upgrade via awardXP at threshold", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		for (let i = 0; i < 10; i++) {
			awardXP(world, entity.id(), "worker", "harvest");
		}
		// awardXP auto-upgrades so mark should already be 2
		expect(entity.get(UnitXP)?.markLevel).toBe(2);
		// Manual applyMarkUpgrade should now fail (not enough XP for mark 3)
		expect(applyMarkUpgrade(world, entity.id())).toBe(false);
	});

	it("fails when not eligible", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		awardXP(world, entity.id(), "worker", "harvest"); // only 10 XP
		expect(applyMarkUpgrade(world, entity.id())).toBe(false);
	});

	it("carries over excess XP after auto-upgrade", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		// 11 actions = 110 XP, threshold for mark 2 is 100
		// Auto-upgrade happens on the 10th action (100 XP), leaving 0 XP
		// 11th action adds 10 more XP at mark 2
		for (let i = 0; i < 11; i++) {
			awardXP(world, entity.id(), "worker", "harvest");
		}
		expect(entity.get(UnitXP)?.xp).toBe(10);
		expect(entity.get(UnitXP)?.markLevel).toBe(2);
	});

	it("fails for nonexistent entity", () => {
		const world = makeWorld();
		expect(applyMarkUpgrade(world, 99999)).toBe(false);
	});

	it("successive auto-upgrades require more XP", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		// Mark 1→2 at 100 XP (10 actions), Mark 2→3 at 200 XP (20 more actions)
		// After 10 actions: auto-upgrade to Mark 2, 0 XP remaining
		for (let i = 0; i < 10; i++) {
			awardXP(world, entity.id(), "worker", "harvest");
		}
		expect(entity.get(UnitXP)?.markLevel).toBe(2);

		// 20 more actions = 200 XP → auto-upgrade to Mark 3
		for (let i = 0; i < 20; i++) {
			awardXP(world, entity.id(), "worker", "harvest");
		}
		expect(entity.get(UnitXP)?.markLevel).toBe(3);
	});
});

// ─── XP progress ─────────────────────────────────────────────────────────────

describe("getXPProgress", () => {
	it("returns fraction [0, 1]", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		awardXP(world, entity.id(), "worker", "harvest"); // 10 of 100
		expect(getXPProgress(world, entity.id())).toBeCloseTo(0.1);
	});

	it("resets to 0 after auto-upgrade at threshold", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		// 10 actions = 100 XP = Mark 2 auto-upgrade, 0 XP remaining
		for (let i = 0; i < 10; i++) {
			awardXP(world, entity.id(), "worker", "harvest");
		}
		// Progress should be 0 (just upgraded, 0/200 toward Mark 3)
		expect(getXPProgress(world, entity.id())).toBeCloseTo(0);
	});

	it("returns 0 for nonexistent entity", () => {
		const world = makeWorld();
		expect(getXPProgress(world, 99999)).toBe(0);
	});
});

// ─── Kill/harvest counters ───────────────────────────────────────────────────

describe("kill and harvest counters", () => {
	it("recordKill increments kill count", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		recordKill(world, entity.id());
		recordKill(world, entity.id());
		expect(entity.get(UnitXP)?.killCount).toBe(2);
	});

	it("recordHarvest increments harvest count", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		recordHarvest(world, entity.id());
		expect(entity.get(UnitXP)?.harvestCount).toBe(1);
	});

	it("counters don't affect XP", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		recordKill(world, entity.id());
		recordHarvest(world, entity.id());
		expect(entity.get(UnitXP)?.xp).toBe(0);
	});
});

// ─── Reset ───────────────────────────────────────────────────────────────────

describe("resetAllXP", () => {
	it("resets all unit XP to 0 mark 1", () => {
		const world = makeWorld();
		const entity = spawnUnit(world);
		awardXP(world, entity.id(), "worker", "harvest");
		recordKill(world, entity.id());
		expect(entity.get(UnitXP)?.xp).toBe(10);

		resetAllXP(world);
		expect(entity.get(UnitXP)?.xp).toBe(0);
		expect(entity.get(UnitXP)?.markLevel).toBe(1);
		expect(entity.get(UnitXP)?.killCount).toBe(0);
		expect(entity.get(UnitXP)?.harvestCount).toBe(0);
	});
});

// ─── Config validation ──────────────────────────────────────────────────────

describe("config validation", () => {
	it("every role family has at least one aligned action", () => {
		for (const [family, actions] of Object.entries(ROLE_ACTIONS)) {
			expect(actions.length).toBeGreaterThan(0);
		}
	});

	it("every robot class maps to a valid role family", () => {
		for (const [cls, family] of Object.entries(CLASS_ROLE)) {
			expect(ROLE_ACTIONS[family as keyof typeof ROLE_ACTIONS]).toBeDefined();
		}
	});
});
