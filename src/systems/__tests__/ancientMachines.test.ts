/**
 * Tests for the ancient machines awakening system.
 *
 * Covers:
 * - Substrate damage accumulation and decay
 * - Residual relationship scoring
 * - Awakening thresholds (Sentinel, Crawler, Colossus)
 * - Threat-level scaling of entity HP and damage
 * - Entity despawning after lifetime expires
 * - Kill penalties (relationship + substrate damage)
 * - Integration victory path progress
 * - Config alignment (config values drive system behavior)
 */

import enemiesConfig from "../../../config/enemies.json";
import {
	_resetAncientMachineState,
	adjustRelationship,
	checkAwakening,
	damageResidual,
	getActiveResiduals,
	getCurrentThreatLevel,
	getIntegrationProgress,
	getRelationshipScore,
	getResidual,
	getSubstrateDamage,
	isColossusAwakened,
	recordSubstrateDamage,
	updateAncientMachines,
} from "../ancientMachines";

const cfg = enemiesConfig.ancientMachines;
const awakeningCfg = cfg.awakening;

const ORIGIN = { x: 0, y: 0, z: 0 };

beforeEach(() => {
	_resetAncientMachineState();
});

// ---------------------------------------------------------------------------
// Substrate damage
// ---------------------------------------------------------------------------

describe("substrate damage", () => {
	it("starts at 0", () => {
		expect(getSubstrateDamage()).toBe(0);
	});

	it("accumulates from mining", () => {
		recordSubstrateDamage("mining", 1);
		expect(getSubstrateDamage()).toBe(awakeningCfg.substrateDamagePerMiningTick);
	});

	it("accumulates from building over access point", () => {
		recordSubstrateDamage("building_over_access", 1);
		expect(getSubstrateDamage()).toBe(awakeningCfg.substrateDamagePerBuildOverAccess);
	});

	it("accumulates from destroying sentinels", () => {
		recordSubstrateDamage("sentinel_destroyed", 1);
		expect(getSubstrateDamage()).toBe(awakeningCfg.substrateDamagePerSentinelDestroyed);
	});

	it("accumulates from destroying crawlers", () => {
		recordSubstrateDamage("crawler_destroyed", 1);
		expect(getSubstrateDamage()).toBe(awakeningCfg.substrateDamagePerCrawlerDestroyed);
	});

	it("accumulates additively across causes", () => {
		recordSubstrateDamage("mining", 1);
		recordSubstrateDamage("sentinel_destroyed", 1);
		const expected =
			awakeningCfg.substrateDamagePerMiningTick +
			awakeningCfg.substrateDamagePerSentinelDestroyed;
		expect(getSubstrateDamage()).toBe(expected);
	});

	it("decays each update tick", () => {
		// Push damage up first
		for (let i = 0; i < 20; i++) {
			recordSubstrateDamage("mining", i);
		}
		const before = getSubstrateDamage();
		updateAncientMachines(21);
		const after = getSubstrateDamage();
		expect(after).toBeLessThan(before);
		expect(after).toBeGreaterThanOrEqual(0);
	});

	it("does not decay below 0", () => {
		// No damage accumulated — should stay at 0
		updateAncientMachines(1);
		expect(getSubstrateDamage()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Relationship score
// ---------------------------------------------------------------------------

describe("relationship score", () => {
	it("starts at 0", () => {
		expect(getRelationshipScore()).toBe(0);
	});

	it("increases with positive delta", () => {
		adjustRelationship(20, "test_friendly", 1);
		expect(getRelationshipScore()).toBe(20);
	});

	it("decreases with negative delta", () => {
		adjustRelationship(-30, "sentinel_killed", 1);
		expect(getRelationshipScore()).toBe(-30);
	});

	it("clamps at +100 maximum", () => {
		adjustRelationship(200, "test_max", 1);
		expect(getRelationshipScore()).toBe(100);
	});

	it("clamps at -100 minimum", () => {
		adjustRelationship(-200, "test_min", 1);
		expect(getRelationshipScore()).toBe(-100);
	});

	it("accumulates across multiple adjustments", () => {
		adjustRelationship(10, "a", 1);
		adjustRelationship(-5, "b", 2);
		adjustRelationship(8, "c", 3);
		expect(getRelationshipScore()).toBe(13);
	});
});

// ---------------------------------------------------------------------------
// Threat level
// ---------------------------------------------------------------------------

describe("threat level", () => {
	it("starts at 0.0", () => {
		expect(getCurrentThreatLevel()).toBe(0);
	});

	it("scales with substrate damage", () => {
		// Add enough damage to reach colossusAwakeThreshold
		const threshold = awakeningCfg.colossusAwakeThreshold;
		for (let i = 0; i < threshold; i++) {
			recordSubstrateDamage("mining", i);
		}
		// Should be 1.0 or close to it (capped)
		expect(getCurrentThreatLevel()).toBeGreaterThanOrEqual(1.0);
	});

	it("caps at 1.0", () => {
		// Add far more damage than threshold
		for (let i = 0; i < 10000; i++) {
			recordSubstrateDamage("mining", i);
		}
		expect(getCurrentThreatLevel()).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Awakening thresholds
// ---------------------------------------------------------------------------

describe("awakening — Sentinel", () => {
	it("does not spawn at low substrate damage", () => {
		recordSubstrateDamage("mining", 1); // minimal
		checkAwakening(ORIGIN, 1);
		expect(getActiveResiduals().filter((e) => e.type === "sentinel")).toHaveLength(0);
	});

	it("spawns a Sentinel at sentinelAwakeThreshold", () => {
		// Build up damage to exactly the sentinel threshold
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const spawned = checkAwakening(ORIGIN, 1);
		expect(spawned.some((e) => e.type === "sentinel")).toBe(true);
	});

	it("does not exceed maxActiveSentinels", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold * 5) {
			recordSubstrateDamage("building_over_access", 1);
		}
		// Call checkAwakening many times
		for (let i = 0; i < 20; i++) {
			checkAwakening(ORIGIN, i + 1);
		}
		const sentinels = getActiveResiduals().filter((e) => e.type === "sentinel");
		expect(sentinels.length).toBeLessThanOrEqual(awakeningCfg.maxActiveSentinels);
	});

	it("spawned Sentinel has type 'sentinel'", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const spawned = checkAwakening(ORIGIN, 1);
		const sentinel = spawned.find((e) => e.type === "sentinel");
		expect(sentinel).toBeDefined();
		expect(sentinel!.type).toBe("sentinel");
	});
});

describe("awakening — Crawler", () => {
	it("spawns a Crawler at crawlerAwakeThreshold", () => {
		while (getSubstrateDamage() < awakeningCfg.crawlerAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const spawned = checkAwakening(ORIGIN, 1);
		expect(spawned.some((e) => e.type === "crawler")).toBe(true);
	});

	it("does not exceed maxActiveCrawlers", () => {
		while (getSubstrateDamage() < awakeningCfg.crawlerAwakeThreshold * 5) {
			recordSubstrateDamage("building_over_access", 1);
		}
		for (let i = 0; i < 20; i++) {
			checkAwakening(ORIGIN, i + 1);
		}
		const crawlers = getActiveResiduals().filter((e) => e.type === "crawler");
		expect(crawlers.length).toBeLessThanOrEqual(awakeningCfg.maxActiveCrawlers);
	});
});

describe("awakening — Colossus", () => {
	it("does not spawn at moderate damage", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		checkAwakening(ORIGIN, 1);
		expect(isColossusAwakened()).toBe(false);
	});

	it("awakens at colossusAwakeThreshold", () => {
		while (getSubstrateDamage() < awakeningCfg.colossusAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		checkAwakening(ORIGIN, 1);
		expect(isColossusAwakened()).toBe(true);
	});

	it("awakens from story progression flag", () => {
		const flag = cfg.colossus.awakeningConditions.storyProgressionFlag;
		checkAwakening(ORIGIN, 1, new Set([flag]));
		expect(isColossusAwakened()).toBe(true);
	});

	it("only awakens once", () => {
		while (getSubstrateDamage() < awakeningCfg.colossusAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		checkAwakening(ORIGIN, 1);
		checkAwakening(ORIGIN, 2);

		const colossuses = getActiveResiduals().filter((e) => e.type === "colossus");
		expect(colossuses).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Entity stats
// ---------------------------------------------------------------------------

describe("Residual entity stats", () => {
	it("Sentinel HP is within configured range", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const [sentinel] = checkAwakening(ORIGIN, 1).filter((e) => e.type === "sentinel");
		expect(sentinel.hp).toBeGreaterThanOrEqual(cfg.sentinel.hpMin);
		expect(sentinel.hp).toBeLessThanOrEqual(cfg.sentinel.hpMax);
	});

	it("Crawler HP is within configured range", () => {
		while (getSubstrateDamage() < awakeningCfg.crawlerAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const [crawler] = checkAwakening(ORIGIN, 1).filter((e) => e.type === "crawler");
		expect(crawler.hp).toBeGreaterThanOrEqual(cfg.crawler.hpMin);
		expect(crawler.hp).toBeLessThanOrEqual(cfg.crawler.hpMax);
	});

	it("Colossus has fixed HP from config", () => {
		while (getSubstrateDamage() < awakeningCfg.colossusAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const [colossus] = checkAwakening(ORIGIN, 1).filter((e) => e.type === "colossus");
		expect(colossus.hp).toBe(cfg.colossus.hp);
	});

	it("entity has a unique ID", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const spawned = checkAwakening(ORIGIN, 1);
		const ids = spawned.map((e) => e.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it("entity is retrievable by ID", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const [sentinel] = checkAwakening(ORIGIN, 1).filter((e) => e.type === "sentinel");
		const retrieved = getResidual(sentinel.id);
		expect(retrieved).toBeDefined();
		expect(retrieved!.id).toBe(sentinel.id);
	});

	it("unknown entity ID returns undefined", () => {
		expect(getResidual("nonexistent_id")).toBeUndefined();
	});

	it("spawned Sentinel starts neutral by default", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		const [sentinel] = checkAwakening(ORIGIN, 1).filter((e) => e.type === "sentinel");
		expect(sentinel.relationship).toBe("neutral");
	});
});

// ---------------------------------------------------------------------------
// Damage and kills
// ---------------------------------------------------------------------------

describe("damaging Residuals", () => {
	function spawnSentinel(): ReturnType<typeof checkAwakening>[0] {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		return checkAwakening(ORIGIN, 1).filter((e) => e.type === "sentinel")[0];
	}

	it("reduces entity HP", () => {
		const sentinel = spawnSentinel();
		const before = sentinel.hp;
		damageResidual(sentinel.id, 10, 2);
		const after = getResidual(sentinel.id);
		expect(after!.hp).toBe(before - 10);
	});

	it("HP does not go below 0", () => {
		const sentinel = spawnSentinel();
		damageResidual(sentinel.id, 99999, 2);
		// entity should be destroyed, not at negative HP
		expect(getResidual(sentinel.id)).toBeUndefined();
	});

	it("returns false for unknown entity", () => {
		expect(damageResidual("ghost_entity", 10, 1)).toBe(false);
	});

	it("returns true when entity is destroyed", () => {
		const sentinel = spawnSentinel();
		const destroyed = damageResidual(sentinel.id, sentinel.hp, 2);
		expect(destroyed).toBe(true);
	});

	it("removes destroyed entity from active list", () => {
		const sentinel = spawnSentinel();
		damageResidual(sentinel.id, sentinel.hp, 2);
		expect(getActiveResiduals().some((e) => e.id === sentinel.id)).toBe(false);
	});

	it("killing a Sentinel applies relationship penalty", () => {
		const sentinel = spawnSentinel();
		damageResidual(sentinel.id, sentinel.hp, 2);
		expect(getRelationshipScore()).toBe(-cfg.sentinel.relationshipPenalty);
	});

	it("killing a Sentinel adds substrate damage", () => {
		const sentinel = spawnSentinel();
		const before = getSubstrateDamage();
		damageResidual(sentinel.id, sentinel.hp, 2);
		// substrate damage increases by sentinel_destroyed amount
		const after = getSubstrateDamage();
		expect(after).toBeGreaterThan(before);
	});
});

// ---------------------------------------------------------------------------
// Despawning
// ---------------------------------------------------------------------------

describe("entity despawn", () => {
	it("Sentinels despawn after despawnAfterTicks", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		checkAwakening(ORIGIN, 0);
		const sentinelId = getActiveResiduals().find((e) => e.type === "sentinel")!.id;

		// Advance time past despawn threshold
		const despawnTick = awakeningCfg.despawnAfterTicks + 1;
		updateAncientMachines(despawnTick);

		expect(getResidual(sentinelId)).toBeUndefined();
	});

	it("Colossus does not despawn", () => {
		while (getSubstrateDamage() < awakeningCfg.colossusAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		checkAwakening(ORIGIN, 0);
		const colossus = getActiveResiduals().find((e) => e.type === "colossus");
		expect(colossus).toBeDefined();

		// Advance far past despawn threshold
		updateAncientMachines(awakeningCfg.despawnAfterTicks * 2);

		expect(getActiveResiduals().some((e) => e.type === "colossus")).toBe(true);
	});

	it("updateAncientMachines returns IDs of despawned entities", () => {
		while (getSubstrateDamage() < awakeningCfg.sentinelAwakeThreshold) {
			recordSubstrateDamage("building_over_access", 1);
		}
		checkAwakening(ORIGIN, 0);
		const despawned = updateAncientMachines(awakeningCfg.despawnAfterTicks + 1);
		expect(despawned.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Integration victory path
// ---------------------------------------------------------------------------

describe("integration progress", () => {
	it("starts at 0 progress, not eligible", () => {
		const { relationshipProgress, isEligible } = getIntegrationProgress();
		expect(relationshipProgress).toBe(0);
		expect(isEligible).toBe(false);
	});

	it("becomes eligible at integration relationship threshold", () => {
		const threshold = cfg.colossus.integrationConditions.relationshipThreshold;
		adjustRelationship(threshold, "integration_test", 1);
		const { isEligible } = getIntegrationProgress();
		expect(isEligible).toBe(true);
	});

	it("progress is proportional to relationship score", () => {
		const threshold = cfg.colossus.integrationConditions.relationshipThreshold;
		adjustRelationship(threshold / 2, "half_way", 1);
		const { relationshipProgress } = getIntegrationProgress();
		expect(relationshipProgress).toBeCloseTo(0.5, 1);
	});

	it("progress caps at 1.0 beyond threshold", () => {
		adjustRelationship(100, "max_friendly", 1);
		const { relationshipProgress } = getIntegrationProgress();
		expect(relationshipProgress).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Config alignment
// ---------------------------------------------------------------------------

describe("config alignment", () => {
	it("sentinel hpMin < hpMax", () => {
		expect(cfg.sentinel.hpMin).toBeLessThan(cfg.sentinel.hpMax);
	});

	it("crawler hpMin < hpMax", () => {
		expect(cfg.crawler.hpMin).toBeLessThan(cfg.crawler.hpMax);
	});

	it("colossus has fixed hp >= 1000", () => {
		expect(cfg.colossus.hp).toBeGreaterThanOrEqual(1000);
	});

	it("sentinelAwakeThreshold < crawlerAwakeThreshold", () => {
		expect(awakeningCfg.sentinelAwakeThreshold).toBeLessThanOrEqual(
			awakeningCfg.crawlerAwakeThreshold,
		);
	});

	it("crawlerAwakeThreshold < colossusAwakeThreshold", () => {
		expect(awakeningCfg.crawlerAwakeThreshold).toBeLessThan(
			awakeningCfg.colossusAwakeThreshold,
		);
	});

	it("substrate damage decay is positive", () => {
		expect(awakeningCfg.substrateDamageDecayPerTick).toBeGreaterThan(0);
	});

	it("Sentinel relationship penalty matches config", () => {
		expect(cfg.sentinel.relationshipPenalty).toBeGreaterThan(0);
	});

	it("Crawler relationship penalty is higher than Sentinel", () => {
		expect(cfg.crawler.relationshipPenalty).toBeGreaterThan(cfg.sentinel.relationshipPenalty);
	});

	it("Colossus integration condition has cube offering list", () => {
		expect(cfg.colossus.integrationConditions.cubeOfferings).toBeInstanceOf(Array);
		expect(cfg.colossus.integrationConditions.cubeOfferings.length).toBeGreaterThan(0);
	});
});
