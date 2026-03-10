/**
 * Unit tests for the quick-deposit system.
 *
 * Tests cover:
 * - Target registration, unregistration, and state updates
 * - checkQuickDeposit proximity, material, capacity, and power checks
 * - executeQuickDeposit success and failure paths
 * - getTargetsInRange and getNearestTarget spatial queries
 * - Range configuration via setQuickDepositRange / getQuickDepositRange
 * - Prompt formatting for various material and target types
 * - Edge cases: empty registry, multiple targets, boundary distances
 * - Module state reset between tests
 */

import {
	checkQuickDeposit,
	executeQuickDeposit,
	getNearestTarget,
	getQuickDepositRange,
	getTargetsInRange,
	registerTarget,
	reset,
	setQuickDepositRange,
	unregisterTarget,
	updateTargetState,
} from "../quickDeposit";

import type {
	QuickDepositPrompt,
	QuickDepositResult,
	QuickDepositTarget,
	Vec3,
} from "../quickDeposit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

function makeFurnace(
	overrides: Partial<QuickDepositTarget> = {},
): QuickDepositTarget {
	return {
		targetId: overrides.targetId ?? "furnace_0",
		targetType: overrides.targetType ?? "furnace",
		position: overrides.position ?? pos(5, 0, 0),
		acceptsMaterial: overrides.acceptsMaterial ?? null,
		hopperSpace: overrides.hopperSpace ?? 5,
		isActive: overrides.isActive ?? true,
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// registerTarget / unregisterTarget
// ---------------------------------------------------------------------------

describe("registerTarget", () => {
	it("registers a target that can be found by proximity", () => {
		registerTarget(makeFurnace({ position: pos(1, 0, 0) }));

		const targets = getTargetsInRange(pos(0, 0, 0), 5);
		expect(targets).toHaveLength(1);
		expect(targets[0].targetId).toBe("furnace_0");
	});

	it("copies position to avoid external mutation", () => {
		const position = pos(1, 2, 3);
		registerTarget(makeFurnace({ position }));

		position.x = 999;

		const nearest = getNearestTarget(pos(1, 2, 3));
		expect(nearest!.position.x).toBe(1);
	});

	it("copies acceptsMaterial array to avoid external mutation", () => {
		const materials = ["iron", "copper"];
		registerTarget(makeFurnace({ acceptsMaterial: materials }));

		materials.push("tampered");

		const nearest = getNearestTarget(pos(5, 0, 0));
		expect(nearest!.acceptsMaterial).toEqual(["iron", "copper"]);
	});
});

describe("unregisterTarget", () => {
	it("removes a target from the registry", () => {
		registerTarget(makeFurnace());
		unregisterTarget("furnace_0");

		const targets = getTargetsInRange(pos(0, 0, 0), 100);
		expect(targets).toHaveLength(0);
	});

	it("does not throw when unregistering unknown ID", () => {
		expect(() => unregisterTarget("nonexistent")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// updateTargetState
// ---------------------------------------------------------------------------

describe("updateTargetState", () => {
	it("updates hopperSpace", () => {
		registerTarget(makeFurnace({ hopperSpace: 5 }));

		updateTargetState("furnace_0", { hopperSpace: 2 });

		const nearest = getNearestTarget(pos(5, 0, 0));
		expect(nearest!.hopperSpace).toBe(2);
	});

	it("updates isActive", () => {
		registerTarget(makeFurnace({ isActive: true }));

		updateTargetState("furnace_0", { isActive: false });

		const nearest = getNearestTarget(pos(5, 0, 0));
		expect(nearest!.isActive).toBe(false);
	});

	it("updates acceptsMaterial", () => {
		registerTarget(makeFurnace({ acceptsMaterial: ["iron"] }));

		updateTargetState("furnace_0", {
			acceptsMaterial: ["iron", "copper"],
		});

		const nearest = getNearestTarget(pos(5, 0, 0));
		expect(nearest!.acceptsMaterial).toEqual(["iron", "copper"]);
	});

	it("updates position", () => {
		registerTarget(makeFurnace({ position: pos(5, 0, 0) }));

		updateTargetState("furnace_0", { position: pos(10, 0, 0) });

		const nearest = getNearestTarget(pos(10, 0, 0));
		expect(nearest!.position).toEqual({ x: 10, y: 0, z: 0 });
	});

	it("ignores update for unknown target", () => {
		expect(() =>
			updateTargetState("nonexistent", { hopperSpace: 0 }),
		).not.toThrow();
	});

	it("sets acceptsMaterial to null (accept all)", () => {
		registerTarget(makeFurnace({ acceptsMaterial: ["iron"] }));

		updateTargetState("furnace_0", { acceptsMaterial: null });

		const nearest = getNearestTarget(pos(5, 0, 0));
		expect(nearest!.acceptsMaterial).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getTargetsInRange
// ---------------------------------------------------------------------------

describe("getTargetsInRange", () => {
	it("returns empty array when no targets registered", () => {
		const targets = getTargetsInRange(pos(0, 0, 0), 10);
		expect(targets).toEqual([]);
	});

	it("returns only targets within range", () => {
		registerTarget(makeFurnace({ targetId: "near", position: pos(2, 0, 0) }));
		registerTarget(makeFurnace({ targetId: "far", position: pos(20, 0, 0) }));

		const targets = getTargetsInRange(pos(0, 0, 0), 5);

		expect(targets).toHaveLength(1);
		expect(targets[0].targetId).toBe("near");
	});

	it("returns targets sorted by distance (nearest first)", () => {
		registerTarget(makeFurnace({ targetId: "mid", position: pos(5, 0, 0) }));
		registerTarget(makeFurnace({ targetId: "near", position: pos(1, 0, 0) }));
		registerTarget(makeFurnace({ targetId: "far", position: pos(9, 0, 0) }));

		const targets = getTargetsInRange(pos(0, 0, 0), 10);

		expect(targets.map((t) => t.targetId)).toEqual(["near", "mid", "far"]);
	});

	it("includes targets exactly at range boundary", () => {
		registerTarget(makeFurnace({ targetId: "boundary", position: pos(3, 0, 0) }));

		const targets = getTargetsInRange(pos(0, 0, 0), 3);
		expect(targets).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// getNearestTarget
// ---------------------------------------------------------------------------

describe("getNearestTarget", () => {
	it("returns null when no targets registered", () => {
		expect(getNearestTarget(pos(0, 0, 0))).toBeNull();
	});

	it("returns the nearest target regardless of range", () => {
		registerTarget(makeFurnace({ targetId: "far", position: pos(100, 0, 0) }));
		registerTarget(makeFurnace({ targetId: "closer", position: pos(50, 0, 0) }));

		const nearest = getNearestTarget(pos(0, 0, 0));
		expect(nearest!.targetId).toBe("closer");
	});

	it("handles 3D distance correctly", () => {
		registerTarget(makeFurnace({ targetId: "a", position: pos(3, 4, 0) })); // dist = 5
		registerTarget(makeFurnace({ targetId: "b", position: pos(1, 1, 1) })); // dist ~1.73

		const nearest = getNearestTarget(pos(0, 0, 0));
		expect(nearest!.targetId).toBe("b");
	});
});

// ---------------------------------------------------------------------------
// checkQuickDeposit
// ---------------------------------------------------------------------------

describe("checkQuickDeposit", () => {
	it("returns null when not holding a cube", () => {
		registerTarget(makeFurnace({ position: pos(1, 0, 0) }));

		const prompt = checkQuickDeposit(pos(0, 0, 0), null, null);
		expect(prompt).toBeNull();
	});

	it("returns null when heldCubeId is set but material is null", () => {
		registerTarget(makeFurnace({ position: pos(1, 0, 0) }));

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", null);
		expect(prompt).toBeNull();
	});

	it("returns null when no targets are in range", () => {
		registerTarget(makeFurnace({ position: pos(100, 0, 0) }));

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "iron");
		expect(prompt).toBeNull();
	});

	it("returns null when nearest target is unpowered", () => {
		registerTarget(makeFurnace({ position: pos(1, 0, 0), isActive: false }));

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "iron");
		expect(prompt).toBeNull();
	});

	it("returns null when nearest target hopper is full", () => {
		registerTarget(makeFurnace({ position: pos(1, 0, 0), hopperSpace: 0 }));

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "iron");
		expect(prompt).toBeNull();
	});

	it("returns null when nearest target rejects the material", () => {
		registerTarget(
			makeFurnace({
				position: pos(1, 0, 0),
				acceptsMaterial: ["copper"],
			}),
		);

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "iron");
		expect(prompt).toBeNull();
	});

	it("returns prompt when all conditions met (accepts all materials)", () => {
		registerTarget(
			makeFurnace({
				position: pos(2, 0, 0),
				acceptsMaterial: null,
			}),
		);

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "scrap_iron");

		expect(prompt).not.toBeNull();
		expect(prompt!.targetId).toBe("furnace_0");
		expect(prompt!.targetType).toBe("furnace");
		expect(prompt!.hotkey).toBe("F");
		expect(prompt!.prompt).toBe(
			"Press F to deposit Scrap Iron Cube into Furnace",
		);
		expect(prompt!.distance).toBeCloseTo(2.0);
	});

	it("returns prompt when material is in accept list", () => {
		registerTarget(
			makeFurnace({
				position: pos(1, 0, 0),
				acceptsMaterial: ["iron", "copper"],
			}),
		);

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "copper");

		expect(prompt).not.toBeNull();
		expect(prompt!.targetId).toBe("furnace_0");
	});

	it("picks the nearest valid target when multiple exist", () => {
		registerTarget(
			makeFurnace({ targetId: "far", position: pos(2.5, 0, 0) }),
		);
		registerTarget(
			makeFurnace({ targetId: "near", position: pos(1, 0, 0) }),
		);

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "iron");

		expect(prompt!.targetId).toBe("near");
	});

	it("skips invalid targets and finds the next valid one", () => {
		// Nearest is full, second nearest is valid
		registerTarget(
			makeFurnace({
				targetId: "full",
				position: pos(1, 0, 0),
				hopperSpace: 0,
			}),
		);
		registerTarget(
			makeFurnace({
				targetId: "valid",
				position: pos(2, 0, 0),
				hopperSpace: 3,
			}),
		);

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "iron");

		expect(prompt!.targetId).toBe("valid");
	});

	it("respects custom deposit range", () => {
		registerTarget(makeFurnace({ position: pos(2, 0, 0) }));

		setQuickDepositRange(1.0);

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "iron");
		expect(prompt).toBeNull();
	});

	it("formats belt_input target type in prompt", () => {
		registerTarget(
			makeFurnace({
				targetId: "belt_0",
				targetType: "belt_input",
				position: pos(1, 0, 0),
			}),
		);

		const prompt = checkQuickDeposit(pos(0, 0, 0), "cube_1", "iron");

		expect(prompt!.prompt).toContain("Belt Input");
	});
});

// ---------------------------------------------------------------------------
// executeQuickDeposit
// ---------------------------------------------------------------------------

describe("executeQuickDeposit", () => {
	it("returns success and decrements hopperSpace", () => {
		registerTarget(makeFurnace({ hopperSpace: 5 }));

		const result = executeQuickDeposit("furnace_0", "cube_1", "iron");

		expect(result.success).toBe(true);
		expect(result.message).toBe("Deposited Iron Cube into Furnace");
		expect(result.soundEvent).toBe("furnace_deposit");
		expect(result.particleEvent).toBe("furnace_intake");

		// Verify space was decremented
		const nearest = getNearestTarget(pos(5, 0, 0));
		expect(nearest!.hopperSpace).toBe(4);
	});

	it("returns failure when target not found", () => {
		const result = executeQuickDeposit("nonexistent", "cube_1", "iron");

		expect(result.success).toBe(false);
		expect(result.message).toBe("Target not found");
		expect(result.soundEvent).toBe("error_buzz");
		expect(result.particleEvent).toBeNull();
	});

	it("returns failure when target is unpowered", () => {
		registerTarget(makeFurnace({ isActive: false }));

		const result = executeQuickDeposit("furnace_0", "cube_1", "iron");

		expect(result.success).toBe(false);
		expect(result.message).toBe("Furnace is unpowered");
		expect(result.soundEvent).toBe("error_buzz");
	});

	it("returns failure when hopper is full", () => {
		registerTarget(makeFurnace({ hopperSpace: 0 }));

		const result = executeQuickDeposit("furnace_0", "cube_1", "iron");

		expect(result.success).toBe(false);
		expect(result.message).toBe("Furnace hopper is full");
		expect(result.soundEvent).toBe("error_buzz");
	});

	it("returns failure when material is rejected", () => {
		registerTarget(makeFurnace({ acceptsMaterial: ["copper"] }));

		const result = executeQuickDeposit("furnace_0", "cube_1", "iron");

		expect(result.success).toBe(false);
		expect(result.message).toBe("Furnace does not accept Iron");
		expect(result.soundEvent).toBe("error_buzz");
	});

	it("uses target-type-specific sound and particle events", () => {
		registerTarget(
			makeFurnace({
				targetId: "belt_0",
				targetType: "belt_input",
				position: pos(1, 0, 0),
			}),
		);

		const result = executeQuickDeposit("belt_0", "cube_1", "iron");

		expect(result.success).toBe(true);
		expect(result.soundEvent).toBe("belt_input_deposit");
		expect(result.particleEvent).toBe("belt_input_intake");
	});

	it("decrements hopperSpace to zero on last deposit", () => {
		registerTarget(makeFurnace({ hopperSpace: 1 }));

		const result = executeQuickDeposit("furnace_0", "cube_1", "iron");

		expect(result.success).toBe(true);

		const nearest = getNearestTarget(pos(5, 0, 0));
		expect(nearest!.hopperSpace).toBe(0);
	});

	it("rejects deposit after hopper fills from repeated deposits", () => {
		registerTarget(makeFurnace({ hopperSpace: 2 }));

		executeQuickDeposit("furnace_0", "cube_1", "iron");
		executeQuickDeposit("furnace_0", "cube_2", "iron");
		const result = executeQuickDeposit("furnace_0", "cube_3", "iron");

		expect(result.success).toBe(false);
		expect(result.message).toBe("Furnace hopper is full");
	});
});

// ---------------------------------------------------------------------------
// setQuickDepositRange / getQuickDepositRange
// ---------------------------------------------------------------------------

describe("range configuration", () => {
	it("defaults to 3.0m", () => {
		expect(getQuickDepositRange()).toBe(3.0);
	});

	it("can be changed via setQuickDepositRange", () => {
		setQuickDepositRange(5.0);

		expect(getQuickDepositRange()).toBe(5.0);
	});

	it("reset restores default range", () => {
		setQuickDepositRange(10.0);
		reset();

		expect(getQuickDepositRange()).toBe(3.0);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all targets", () => {
		registerTarget(makeFurnace({ targetId: "a" }));
		registerTarget(makeFurnace({ targetId: "b" }));

		reset();

		expect(getTargetsInRange(pos(0, 0, 0), 1000)).toHaveLength(0);
	});

	it("resets range to default", () => {
		setQuickDepositRange(99);
		reset();

		expect(getQuickDepositRange()).toBe(3.0);
	});
});
