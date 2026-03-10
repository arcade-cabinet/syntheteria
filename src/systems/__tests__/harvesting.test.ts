/**
 * Unit tests for the harvesting system.
 *
 * Tests cover:
 * - startHarvesting begins powder transfer from deposit to player storage
 * - Powder accumulates at grindSpeed rate per second (delta-based)
 * - Deposit quantity decreases by same amount
 * - Stops when deposit quantity reaches 0
 * - Stops when player moves beyond 3.0m range
 * - Cannot harvest two deposits simultaneously
 * - Rates match config/mining.json ore type grindSpeed values
 * - Module state resets between tests
 */

import {
	DEFAULT_HARVEST_RANGE,
	type Vec3,
	_resetHarvestingState,
	getHarvestingState,
	getPowderStorage,
	startHarvesting,
	stopHarvesting,
	updateHarvesting,
} from "../harvesting";
import {
	ORE_TYPE_CONFIGS,
	resetDeposits,
	spawnOreDeposit,
} from "../oreSpawner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

/** Create a deposit position getter that always returns the same position. */
function staticPos(x = 0, y = 0, z = 0): () => Vec3 {
	return () => ({ x, y, z });
}

/** Spawn a rock deposit at a given position with given quantity. */
function spawnRock(
	quantity = 100,
	position: Vec3 = pos(),
): ReturnType<typeof spawnOreDeposit> {
	return spawnOreDeposit({
		type: "rock",
		quantity,
		position,
	});
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetHarvestingState();
	resetDeposits();
});

// ---------------------------------------------------------------------------
// startHarvesting — basic usage
// ---------------------------------------------------------------------------

describe("startHarvesting", () => {
	it("returns true when starting to harvest a valid nearby deposit", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		const result = startHarvesting(
			deposit.id,
			pos(0, 0, 0),
			staticPos(1, 0, 0),
		);

		expect(result).toBe(true);
	});

	it("sets harvesting state as active", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const state = getHarvestingState();
		expect(state).not.toBeNull();
		expect(state?.isActive).toBe(true);
		expect(state?.depositId).toBe(deposit.id);
		expect(state?.powderAccumulated).toBe(0);
	});

	it("returns false if deposit does not exist", () => {
		const result = startHarvesting(
			"nonexistent_deposit",
			pos(0, 0, 0),
			staticPos(0, 0, 0),
		);

		expect(result).toBe(false);
		expect(getHarvestingState()).toBeNull();
	});

	it("returns false if deposit quantity is 0", () => {
		const deposit = spawnRock(0, pos(1, 0, 0));
		const result = startHarvesting(
			deposit.id,
			pos(0, 0, 0),
			staticPos(1, 0, 0),
		);

		expect(result).toBe(false);
	});

	it("returns false if player is beyond harvest range", () => {
		const deposit = spawnRock(100, pos(10, 0, 0));
		const result = startHarvesting(
			deposit.id,
			pos(0, 0, 0),
			staticPos(10, 0, 0),
		);

		expect(result).toBe(false);
	});

	it("returns true when player is exactly at harvest range boundary", () => {
		// Place deposit exactly DEFAULT_HARVEST_RANGE away
		const deposit = spawnRock(100, pos(DEFAULT_HARVEST_RANGE, 0, 0));
		const result = startHarvesting(
			deposit.id,
			pos(0, 0, 0),
			staticPos(DEFAULT_HARVEST_RANGE, 0, 0),
		);

		expect(result).toBe(true);
	});

	it("returns true when player is inside harvest range", () => {
		const deposit = spawnRock(100, pos(2, 0, 0));
		const result = startHarvesting(
			deposit.id,
			pos(0, 0, 0),
			staticPos(2, 0, 0),
		);

		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Cannot harvest two deposits simultaneously
// ---------------------------------------------------------------------------

describe("simultaneous harvesting prevention", () => {
	it("returns false when trying to harvest while already harvesting", () => {
		const deposit1 = spawnRock(100, pos(1, 0, 0));
		const deposit2 = spawnOreDeposit({
			type: "copper",
			quantity: 50,
			position: pos(2, 0, 0),
		});

		startHarvesting(deposit1.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const result = startHarvesting(
			deposit2.id,
			pos(0, 0, 0),
			staticPos(2, 0, 0),
		);

		expect(result).toBe(false);
	});

	it("allows starting new harvest after stopping previous", () => {
		const deposit1 = spawnRock(100, pos(1, 0, 0));
		const deposit2 = spawnOreDeposit({
			type: "copper",
			quantity: 50,
			position: pos(2, 0, 0),
		});

		startHarvesting(deposit1.id, pos(0, 0, 0), staticPos(1, 0, 0));
		stopHarvesting();

		const result = startHarvesting(
			deposit2.id,
			pos(0, 0, 0),
			staticPos(2, 0, 0),
		);

		expect(result).toBe(true);
		expect(getHarvestingState()?.depositId).toBe(deposit2.id);
	});
});

// ---------------------------------------------------------------------------
// updateHarvesting — powder accumulation
// ---------------------------------------------------------------------------

describe("updateHarvesting", () => {
	it("accumulates powder at grindSpeed rate per second", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		const rockGrindSpeed = ORE_TYPE_CONFIGS.rock.grindSpeed; // 1.0
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const result = updateHarvesting(1.0, pos(0, 0, 0)); // 1 second

		expect(result.powderGained).toBeCloseTo(rockGrindSpeed * 1.0);
		expect(result.depositRemaining).toBeCloseTo(100 - rockGrindSpeed * 1.0);
		expect(result.stopped).toBe(false);
	});

	it("scales powder with delta time", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		const rockGrindSpeed = ORE_TYPE_CONFIGS.rock.grindSpeed;
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const delta = 0.016; // ~60fps
		const result = updateHarvesting(delta, pos(0, 0, 0));

		expect(result.powderGained).toBeCloseTo(rockGrindSpeed * delta);
	});

	it("uses ore-type-specific grindSpeed", () => {
		const copperDeposit = spawnOreDeposit({
			type: "copper",
			quantity: 100,
			position: pos(1, 0, 0),
		});
		const copperGrindSpeed = ORE_TYPE_CONFIGS.copper.grindSpeed; // 0.6
		startHarvesting(copperDeposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const result = updateHarvesting(1.0, pos(0, 0, 0));

		expect(result.powderGained).toBeCloseTo(copperGrindSpeed);
	});

	it("decreases deposit quantity by same amount as powder gained", () => {
		const initialQuantity = 50;
		const deposit = spawnRock(initialQuantity, pos(1, 0, 0));
		const rockGrindSpeed = ORE_TYPE_CONFIGS.rock.grindSpeed;
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		updateHarvesting(1.0, pos(0, 0, 0));

		expect(deposit.quantity).toBeCloseTo(
			initialQuantity - rockGrindSpeed * 1.0,
		);
	});

	it("accumulates powder across multiple update ticks", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		const rockGrindSpeed = ORE_TYPE_CONFIGS.rock.grindSpeed;
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		updateHarvesting(0.5, pos(0, 0, 0));
		updateHarvesting(0.5, pos(0, 0, 0));
		updateHarvesting(0.5, pos(0, 0, 0));

		const storage = getPowderStorage();
		expect(storage.get("rock")).toBeCloseTo(rockGrindSpeed * 1.5);
	});

	it("adds powder to powder storage keyed by ore type", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		updateHarvesting(1.0, pos(0, 0, 0));

		const storage = getPowderStorage();
		expect(storage.has("rock")).toBe(true);
		expect(storage.get("rock")).toBeGreaterThan(0);
	});

	it("returns zeros when not harvesting", () => {
		const result = updateHarvesting(1.0, pos(0, 0, 0));

		expect(result.powderGained).toBe(0);
		expect(result.depositRemaining).toBe(0);
		expect(result.stopped).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// updateHarvesting — stopping conditions
// ---------------------------------------------------------------------------

describe("harvesting stop conditions", () => {
	it("stops when deposit quantity reaches 0", () => {
		const deposit = spawnRock(0.5, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		// With grindSpeed 1.0, 1 second extracts 1.0 powder — more than 0.5 remaining
		const result = updateHarvesting(1.0, pos(0, 0, 0));

		expect(result.stopped).toBe(true);
		expect(result.depositRemaining).toBe(0);
		expect(result.powderGained).toBeCloseTo(0.5); // clamped to remaining
		expect(deposit.quantity).toBe(0);
		expect(getHarvestingState()).toBeNull();
	});

	it("stops when player moves beyond harvest range", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		// Player moves far away
		const result = updateHarvesting(1.0, pos(100, 0, 0));

		expect(result.stopped).toBe(true);
		expect(result.powderGained).toBe(0);
		expect(result.depositRemaining).toBe(100); // unchanged
		expect(getHarvestingState()).toBeNull();
	});

	it("does not extract powder on the tick where player moves out of range", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		// First tick in range
		updateHarvesting(0.5, pos(0, 0, 0));
		const storageBefore = getPowderStorage().get("rock") ?? 0;

		// Second tick out of range
		updateHarvesting(0.5, pos(100, 0, 0));
		const storageAfter = getPowderStorage().get("rock") ?? 0;

		expect(storageAfter).toBeCloseTo(storageBefore); // no change
	});

	it("allows restarting harvest after deposit depletion on a different deposit", () => {
		const deposit1 = spawnRock(0.1, pos(1, 0, 0));
		startHarvesting(deposit1.id, pos(0, 0, 0), staticPos(1, 0, 0));
		updateHarvesting(1.0, pos(0, 0, 0)); // depletes deposit1

		const deposit2 = spawnOreDeposit({
			type: "copper",
			quantity: 100,
			position: pos(2, 0, 0),
		});

		const result = startHarvesting(
			deposit2.id,
			pos(0, 0, 0),
			staticPos(2, 0, 0),
		);

		expect(result).toBe(true);
		expect(getHarvestingState()?.depositId).toBe(deposit2.id);
	});
});

// ---------------------------------------------------------------------------
// stopHarvesting — manual stop
// ---------------------------------------------------------------------------

describe("stopHarvesting", () => {
	it("manually stops active harvesting", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		stopHarvesting();

		expect(getHarvestingState()).toBeNull();
	});

	it("does nothing when not harvesting", () => {
		expect(() => stopHarvesting()).not.toThrow();
		expect(getHarvestingState()).toBeNull();
	});

	it("preserves powder storage after stopping", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));
		updateHarvesting(1.0, pos(0, 0, 0));

		const storageBefore = getPowderStorage().get("rock") ?? 0;
		stopHarvesting();
		const storageAfter = getPowderStorage().get("rock") ?? 0;

		expect(storageAfter).toBeCloseTo(storageBefore);
		expect(storageAfter).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Grinding rates from config/mining.json
// ---------------------------------------------------------------------------

describe("grinding rates match config", () => {
	it("rock grindSpeed is 1.0 per second", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const result = updateHarvesting(1.0, pos(0, 0, 0));

		expect(result.powderGained).toBeCloseTo(1.0);
	});

	it("scrap_iron grindSpeed is 0.8 per second", () => {
		const deposit = spawnOreDeposit({
			type: "scrap_iron",
			quantity: 100,
			position: pos(1, 0, 0),
		});
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const result = updateHarvesting(1.0, pos(0, 0, 0));

		expect(result.powderGained).toBeCloseTo(0.8);
	});

	it("copper grindSpeed is 0.6 per second", () => {
		const deposit = spawnOreDeposit({
			type: "copper",
			quantity: 100,
			position: pos(1, 0, 0),
		});
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const result = updateHarvesting(1.0, pos(0, 0, 0));

		expect(result.powderGained).toBeCloseTo(0.6);
	});

	it("silicon grindSpeed is 0.4 per second", () => {
		const deposit = spawnOreDeposit({
			type: "silicon",
			quantity: 100,
			position: pos(1, 0, 0),
		});
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const result = updateHarvesting(1.0, pos(0, 0, 0));

		expect(result.powderGained).toBeCloseTo(0.4);
	});

	it("titanium grindSpeed is 0.3 per second", () => {
		const deposit = spawnOreDeposit({
			type: "titanium",
			quantity: 100,
			position: pos(1, 0, 0),
		});
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		const result = updateHarvesting(1.0, pos(0, 0, 0));

		expect(result.powderGained).toBeCloseTo(0.3);
	});
});

// ---------------------------------------------------------------------------
// Powder storage
// ---------------------------------------------------------------------------

describe("powder storage", () => {
	it("tracks powder per ore type separately", () => {
		// Harvest some rock
		const rockDeposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(rockDeposit.id, pos(0, 0, 0), staticPos(1, 0, 0));
		updateHarvesting(1.0, pos(0, 0, 0));
		stopHarvesting();

		// Harvest some copper
		const copperDeposit = spawnOreDeposit({
			type: "copper",
			quantity: 100,
			position: pos(2, 0, 0),
		});
		startHarvesting(copperDeposit.id, pos(0, 0, 0), staticPos(2, 0, 0));
		updateHarvesting(1.0, pos(0, 0, 0));
		stopHarvesting();

		const storage = getPowderStorage();
		expect(storage.get("rock")).toBeCloseTo(1.0);
		expect(storage.get("copper")).toBeCloseTo(0.6);
	});

	it("is empty initially", () => {
		const storage = getPowderStorage();
		expect(storage.size).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// _resetHarvestingState — test cleanup
// ---------------------------------------------------------------------------

describe("_resetHarvestingState", () => {
	it("clears harvesting state", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));

		_resetHarvestingState();

		expect(getHarvestingState()).toBeNull();
	});

	it("clears powder storage", () => {
		const deposit = spawnRock(100, pos(1, 0, 0));
		startHarvesting(deposit.id, pos(0, 0, 0), staticPos(1, 0, 0));
		updateHarvesting(1.0, pos(0, 0, 0));

		_resetHarvestingState();

		expect(getPowderStorage().size).toBe(0);
	});
});
