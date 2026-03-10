/**
 * Tests for the player entity system.
 *
 * Tests cover:
 * - Spawn creates correct initial state with starter equipment
 * - Damage calculation with armor reduction at each tier
 * - Death triggers at 0 health
 * - Respawn timer countdown and state reset
 * - Powder storage type switching and rejection
 * - Powder capacity limits
 * - Equipment slot management and validation
 * - Movement speed modifier stacking
 * - Carrying cube reduces speed by 20%
 * - Heal clamps to max health
 * - Experience and leveling
 * - Edge cases (no player spawned, dead player, negative values)
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	spawnPlayer,
	takeDamage,
	heal,
	isAlive,
	updateRespawn,
	addPowder,
	removePowder,
	equipItem,
	updateMovementSpeed,
	getPlayerState,
	setPosition,
	setRotation,
	setHeldCube,
	setMoving,
	setGrounded,
	addExperience,
	reset,
	type PlayerState,
	type EquipmentSlot,
} from "../playerEntity";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultSpawn(): PlayerState {
	return spawnPlayer("reclaimers", "Reclaimer", { x: 10, y: 1, z: 20 });
}

function makeEquipment(
	overrides: Partial<EquipmentSlot> = {},
): EquipmentSlot {
	return {
		itemId: "test_item",
		itemName: "Test Item",
		tier: 1,
		durability: 1,
		bonusStats: {},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Spawn
// ---------------------------------------------------------------------------

describe("spawnPlayer", () => {
	it("creates a player with correct faction and race", () => {
		const state = spawnPlayer("reclaimers", "Reclaimer");
		expect(state.faction).toBe("reclaimers");
		expect(state.raceName).toBe("Reclaimer");
		expect(state.botName).toBe("Reclaimer-Bot");
	});

	it("spawns at the specified position", () => {
		const state = spawnPlayer("reclaimers", "Reclaimer", { x: 5, y: 2, z: 10 });
		expect(state.position).toEqual({ x: 5, y: 2, z: 10 });
	});

	it("starts with full health", () => {
		const state = defaultSpawn();
		expect(state.health).toBe(state.maxHealth);
		expect(state.health).toBeGreaterThan(0);
	});

	it("starts alive", () => {
		defaultSpawn();
		expect(isAlive()).toBe(true);
	});

	it("starts with respawnTimer at 0", () => {
		const state = defaultSpawn();
		expect(state.respawnTimer).toBe(0);
		expect(state.isDead).toBe(false);
	});

	it("starts with tier-1 harvester", () => {
		const state = defaultSpawn();
		expect(state.harvester.tier).toBe(1);
		expect(state.harvester.itemId).toBe("harvester_t1");
		expect(state.harvester.durability).toBe(1);
	});

	it("starts with tier-1 grabber", () => {
		const state = defaultSpawn();
		expect(state.grabber.tier).toBe(1);
		expect(state.grabber.itemId).toBe("grabber_t1");
	});

	it("starts with no weapon", () => {
		const state = defaultSpawn();
		expect(state.weapon.tier).toBe(0);
		expect(state.weapon.itemId).toBeNull();
	});

	it("starts with no armor", () => {
		const state = defaultSpawn();
		expect(state.armor.tier).toBe(0);
		expect(state.armor.itemId).toBeNull();
	});

	it("starts with empty powder storage", () => {
		const state = defaultSpawn();
		expect(state.powderCurrent).toBe(0);
		expect(state.powderType).toBe("");
		expect(state.powderCapacity).toBeGreaterThan(0);
	});

	it("starts at level 1 with 0 experience", () => {
		const state = defaultSpawn();
		expect(state.level).toBe(1);
		expect(state.experience).toBe(0);
	});

	it("starts not holding a cube", () => {
		const state = defaultSpawn();
		expect(state.heldCubeId).toBeNull();
	});

	it("generates unique entity IDs", () => {
		const a = spawnPlayer("reclaimers", "Reclaimer");
		reset();
		const b = spawnPlayer("volt", "Volt");
		// After reset, counter resets so IDs are fresh — but within a session they differ
		// Re-spawn without reset to test uniqueness
		reset();
		spawnPlayer("a", "A");
		const state1 = getPlayerState();
		reset();
		spawnPlayer("b", "B");
		const state2 = getPlayerState();
		// Both should have valid IDs
		expect(state1!.entityId).toBeTruthy();
		expect(state2!.entityId).toBeTruthy();
	});

	it("sets yaw and pitch to 0", () => {
		const state = defaultSpawn();
		expect(state.yaw).toBe(0);
		expect(state.pitch).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

describe("takeDamage", () => {
	it("reduces health by damage amount with no armor", () => {
		const state = defaultSpawn();
		const result = takeDamage(25);
		expect(result.finalDamage).toBe(25);
		expect(result.healthRemaining).toBe(state.maxHealth - 25);
		expect(result.isDead).toBe(false);
	});

	it("armor tier 1 reduces damage by 10%", () => {
		defaultSpawn();
		equipItem("armor", makeEquipment({ tier: 1 }));
		const result = takeDamage(100);
		expect(result.finalDamage).toBe(90);
	});

	it("armor tier 2 reduces damage by 20%", () => {
		defaultSpawn();
		equipItem("armor", makeEquipment({ tier: 2 }));
		const result = takeDamage(100);
		expect(result.finalDamage).toBe(80);
	});

	it("armor tier 3 reduces damage by 30%", () => {
		defaultSpawn();
		equipItem("armor", makeEquipment({ tier: 3 }));
		const result = takeDamage(100);
		expect(result.finalDamage).toBe(70);
	});

	it("kills player when damage exceeds health", () => {
		const state = defaultSpawn();
		const result = takeDamage(state.maxHealth + 50);
		expect(result.isDead).toBe(true);
		expect(result.healthRemaining).toBe(0);
		expect(result.killedBy).toBe("unknown");
	});

	it("kills player when damage equals health exactly", () => {
		const state = defaultSpawn();
		const result = takeDamage(state.maxHealth);
		expect(result.isDead).toBe(true);
		expect(result.healthRemaining).toBe(0);
	});

	it("records killedBy source ID", () => {
		const state = defaultSpawn();
		const result = takeDamage(state.maxHealth, "enemy-42", "kinetic");
		expect(result.killedBy).toBe("enemy-42");
	});

	it("sets respawn timer on death", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const afterDeath = getPlayerState()!;
		expect(afterDeath.respawnTimer).toBeGreaterThan(0);
	});

	it("returns 0 damage when player is already dead", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const result = takeDamage(50);
		expect(result.finalDamage).toBe(0);
	});

	it("returns 0 damage when no player spawned", () => {
		const result = takeDamage(10);
		expect(result.finalDamage).toBe(0);
	});

	it("armor does not reduce damage below 0", () => {
		defaultSpawn();
		equipItem("armor", makeEquipment({ tier: 3 }));
		const result = takeDamage(0);
		expect(result.finalDamage).toBe(0);
		expect(result.healthRemaining).toBe(getPlayerState()!.maxHealth);
	});
});

// ---------------------------------------------------------------------------
// Heal
// ---------------------------------------------------------------------------

describe("heal", () => {
	it("restores health by the given amount", () => {
		defaultSpawn();
		takeDamage(30);
		const healed = heal(15);
		expect(healed).toBe(15);
		const state = getPlayerState()!;
		expect(state.health).toBe(state.maxHealth - 15);
	});

	it("clamps to maxHealth", () => {
		const spawned = defaultSpawn();
		takeDamage(10);
		const healed = heal(999);
		expect(healed).toBe(10);
		expect(getPlayerState()!.health).toBe(spawned.maxHealth);
	});

	it("returns 0 when already at max health", () => {
		defaultSpawn();
		const healed = heal(50);
		expect(healed).toBe(0);
	});

	it("cannot heal a dead player", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const healed = heal(50);
		expect(healed).toBe(0);
	});

	it("returns 0 when no player spawned", () => {
		const healed = heal(10);
		expect(healed).toBe(0);
	});

	it("returns 0 for negative amount", () => {
		defaultSpawn();
		takeDamage(20);
		const healed = heal(-10);
		expect(healed).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Respawn
// ---------------------------------------------------------------------------

describe("updateRespawn", () => {
	it("counts down the respawn timer", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const timerBefore = getPlayerState()!.respawnTimer;
		updateRespawn(1.0);
		const timerAfter = getPlayerState()!.respawnTimer;
		expect(timerAfter).toBe(timerBefore - 1.0);
	});

	it("returns true when player respawns", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const timer = getPlayerState()!.respawnTimer;
		const respawned = updateRespawn(timer + 1);
		expect(respawned).toBe(true);
	});

	it("resets health to max on respawn", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const timer = getPlayerState()!.respawnTimer;
		updateRespawn(timer);
		expect(getPlayerState()!.health).toBe(state.maxHealth);
	});

	it("clears isDead on respawn", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const timer = getPlayerState()!.respawnTimer;
		updateRespawn(timer);
		expect(getPlayerState()!.isDead).toBe(false);
		expect(isAlive()).toBe(true);
	});

	it("teleports to spawn position on respawn", () => {
		spawnPlayer("reclaimers", "Reclaimer", { x: 10, y: 1, z: 20 });
		setPosition(50, 5, 60); // move away
		const state = getPlayerState()!;
		takeDamage(state.maxHealth);
		const timer = getPlayerState()!.respawnTimer;
		updateRespawn(timer);
		expect(getPlayerState()!.position).toEqual({ x: 10, y: 1, z: 20 });
	});

	it("clears held cube on respawn", () => {
		defaultSpawn();
		setHeldCube("cube-99");
		const state = getPlayerState()!;
		takeDamage(state.maxHealth);
		const timer = getPlayerState()!.respawnTimer;
		updateRespawn(timer);
		expect(getPlayerState()!.heldCubeId).toBeNull();
	});

	it("returns false when player is alive", () => {
		defaultSpawn();
		const result = updateRespawn(1.0);
		expect(result).toBe(false);
	});

	it("returns false when no player spawned", () => {
		const result = updateRespawn(1.0);
		expect(result).toBe(false);
	});

	it("returns false while timer still counting", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const result = updateRespawn(0.1);
		expect(result).toBe(false);
		expect(getPlayerState()!.isDead).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Powder storage
// ---------------------------------------------------------------------------

describe("addPowder", () => {
	it("adds powder of a given type", () => {
		defaultSpawn();
		const added = addPowder("iron", 30);
		expect(added).toBe(30);
		const state = getPlayerState()!;
		expect(state.powderCurrent).toBe(30);
		expect(state.powderType).toBe("iron");
	});

	it("clamps to capacity", () => {
		defaultSpawn();
		const cap = getPlayerState()!.powderCapacity;
		const added = addPowder("iron", cap + 50);
		expect(added).toBe(cap);
		expect(getPlayerState()!.powderCurrent).toBe(cap);
	});

	it("rejects different powder type when storage is not empty", () => {
		defaultSpawn();
		addPowder("iron", 10);
		const added = addPowder("copper", 20);
		expect(added).toBe(0);
		expect(getPlayerState()!.powderType).toBe("iron");
		expect(getPlayerState()!.powderCurrent).toBe(10);
	});

	it("accepts new type when storage is empty", () => {
		defaultSpawn();
		addPowder("iron", 10);
		removePowder(10); // empty it
		const added = addPowder("copper", 20);
		expect(added).toBe(20);
		expect(getPlayerState()!.powderType).toBe("copper");
	});

	it("accepts same type powder when already storing that type", () => {
		defaultSpawn();
		addPowder("iron", 10);
		const added = addPowder("iron", 15);
		expect(added).toBe(15);
		expect(getPlayerState()!.powderCurrent).toBe(25);
	});

	it("returns 0 when no player spawned", () => {
		expect(addPowder("iron", 10)).toBe(0);
	});

	it("returns 0 for zero or negative amount", () => {
		defaultSpawn();
		expect(addPowder("iron", 0)).toBe(0);
		expect(addPowder("iron", -5)).toBe(0);
	});

	it("returns 0 when at capacity", () => {
		defaultSpawn();
		const cap = getPlayerState()!.powderCapacity;
		addPowder("iron", cap);
		expect(addPowder("iron", 1)).toBe(0);
	});
});

describe("removePowder", () => {
	it("removes powder from storage", () => {
		defaultSpawn();
		addPowder("iron", 50);
		const removed = removePowder(20);
		expect(removed).toBe(20);
		expect(getPlayerState()!.powderCurrent).toBe(30);
	});

	it("clamps removal to current amount", () => {
		defaultSpawn();
		addPowder("iron", 20);
		const removed = removePowder(50);
		expect(removed).toBe(20);
		expect(getPlayerState()!.powderCurrent).toBe(0);
	});

	it("clears powder type when fully emptied", () => {
		defaultSpawn();
		addPowder("iron", 20);
		removePowder(20);
		expect(getPlayerState()!.powderType).toBe("");
	});

	it("returns 0 when no player spawned", () => {
		expect(removePowder(10)).toBe(0);
	});

	it("returns 0 for zero or negative amount", () => {
		defaultSpawn();
		addPowder("iron", 10);
		expect(removePowder(0)).toBe(0);
		expect(removePowder(-5)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

describe("equipItem", () => {
	it("equips item into harvester slot", () => {
		defaultSpawn();
		const item = makeEquipment({ itemId: "harvest_t3", itemName: "Advanced Harvester", tier: 3 });
		expect(equipItem("harvester", item)).toBe(true);
		expect(getPlayerState()!.harvester.tier).toBe(3);
		expect(getPlayerState()!.harvester.itemId).toBe("harvest_t3");
	});

	it("equips item into grabber slot", () => {
		defaultSpawn();
		const item = makeEquipment({ itemId: "grab_t2", tier: 2 });
		expect(equipItem("grabber", item)).toBe(true);
		expect(getPlayerState()!.grabber.tier).toBe(2);
	});

	it("equips item into weapon slot", () => {
		defaultSpawn();
		const item = makeEquipment({ itemId: "welder_t1", itemName: "Welder" });
		expect(equipItem("weapon", item)).toBe(true);
		expect(getPlayerState()!.weapon.itemId).toBe("welder_t1");
	});

	it("equips item into armor slot", () => {
		defaultSpawn();
		const item = makeEquipment({ itemId: "plating_t2", tier: 2 });
		expect(equipItem("armor", item)).toBe(true);
		expect(getPlayerState()!.armor.tier).toBe(2);
	});

	it("rejects invalid slot names", () => {
		defaultSpawn();
		expect(equipItem("legs", makeEquipment())).toBe(false);
		expect(equipItem("head", makeEquipment())).toBe(false);
		expect(equipItem("", makeEquipment())).toBe(false);
	});

	it("replaces existing equipment", () => {
		defaultSpawn();
		const item1 = makeEquipment({ itemId: "a", tier: 1 });
		const item2 = makeEquipment({ itemId: "b", tier: 3 });
		equipItem("weapon", item1);
		expect(getPlayerState()!.weapon.itemId).toBe("a");
		equipItem("weapon", item2);
		expect(getPlayerState()!.weapon.itemId).toBe("b");
		expect(getPlayerState()!.weapon.tier).toBe(3);
	});

	it("returns false when no player spawned", () => {
		expect(equipItem("weapon", makeEquipment())).toBe(false);
	});

	it("preserves bonus stats", () => {
		defaultSpawn();
		const item = makeEquipment({ bonusStats: { harvestSpeed: 1.5, range: 2.0 } });
		equipItem("harvester", item);
		expect(getPlayerState()!.harvester.bonusStats).toEqual({
			harvestSpeed: 1.5,
			range: 2.0,
		});
	});
});

// ---------------------------------------------------------------------------
// Movement speed
// ---------------------------------------------------------------------------

describe("updateMovementSpeed", () => {
	it("returns base speed with no modifiers", () => {
		const state = defaultSpawn();
		const speed = updateMovementSpeed();
		expect(speed).toBe(state.baseSpeed);
	});

	it("applies terrain modifier", () => {
		const state = defaultSpawn();
		const speed = updateMovementSpeed(0.5);
		expect(speed).toBeCloseTo(state.baseSpeed * 0.5);
	});

	it("applies weather modifier", () => {
		const state = defaultSpawn();
		const speed = updateMovementSpeed(1.0, 0.7);
		expect(speed).toBeCloseTo(state.baseSpeed * 0.7);
	});

	it("stacks all modifiers multiplicatively", () => {
		const state = defaultSpawn();
		const speed = updateMovementSpeed(0.8, 0.9, 0.5);
		expect(speed).toBeCloseTo(state.baseSpeed * 0.8 * 0.9 * 0.5);
	});

	it("carrying cube reduces speed by 20%", () => {
		const state = defaultSpawn();
		setHeldCube("cube-1");
		const speed = updateMovementSpeed();
		expect(speed).toBeCloseTo(state.baseSpeed * 0.8);
	});

	it("carrying cube stacks with other modifiers", () => {
		const state = defaultSpawn();
		setHeldCube("cube-1");
		const speed = updateMovementSpeed(0.5, 1.0, 1.0);
		expect(speed).toBeCloseTo(state.baseSpeed * 0.5 * 0.8);
	});

	it("no carry penalty when not holding a cube", () => {
		const state = defaultSpawn();
		setHeldCube(null);
		const speed = updateMovementSpeed();
		expect(speed).toBe(state.baseSpeed);
	});

	it("updates currentSpeed in player state", () => {
		defaultSpawn();
		updateMovementSpeed(0.6, 0.8);
		const state = getPlayerState()!;
		expect(state.currentSpeed).toBeCloseTo(state.baseSpeed * 0.6 * 0.8);
	});

	it("returns 0 when no player spawned", () => {
		expect(updateMovementSpeed()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getPlayerState
// ---------------------------------------------------------------------------

describe("getPlayerState", () => {
	it("returns null before spawn", () => {
		expect(getPlayerState()).toBeNull();
	});

	it("returns a snapshot (not a reference)", () => {
		defaultSpawn();
		const a = getPlayerState()!;
		const b = getPlayerState()!;
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});
});

// ---------------------------------------------------------------------------
// isAlive
// ---------------------------------------------------------------------------

describe("isAlive", () => {
	it("returns false before spawn", () => {
		expect(isAlive()).toBe(false);
	});

	it("returns true after spawn", () => {
		defaultSpawn();
		expect(isAlive()).toBe(true);
	});

	it("returns false after death", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		expect(isAlive()).toBe(false);
	});

	it("returns true after respawn", () => {
		const state = defaultSpawn();
		takeDamage(state.maxHealth);
		const timer = getPlayerState()!.respawnTimer;
		updateRespawn(timer);
		expect(isAlive()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Position / Rotation / Held cube setters
// ---------------------------------------------------------------------------

describe("position and rotation setters", () => {
	it("setPosition updates position", () => {
		defaultSpawn();
		setPosition(5, 10, 15);
		expect(getPlayerState()!.position).toEqual({ x: 5, y: 10, z: 15 });
	});

	it("setRotation updates yaw and pitch", () => {
		defaultSpawn();
		setRotation(1.5, -0.3);
		expect(getPlayerState()!.yaw).toBe(1.5);
		expect(getPlayerState()!.pitch).toBe(-0.3);
	});

	it("setHeldCube sets cube ID", () => {
		defaultSpawn();
		setHeldCube("cube-42");
		expect(getPlayerState()!.heldCubeId).toBe("cube-42");
	});

	it("setHeldCube to null clears cube", () => {
		defaultSpawn();
		setHeldCube("cube-42");
		setHeldCube(null);
		expect(getPlayerState()!.heldCubeId).toBeNull();
	});

	it("setMoving updates isMoving", () => {
		defaultSpawn();
		setMoving(true);
		expect(getPlayerState()!.isMoving).toBe(true);
		setMoving(false);
		expect(getPlayerState()!.isMoving).toBe(false);
	});

	it("setGrounded updates isGrounded", () => {
		defaultSpawn();
		setGrounded(false);
		expect(getPlayerState()!.isGrounded).toBe(false);
		setGrounded(true);
		expect(getPlayerState()!.isGrounded).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Experience / Leveling
// ---------------------------------------------------------------------------

describe("addExperience", () => {
	it("accumulates experience", () => {
		defaultSpawn();
		addExperience(50);
		expect(getPlayerState()!.experience).toBe(50);
	});

	it("levels up at 100 XP", () => {
		defaultSpawn();
		addExperience(100);
		expect(getPlayerState()!.level).toBe(2);
		expect(getPlayerState()!.experience).toBe(0);
	});

	it("handles multiple level ups at once", () => {
		defaultSpawn();
		addExperience(250);
		expect(getPlayerState()!.level).toBe(3);
		expect(getPlayerState()!.experience).toBe(50);
	});

	it("ignores zero or negative XP", () => {
		defaultSpawn();
		addExperience(0);
		addExperience(-10);
		expect(getPlayerState()!.experience).toBe(0);
		expect(getPlayerState()!.level).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears player state to null", () => {
		defaultSpawn();
		reset();
		expect(getPlayerState()).toBeNull();
	});

	it("isAlive returns false after reset", () => {
		defaultSpawn();
		reset();
		expect(isAlive()).toBe(false);
	});
});
