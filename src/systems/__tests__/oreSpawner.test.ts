/**
 * Unit tests for the OreDeposit entity spawner.
 *
 * Tests cover:
 * - spawnOreDeposit creates entity with correct data
 * - Ore type validation against config/mining.json oreTypes
 * - Invalid ore type throws error
 * - Rapier physics body creation callback
 * - spawnInitialDeposits distributes deposits at valid positions
 * - Minimum distance enforcement between deposits
 * - Module state reset between tests
 */

import {
	ORE_TYPE_CONFIGS,
	VALID_ORE_TYPES,
	getAllDeposits,
	getDeposit,
	resetDeposits,
	spawnInitialDeposits,
	spawnOreDeposit,
} from "../oreSpawner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePosition(
	x = 0,
	y = 0,
	z = 0,
): { x: number; y: number; z: number } {
	return { x, y, z };
}

/** Deterministic RNG for reproducible tests. */
function seededRng(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 16807 + 0) % 2147483647;
		return s / 2147483647;
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetDeposits();
});

// ---------------------------------------------------------------------------
// spawnOreDeposit — basic creation
// ---------------------------------------------------------------------------

describe("spawnOreDeposit", () => {
	it("creates entity with correct ore type and quantity", () => {
		const deposit = spawnOreDeposit({
			type: "rock",
			quantity: 100,
			position: makePosition(10, 0, 20),
		});

		expect(deposit.type).toBe("rock");
		expect(deposit.quantity).toBe(100);
		expect(deposit.position).toEqual({ x: 10, y: 0, z: 20 });
	});

	it("assigns unique IDs to each deposit", () => {
		const d1 = spawnOreDeposit({
			type: "rock",
			quantity: 50,
			position: makePosition(),
		});
		const d2 = spawnOreDeposit({
			type: "copper",
			quantity: 30,
			position: makePosition(5, 0, 5),
		});

		expect(d1.id).not.toBe(d2.id);
		expect(d1.id).toMatch(/^ore_deposit_/);
		expect(d2.id).toMatch(/^ore_deposit_/);
	});

	it("uses default collider radius of 1.0 when not specified", () => {
		const deposit = spawnOreDeposit({
			type: "scrap_iron",
			quantity: 75,
			position: makePosition(),
		});

		expect(deposit.colliderRadius).toBe(1.0);
	});

	it("uses custom collider radius when specified", () => {
		const deposit = spawnOreDeposit({
			type: "titanium",
			quantity: 20,
			position: makePosition(),
			colliderRadius: 2.5,
		});

		expect(deposit.colliderRadius).toBe(2.5);
	});

	it("copies hardness and grindSpeed from ore type config", () => {
		const deposit = spawnOreDeposit({
			type: "copper",
			quantity: 50,
			position: makePosition(),
		});

		expect(deposit.hardness).toBe(ORE_TYPE_CONFIGS.copper.hardness);
		expect(deposit.grindSpeed).toBe(ORE_TYPE_CONFIGS.copper.grindSpeed);
		expect(deposit.color).toBe(ORE_TYPE_CONFIGS.copper.color);
	});

	it("registers deposit in module store", () => {
		const deposit = spawnOreDeposit({
			type: "silicon",
			quantity: 40,
			position: makePosition(3, 0, 7),
		});

		expect(getDeposit(deposit.id)).toBe(deposit);
		expect(getAllDeposits()).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// spawnOreDeposit — ore type validation
// ---------------------------------------------------------------------------

describe("ore type validation", () => {
	it("accepts all valid ore types from mining.json", () => {
		for (const oreType of VALID_ORE_TYPES) {
			const deposit = spawnOreDeposit({
				type: oreType,
				quantity: 10,
				position: makePosition(),
			});
			expect(deposit.type).toBe(oreType);
		}
	});

	it("throws error for invalid ore type", () => {
		expect(() =>
			spawnOreDeposit({
				type: "unobtainium",
				quantity: 10,
				position: makePosition(),
			}),
		).toThrow('Invalid ore type "unobtainium"');
	});

	it("throws error for empty ore type string", () => {
		expect(() =>
			spawnOreDeposit({
				type: "",
				quantity: 10,
				position: makePosition(),
			}),
		).toThrow("Invalid ore type");
	});

	it("error message lists valid types", () => {
		try {
			spawnOreDeposit({
				type: "invalid",
				quantity: 10,
				position: makePosition(),
			});
		} catch (e) {
			expect((e as Error).message).toContain("rock");
			expect((e as Error).message).toContain("titanium");
		}
	});
});

// ---------------------------------------------------------------------------
// spawnOreDeposit — Rapier physics body
// ---------------------------------------------------------------------------

describe("physics body creation", () => {
	it("calls createPhysicsBody callback with position and radius", () => {
		const mockCreateBody = jest.fn();
		const pos = makePosition(5, 0, 10);

		spawnOreDeposit(
			{
				type: "rock",
				quantity: 100,
				position: pos,
				colliderRadius: 1.5,
			},
			mockCreateBody,
		);

		expect(mockCreateBody).toHaveBeenCalledTimes(1);
		expect(mockCreateBody).toHaveBeenCalledWith(
			expect.objectContaining({ x: 5, y: 0, z: 10 }),
			1.5,
		);
	});

	it("does not crash when no physics callback provided", () => {
		expect(() =>
			spawnOreDeposit({
				type: "rock",
				quantity: 100,
				position: makePosition(),
			}),
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// spawnInitialDeposits — bulk spawning
// ---------------------------------------------------------------------------

describe("spawnInitialDeposits", () => {
	it("spawns the requested number of deposits", () => {
		const deposits = spawnInitialDeposits(5, 100, {
			rng: seededRng(42),
		});

		expect(deposits).toHaveLength(5);
	});

	it("all deposits have valid ore types", () => {
		const deposits = spawnInitialDeposits(10, 200, {
			rng: seededRng(123),
		});

		for (const d of deposits) {
			expect(VALID_ORE_TYPES).toContain(d.type);
		}
	});

	it("deposits are placed within world bounds", () => {
		const worldSize = 100;
		const half = worldSize / 2;
		const deposits = spawnInitialDeposits(20, worldSize, {
			rng: seededRng(99),
		});

		for (const d of deposits) {
			expect(d.position.x).toBeGreaterThanOrEqual(-half);
			expect(d.position.x).toBeLessThanOrEqual(half);
			expect(d.position.z).toBeGreaterThanOrEqual(-half);
			expect(d.position.z).toBeLessThanOrEqual(half);
			expect(d.position.y).toBe(0);
		}
	});

	it("enforces minimum distance between deposits", () => {
		const minDistance = 10;
		const deposits = spawnInitialDeposits(8, 200, {
			minDistance,
			rng: seededRng(77),
		});

		for (let i = 0; i < deposits.length; i++) {
			for (let j = i + 1; j < deposits.length; j++) {
				const dx = deposits[i].position.x - deposits[j].position.x;
				const dz = deposits[i].position.z - deposits[j].position.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				expect(dist).toBeGreaterThanOrEqual(minDistance);
			}
		}
	});

	it("uses default quantity for all deposits", () => {
		const deposits = spawnInitialDeposits(3, 100, {
			defaultQuantity: 250,
			rng: seededRng(55),
		});

		for (const d of deposits) {
			expect(d.quantity).toBe(250);
		}
	});

	it("uses default collider radius for all deposits", () => {
		const deposits = spawnInitialDeposits(3, 100, {
			defaultColliderRadius: 2.0,
			rng: seededRng(55),
		});

		for (const d of deposits) {
			expect(d.colliderRadius).toBe(2.0);
		}
	});

	it("calls createPhysicsBody for each deposit", () => {
		const mockCreateBody = jest.fn();
		const deposits = spawnInitialDeposits(4, 100, {
			createPhysicsBody: mockCreateBody,
			rng: seededRng(33),
		});

		expect(mockCreateBody).toHaveBeenCalledTimes(deposits.length);
	});

	it("registers all deposits in module store", () => {
		spawnInitialDeposits(5, 100, {
			rng: seededRng(42),
		});

		expect(getAllDeposits()).toHaveLength(5);
	});

	it("returns fewer deposits if world is too small for requested count", () => {
		// Very small world + large minDistance = can't fit many
		const deposits = spawnInitialDeposits(100, 10, {
			minDistance: 8,
			rng: seededRng(11),
		});

		expect(deposits.length).toBeLessThan(100);
		expect(deposits.length).toBeGreaterThan(0);
	});

	it("returns empty array when count is 0", () => {
		const deposits = spawnInitialDeposits(0, 100);
		expect(deposits).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Module state — reset
// ---------------------------------------------------------------------------

describe("resetDeposits", () => {
	it("clears all deposits from the store", () => {
		spawnOreDeposit({
			type: "rock",
			quantity: 50,
			position: makePosition(),
		});
		spawnOreDeposit({
			type: "copper",
			quantity: 30,
			position: makePosition(10, 0, 10),
		});

		expect(getAllDeposits()).toHaveLength(2);

		resetDeposits();

		expect(getAllDeposits()).toHaveLength(0);
	});

	it("resets ID counter so new deposits start from 0", () => {
		spawnOreDeposit({
			type: "rock",
			quantity: 50,
			position: makePosition(),
		});

		resetDeposits();

		const deposit = spawnOreDeposit({
			type: "rock",
			quantity: 50,
			position: makePosition(),
		});

		expect(deposit.id).toBe("ore_deposit_0");
	});
});
