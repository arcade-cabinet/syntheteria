/**
 * Unit tests for cube ammo system — material cubes as thrown projectiles.
 *
 * Tests cover:
 * - Material damage table lookups and fallback
 * - calculateThrowDamage: force scaling, distance falloff, critical hits, break chance
 * - Projectile lifecycle: creation, physics (gravity, movement), expiry
 * - Collision detection: direct hits, splash damage, thrower immunity
 * - Target registry: register, unregister, position updates
 * - Economic analysis: getCubeValue, getDamagePerValue, getBestAmmoForSituation
 * - reset()
 */

import {
	MATERIAL_DAMAGE_TABLE,
	calculateThrowDamage,
	createProjectile,
	getActiveProjectiles,
	getBestAmmoForSituation,
	getCubeValue,
	getDamagePerValue,
	getProjectile,
	registerTarget,
	reset,
	unregisterTarget,
	updateProjectiles,
	updateTargetPosition,
	_setRandomFn,
} from "../cubeAmmo";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Material damage table
// ---------------------------------------------------------------------------

describe("material damage table", () => {
	it("has entries for scrap_iron, copper, iron, rare_alloy, fiber_optics, e_waste", () => {
		expect(MATERIAL_DAMAGE_TABLE.scrap_iron).toBeDefined();
		expect(MATERIAL_DAMAGE_TABLE.copper).toBeDefined();
		expect(MATERIAL_DAMAGE_TABLE.iron).toBeDefined();
		expect(MATERIAL_DAMAGE_TABLE.rare_alloy).toBeDefined();
		expect(MATERIAL_DAMAGE_TABLE.fiber_optics).toBeDefined();
		expect(MATERIAL_DAMAGE_TABLE.e_waste).toBeDefined();
	});

	it("scrap_iron is cheap (low value) with moderate damage", () => {
		const p = MATERIAL_DAMAGE_TABLE.scrap_iron;
		expect(p.baseDamage).toBe(15);
		expect(p.economicValue).toBe(5);
		expect(p.splashRadius).toBe(0);
	});

	it("rare_alloy is expensive with high damage and splash", () => {
		const p = MATERIAL_DAMAGE_TABLE.rare_alloy;
		expect(p.baseDamage).toBe(50);
		expect(p.splashRadius).toBeGreaterThan(0);
		expect(p.economicValue).toBe(100);
	});

	it("e_waste has a poison status effect", () => {
		expect(MATERIAL_DAMAGE_TABLE.e_waste.statusEffect).toBe("poison");
	});

	it("fiber_optics has high break chance", () => {
		expect(MATERIAL_DAMAGE_TABLE.fiber_optics.breakChance).toBeGreaterThanOrEqual(0.7);
	});
});

// ---------------------------------------------------------------------------
// calculateThrowDamage — force scaling
// ---------------------------------------------------------------------------

describe("calculateThrowDamage — force", () => {
	beforeEach(() => {
		// Deterministic: no critical, no break
		_setRandomFn(() => 0.99);
	});

	it("force 10 (reference) gives multiplier 1.0", () => {
		const r = calculateThrowDamage("scrap_iron", 10, 0);
		expect(r.forceMultiplier).toBeCloseTo(1.0);
		expect(r.finalDamage).toBeCloseTo(15);
	});

	it("force 20 doubles the multiplier", () => {
		const r = calculateThrowDamage("scrap_iron", 20, 0);
		expect(r.forceMultiplier).toBeCloseTo(2.0);
		expect(r.finalDamage).toBeCloseTo(30);
	});

	it("force 5 halves the multiplier", () => {
		const r = calculateThrowDamage("scrap_iron", 5, 0);
		expect(r.forceMultiplier).toBeCloseTo(0.5);
		expect(r.finalDamage).toBeCloseTo(7.5);
	});

	it("force 0 gives 0 damage", () => {
		const r = calculateThrowDamage("scrap_iron", 0, 0);
		expect(r.forceMultiplier).toBe(0);
		expect(r.finalDamage).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// calculateThrowDamage — distance falloff
// ---------------------------------------------------------------------------

describe("calculateThrowDamage — distance falloff", () => {
	beforeEach(() => {
		_setRandomFn(() => 0.99);
	});

	it("no penalty within 5m", () => {
		const r = calculateThrowDamage("scrap_iron", 10, 3);
		expect(r.distancePenalty).toBe(0);
		expect(r.finalDamage).toBeCloseTo(15);
	});

	it("partial penalty between 5-30m", () => {
		// At 17.5m: penalty = (17.5 - 5) / (30 - 5) = 0.5
		const r = calculateThrowDamage("scrap_iron", 10, 17.5);
		expect(r.distancePenalty).toBeCloseTo(0.5);
		expect(r.finalDamage).toBeCloseTo(7.5);
	});

	it("full penalty at 30m+", () => {
		const r = calculateThrowDamage("scrap_iron", 10, 30);
		expect(r.distancePenalty).toBe(1);
		expect(r.finalDamage).toBe(0);
	});

	it("full penalty beyond 30m", () => {
		const r = calculateThrowDamage("scrap_iron", 10, 50);
		expect(r.distancePenalty).toBe(1);
		expect(r.finalDamage).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// calculateThrowDamage — critical hits
// ---------------------------------------------------------------------------

describe("calculateThrowDamage — critical hits", () => {
	it("critical hit doubles damage (random < 0.15)", () => {
		_setRandomFn(() => 0.1); // below 0.15 threshold
		const r = calculateThrowDamage("scrap_iron", 10, 0);
		expect(r.isCritical).toBe(true);
		expect(r.finalDamage).toBeCloseTo(30); // 15 * 2
	});

	it("no critical when random >= 0.15", () => {
		_setRandomFn(() => 0.5);
		const r = calculateThrowDamage("scrap_iron", 10, 0);
		expect(r.isCritical).toBe(false);
		expect(r.finalDamage).toBeCloseTo(15);
	});
});

// ---------------------------------------------------------------------------
// calculateThrowDamage — cube break
// ---------------------------------------------------------------------------

describe("calculateThrowDamage — cube destruction", () => {
	it("cube destroyed when random < breakChance", () => {
		// scrap_iron breakChance = 0.3
		// First call to getRandom is for critical (0.99 -> no crit)
		// Second call is for break (0.1 -> break since 0.1 < 0.3)
		let callCount = 0;
		_setRandomFn(() => {
			callCount++;
			return callCount === 1 ? 0.99 : 0.1;
		});
		const r = calculateThrowDamage("scrap_iron", 10, 0);
		expect(r.cubeDestroyed).toBe(true);
	});

	it("cube survives when random >= breakChance", () => {
		_setRandomFn(() => 0.99);
		const r = calculateThrowDamage("scrap_iron", 10, 0);
		expect(r.cubeDestroyed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// calculateThrowDamage — unknown material fallback
// ---------------------------------------------------------------------------

describe("calculateThrowDamage — unknown material", () => {
	it("uses fallback profile for unknown material", () => {
		_setRandomFn(() => 0.99);
		const r = calculateThrowDamage("unobtanium", 10, 0);
		expect(r.baseDamage).toBe(10);
		expect(r.splashRadius).toBe(0);
		expect(r.statusEffect).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// calculateThrowDamage — status effect
// ---------------------------------------------------------------------------

describe("calculateThrowDamage — status effect", () => {
	it("e_waste returns poison status effect", () => {
		_setRandomFn(() => 0.99);
		const r = calculateThrowDamage("e_waste", 10, 0);
		expect(r.statusEffect).toBe("poison");
	});

	it("iron returns null status effect", () => {
		_setRandomFn(() => 0.99);
		const r = calculateThrowDamage("iron", 10, 0);
		expect(r.statusEffect).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Projectile lifecycle
// ---------------------------------------------------------------------------

describe("createProjectile", () => {
	it("creates a projectile and returns its ID", () => {
		const id = createProjectile(
			"cube_1",
			"iron",
			"player",
			{ x: 0, y: 1, z: 0 },
			{ x: 1, y: 0, z: 0 },
			10,
		);
		expect(id).toBe("proj_0");
		expect(getProjectile(id)).toBeDefined();
	});

	it("assigns unique IDs to each projectile", () => {
		const id1 = createProjectile("c1", "iron", "p", { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		const id2 = createProjectile("c2", "iron", "p", { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		expect(id1).not.toBe(id2);
	});

	it("sets initial velocity as direction * force", () => {
		const id = createProjectile(
			"c1",
			"iron",
			"p",
			{ x: 0, y: 5, z: 0 },
			{ x: 1, y: 0, z: 0 },
			15,
		);
		const proj = getProjectile(id)!;
		expect(proj.velocity.x).toBe(15);
		expect(proj.velocity.y).toBe(0);
		expect(proj.velocity.z).toBe(0);
	});

	it("copies position (no reference sharing)", () => {
		const pos = { x: 1, y: 2, z: 3 };
		const id = createProjectile("c1", "iron", "p", pos, { x: 1, y: 0, z: 0 }, 10);
		pos.x = 999;
		expect(getProjectile(id)!.position.x).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// updateProjectiles — physics
// ---------------------------------------------------------------------------

describe("updateProjectiles — physics", () => {
	it("moves projectile along velocity vector", () => {
		const id = createProjectile(
			"c1",
			"iron",
			"p",
			{ x: 0, y: 10, z: 0 },
			{ x: 1, y: 0, z: 0 },
			10,
		);
		updateProjectiles(1.0);
		const proj = getProjectile(id);
		// x = 0 + 10 * 1 = 10
		expect(proj!.position.x).toBeCloseTo(10);
	});

	it("applies gravity to y velocity", () => {
		const id = createProjectile(
			"c1",
			"iron",
			"p",
			{ x: 0, y: 100, z: 0 },
			{ x: 0, y: 0, z: 0 },
			0,
		);
		updateProjectiles(1.0);
		const proj = getProjectile(id)!;
		// After 1s: velocity.y = 0 - 9.81*1 = -9.81
		// position.y = 100 + (-9.81)*1 = 90.19
		expect(proj.velocity.y).toBeCloseTo(-9.81);
		expect(proj.position.y).toBeCloseTo(90.19);
	});

	it("deactivates projectile after maxLifetime", () => {
		createProjectile(
			"c1",
			"iron",
			"p",
			{ x: 0, y: 100, z: 0 },
			{ x: 1, y: 0, z: 0 },
			10,
		);
		// Default lifetime is 5s
		updateProjectiles(5.0);
		expect(getActiveProjectiles().size).toBe(0);
	});

	it("deactivates projectile below ground (y < -10)", () => {
		createProjectile(
			"c1",
			"iron",
			"p",
			{ x: 0, y: 0, z: 0 },
			{ x: 0, y: -1, z: 0 },
			15,
		);
		// After 1s: y = 0 + (-15)*1 - gravity = very negative
		updateProjectiles(1.0);
		expect(getActiveProjectiles().size).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// updateProjectiles — collision detection
// ---------------------------------------------------------------------------

describe("updateProjectiles — collisions", () => {
	it("detects direct hit when projectile reaches target", () => {
		_setRandomFn(() => 0.99);
		// Use short time step so gravity doesn't move projectile out of hitbox
		// After 0.1s: x = 10*0.1 = 1.0, y_drop = 0.5*9.81*0.01 ≈ 0.049
		registerTarget("enemy", { x: 1, y: 10, z: 0 }, 1.0);
		createProjectile(
			"c1",
			"iron",
			"player",
			{ x: 0, y: 10, z: 0 },
			{ x: 1, y: 0, z: 0 },
			10,
		);
		const hits = updateProjectiles(0.1);
		expect(hits.length).toBeGreaterThanOrEqual(1);
		expect(hits[0].targetId).toBe("enemy");
		expect(hits[0].isSplash).toBe(false);
	});

	it("does not hit the thrower", () => {
		_setRandomFn(() => 0.99);
		registerTarget("player", { x: 0, y: 10, z: 0 }, 2.0);
		createProjectile(
			"c1",
			"iron",
			"player",
			{ x: 0, y: 10, z: 0 },
			{ x: 1, y: 0, z: 0 },
			10,
		);
		const hits = updateProjectiles(0.01);
		const throwerHits = hits.filter((h) => h.targetId === "player");
		expect(throwerHits).toHaveLength(0);
	});

	it("projectile is consumed on first hit", () => {
		_setRandomFn(() => 0.99);
		// Target at x=1, short time step so gravity is negligible
		registerTarget("enemy", { x: 1, y: 10, z: 0 }, 1.0);
		const id = createProjectile(
			"c1",
			"iron",
			"player",
			{ x: 0, y: 10, z: 0 },
			{ x: 1, y: 0, z: 0 },
			10,
		);
		updateProjectiles(0.1);
		// After hit, projectile should be cleaned up
		expect(getProjectile(id)).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Target registry
// ---------------------------------------------------------------------------

describe("target registry", () => {
	it("registerTarget adds a target for collision checks", () => {
		registerTarget("enemy", { x: 5, y: 0, z: 0 }, 1.0);
		_setRandomFn(() => 0.99);
		createProjectile("c1", "iron", "p", { x: 4, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		const hits = updateProjectiles(0.1);
		expect(hits.length).toBeGreaterThanOrEqual(1);
	});

	it("unregisterTarget removes a target", () => {
		registerTarget("enemy", { x: 1, y: 0, z: 0 }, 1.0);
		unregisterTarget("enemy");
		_setRandomFn(() => 0.99);
		createProjectile("c1", "iron", "p", { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		const hits = updateProjectiles(0.1);
		expect(hits.filter((h) => h.targetId === "enemy")).toHaveLength(0);
	});

	it("updateTargetPosition moves a target", () => {
		registerTarget("enemy", { x: 100, y: 100, z: 100 }, 1.0);
		// Move target to where projectile will be after 0.1s
		updateTargetPosition("enemy", { x: 1, y: 10, z: 0 });
		_setRandomFn(() => 0.99);
		createProjectile("c1", "iron", "p", { x: 0, y: 10, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		const hits = updateProjectiles(0.1);
		expect(hits.length).toBeGreaterThanOrEqual(1);
	});

	it("updateTargetPosition is safe for nonexistent target", () => {
		expect(() => updateTargetPosition("nobody", { x: 0, y: 0, z: 0 })).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Economic analysis
// ---------------------------------------------------------------------------

describe("economic analysis", () => {
	describe("getCubeValue", () => {
		it("returns economic value for known materials", () => {
			expect(getCubeValue("scrap_iron")).toBe(5);
			expect(getCubeValue("rare_alloy")).toBe(100);
		});

		it("returns fallback value for unknown materials", () => {
			expect(getCubeValue("unobtanium")).toBe(5);
		});
	});

	describe("getDamagePerValue", () => {
		it("scrap_iron has highest damage-per-value ratio", () => {
			// 15 / 5 = 3.0
			expect(getDamagePerValue("scrap_iron")).toBeCloseTo(3.0);
		});

		it("rare_alloy has low damage-per-value (expensive ammo)", () => {
			// 50 / 100 = 0.5
			expect(getDamagePerValue("rare_alloy")).toBeCloseTo(0.5);
		});
	});

	describe("getBestAmmoForSituation", () => {
		it("single target: picks highest damage-per-value", () => {
			const best = getBestAmmoForSituation(
				["scrap_iron", "copper", "rare_alloy"],
				1,
			);
			// scrap_iron: 15/5=3.0, copper: 20/15=1.33, rare_alloy: 50/100=0.5
			expect(best).toBe("scrap_iron");
		});

		it("multiple targets: prefers splash damage materials", () => {
			const best = getBestAmmoForSituation(
				["scrap_iron", "rare_alloy", "fiber_optics"],
				5,
			);
			// rare_alloy has splash radius 2, fiber_optics has splash radius 3
			expect(["rare_alloy", "fiber_optics"]).toContain(best);
		});

		it("returns fallback for empty materials array", () => {
			expect(getBestAmmoForSituation([], 1)).toBe("scrap_iron");
		});

		it("single material returns that material", () => {
			expect(getBestAmmoForSituation(["copper"], 1)).toBe("copper");
		});
	});
});

// ---------------------------------------------------------------------------
// getActiveProjectiles
// ---------------------------------------------------------------------------

describe("getActiveProjectiles", () => {
	it("returns empty map initially", () => {
		expect(getActiveProjectiles().size).toBe(0);
	});

	it("returns all active projectiles", () => {
		createProjectile("c1", "iron", "p", { x: 0, y: 10, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		createProjectile("c2", "iron", "p", { x: 0, y: 10, z: 0 }, { x: -1, y: 0, z: 0 }, 10);
		expect(getActiveProjectiles().size).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all projectiles", () => {
		createProjectile("c1", "iron", "p", { x: 0, y: 10, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		reset();
		expect(getActiveProjectiles().size).toBe(0);
	});

	it("clears all targets", () => {
		registerTarget("enemy", { x: 0, y: 0, z: 0 }, 1.0);
		reset();
		_setRandomFn(() => 0.99);
		createProjectile("c1", "iron", "p", { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0);
		const hits = updateProjectiles(0.1);
		expect(hits).toHaveLength(0);
	});

	it("resets projectile ID counter", () => {
		createProjectile("c1", "iron", "p", { x: 0, y: 10, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		reset();
		const id = createProjectile("c2", "iron", "p", { x: 0, y: 10, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
		expect(id).toBe("proj_0");
	});

	it("clears random function override", () => {
		_setRandomFn(() => 0);
		reset();
		const r = calculateThrowDamage("scrap_iron", 10, 0);
		expect(r.baseDamage).toBe(15);
	});
});
