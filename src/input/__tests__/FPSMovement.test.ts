/**
 * Unit tests for FPSMovement.ts.
 *
 * Tests cover:
 * - isOnGround returns true when entity is at floor level
 * - isOnGround returns false when entity is above floor
 * - isOnGround returns true when worldPosition is missing
 * - applyGravity pulls entity down each frame
 * - applyGravity clamps entity to floor (no clipping through ground)
 * - applyGravity resets vertical velocity to 0 on landing
 * - applyGravity accumulates velocity across multiple frames
 * - tryJump returns false when entity has no legs
 * - tryJump returns false when entity is not on ground
 * - tryJump returns true and sets upward velocity when on ground with legs
 * - getWalkBob returns 0 when speed is nearly zero
 * - getWalkBob returns non-zero value when moving
 * - getWalkBob amplitude scales with speed (capped at 1)
 * - getWalkBob oscillates with sin() — sign changes over time
 */

// ---------------------------------------------------------------------------
// Mock config (terrain.json needed for imports)
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		terrain: {
			worldSize: 200,
			fogResolution: 64,
			heightScale: 5,
			roughness: 0.4,
			baseFrequency: 0.03,
			harmonics: [
				{ frequency: 0.07, amplitude: 0.3 },
				{ frequency: 0.15, amplitude: 0.15 },
			],
			seaLevel: -2,
			mountainThreshold: 3,
		},
	},
}));

// ---------------------------------------------------------------------------
// Mock terrain — controls floor height
// ---------------------------------------------------------------------------

const mockGetTerrainHeight = jest.fn<number, [number, number]>().mockReturnValue(0);

jest.mock("../../ecs/terrain", () => ({
	getTerrainHeight: (...args: [number, number]) => mockGetTerrainHeight(...args),
	WORLD_SIZE: 200,
	WORLD_HALF: 100,
	FOG_RES: 64,
}));

import {
	applyGravity,
	getWalkBob,
	isOnGround,
	tryJump,
} from "../FPSMovement";
import type { PlayerEntity } from "../../ecs/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBotAtHeight(y: number, hasLegs = true): PlayerEntity {
	return {
		id: "bot_test",
		faction: "player",
		worldPosition: { x: 0, y, z: 0 },
		playerControlled: { isActive: true, yaw: 0, pitch: 0 },
		unit: {
			type: "maintenance_bot",
			displayName: "Test Bot",
			speed: 3,
			selected: false,
			components: hasLegs
				? [{ name: "legs", functional: true, material: "metal" }]
				: [],
		},
		mapFragment: { fragmentId: "frag_0" },
	} as PlayerEntity;
}

// ---------------------------------------------------------------------------
// isOnGround
// ---------------------------------------------------------------------------

describe("isOnGround", () => {
	beforeEach(() => {
		mockGetTerrainHeight.mockReturnValue(0);
	});

	it("returns true when entity is exactly at floor level", () => {
		const bot = makeBotAtHeight(0);
		expect(isOnGround(bot)).toBe(true);
	});

	it("returns true when entity is slightly above floor (within epsilon)", () => {
		const bot = makeBotAtHeight(0.005); // within GROUND_EPSILON of 0.01
		expect(isOnGround(bot)).toBe(true);
	});

	it("returns false when entity is clearly above floor", () => {
		const bot = makeBotAtHeight(2);
		expect(isOnGround(bot)).toBe(false);
	});

	it("returns true when worldPosition is missing", () => {
		const bot = { id: "bot_no_pos", faction: "player" } as PlayerEntity;
		expect(isOnGround(bot)).toBe(true);
	});

	it("uses terrain height at entity x/z position", () => {
		mockGetTerrainHeight.mockReturnValue(5); // elevated terrain
		const bot = makeBotAtHeight(5);
		expect(isOnGround(bot)).toBe(true);
	});

	it("returns false when above elevated terrain", () => {
		mockGetTerrainHeight.mockReturnValue(5);
		const bot = makeBotAtHeight(10);
		expect(isOnGround(bot)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// applyGravity
// ---------------------------------------------------------------------------

describe("applyGravity", () => {
	beforeEach(() => {
		mockGetTerrainHeight.mockReturnValue(0);
	});

	it("pulls entity downward when airborne", () => {
		const bot = makeBotAtHeight(5);
		const startY = bot.worldPosition.y;
		applyGravity(bot, 0.1);
		expect(bot.worldPosition.y).toBeLessThan(startY);
	});

	it("clamps entity to floor on landing", () => {
		const bot = makeBotAtHeight(0.01); // just above floor
		applyGravity(bot, 1); // large delta — should land
		expect(bot.worldPosition.y).toBeCloseTo(0, 2);
	});

	it("velocity is reset to 0 on landing", () => {
		const bot = makeBotAtHeight(0);
		applyGravity(bot, 1);
		const yBefore = bot.worldPosition.y;
		applyGravity(bot, 1);
		// After landing, entity stays at floor (no accumulating negative velocity)
		expect(bot.worldPosition.y).toBeCloseTo(yBefore, 2);
	});

	it("falls faster with each successive frame (gravity acceleration)", () => {
		const bot = makeBotAtHeight(100);
		applyGravity(bot, 0.1);
		const dy1 = 100 - bot.worldPosition.y;

		const bot2 = makeBotAtHeight(bot.worldPosition.y);
		// Transfer vertical velocity: applyGravity stores velocity per-entity
		// so just continue with the same bot
		const prevY = bot.worldPosition.y;
		applyGravity(bot, 0.1);
		const dy2 = prevY - bot.worldPosition.y;

		expect(dy2).toBeGreaterThan(dy1);
	});

	it("entity never goes below floor (no ground clipping)", () => {
		mockGetTerrainHeight.mockReturnValue(0);
		const bot = makeBotAtHeight(1);
		// Apply many frames — entity should never go below 0
		for (let i = 0; i < 100; i++) {
			applyGravity(bot, 0.1);
		}
		expect(bot.worldPosition.y).toBeGreaterThanOrEqual(0);
	});
});

// ---------------------------------------------------------------------------
// tryJump
// ---------------------------------------------------------------------------

describe("tryJump", () => {
	beforeEach(() => {
		mockGetTerrainHeight.mockReturnValue(0);
	});

	it("returns false when bot has no legs", () => {
		const bot = makeBotAtHeight(0, false); // no legs
		expect(tryJump(bot)).toBe(false);
	});

	it("returns false when bot is not on ground (airborne)", () => {
		const bot = makeBotAtHeight(5, true); // high up
		expect(tryJump(bot)).toBe(false);
	});

	it("returns true when on ground with functional legs", () => {
		const bot = makeBotAtHeight(0, true);
		expect(tryJump(bot)).toBe(true);
	});

	it("after jump, entity moves upward on next applyGravity call", () => {
		const bot = makeBotAtHeight(0, true);
		tryJump(bot);
		const startY = bot.worldPosition.y;
		applyGravity(bot, 0.05); // small delta — should go up
		expect(bot.worldPosition.y).toBeGreaterThan(startY);
	});

	it("returns false for broken legs", () => {
		const bot = makeBotAtHeight(0);
		bot.unit.components = [{ name: "legs", functional: false, material: "metal" }];
		expect(tryJump(bot)).toBe(false);
	});

	it("can only jump once (not while airborne)", () => {
		const bot = makeBotAtHeight(0, true);
		expect(tryJump(bot)).toBe(true);
		// Bot is now airborne after jump impulse
		bot.worldPosition.y = 2;
		expect(tryJump(bot)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getWalkBob
// ---------------------------------------------------------------------------

describe("getWalkBob", () => {
	it("returns 0 when speed is nearly zero", () => {
		expect(getWalkBob(1.0, 0)).toBe(0);
		expect(getWalkBob(1.0, 0.005)).toBe(0);
	});

	it("returns a non-zero value when moving at speed > 0.01", () => {
		const bob = getWalkBob(1.0, 1);
		expect(bob).not.toBe(0);
	});

	it("amplitude scales with speed (half-speed = half amplitude)", () => {
		const t = Math.PI / 2 / 8; // quarter period — sin = 1
		const bob1 = getWalkBob(t, 0.5);
		const bob2 = getWalkBob(t, 1.0);
		// bob2 should be roughly 2x bob1 (since amplitude scales linearly)
		expect(Math.abs(bob2)).toBeGreaterThan(Math.abs(bob1));
	});

	it("returns positive and negative values at different times (sin oscillation)", () => {
		// At t=0: sin(0)=0, at t=π/8: sin(π)≈0 (nearly), sample around it
		const t1 = (Math.PI / 2) / 8; // t where sin(t*8)=1 → positive
		const t2 = (3 * Math.PI / 2) / 8; // t where sin(t*8)=-1 → negative
		expect(getWalkBob(t1, 1)).toBeGreaterThan(0);
		expect(getWalkBob(t2, 1)).toBeLessThan(0);
	});

	it("speed capped at amplitude of 1 — speed=2 same amplitude as speed=1", () => {
		const t = (Math.PI / 2) / 8; // sin peak
		const bobAt1 = getWalkBob(t, 1);
		const bobAt2 = getWalkBob(t, 2);
		// Both should have same value since amplitude = 0.04 * min(speed, 1)
		expect(bobAt2).toBeCloseTo(bobAt1, 5);
	});
});
