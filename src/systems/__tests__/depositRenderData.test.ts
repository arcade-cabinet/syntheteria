/**
 * Unit tests for the deposit render data system.
 *
 * Tests cover:
 * - Registration and unregistration
 * - Depletion visualization (scale reduction, colour desaturation)
 * - Discovery state (fog of war)
 * - Targeting indicators
 * - Spatial queries (getDepositsInRange)
 * - Ore type render params lookup
 * - collectDepositRenderData full collection
 * - getDiscoveredDeposits / getDepletedDeposits filters
 * - Edge cases: duplicate registration, unknown ore type, zero max quantity
 * - reset() isolation
 */

import {
	registerDeposit,
	unregisterDeposit,
	updateDepositQuantity,
	setDepositDiscovered,
	setDepositTargeted,
	collectDepositRenderData,
	getOreRenderParams,
	getDiscoveredDeposits,
	getDepositsInRange,
	getDepletedDeposits,
	reset,
	type Vec3,
} from "../depositRenderData";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("registerDeposit", () => {
	it("registers a deposit and makes it available via collectDepositRenderData", () => {
		registerDeposit("d1", pos(10, 0, 20), "iron", 100, 100);

		const data = collectDepositRenderData();
		expect(data).toHaveLength(1);
		expect(data[0].depositId).toBe("d1");
		expect(data[0].position).toEqual({ x: 10, y: 0, z: 20 });
		expect(data[0].oreType).toBe("iron");
	});

	it("assigns a unique noiseSeed to each deposit", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		registerDeposit("d2", pos(5, 0, 5), "copper", 50, 50);

		const data = collectDepositRenderData();
		expect(data[0].renderParams.noiseSeed).not.toBe(
			data[1].renderParams.noiseSeed,
		);
	});

	it("copies position defensively (mutation of original does not affect stored data)", () => {
		const p = pos(1, 2, 3);
		registerDeposit("d1", p, "iron", 100, 100);
		p.x = 999;

		const data = collectDepositRenderData();
		expect(data[0].position.x).toBe(1);
	});

	it("throws if the same depositId is registered twice", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);

		expect(() =>
			registerDeposit("d1", pos(5, 0, 5), "copper", 50, 50),
		).toThrow('Deposit "d1" is already registered');
	});

	it("defaults to not discovered and not targeted", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);

		const info = collectDepositRenderData()[0];
		expect(info.discovered).toBe(false);
		expect(info.targeted).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Unregistration
// ---------------------------------------------------------------------------

describe("unregisterDeposit", () => {
	it("removes a deposit from the registry", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		registerDeposit("d2", pos(5, 0, 5), "copper", 50, 50);

		unregisterDeposit("d1");

		const data = collectDepositRenderData();
		expect(data).toHaveLength(1);
		expect(data[0].depositId).toBe("d2");
	});

	it("is a no-op for an unregistered deposit", () => {
		expect(() => unregisterDeposit("nonexistent")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Depletion visualization
// ---------------------------------------------------------------------------

describe("updateDepositQuantity / depletion", () => {
	it("depletionPercent is 0 when quantity equals max", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);

		const info = collectDepositRenderData()[0];
		expect(info.depletionPercent).toBe(0);
	});

	it("depletionPercent is 1 when quantity is 0", () => {
		registerDeposit("d1", pos(), "iron", 0, 100);

		const info = collectDepositRenderData()[0];
		expect(info.depletionPercent).toBe(1);
	});

	it("depletionPercent is 0.5 when half depleted", () => {
		registerDeposit("d1", pos(), "iron", 50, 100);

		const info = collectDepositRenderData()[0];
		expect(info.depletionPercent).toBeCloseTo(0.5);
	});

	it("updates depletion when quantity changes", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		updateDepositQuantity("d1", 25, 100);

		const info = collectDepositRenderData()[0];
		expect(info.depletionPercent).toBeCloseTo(0.75);
	});

	it("scale shrinks with depletion (min 30% of original at full depletion)", () => {
		const baseParams = getOreRenderParams("iron");

		registerDeposit("d1", pos(), "iron", 100, 100);
		const fullScale = collectDepositRenderData()[0].renderParams.baseScale;
		expect(fullScale).toBe(baseParams.baseScale);

		updateDepositQuantity("d1", 0, 100);
		const depletedScale =
			collectDepositRenderData()[0].renderParams.baseScale;
		expect(depletedScale).toBeCloseTo(baseParams.baseScale * 0.3);
	});

	it("colour desaturates with depletion", () => {
		const baseParams = getOreRenderParams("copper");

		registerDeposit("d1", pos(), "copper", 100, 100);
		const fullColor = collectDepositRenderData()[0].renderParams.color;
		expect(fullColor).toBe(baseParams.color.toUpperCase());

		updateDepositQuantity("d1", 0, 100);
		const depletedColor = collectDepositRenderData()[0].renderParams.color;
		// Depleted colour should differ from original (desaturated)
		expect(depletedColor).not.toBe(baseParams.color.toUpperCase());
	});

	it("throws for unregistered deposit", () => {
		expect(() => updateDepositQuantity("nope", 50, 100)).toThrow(
			'Deposit "nope" is not registered',
		);
	});

	it("handles maxQuantity of 0 as fully depleted", () => {
		registerDeposit("d1", pos(), "iron", 0, 0);

		const info = collectDepositRenderData()[0];
		expect(info.depletionPercent).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Discovery state (fog of war)
// ---------------------------------------------------------------------------

describe("setDepositDiscovered", () => {
	it("marks a deposit as discovered", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		setDepositDiscovered("d1", true);

		const info = collectDepositRenderData()[0];
		expect(info.discovered).toBe(true);
	});

	it("can toggle discovery off", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		setDepositDiscovered("d1", true);
		setDepositDiscovered("d1", false);

		const info = collectDepositRenderData()[0];
		expect(info.discovered).toBe(false);
	});

	it("throws for unregistered deposit", () => {
		expect(() => setDepositDiscovered("nope", true)).toThrow(
			'Deposit "nope" is not registered',
		);
	});
});

// ---------------------------------------------------------------------------
// Targeting indicators
// ---------------------------------------------------------------------------

describe("setDepositTargeted", () => {
	it("records which entity is mining the deposit", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		setDepositTargeted("d1", "bot_7");

		const info = collectDepositRenderData()[0];
		expect(info.targeted).toBe("bot_7");
	});

	it("clears targeting with null", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		setDepositTargeted("d1", "bot_7");
		setDepositTargeted("d1", null);

		const info = collectDepositRenderData()[0];
		expect(info.targeted).toBeNull();
	});

	it("throws for unregistered deposit", () => {
		expect(() => setDepositTargeted("nope", "bot_1")).toThrow(
			'Deposit "nope" is not registered',
		);
	});
});

// ---------------------------------------------------------------------------
// getOreRenderParams
// ---------------------------------------------------------------------------

describe("getOreRenderParams", () => {
	it("returns correct params for scrap_iron", () => {
		const params = getOreRenderParams("scrap_iron");
		expect(params.color).toBe("#8B7355");
		expect(params.baseScale).toBe(1.2);
		expect(params.heightVariation).toBe(0.4);
		expect(params.roughness).toBe(0.8);
		expect(params.emissiveIntensity).toBe(0);
		expect(params.noiseFrequency).toBe(3.0);
	});

	it("returns correct params for fiber_optics", () => {
		const params = getOreRenderParams("fiber_optics");
		expect(params.color).toBe("#00CED1");
		expect(params.baseScale).toBe(0.6);
		expect(params.emissiveIntensity).toBe(0.3);
		expect(params.noiseFrequency).toBe(8.0);
	});

	it("returns correct params for rare_alloy", () => {
		const params = getOreRenderParams("rare_alloy");
		expect(params.color).toBe("#DAA520");
		expect(params.baseScale).toBe(2.0);
		expect(params.roughness).toBe(0.15);
	});

	it("returns default grey params for unknown ore type", () => {
		const params = getOreRenderParams("unobtainium");
		expect(params.color).toBe("#808080");
		expect(params.baseScale).toBe(1.0);
		expect(params.emissiveIntensity).toBe(0);
	});

	it("returns a copy for unknown types (mutation-safe)", () => {
		const a = getOreRenderParams("unknown_1");
		const b = getOreRenderParams("unknown_2");
		a.baseScale = 999;
		expect(b.baseScale).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// collectDepositRenderData
// ---------------------------------------------------------------------------

describe("collectDepositRenderData", () => {
	it("returns empty array when no deposits registered", () => {
		expect(collectDepositRenderData()).toEqual([]);
	});

	it("returns all registered deposits", () => {
		registerDeposit("d1", pos(0, 0, 0), "iron", 100, 100);
		registerDeposit("d2", pos(10, 0, 10), "copper", 50, 50);
		registerDeposit("d3", pos(20, 0, 20), "e_waste", 30, 60);

		const data = collectDepositRenderData();
		expect(data).toHaveLength(3);

		const ids = data.map((d) => d.depositId).sort();
		expect(ids).toEqual(["d1", "d2", "d3"]);
	});

	it("returns defensive copies of positions", () => {
		registerDeposit("d1", pos(5, 0, 5), "iron", 100, 100);

		const data = collectDepositRenderData();
		data[0].position.x = 999;

		const fresh = collectDepositRenderData();
		expect(fresh[0].position.x).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// getDiscoveredDeposits
// ---------------------------------------------------------------------------

describe("getDiscoveredDeposits", () => {
	it("returns only deposits with discovered = true", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		registerDeposit("d2", pos(10, 0, 10), "copper", 50, 50);
		setDepositDiscovered("d1", true);

		const discovered = getDiscoveredDeposits();
		expect(discovered).toHaveLength(1);
		expect(discovered[0].depositId).toBe("d1");
	});

	it("returns empty array when none discovered", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		expect(getDiscoveredDeposits()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// getDepositsInRange
// ---------------------------------------------------------------------------

describe("getDepositsInRange", () => {
	it("returns deposits within radius (XZ plane)", () => {
		registerDeposit("near", pos(5, 0, 5), "iron", 100, 100);
		registerDeposit("far", pos(100, 0, 100), "copper", 50, 50);

		const inRange = getDepositsInRange(pos(0, 0, 0), 10);
		expect(inRange).toHaveLength(1);
		expect(inRange[0].depositId).toBe("near");
	});

	it("includes deposits exactly on the boundary", () => {
		registerDeposit("edge", pos(10, 0, 0), "iron", 100, 100);

		const inRange = getDepositsInRange(pos(0, 0, 0), 10);
		expect(inRange).toHaveLength(1);
	});

	it("ignores Y axis in distance calculation", () => {
		registerDeposit("high", pos(3, 500, 4), "iron", 100, 100);

		// XZ distance is 5, Y is irrelevant
		const inRange = getDepositsInRange(pos(0, 0, 0), 6);
		expect(inRange).toHaveLength(1);
	});

	it("returns empty when no deposits in range", () => {
		registerDeposit("far", pos(100, 0, 100), "iron", 100, 100);

		const inRange = getDepositsInRange(pos(0, 0, 0), 5);
		expect(inRange).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// getDepletedDeposits
// ---------------------------------------------------------------------------

describe("getDepletedDeposits", () => {
	it("returns deposits with quantity 0", () => {
		registerDeposit("full", pos(), "iron", 100, 100);
		registerDeposit("empty", pos(10, 0, 10), "copper", 0, 50);

		const depleted = getDepletedDeposits();
		expect(depleted).toHaveLength(1);
		expect(depleted[0].depositId).toBe("empty");
	});

	it("includes deposits depleted via updateDepositQuantity", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		updateDepositQuantity("d1", 0, 100);

		const depleted = getDepletedDeposits();
		expect(depleted).toHaveLength(1);
	});

	it("returns empty when nothing is depleted", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		expect(getDepletedDeposits()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all registered deposits", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		registerDeposit("d2", pos(5, 0, 5), "copper", 50, 50);

		reset();

		expect(collectDepositRenderData()).toHaveLength(0);
	});

	it("resets seed counter so new deposits get predictable seeds", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		const seedBefore = collectDepositRenderData()[0].renderParams.noiseSeed;

		reset();

		registerDeposit("d1", pos(), "iron", 100, 100);
		const seedAfter = collectDepositRenderData()[0].renderParams.noiseSeed;

		expect(seedAfter).toBe(seedBefore);
	});

	it("allows re-registration of previously used depositIds", () => {
		registerDeposit("d1", pos(), "iron", 100, 100);
		reset();

		expect(() =>
			registerDeposit("d1", pos(), "copper", 50, 50),
		).not.toThrow();
	});
});
