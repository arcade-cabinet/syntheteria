/**
 * Unit tests for crosshairDriver — crosshair/reticle state determination.
 *
 * Tests cover:
 * - Each entity type produces the correct crosshair style
 * - Target name formatting for all entity types
 * - Distance display in CrosshairUpdate
 * - Interaction prompts for common scenarios
 * - Health bar logic (show/hide, color by faction/type)
 * - Out-of-range behavior ("Move closer" prompt)
 * - Player mode affects crosshair (build mode override)
 * - Null hit produces default crosshair
 * - Combat targets show health + hostile color
 * - Reticle color per style
 * - Reset clears state
 */

import {
	updateCrosshair,
	getInteractionPrompt,
	getTargetHealthBar,
	setPlayerMode,
	getPlayerMode,
	getReticleColor,
	reset,
	type RaycastHit,
	type PlayerLookState,
} from "../crosshairDriver";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHit(overrides: Partial<RaycastHit> = {}): RaycastHit {
	return {
		entityId: "test-1",
		entityType: "material_cube",
		distance: 2.0,
		point: { x: 0, y: 0, z: 0 },
		isInteractable: true,
		...overrides,
	};
}

function makePlayerState(overrides: Partial<PlayerLookState> = {}): PlayerLookState {
	return {
		mode: "explore",
		isHoldingCube: false,
		currentFaction: "player",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Null hit → default crosshair
// ---------------------------------------------------------------------------

describe("null hit", () => {
	it("returns default style when nothing is targeted", () => {
		const result = updateCrosshair(null, makePlayerState());
		expect(result.style).toBe("default");
		expect(result.targetName).toBeUndefined();
		expect(result.targetDistance).toBeUndefined();
		expect(result.canInteract).toBe(false);
		expect(result.quickAction).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Crosshair style per entity type
// ---------------------------------------------------------------------------

describe("crosshair style per entity type", () => {
	it("ore_deposit → harvest", () => {
		const hit = makeHit({ entityType: "ore_deposit", health: 0.85 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("harvest");
	});

	it("material_cube → interact", () => {
		const hit = makeHit({ entityType: "material_cube" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("furnace → interact", () => {
		const hit = makeHit({ entityType: "furnace" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("belt → interact", () => {
		const hit = makeHit({ entityType: "belt" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("enemy_bot → combat", () => {
		const hit = makeHit({ entityType: "enemy_bot", distance: 10.0, health: 0.75 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("combat");
	});

	it("friendly_bot → interact", () => {
		const hit = makeHit({ entityType: "friendly_bot", distance: 3.0 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("turret → interact", () => {
		const hit = makeHit({ entityType: "turret", health: 1.0 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("otter → interact", () => {
		const hit = makeHit({ entityType: "otter" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("wall → interact", () => {
		const hit = makeHit({ entityType: "wall" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("wire → interact", () => {
		const hit = makeHit({ entityType: "wire" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("building → interact", () => {
		const hit = makeHit({ entityType: "building" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("interact");
	});

	it("unknown entity type → default", () => {
		const hit = makeHit({ entityType: "unknown_thing" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("default");
	});
});

// ---------------------------------------------------------------------------
// Target name formatting
// ---------------------------------------------------------------------------

describe("target name formatting", () => {
	it("ore_deposit shows name and percentage", () => {
		const hit = makeHit({
			entityType: "ore_deposit",
			displayName: "Iron Deposit",
			health: 0.85,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Iron Deposit (85%)");
	});

	it("ore_deposit without name uses fallback", () => {
		const hit = makeHit({ entityType: "ore_deposit", health: 0.5 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Ore Deposit (50%)");
	});

	it("ore_deposit without health shows ??%", () => {
		const hit = makeHit({ entityType: "ore_deposit" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toContain("??%");
	});

	it("material_cube uses display name", () => {
		const hit = makeHit({ entityType: "material_cube", displayName: "Iron Cube" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Iron Cube");
	});

	it("furnace shows Powered status when health > 0", () => {
		const hit = makeHit({ entityType: "furnace", displayName: "Furnace", health: 1.0 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Furnace [Powered]");
	});

	it("furnace shows Unpowered when health is 0", () => {
		const hit = makeHit({ entityType: "furnace", displayName: "Furnace", health: 0 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Furnace [Unpowered]");
	});

	it("enemy_bot shows HP percentage", () => {
		const hit = makeHit({
			entityType: "enemy_bot",
			displayName: "Feral Scout",
			health: 0.75,
			distance: 10.0,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Feral Scout [75% HP]");
	});

	it("friendly_bot shows Idle status", () => {
		const hit = makeHit({
			entityType: "friendly_bot",
			displayName: "Bot-02",
			distance: 3.0,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Bot-02 [Idle]");
	});

	it("turret shows Active when health > 0", () => {
		const hit = makeHit({
			entityType: "turret",
			displayName: "Turret",
			health: 0.9,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Turret [Active]");
	});

	it("turret shows Offline when health is 0", () => {
		const hit = makeHit({
			entityType: "turret",
			displayName: "Turret",
			health: 0,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Turret [Offline]");
	});

	it("otter shows Quest! tag", () => {
		const hit = makeHit({ entityType: "otter", displayName: "Otter" });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetName).toBe("Otter [Quest!]");
	});
});

// ---------------------------------------------------------------------------
// Distance display
// ---------------------------------------------------------------------------

describe("distance display", () => {
	it("includes distance in the result", () => {
		const hit = makeHit({ distance: 5.7 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetDistance).toBe(5.7);
	});

	it("null hit has undefined distance", () => {
		const result = updateCrosshair(null, makePlayerState());
		expect(result.targetDistance).toBeUndefined();
	});

	it("very close distance (0.1m) is included", () => {
		const hit = makeHit({ distance: 0.1 });
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.targetDistance).toBe(0.1);
	});
});

// ---------------------------------------------------------------------------
// Interaction prompts
// ---------------------------------------------------------------------------

describe("interaction prompts", () => {
	it("ore_deposit → 'Hold E to harvest'", () => {
		const prompt = getInteractionPrompt("ore_deposit", makePlayerState());
		expect(prompt).toBe("Hold E to harvest");
	});

	it("cube while empty-handed → 'E to grab'", () => {
		const prompt = getInteractionPrompt("material_cube", makePlayerState({ isHoldingCube: false }));
		expect(prompt).toBe("E to grab");
	});

	it("cube while holding cube → 'E to swap'", () => {
		const prompt = getInteractionPrompt("material_cube", makePlayerState({ isHoldingCube: true }));
		expect(prompt).toBe("E to swap");
	});

	it("furnace while holding cube → 'E to deposit'", () => {
		const prompt = getInteractionPrompt("furnace", makePlayerState({ isHoldingCube: true }));
		expect(prompt).toBe("E to deposit");
	});

	it("furnace while empty-handed → 'E to open'", () => {
		const prompt = getInteractionPrompt("furnace", makePlayerState({ isHoldingCube: false }));
		expect(prompt).toBe("E to open");
	});

	it("enemy_bot → 'LMB to attack'", () => {
		const prompt = getInteractionPrompt("enemy_bot", makePlayerState());
		expect(prompt).toBe("LMB to attack");
	});

	it("friendly_bot → 'Tab to switch'", () => {
		const prompt = getInteractionPrompt("friendly_bot", makePlayerState());
		expect(prompt).toBe("Tab to switch");
	});

	it("otter → 'E to talk'", () => {
		const prompt = getInteractionPrompt("otter", makePlayerState());
		expect(prompt).toBe("E to talk");
	});

	it("unknown type → null", () => {
		const prompt = getInteractionPrompt("some_unknown_type", makePlayerState());
		expect(prompt).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Out-of-range behavior
// ---------------------------------------------------------------------------

describe("out-of-range behavior", () => {
	it("shows 'Move closer' when target is beyond max range", () => {
		const hit = makeHit({
			entityType: "material_cube",
			distance: 100.0,
			isInteractable: true,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.quickAction).toBe("Move closer");
		expect(result.canInteract).toBe(false);
	});

	it("ore_deposit at distance 3.0 is in range", () => {
		const hit = makeHit({
			entityType: "ore_deposit",
			distance: 3.0,
			health: 0.5,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.quickAction).not.toBe("Move closer");
		expect(result.canInteract).toBe(true);
	});

	it("ore_deposit at distance 3.1 is out of range", () => {
		const hit = makeHit({
			entityType: "ore_deposit",
			distance: 3.1,
			health: 0.5,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.quickAction).toBe("Move closer");
		expect(result.canInteract).toBe(false);
	});

	it("enemy_bot at 15.0 is in range (long range)", () => {
		const hit = makeHit({
			entityType: "enemy_bot",
			distance: 15.0,
			health: 0.5,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.quickAction).not.toBe("Move closer");
	});

	it("non-interactable entity in range still cannot interact", () => {
		const hit = makeHit({
			entityType: "material_cube",
			distance: 1.0,
			isInteractable: false,
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.canInteract).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Player mode affects crosshair
// ---------------------------------------------------------------------------

describe("player mode", () => {
	it("build mode overrides crosshair to build style", () => {
		const hit = makeHit({ entityType: "ore_deposit", health: 0.5 });
		const result = updateCrosshair(hit, makePlayerState({ mode: "build", buildItemName: "Furnace" }));
		expect(result.style).toBe("build");
		expect(result.targetName).toBe("Place: Furnace");
	});

	it("build mode with null hit still shows build", () => {
		const result = updateCrosshair(null, makePlayerState({ mode: "build", buildItemName: "Wall" }));
		expect(result.style).toBe("build");
		expect(result.targetName).toBe("Place: Wall");
		expect(result.canInteract).toBe(true);
	});

	it("build mode without buildItemName has undefined targetName", () => {
		const result = updateCrosshair(null, makePlayerState({ mode: "build" }));
		expect(result.style).toBe("build");
		expect(result.targetName).toBeUndefined();
	});

	it("setPlayerMode updates internal mode", () => {
		setPlayerMode("combat");
		expect(getPlayerMode()).toBe("combat");
	});

	it("setPlayerMode persists until reset", () => {
		setPlayerMode("harvest");
		expect(getPlayerMode()).toBe("harvest");
		reset();
		expect(getPlayerMode()).toBe("explore");
	});
});

// ---------------------------------------------------------------------------
// Health bar logic
// ---------------------------------------------------------------------------

describe("health bar", () => {
	it("returns null for null hit", () => {
		expect(getTargetHealthBar(null)).toBeNull();
	});

	it("returns null for entities without health", () => {
		const hit = makeHit({ entityType: "material_cube" });
		expect(getTargetHealthBar(hit)).toBeNull();
	});

	it("material_cube with health still returns null (cubes have no health bar)", () => {
		const hit = makeHit({ entityType: "material_cube", health: 0.5 });
		expect(getTargetHealthBar(hit)).toBeNull();
	});

	it("enemy_bot shows health bar with faction color", () => {
		const hit = makeHit({
			entityType: "enemy_bot",
			health: 0.75,
			faction: "volt_collective",
		});
		const bar = getTargetHealthBar(hit);
		expect(bar).not.toBeNull();
		expect(bar!.show).toBe(true);
		expect(bar!.percent).toBe(0.75);
		expect(bar!.color).toBe("#3399ff");
	});

	it("enemy_bot without faction uses default hostile color", () => {
		const hit = makeHit({
			entityType: "enemy_bot",
			health: 0.5,
		});
		const bar = getTargetHealthBar(hit);
		expect(bar).not.toBeNull();
		expect(bar!.color).toBe("#ff3333");
	});

	it("friendly_bot shows health bar with player color", () => {
		const hit = makeHit({
			entityType: "friendly_bot",
			health: 0.9,
			faction: "player",
		});
		const bar = getTargetHealthBar(hit);
		expect(bar).not.toBeNull();
		expect(bar!.show).toBe(true);
		expect(bar!.percent).toBe(0.9);
		expect(bar!.color).toBe("#00ff88");
	});

	it("ore_deposit shows remaining bar in blue", () => {
		const hit = makeHit({ entityType: "ore_deposit", health: 0.6 });
		const bar = getTargetHealthBar(hit);
		expect(bar).not.toBeNull();
		expect(bar!.show).toBe(true);
		expect(bar!.percent).toBe(0.6);
		expect(bar!.color).toBe("#88ccff");
	});

	it("building shows repair bar in yellow", () => {
		const hit = makeHit({ entityType: "building", health: 0.4 });
		const bar = getTargetHealthBar(hit);
		expect(bar).not.toBeNull();
		expect(bar!.show).toBe(true);
		expect(bar!.percent).toBe(0.4);
		expect(bar!.color).toBe("#ffcc00");
	});

	it("furnace shows repair bar in yellow", () => {
		const hit = makeHit({ entityType: "furnace", health: 0.8 });
		const bar = getTargetHealthBar(hit);
		expect(bar).not.toBeNull();
		expect(bar!.color).toBe("#ffcc00");
	});

	it("turret shows repair bar in yellow", () => {
		const hit = makeHit({ entityType: "turret", health: 0.3 });
		const bar = getTargetHealthBar(hit);
		expect(bar).not.toBeNull();
		expect(bar!.color).toBe("#ffcc00");
	});

	it("unknown entity with health returns null", () => {
		const hit = makeHit({ entityType: "mystery_object", health: 0.5 });
		expect(getTargetHealthBar(hit)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Reticle colors
// ---------------------------------------------------------------------------

describe("getReticleColor", () => {
	it("default → white", () => {
		expect(getReticleColor("default")).toBe("#ffffff");
	});

	it("harvest → gold", () => {
		expect(getReticleColor("harvest")).toBe("#ffcc00");
	});

	it("interact → cyan", () => {
		expect(getReticleColor("interact")).toBe("#00ccff");
	});

	it("combat → red", () => {
		expect(getReticleColor("combat")).toBe("#ff3333");
	});

	it("build → green", () => {
		expect(getReticleColor("build")).toBe("#33ff33");
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("resets player mode to explore", () => {
		setPlayerMode("combat");
		expect(getPlayerMode()).toBe("combat");
		reset();
		expect(getPlayerMode()).toBe("explore");
	});
});

// ---------------------------------------------------------------------------
// Combat targets with health + hostile colors
// ---------------------------------------------------------------------------

describe("combat targets", () => {
	it("enemy with feral faction shows red health bar", () => {
		const hit = makeHit({
			entityType: "enemy_bot",
			health: 0.3,
			faction: "feral",
			displayName: "Feral Brute",
		});
		const result = updateCrosshair(hit, makePlayerState());
		expect(result.style).toBe("combat");
		expect(result.targetName).toBe("Feral Brute [30% HP]");

		const bar = getTargetHealthBar(hit);
		expect(bar!.color).toBe("#ff3333");
		expect(bar!.percent).toBe(0.3);
	});

	it("enemy with iron_creed faction shows grey health bar", () => {
		const hit = makeHit({
			entityType: "enemy_bot",
			health: 1.0,
			faction: "iron_creed",
			displayName: "Iron Sentinel",
		});
		const bar = getTargetHealthBar(hit);
		expect(bar!.color).toBe("#888888");
	});

	it("enemy with signal_choir faction shows purple health bar", () => {
		const hit = makeHit({
			entityType: "enemy_bot",
			health: 0.5,
			faction: "signal_choir",
		});
		const bar = getTargetHealthBar(hit);
		expect(bar!.color).toBe("#aa44ff");
	});
});

// ---------------------------------------------------------------------------
// Build mode quick action
// ---------------------------------------------------------------------------

describe("build mode quick action", () => {
	it("shows 'LMB to place' as quick action", () => {
		const result = updateCrosshair(
			makeHit(),
			makePlayerState({ mode: "build", buildItemName: "Turret" }),
		);
		expect(result.quickAction).toBe("LMB to place");
	});
});
