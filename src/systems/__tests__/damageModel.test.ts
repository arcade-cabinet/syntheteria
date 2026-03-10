/**
 * Tests for the unified damage model.
 *
 * Tests cover:
 * - Base damage passthrough
 * - Armor reduces kinetic damage
 * - Shield reduces energy damage
 * - Firewall reduces hacking damage
 * - Percentage resistances (environmental, acid, EM)
 * - Critical hits
 * - Armor penetration
 * - Environment modifiers
 * - Splash damage falloff
 * - DPS calculation
 * - Effective HP
 * - Minimum damage floor
 * - Overkill tracking
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	calculateDamage,
	calculateSplashDamage,
	calculateDPS,
	effectiveHP,
	setRandomFn,
	resetDamageModel,
	type DamageSource,
	type DamageTarget,
} from "../damageModel";

const baseTarget: DamageTarget = {
	armor: 0,
	shield: 0,
	firewall: 0,
	environmentalResist: 0,
	acidResist: 0,
	emResist: 0,
};

beforeEach(() => {
	resetDamageModel();
	// Default: no crits
	setRandomFn(() => 1.0);
});

// ---------------------------------------------------------------------------
// Basic damage
// ---------------------------------------------------------------------------

describe("basic damage", () => {
	it("passes through base damage with no armor", () => {
		const source: DamageSource = { baseDamage: 10, type: "kinetic" };
		const result = calculateDamage(source, baseTarget);
		expect(result.finalDamage).toBe(10);
		expect(result.wasCritical).toBe(false);
	});

	it("different damage types pass through unarmored target", () => {
		for (const type of [
			"kinetic",
			"energy",
			"hacking",
			"environmental",
			"acid",
			"electromagnetic",
		] as const) {
			const source: DamageSource = { baseDamage: 20, type };
			const result = calculateDamage(source, baseTarget);
			expect(result.finalDamage).toBe(20);
		}
	});

	it("zero base damage = zero final damage", () => {
		const source: DamageSource = { baseDamage: 0, type: "kinetic" };
		const result = calculateDamage(source, baseTarget);
		expect(result.finalDamage).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Kinetic + Armor
// ---------------------------------------------------------------------------

describe("kinetic damage with armor", () => {
	it("armor reduces kinetic damage", () => {
		const source: DamageSource = { baseDamage: 10, type: "kinetic" };
		const target: DamageTarget = { ...baseTarget, armor: 4 };
		const result = calculateDamage(source, target);
		// 4 armor * 0.5 = 2 reduction
		expect(result.finalDamage).toBe(8);
		expect(result.damageReduced).toBe(2);
	});

	it("armor cannot reduce below 0", () => {
		const source: DamageSource = { baseDamage: 5, type: "kinetic" };
		const target: DamageTarget = { ...baseTarget, armor: 100 };
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(0);
	});

	it("armor penetration ignores portion of armor", () => {
		const source: DamageSource = {
			baseDamage: 10,
			type: "kinetic",
			armorPenetration: 0.5, // ignore 50% of armor
		};
		const target: DamageTarget = { ...baseTarget, armor: 10 };
		// Effective armor = 10 * (1 - 0.5) = 5, reduction = 5 * 0.5 = 2.5
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(7.5);
	});

	it("full armor penetration ignores all armor", () => {
		const source: DamageSource = {
			baseDamage: 10,
			type: "kinetic",
			armorPenetration: 1.0,
		};
		const target: DamageTarget = { ...baseTarget, armor: 100 };
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(10);
	});

	it("armor does NOT affect energy damage", () => {
		const source: DamageSource = { baseDamage: 10, type: "energy" };
		const target: DamageTarget = { ...baseTarget, armor: 100 };
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Energy + Shield
// ---------------------------------------------------------------------------

describe("energy damage with shield", () => {
	it("shield reduces energy damage", () => {
		const source: DamageSource = { baseDamage: 10, type: "energy" };
		const target: DamageTarget = { ...baseTarget, shield: 6 };
		// 6 * 0.5 = 3 reduction
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(7);
	});

	it("shield does not affect kinetic", () => {
		const source: DamageSource = { baseDamage: 10, type: "kinetic" };
		const target: DamageTarget = { ...baseTarget, shield: 100 };
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Hacking + Firewall
// ---------------------------------------------------------------------------

describe("hacking damage with firewall", () => {
	it("firewall reduces hacking damage", () => {
		const source: DamageSource = { baseDamage: 10, type: "hacking" };
		const target: DamageTarget = { ...baseTarget, firewall: 8 };
		// 8 * 0.5 = 4 reduction
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(6);
	});
});

// ---------------------------------------------------------------------------
// Percentage resistances
// ---------------------------------------------------------------------------

describe("percentage resistances", () => {
	it("environmental resist reduces environmental damage", () => {
		const source: DamageSource = { baseDamage: 20, type: "environmental" };
		const target: DamageTarget = {
			...baseTarget,
			environmentalResist: 0.5,
		};
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(10);
	});

	it("acid resist reduces acid damage", () => {
		const source: DamageSource = { baseDamage: 30, type: "acid" };
		const target: DamageTarget = { ...baseTarget, acidResist: 0.75 };
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(7.5);
	});

	it("EM resist reduces electromagnetic damage", () => {
		const source: DamageSource = {
			baseDamage: 40,
			type: "electromagnetic",
		};
		const target: DamageTarget = { ...baseTarget, emResist: 0.25 };
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(30);
	});

	it("100% resistance = 0 damage", () => {
		const source: DamageSource = { baseDamage: 100, type: "acid" };
		const target: DamageTarget = { ...baseTarget, acidResist: 1.0 };
		const result = calculateDamage(source, target);
		expect(result.finalDamage).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Critical hits
// ---------------------------------------------------------------------------

describe("critical hits", () => {
	it("crit doubles damage with default multiplier", () => {
		setRandomFn(() => 0.0); // always crit
		const source: DamageSource = {
			baseDamage: 10,
			type: "kinetic",
			critChance: 0.5,
		};
		const result = calculateDamage(source, baseTarget);
		expect(result.finalDamage).toBe(20);
		expect(result.wasCritical).toBe(true);
	});

	it("custom crit multiplier", () => {
		setRandomFn(() => 0.0);
		const source: DamageSource = {
			baseDamage: 10,
			type: "kinetic",
			critChance: 0.5,
			critMultiplier: 3.0,
		};
		const result = calculateDamage(source, baseTarget);
		expect(result.finalDamage).toBe(30);
	});

	it("no crit when chance is 0", () => {
		setRandomFn(() => 0.0);
		const source: DamageSource = {
			baseDamage: 10,
			type: "kinetic",
			critChance: 0,
		};
		const result = calculateDamage(source, baseTarget);
		expect(result.finalDamage).toBe(10);
		expect(result.wasCritical).toBe(false);
	});

	it("no crit when roll exceeds chance", () => {
		setRandomFn(() => 0.5); // roll = 0.5
		const source: DamageSource = {
			baseDamage: 10,
			type: "kinetic",
			critChance: 0.3, // need < 0.3
		};
		const result = calculateDamage(source, baseTarget);
		expect(result.finalDamage).toBe(10);
		expect(result.wasCritical).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Environment modifiers
// ---------------------------------------------------------------------------

describe("environment modifiers", () => {
	it("global damage multiplier", () => {
		const source: DamageSource = { baseDamage: 10, type: "kinetic" };
		const result = calculateDamage(source, baseTarget, {
			globalDamageMultiplier: 1.5,
		});
		expect(result.finalDamage).toBe(15);
	});

	it("type-specific bonus", () => {
		const source: DamageSource = { baseDamage: 10, type: "energy" };
		const result = calculateDamage(source, baseTarget, {
			typeBonuses: { energy: 2.0 },
		});
		expect(result.finalDamage).toBe(20);
	});

	it("combined global and type bonuses stack multiplicatively", () => {
		const source: DamageSource = { baseDamage: 10, type: "energy" };
		const result = calculateDamage(source, baseTarget, {
			globalDamageMultiplier: 1.5,
			typeBonuses: { energy: 2.0 },
		});
		expect(result.finalDamage).toBe(30); // 10 * 1.5 * 2.0
	});
});

// ---------------------------------------------------------------------------
// Overkill
// ---------------------------------------------------------------------------

describe("overkill tracking", () => {
	it("calculates overkill when damage exceeds HP", () => {
		const source: DamageSource = { baseDamage: 25, type: "kinetic" };
		const result = calculateDamage(source, baseTarget, undefined, 10);
		expect(result.finalDamage).toBe(25);
		expect(result.overkill).toBe(15);
	});

	it("overkill is 0 when damage <= HP", () => {
		const source: DamageSource = { baseDamage: 5, type: "kinetic" };
		const result = calculateDamage(source, baseTarget, undefined, 10);
		expect(result.overkill).toBe(0);
	});

	it("overkill is 0 when HP not provided", () => {
		const source: DamageSource = { baseDamage: 100, type: "kinetic" };
		const result = calculateDamage(source, baseTarget);
		expect(result.overkill).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Splash damage
// ---------------------------------------------------------------------------

describe("splash damage", () => {
	it("full damage at center", () => {
		const source: DamageSource = { baseDamage: 100, type: "kinetic" };
		expect(calculateSplashDamage(source, 0, 10)).toBe(100);
	});

	it("reduced damage at distance", () => {
		const source: DamageSource = {
			baseDamage: 100,
			type: "kinetic",
			splashFalloff: 0.2,
		};
		// At half radius: multiplier = 1 - 0.5 * (1 - 0.2) = 1 - 0.4 = 0.6
		expect(calculateSplashDamage(source, 5, 10)).toBe(60);
	});

	it("zero damage at max radius", () => {
		const source: DamageSource = { baseDamage: 100, type: "kinetic" };
		expect(calculateSplashDamage(source, 10, 10)).toBe(0);
	});

	it("zero damage beyond max radius", () => {
		const source: DamageSource = { baseDamage: 100, type: "kinetic" };
		expect(calculateSplashDamage(source, 15, 10)).toBe(0);
	});

	it("minimum splash at edge with falloff", () => {
		const source: DamageSource = {
			baseDamage: 100,
			type: "kinetic",
			splashFalloff: 0.5,
		};
		// At edge (t=0.99...): multiplier ≈ 0.5
		const atEdge = calculateSplashDamage(source, 9.99, 10);
		expect(atEdge).toBeGreaterThan(0);
		expect(atEdge).toBeLessThan(60);
	});
});

// ---------------------------------------------------------------------------
// DPS calculation
// ---------------------------------------------------------------------------

describe("DPS calculation", () => {
	it("base DPS = damage * attack speed", () => {
		expect(calculateDPS(10, 2, 0, 1)).toBe(20);
	});

	it("crit chance increases expected DPS", () => {
		// 50% chance for 2x crit = 50% bonus
		const dps = calculateDPS(10, 1, 0.5, 2);
		expect(dps).toBe(15); // 10 * 1 * (1 + 0.5 * 1)
	});

	it("higher crit multiplier increases DPS", () => {
		const dps = calculateDPS(10, 1, 0.5, 3);
		expect(dps).toBe(20); // 10 * 1 * (1 + 0.5 * 2)
	});
});

// ---------------------------------------------------------------------------
// Effective HP
// ---------------------------------------------------------------------------

describe("effective HP", () => {
	it("no armor means base HP", () => {
		expect(effectiveHP(100, 0)).toBe(100);
	});

	it("armor increases effective HP for kinetic", () => {
		const ehp = effectiveHP(100, 10);
		expect(ehp).toBeGreaterThan(100);
	});

	it("armor does not affect effective HP for energy", () => {
		expect(effectiveHP(100, 100, "energy")).toBe(100);
	});
});
