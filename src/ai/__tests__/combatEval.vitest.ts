import { describe, expect, it } from "vitest";
import {
	ATTACK_THRESHOLD,
	type CombatUnit,
	computeArmyStrength,
	computeLocalStrength,
	evaluateCombat,
	evaluateLocalCombat,
	LOCAL_FORCE_RADIUS,
	RETREAT_THRESHOLD,
} from "../planning/combatEval";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(overrides: Partial<CombatUnit> = {}): CombatUnit {
	return {
		x: 0,
		z: 0,
		attack: 3,
		hp: 10,
		defense: 0,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// computeArmyStrength
// ---------------------------------------------------------------------------

describe("computeArmyStrength", () => {
	it("returns 0 for empty army", () => {
		expect(computeArmyStrength([])).toBe(0);
	});

	it("computes attack * HP for single unit", () => {
		const units = [makeUnit({ attack: 4, hp: 10, defense: 0 })];
		expect(computeArmyStrength(units)).toBe(40); // 4 * 10
	});

	it("sums across multiple units", () => {
		const units = [
			makeUnit({ attack: 3, hp: 10, defense: 0 }),
			makeUnit({ attack: 2, hp: 5, defense: 0 }),
		];
		expect(computeArmyStrength(units)).toBe(40); // 30 + 10
	});

	it("defense adds 10% effective HP per point", () => {
		const units = [makeUnit({ attack: 4, hp: 10, defense: 2 })];
		// effectiveHp = 10 * (1 + 2 * 0.1) = 10 * 1.2 = 12
		// strength = 4 * 12 = 48
		expect(computeArmyStrength(units)).toBe(48);
	});

	it("units with 0 attack contribute 0 strength", () => {
		const units = [makeUnit({ attack: 0, hp: 10, defense: 5 })];
		expect(computeArmyStrength(units)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// computeLocalStrength
// ---------------------------------------------------------------------------

describe("computeLocalStrength", () => {
	it("only counts units within LOCAL_FORCE_RADIUS", () => {
		const units = [
			makeUnit({ x: 5, z: 5, attack: 3, hp: 10 }), // dist = 0 from (5,5)
			makeUnit({ x: 20, z: 20, attack: 3, hp: 10 }), // dist = 30, out of range
		];
		const strength = computeLocalStrength(units, 5, 5);
		expect(strength).toBe(30); // Only the nearby unit
	});

	it("counts all units when all are within range", () => {
		const units = [
			makeUnit({ x: 5, z: 5, attack: 3, hp: 10 }),
			makeUnit({ x: 6, z: 5, attack: 2, hp: 10 }),
		];
		const strength = computeLocalStrength(units, 5, 5);
		expect(strength).toBe(50); // 30 + 20
	});

	it("returns 0 when no units are in range", () => {
		const units = [makeUnit({ x: 50, z: 50, attack: 3, hp: 10 })];
		expect(computeLocalStrength(units, 0, 0)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// evaluateCombat
// ---------------------------------------------------------------------------

describe("evaluateCombat", () => {
	it("returns attack when we have overwhelming advantage", () => {
		const my = [
			makeUnit({ attack: 5, hp: 10 }),
			makeUnit({ attack: 5, hp: 10 }),
		];
		const enemy = [makeUnit({ attack: 2, hp: 5 })];
		const result = evaluateCombat(my, enemy);
		expect(result.decision).toBe("attack");
		expect(result.ratio).toBeGreaterThan(ATTACK_THRESHOLD);
	});

	it("returns retreat when severely outnumbered", () => {
		const my = [makeUnit({ attack: 2, hp: 3 })];
		const enemy = [
			makeUnit({ attack: 5, hp: 10 }),
			makeUnit({ attack: 5, hp: 10 }),
			makeUnit({ attack: 5, hp: 10 }),
		];
		const result = evaluateCombat(my, enemy);
		expect(result.decision).toBe("retreat");
		expect(result.ratio).toBeLessThan(RETREAT_THRESHOLD);
	});

	it("returns hold when roughly even", () => {
		const my = [makeUnit({ attack: 3, hp: 10 })];
		const enemy = [makeUnit({ attack: 4, hp: 10 })];
		const _result = evaluateCombat(my, enemy);
		// ratio = 30/40 = 0.75 > ATTACK_THRESHOLD(0.7) → actually attack
		// Let's use a tighter matchup
		const my2 = [makeUnit({ attack: 3, hp: 8 })];
		const enemy2 = [makeUnit({ attack: 3, hp: 15 })];
		const result2 = evaluateCombat(my2, enemy2);
		// ratio = 24/45 = 0.533 → between 0.3 and 0.7 → hold
		expect(result2.decision).toBe("hold");
	});

	it("returns attack when enemy has 0 strength", () => {
		const my = [makeUnit({ attack: 1, hp: 1 })];
		const enemy: CombatUnit[] = [];
		const result = evaluateCombat(my, enemy);
		expect(result.decision).toBe("attack");
		expect(result.ratio).toBe(Infinity);
	});

	it("returns retreat when we have 0 strength", () => {
		const my: CombatUnit[] = [];
		const enemy = [makeUnit({ attack: 5, hp: 10 })];
		const result = evaluateCombat(my, enemy);
		expect(result.decision).toBe("retreat");
		expect(result.ratio).toBe(0);
	});

	it("strength values are computed correctly", () => {
		const my = [makeUnit({ attack: 4, hp: 10, defense: 1 })];
		const enemy = [makeUnit({ attack: 3, hp: 8, defense: 0 })];
		const result = evaluateCombat(my, enemy);
		expect(result.myStrength).toBe(44); // 4 * 10 * 1.1
		expect(result.enemyStrength).toBe(24); // 3 * 8
	});
});

// ---------------------------------------------------------------------------
// evaluateLocalCombat
// ---------------------------------------------------------------------------

describe("evaluateLocalCombat", () => {
	it("only considers units within LOCAL_FORCE_RADIUS of position", () => {
		const friendlies = [
			makeUnit({ x: 5, z: 5, attack: 5, hp: 10 }), // nearby
			makeUnit({ x: 50, z: 50, attack: 5, hp: 10 }), // far away
		];
		const enemies = [
			makeUnit({ x: 6, z: 5, attack: 3, hp: 10 }), // nearby
		];
		const result = evaluateLocalCombat(5, 5, friendlies, enemies);
		// My local = 50 (only the nearby friendly)
		// Enemy local = 30
		expect(result.myStrength).toBe(50);
		expect(result.enemyStrength).toBe(30);
		expect(result.decision).toBe("attack");
	});

	it("returns attack when no local enemies", () => {
		const friendlies = [makeUnit({ x: 5, z: 5, attack: 3, hp: 10 })];
		const enemies = [makeUnit({ x: 50, z: 50, attack: 10, hp: 10 })];
		const result = evaluateLocalCombat(5, 5, friendlies, enemies);
		expect(result.decision).toBe("attack");
	});

	it("returns retreat when locally outnumbered despite global advantage", () => {
		const friendlies = [
			makeUnit({ x: 5, z: 5, attack: 2, hp: 3 }),
			// Many strong units far away — don't help locally
			makeUnit({ x: 50, z: 50, attack: 10, hp: 20 }),
			makeUnit({ x: 51, z: 50, attack: 10, hp: 20 }),
		];
		const enemies = [
			makeUnit({ x: 6, z: 5, attack: 5, hp: 10 }),
			makeUnit({ x: 5, z: 6, attack: 5, hp: 10 }),
			makeUnit({ x: 4, z: 5, attack: 5, hp: 10 }),
		];
		const result = evaluateLocalCombat(5, 5, friendlies, enemies);
		expect(result.decision).toBe("retreat");
	});
});

// ---------------------------------------------------------------------------
// Threshold constants
// ---------------------------------------------------------------------------

describe("thresholds", () => {
	it("ATTACK_THRESHOLD is 0.7", () => {
		expect(ATTACK_THRESHOLD).toBe(0.7);
	});

	it("RETREAT_THRESHOLD is 0.3", () => {
		expect(RETREAT_THRESHOLD).toBe(0.3);
	});

	it("LOCAL_FORCE_RADIUS is 6", () => {
		expect(LOCAL_FORCE_RADIUS).toBe(6);
	});
});
