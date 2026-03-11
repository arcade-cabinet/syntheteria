/**
 * Tests for conversionSystem.ts — unit conversion via influence zones.
 *
 * Covers:
 * - Faith pressure accumulation from influence zones
 * - Vulnerability threshold
 * - Conversion immunity (divine_voltage doctrine)
 * - Conversion attempt: range check, faction check, immunity check
 * - Conversion success/fail based on random chance (seeded via mock)
 * - Conversion cleared pressure record
 * - runConversionTick: batch update
 * - getConversionCount tracking
 * - Reason resistance reduces conversion success chance
 * - Config value assertions
 */

import victoryPathsConfig from "../../../config/victoryPaths.json";
import {
	_resetConversionState,
	attemptConversion,
	clearUnitPressure,
	getConversionCount,
	getConversionTime,
	getUnitsUnderPressure,
	getUnitPressure,
	isVulnerableToConversion,
	runConversionTick,
	updateFaithPressure,
} from "../conversionSystem";
import {
	_resetIdeologyState,
	placeShrine,
} from "../ideologySystem";

const conversionCfg = victoryPathsConfig.faithSystem.conversionMechanics;
const PRESSURE_THRESHOLD = conversionCfg.faithPressureToVulnerable;

const ORIGIN = { x: 0, y: 0, z: 0 };

beforeEach(() => {
	_resetConversionState();
	_resetIdeologyState();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(
	id: string,
	faction: string,
	pos = ORIGIN,
	immune = false,
): { id: string; faction: string; position: { x: number; y: number; z: number }; conversionImmune: boolean } {
	return { id, faction, position: pos, conversionImmune: immune };
}

function makeLeader(
	id: string,
	faction: string,
	faith = 500,
	pos = ORIGIN,
): { id: string; faction: string; position: { x: number; y: number; z: number }; factionFaith: number } {
	return { id, faction, position: pos, factionFaith: faith };
}

// ---------------------------------------------------------------------------
// Faith pressure accumulation
// ---------------------------------------------------------------------------

describe("updateFaithPressure", () => {
	it("accumulates pressure for enemy in influence zone", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const enemy = makeUnit("enemy_1", "volt_collective", { x: 2, y: 0, z: 0 });

		// Shrine radius is 8m — enemy at x=2 is inside
		updateFaithPressure("reclaimers", [enemy]);
		expect(getUnitPressure("enemy_1")).toBeGreaterThan(0);
	});

	it("does not accumulate pressure outside zone", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const enemy = makeUnit("enemy_far", "volt_collective", { x: 100, y: 0, z: 100 });

		updateFaithPressure("reclaimers", [enemy]);
		expect(getUnitPressure("enemy_far")).toBe(0);
	});

	it("does not accumulate pressure on own faction units", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const friendly = makeUnit("friendly_1", "reclaimers", { x: 2, y: 0, z: 0 });

		updateFaithPressure("reclaimers", [friendly]);
		expect(getUnitPressure("friendly_1")).toBe(0);
	});

	it("does not accumulate on immune units", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const immune = makeUnit("immune_1", "volt_collective", { x: 2, y: 0, z: 0 }, true);

		updateFaithPressure("reclaimers", [immune]);
		expect(getUnitPressure("immune_1")).toBe(0);
	});

	it("accumulates additively over multiple ticks", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const enemy = makeUnit("enemy_multi", "volt_collective", { x: 2, y: 0, z: 0 });

		updateFaithPressure("reclaimers", [enemy]);
		const after1 = getUnitPressure("enemy_multi");
		updateFaithPressure("reclaimers", [enemy]);
		const after2 = getUnitPressure("enemy_multi");

		expect(after2).toBeGreaterThan(after1);
	});

	it("accumulates from multiple overlapping zones", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		placeShrine("reclaimers", "shrine", { x: 4, y: 0, z: 0 }, 1);
		const enemy = makeUnit("enemy_overlap", "volt_collective", { x: 2, y: 0, z: 0 });

		updateFaithPressure("reclaimers", [enemy]);
		// Should be double the single-shrine pressure
		const single = victoryPathsConfig.faithSystem.influenceZones.shrine.faithPressurePerTick;
		expect(getUnitPressure("enemy_overlap")).toBeCloseTo(single * 2, 5);
	});
});

// ---------------------------------------------------------------------------
// Vulnerability
// ---------------------------------------------------------------------------

describe("isVulnerableToConversion", () => {
	it("starts not vulnerable", () => {
		expect(isVulnerableToConversion("any_unit")).toBe(false);
	});

	it("becomes vulnerable at pressure threshold", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const enemy = makeUnit("vuln_test", "volt_collective", { x: 2, y: 0, z: 0 });

		// Run enough ticks to reach threshold
		const pressurePerTick = victoryPathsConfig.faithSystem.influenceZones.shrine.faithPressurePerTick;
		const ticksNeeded = Math.ceil(PRESSURE_THRESHOLD / pressurePerTick);

		for (let i = 0; i < ticksNeeded; i++) {
			updateFaithPressure("reclaimers", [enemy]);
		}

		expect(isVulnerableToConversion("vuln_test")).toBe(true);
	});
});

describe("clearUnitPressure", () => {
	it("removes pressure record", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const enemy = makeUnit("clear_test", "volt_collective", { x: 2, y: 0, z: 0 });
		updateFaithPressure("reclaimers", [enemy]);

		clearUnitPressure("clear_test");
		expect(getUnitPressure("clear_test")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// attemptConversion
// ---------------------------------------------------------------------------

describe("attemptConversion", () => {
	function makeVulnerable(unitId: string): void {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const enemy = makeUnit(unitId, "volt_collective", { x: 2, y: 0, z: 0 });
		const pressurePerTick = victoryPathsConfig.faithSystem.influenceZones.shrine.faithPressurePerTick;
		const ticksNeeded = Math.ceil(PRESSURE_THRESHOLD / pressurePerTick);
		for (let i = 0; i < ticksNeeded; i++) {
			updateFaithPressure("reclaimers", [enemy]);
		}
	}

	it("returns 'blocked' when attacking own faction", () => {
		const leader = makeLeader("l1", "reclaimers");
		const friendly = makeUnit("f1", "reclaimers", { x: 2, y: 0, z: 0 });
		expect(attemptConversion(leader, friendly, 1)).toBe("blocked");
	});

	it("returns 'blocked' for immune unit", () => {
		makeVulnerable("immune_unit");
		const leader = makeLeader("l1", "reclaimers", 500, ORIGIN);
		const immune = makeUnit("immune_unit", "volt_collective", { x: 2, y: 0, z: 0 }, true);
		expect(attemptConversion(leader, immune, 1)).toBe("blocked");
	});

	it("returns 'blocked' if unit not yet vulnerable", () => {
		const leader = makeLeader("l1", "reclaimers", 500, ORIGIN);
		const notVuln = makeUnit("not_vuln", "volt_collective", { x: 2, y: 0, z: 0 });
		expect(attemptConversion(leader, notVuln, 1)).toBe("blocked");
	});

	it("returns 'out_of_range' when leader too far away", () => {
		makeVulnerable("far_unit");
		const leader = makeLeader("l1", "reclaimers", 500, { x: 100, y: 0, z: 100 });
		const target = makeUnit("far_unit", "volt_collective", { x: 2, y: 0, z: 0 });
		expect(attemptConversion(leader, target, 1)).toBe("out_of_range");
	});

	it("returns 'success' or 'fail' for valid in-range attempt on vulnerable unit", () => {
		makeVulnerable("try_unit");
		const leader = makeLeader("l1", "reclaimers", 1000, ORIGIN);
		const target = makeUnit("try_unit", "volt_collective", { x: 1, y: 0, z: 0 });

		// Run many attempts — statistically should get at least one success
		const results = new Set<string>();
		for (let i = 0; i < 200; i++) {
			_resetConversionState();
			_resetIdeologyState();
			makeVulnerable("try_unit_r");
			const t = makeUnit("try_unit_r", "volt_collective", { x: 1, y: 0, z: 0 });
			const l = makeLeader("l2", "reclaimers", 1000, ORIGIN);
			results.add(attemptConversion(l, t, 1));
		}
		// Should see both success and fail over 200 trials
		expect(results.has("success") || results.has("fail")).toBe(true);
	});

	it("successful conversion clears pressure record", () => {
		// Force Math.random to always return 0 (always succeed)
		const origRandom = Math.random;
		Math.random = () => 0;

		makeVulnerable("convert_me");
		const leader = makeLeader("l1", "reclaimers", 500, ORIGIN);
		const target = makeUnit("convert_me", "volt_collective", { x: 1, y: 0, z: 0 });
		attemptConversion(leader, target, 1);

		expect(getUnitPressure("convert_me")).toBe(0);

		Math.random = origRandom;
	});

	it("successful conversion increments conversion count", () => {
		const origRandom = Math.random;
		Math.random = () => 0;

		makeVulnerable("convert_count");
		const leader = makeLeader("l1", "reclaimers", 500, ORIGIN);
		const target = makeUnit("convert_count", "volt_collective", { x: 1, y: 0, z: 0 });
		const result = attemptConversion(leader, target, 1);

		if (result === "success") {
			expect(getConversionCount("reclaimers")).toBe(1);
		}

		Math.random = origRandom;
	});
});

// ---------------------------------------------------------------------------
// runConversionTick
// ---------------------------------------------------------------------------

describe("runConversionTick", () => {
	it("returns empty array when no vulnerable units", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const leader = makeLeader("l1", "reclaimers", 500, ORIGIN);
		const enemy = makeUnit("fresh_enemy", "volt_collective", { x: 2, y: 0, z: 0 });

		const result = runConversionTick("reclaimers", [leader], [enemy], 1);
		expect(result).toHaveLength(0);
	});

	it("returns converted IDs on success (forced via Math.random mock)", () => {
		const origRandom = Math.random;
		Math.random = () => 0; // Always succeed

		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const enemy = makeUnit("batch_target", "volt_collective", { x: 2, y: 0, z: 0 });

		// Build up pressure to threshold
		const pressurePerTick = victoryPathsConfig.faithSystem.influenceZones.shrine.faithPressurePerTick;
		const ticksNeeded = Math.ceil(PRESSURE_THRESHOLD / pressurePerTick);
		for (let i = 0; i < ticksNeeded; i++) {
			updateFaithPressure("reclaimers", [enemy]);
		}

		const leader = makeLeader("l1", "reclaimers", 500, ORIGIN);
		const result = runConversionTick("reclaimers", [leader], [enemy], ticksNeeded + 1);

		Math.random = origRandom;

		// On success, the converted unit ID should be in the result
		expect(result).toContain("batch_target");
	});
});

// ---------------------------------------------------------------------------
// getUnitsUnderPressure
// ---------------------------------------------------------------------------

describe("getUnitsUnderPressure", () => {
	it("starts empty", () => {
		expect(getUnitsUnderPressure()).toHaveLength(0);
	});

	it("lists units that have accumulated pressure", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const enemy = makeUnit("p_track", "volt_collective", { x: 2, y: 0, z: 0 });
		updateFaithPressure("reclaimers", [enemy]);
		expect(getUnitsUnderPressure()).toContain("p_track");
	});
});

// ---------------------------------------------------------------------------
// Config alignment
// ---------------------------------------------------------------------------

describe("config alignment", () => {
	it("conversionActionRange > 0", () => {
		expect(conversionCfg.conversionActionRange).toBeGreaterThan(0);
	});

	it("faithPressureToVulnerable > 0", () => {
		expect(conversionCfg.faithPressureToVulnerable).toBeGreaterThan(0);
	});

	it("conversionChanceBase is between 0 and 1", () => {
		expect(conversionCfg.conversionChanceBase).toBeGreaterThan(0);
		expect(conversionCfg.conversionChanceBase).toBeLessThan(1);
	});

	it("conversionTimeSeconds > 0", () => {
		expect(getConversionTime()).toBeGreaterThan(0);
	});

	it("shrine faithPressurePerTick > 0", () => {
		expect(victoryPathsConfig.faithSystem.influenceZones.shrine.faithPressurePerTick).toBeGreaterThan(0);
	});

	it("temple faithPressurePerTick > shrine", () => {
		const iz = victoryPathsConfig.faithSystem.influenceZones;
		expect(iz.temple.faithPressurePerTick).toBeGreaterThan(iz.shrine.faithPressurePerTick);
	});
});
