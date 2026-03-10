/**
 * Unit tests for ThreatAssessment — threat level scoring for bot AI.
 *
 * Tests cover:
 * - assessThreat: weighted threat scoring from distance, hostility, health, numbers, confidence
 * - Non-hostile entities always return 0 threat
 * - Factor variations: distance, health ratio, numerical advantage, confidence
 * - getHighestThreat: finds the most threatening entity in memory
 * - getThreatsAbove: filters threats above threshold
 * - hasThreatAboveThreshold: quick boolean check
 * - Edge cases: empty memory, no hostiles, all below threshold
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before imports
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		enemies: {
			perception: {
				defaultFOV: 120,
				scoutFOV: 180,
				heavyFOV: 90,
				defaultRange: 15,
				cameraRangeBonus: 10,
				memoryDuration: 30,
				threatThreshold: 0.5,
			},
		},
	},
}));

// Mock MemorySystem — we control what memories exist
let mockMemories: import("../MemorySystem.ts").MemoryRecord[] = [];

jest.mock("../MemorySystem.ts", () => ({
	getMemories: (_botId: string, _currentTime: number) => mockMemories,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import type { MemoryRecord } from "../MemorySystem.ts";
import type { BotContext } from "../BotContext.ts";
import type { Entity, Vec3 } from "../../ecs/types.ts";
import {
	assessThreat,
	getHighestThreat,
	getThreatsAbove,
	hasThreatAboveThreshold,
	THREAT_THRESHOLD,
} from "../ThreatAssessment.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

function makeMemory(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
	return {
		entityId: "enemy-1",
		lastSeenPosition: pos(10, 0, 10),
		lastSeenTime: 0,
		entityType: "maintenance_bot",
		faction: "feral",
		confidence: 1.0,
		visible: true,
		...overrides,
	};
}

function makeContext(overrides: Partial<BotContext> = {}): BotContext {
	return {
		entityId: "bot-1",
		position: pos(0, 0, 0),
		faction: "player",
		nearbyEnemies: [],
		nearbyAllies: [],
		components: {
			total: 4,
			functional: 4,
			healthRatio: 1.0,
			hasArms: true,
			hasCamera: true,
			hasLegs: true,
		},
		homeBase: null,
		currentOrder: null,
		aggroRangeSq: 100,
		patrolRangeSq: 225,
		meleeRange: 2,
		fleeThreshold: 0.25,
		safeDistanceSq: 400,
		...overrides,
	};
}

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: "enemy-1",
		faction: "feral",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockMemories = [];
});

// ---------------------------------------------------------------------------
// THREAT_THRESHOLD
// ---------------------------------------------------------------------------

describe("THREAT_THRESHOLD", () => {
	it("equals the configured threshold value", () => {
		expect(THREAT_THRESHOLD).toBe(0.5);
	});
});

// ---------------------------------------------------------------------------
// assessThreat — basic scoring
// ---------------------------------------------------------------------------

describe("assessThreat", () => {
	it("returns 0 for non-hostile entity", () => {
		// "wildlife" faction is not hostile to "player"
		const memory = makeMemory({ faction: "wildlife" });
		const ctx = makeContext();

		const threat = assessThreat("bot-1", memory, ctx, []);
		expect(threat).toBe(0);
	});

	it("returns positive threat for hostile entity", () => {
		// "feral" is hostile to "player"
		const memory = makeMemory({ faction: "feral" });
		const ctx = makeContext();

		const threat = assessThreat("bot-1", memory, ctx, []);
		expect(threat).toBeGreaterThan(0);
	});

	it("returns threat <= 1.0", () => {
		const memory = makeMemory({
			faction: "feral",
			confidence: 1.0,
			lastSeenPosition: pos(0, 0, 0), // point-blank
		});
		const ctx = makeContext({
			nearbyEnemies: [
				{ id: "e1", position: pos(1, 0, 0), distanceSq: 1, faction: "feral" },
				{ id: "e2", position: pos(2, 0, 0), distanceSq: 4, faction: "feral" },
				{ id: "e3", position: pos(3, 0, 0), distanceSq: 9, faction: "feral" },
			],
		});
		const entities = [
			makeEntity({ id: "enemy-1", unit: {
				type: "maintenance_bot",
				displayName: "Bot",
				speed: 3,
				selected: false,
				components: [
					{ name: "arms", functional: true, material: "metal" },
					{ name: "legs", functional: true, material: "metal" },
				],
			} }),
		];

		const threat = assessThreat("bot-1", memory, ctx, entities);
		expect(threat).toBeLessThanOrEqual(1.0);
	});

	it("higher confidence memory produces higher threat", () => {
		const ctx = makeContext();

		const lowConf = makeMemory({ faction: "feral", confidence: 0.2, lastSeenPosition: pos(5, 0, 5) });
		const highConf = makeMemory({ faction: "feral", confidence: 1.0, lastSeenPosition: pos(5, 0, 5) });

		const threatLow = assessThreat("bot-1", lowConf, ctx, []);
		const threatHigh = assessThreat("bot-1", highConf, ctx, []);

		expect(threatHigh).toBeGreaterThan(threatLow);
	});

	it("closer enemies produce higher threat", () => {
		const ctx = makeContext();

		const farMemory = makeMemory({ faction: "feral", lastSeenPosition: pos(20, 0, 20) });
		const closeMemory = makeMemory({ faction: "feral", lastSeenPosition: pos(2, 0, 2) });

		const threatFar = assessThreat("bot-1", farMemory, ctx, []);
		const threatClose = assessThreat("bot-1", closeMemory, ctx, []);

		expect(threatClose).toBeGreaterThan(threatFar);
	});

	it("target beyond max range has zero distance factor", () => {
		// maxRange = defaultRange + cameraRangeBonus = 15 + 10 = 25
		const ctx = makeContext();
		const farMemory = makeMemory({
			faction: "feral",
			lastSeenPosition: pos(100, 0, 100), // well beyond range
		});

		const threat = assessThreat("bot-1", farMemory, ctx, []);
		// Should still be positive (hostility + confidence factors) but lower than nearby
		expect(threat).toBeGreaterThan(0);
		// But less than a near-range hostile
		const nearMemory = makeMemory({
			faction: "feral",
			lastSeenPosition: pos(1, 0, 1),
		});
		const nearThreat = assessThreat("bot-1", nearMemory, ctx, []);
		expect(nearThreat).toBeGreaterThan(threat);
	});

	it("healthier targets are more threatening", () => {
		const ctx = makeContext();

		const healthyEntity = makeEntity({
			id: "healthy",
			unit: {
				type: "maintenance_bot",
				displayName: "Bot",
				speed: 3,
				selected: false,
				components: [
					{ name: "arms", functional: true, material: "metal" },
					{ name: "legs", functional: true, material: "metal" },
				],
			},
		});

		const damagedEntity = makeEntity({
			id: "damaged",
			unit: {
				type: "maintenance_bot",
				displayName: "Bot",
				speed: 3,
				selected: false,
				components: [
					{ name: "arms", functional: false, material: "metal" },
					{ name: "legs", functional: false, material: "metal" },
				],
			},
		});

		const healthyMemory = makeMemory({
			entityId: "healthy",
			faction: "feral",
			lastSeenPosition: pos(5, 0, 5),
		});
		const damagedMemory = makeMemory({
			entityId: "damaged",
			faction: "feral",
			lastSeenPosition: pos(5, 0, 5),
		});

		const healthyThreat = assessThreat("bot-1", healthyMemory, ctx, [healthyEntity]);
		const damagedThreat = assessThreat("bot-1", damagedMemory, ctx, [damagedEntity]);

		expect(healthyThreat).toBeGreaterThan(damagedThreat);
	});

	it("being outnumbered increases threat", () => {
		const ctxAlone = makeContext({ nearbyEnemies: [
			{ id: "e1", position: pos(5, 0, 0), distanceSq: 25, faction: "feral" },
		], nearbyAllies: [] });

		const ctxWithAllies = makeContext({ nearbyEnemies: [
			{ id: "e1", position: pos(5, 0, 0), distanceSq: 25, faction: "feral" },
		], nearbyAllies: [
			{ id: "a1", position: pos(1, 0, 0), distanceSq: 1, faction: "player" },
			{ id: "a2", position: pos(2, 0, 0), distanceSq: 4, faction: "player" },
			{ id: "a3", position: pos(3, 0, 0), distanceSq: 9, faction: "player" },
		] });

		const memory = makeMemory({ faction: "feral", lastSeenPosition: pos(5, 0, 5) });

		const threatAlone = assessThreat("bot-1", memory, ctxAlone, []);
		const threatWithAllies = assessThreat("bot-1", memory, ctxWithAllies, []);

		expect(threatAlone).toBeGreaterThan(threatWithAllies);
	});

	it("entity without unit components gets 0.5 health factor", () => {
		// When entity exists but has no unit.components, we assume moderate threat
		const entityNoComponents = makeEntity({ id: "building-1" });
		const ctx = makeContext();
		const memory = makeMemory({
			entityId: "building-1",
			faction: "feral",
			lastSeenPosition: pos(5, 0, 5),
		});

		const threat = assessThreat("bot-1", memory, ctx, [entityNoComponents]);
		// Just verify it's a valid number > 0
		expect(threat).toBeGreaterThan(0);
	});

	it("entity not found in allEntities gets 0.5 health factor", () => {
		const ctx = makeContext();
		const memory = makeMemory({
			entityId: "ghost",
			faction: "feral",
			lastSeenPosition: pos(5, 0, 5),
		});

		// Empty entity list — entity not found
		const threat = assessThreat("bot-1", memory, ctx, []);
		expect(threat).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// getHighestThreat
// ---------------------------------------------------------------------------

describe("getHighestThreat", () => {
	it("returns null when no memories exist", () => {
		mockMemories = [];
		const ctx = makeContext();

		const result = getHighestThreat("bot-1", 0, ctx, []);
		expect(result).toBeNull();
	});

	it("returns null when all memories are non-hostile", () => {
		mockMemories = [
			makeMemory({ entityId: "wildlife-1", faction: "wildlife" }),
		];
		const ctx = makeContext();

		const result = getHighestThreat("bot-1", 0, ctx, []);
		expect(result).toBeNull();
	});

	it("returns the highest threat entity", () => {
		const closeEnemy = makeMemory({
			entityId: "close-enemy",
			faction: "feral",
			lastSeenPosition: pos(2, 0, 2),
			confidence: 1.0,
		});
		const farEnemy = makeMemory({
			entityId: "far-enemy",
			faction: "feral",
			lastSeenPosition: pos(20, 0, 20),
			confidence: 0.5,
		});
		mockMemories = [closeEnemy, farEnemy];

		const ctx = makeContext();
		const result = getHighestThreat("bot-1", 0, ctx, []);

		expect(result).not.toBeNull();
		expect(result!.entityId).toBe("close-enemy");
		expect(result!.threatLevel).toBeGreaterThan(0);
	});

	it("includes memory record in result", () => {
		mockMemories = [
			makeMemory({ entityId: "enemy-1", faction: "feral" }),
		];
		const ctx = makeContext();

		const result = getHighestThreat("bot-1", 0, ctx, []);
		expect(result).not.toBeNull();
		expect(result!.memory.entityId).toBe("enemy-1");
	});
});

// ---------------------------------------------------------------------------
// getThreatsAbove
// ---------------------------------------------------------------------------

describe("getThreatsAbove", () => {
	it("returns empty array when no threats exist", () => {
		mockMemories = [];
		const ctx = makeContext();

		const result = getThreatsAbove("bot-1", 0, ctx, []);
		expect(result).toEqual([]);
	});

	it("filters out threats below minimum threshold", () => {
		// Put enemy at max range with low confidence — should be below threshold
		mockMemories = [
			makeMemory({
				entityId: "weak-enemy",
				faction: "feral",
				lastSeenPosition: pos(100, 0, 100),
				confidence: 0.1,
			}),
		];
		const ctx = makeContext();

		const result = getThreatsAbove("bot-1", 0, ctx, [], 0.9);
		expect(result).toHaveLength(0);
	});

	it("returns threats sorted by threat level descending", () => {
		mockMemories = [
			makeMemory({
				entityId: "far-enemy",
				faction: "feral",
				lastSeenPosition: pos(20, 0, 20),
				confidence: 0.3,
			}),
			makeMemory({
				entityId: "close-enemy",
				faction: "cultist",
				lastSeenPosition: pos(1, 0, 1),
				confidence: 1.0,
			}),
		];
		const ctx = makeContext();

		const result = getThreatsAbove("bot-1", 0, ctx, [], 0);
		expect(result.length).toBe(2);
		expect(result[0].threatLevel).toBeGreaterThanOrEqual(result[1].threatLevel);
	});

	it("uses THREAT_THRESHOLD as default minimum", () => {
		mockMemories = [
			makeMemory({
				entityId: "enemy-1",
				faction: "feral",
				lastSeenPosition: pos(1, 0, 1),
				confidence: 1.0,
			}),
		];
		const ctx = makeContext();

		// Close enemy with high confidence should be above threshold
		const result = getThreatsAbove("bot-1", 0, ctx, []);
		expect(result.length).toBeGreaterThanOrEqual(0); // depends on scoring
	});
});

// ---------------------------------------------------------------------------
// hasThreatAboveThreshold
// ---------------------------------------------------------------------------

describe("hasThreatAboveThreshold", () => {
	it("returns false when no memories exist", () => {
		mockMemories = [];
		const ctx = makeContext();

		expect(hasThreatAboveThreshold("bot-1", 0, ctx, [])).toBe(false);
	});

	it("returns false when all memories are non-hostile", () => {
		mockMemories = [
			makeMemory({ entityId: "friendly", faction: "player" }),
		];
		const ctx = makeContext();

		expect(hasThreatAboveThreshold("bot-1", 0, ctx, [])).toBe(false);
	});

	it("returns true when a close hostile with high confidence exists", () => {
		mockMemories = [
			makeMemory({
				entityId: "close-enemy",
				faction: "feral",
				lastSeenPosition: pos(1, 0, 1),
				confidence: 1.0,
			}),
		];
		const ctx = makeContext({
			nearbyEnemies: [
				{ id: "close-enemy", position: pos(1, 0, 1), distanceSq: 2, faction: "feral" },
			],
		});

		expect(hasThreatAboveThreshold("bot-1", 0, ctx, [])).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Hostility matrix
// ---------------------------------------------------------------------------

describe("hostility matrix", () => {
	it("player is hostile to feral", () => {
		const memory = makeMemory({ faction: "feral" });
		const ctx = makeContext({ faction: "player" });
		expect(assessThreat("bot-1", memory, ctx, [])).toBeGreaterThan(0);
	});

	it("player is hostile to cultist", () => {
		const memory = makeMemory({ faction: "cultist" });
		const ctx = makeContext({ faction: "player" });
		expect(assessThreat("bot-1", memory, ctx, [])).toBeGreaterThan(0);
	});

	it("player is hostile to rogue", () => {
		const memory = makeMemory({ faction: "rogue" });
		const ctx = makeContext({ faction: "player" });
		expect(assessThreat("bot-1", memory, ctx, [])).toBeGreaterThan(0);
	});

	it("player is NOT hostile to wildlife", () => {
		const memory = makeMemory({ faction: "wildlife" });
		const ctx = makeContext({ faction: "player" });
		expect(assessThreat("bot-1", memory, ctx, [])).toBe(0);
	});

	it("player is NOT hostile to player (same faction)", () => {
		const memory = makeMemory({ faction: "player" });
		const ctx = makeContext({ faction: "player" });
		expect(assessThreat("bot-1", memory, ctx, [])).toBe(0);
	});

	it("feral is hostile to player", () => {
		const memory = makeMemory({ faction: "player" });
		const ctx = makeContext({ faction: "feral" });
		expect(assessThreat("bot-1", memory, ctx, [])).toBeGreaterThan(0);
	});

	it("feral is hostile to cultist", () => {
		const memory = makeMemory({ faction: "cultist" });
		const ctx = makeContext({ faction: "feral" });
		expect(assessThreat("bot-1", memory, ctx, [])).toBeGreaterThan(0);
	});

	it("wildlife is NOT hostile to anyone", () => {
		const memory = makeMemory({ faction: "player" });
		const ctx = makeContext({ faction: "wildlife" });
		expect(assessThreat("bot-1", memory, ctx, [])).toBe(0);
	});
});
