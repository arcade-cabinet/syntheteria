/**
 * Unit tests for the cube economy system.
 *
 * Tests cover:
 * - Spawning cubes with correct material values and health
 * - Picking up and dropping cubes
 * - Transfer (theft/trade) between factions
 * - Cube counting (total and filtered by material)
 * - Economic value calculations
 * - getCubesByFaction returns copies
 * - Tick system: decay of damaged cubes, value recalculation, destruction
 * - Damage mechanic
 * - Theft log tracking
 * - Reset clears all state
 * - Multi-faction independence
 * - Edge cases (unknown materials, nonexistent cubes)
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		cubeMaterials: {
			scrap: {
				name: "Scrap",
				value: 0,
				color: "0x6b5b3d",
				glowColor: "0x887755",
				category: "metal",
				durability: 50,
				weight: 1.0,
				description: "Salvaged scrap metal.",
			},
			iron: {
				name: "Iron",
				value: 1,
				color: "0x8a8a8a",
				glowColor: "0x99aacc",
				category: "metal",
				durability: 100,
				weight: 2.0,
				description: "Standard structural iron.",
			},
			copper: {
				name: "Copper",
				value: 3,
				color: "0xb87333",
				glowColor: "0xdd8844",
				category: "metal",
				durability: 75,
				weight: 1.8,
				description: "Conductive copper.",
			},
			steel: {
				name: "Steel",
				value: 5,
				color: "0xaaaabc",
				glowColor: "0xbbccdd",
				category: "metal",
				durability: 200,
				weight: 3.0,
				description: "Reinforced steel plating.",
			},
			processor: {
				name: "Processor",
				value: 20,
				color: "0x334455",
				glowColor: "0x00e5ff",
				category: "electronic",
				durability: 30,
				weight: 0.8,
				description: "Advanced processor chip.",
			},
			power_core: {
				name: "Power Core",
				value: 25,
				color: "0xaaaa22",
				glowColor: "0xffff44",
				category: "rare",
				durability: 180,
				weight: 2.0,
				description: "Concentrated power core.",
			},
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports (after mock)
// ---------------------------------------------------------------------------

import {
	spawnCube,
	pickupCube,
	dropCube,
	transferCube,
	getCubeCount,
	getCubeValue,
	getCubesByFaction,
	getCube,
	getTheftLog,
	cubeEconomySystem,
	damageCube,
	resetCubeEconomy,
} from "../cubeEconomy";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetCubeEconomy();
});

// ---------------------------------------------------------------------------
// spawnCube
// ---------------------------------------------------------------------------

describe("spawnCube", () => {
	it("returns a unique cube ID", () => {
		const id1 = spawnCube("reclaimers", "iron", 0, 0);
		const id2 = spawnCube("reclaimers", "iron", 1, 1);
		expect(id1).not.toBe(id2);
	});

	it("spawns a cube with correct material value from config", () => {
		const id = spawnCube("reclaimers", "iron", 5, 10);
		const cube = getCube(id);
		expect(cube).toBeDefined();
		expect(cube!.value).toBe(1); // iron value = 1
		expect(cube!.materialType).toBe("iron");
	});

	it("spawns a cube with correct health from config durability", () => {
		const id = spawnCube("reclaimers", "steel", 0, 0);
		const cube = getCube(id);
		expect(cube!.health).toBe(200); // steel durability = 200
	});

	it("spawns a cube at the given position", () => {
		const id = spawnCube("reclaimers", "copper", 7, 13);
		const cube = getCube(id);
		expect(cube!.x).toBe(7);
		expect(cube!.z).toBe(13);
	});

	it("spawns a cube with no holder", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		const cube = getCube(id);
		expect(cube!.heldBy).toBeNull();
	});

	it("spawns a cube assigned to the specified faction", () => {
		const id = spawnCube("volt_collective", "copper", 0, 0);
		const cube = getCube(id);
		expect(cube!.faction).toBe("volt_collective");
	});

	it("assigns value 0 for unknown material types", () => {
		const id = spawnCube("reclaimers", "unobtainium", 0, 0);
		const cube = getCube(id);
		expect(cube!.value).toBe(0);
	});

	it("assigns default 100 health for unknown material types", () => {
		const id = spawnCube("reclaimers", "unobtainium", 0, 0);
		const cube = getCube(id);
		expect(cube!.health).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// pickupCube
// ---------------------------------------------------------------------------

describe("pickupCube", () => {
	it("picks up a free cube and sets heldBy", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		const result = pickupCube(id, "player_1");
		expect(result).toBe(true);

		const cube = getCube(id);
		expect(cube!.heldBy).toBe("player_1");
	});

	it("returns false for a nonexistent cube", () => {
		expect(pickupCube("fake_id", "player_1")).toBe(false);
	});

	it("returns false when cube is already held by another entity", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		pickupCube(id, "player_1");
		expect(pickupCube(id, "player_2")).toBe(false);
	});

	it("returns false when cube is already held by the same entity", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		pickupCube(id, "player_1");
		expect(pickupCube(id, "player_1")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// dropCube
// ---------------------------------------------------------------------------

describe("dropCube", () => {
	it("drops a held cube and updates position", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		pickupCube(id, "player_1");
		dropCube(id, 10, 20);

		const cube = getCube(id);
		expect(cube!.heldBy).toBeNull();
		expect(cube!.x).toBe(10);
		expect(cube!.z).toBe(20);
	});

	it("does nothing for a nonexistent cube", () => {
		// Should not throw
		expect(() => dropCube("fake_id", 5, 5)).not.toThrow();
	});

	it("can drop a cube that is not held (updates position only)", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		dropCube(id, 3, 7);

		const cube = getCube(id);
		expect(cube!.heldBy).toBeNull();
		expect(cube!.x).toBe(3);
		expect(cube!.z).toBe(7);
	});
});

// ---------------------------------------------------------------------------
// transferCube
// ---------------------------------------------------------------------------

describe("transferCube", () => {
	it("transfers ownership from one faction to another", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		const result = transferCube(id, "reclaimers", "volt_collective");
		expect(result).toBe(true);

		const cube = getCube(id);
		expect(cube!.faction).toBe("volt_collective");
	});

	it("returns false for a nonexistent cube", () => {
		expect(transferCube("fake_id", "reclaimers", "volt_collective")).toBe(
			false,
		);
	});

	it("returns false when fromFaction does not match current owner", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		expect(transferCube(id, "volt_collective", "signal_choir")).toBe(false);
	});

	it("returns false when transferring to the same faction", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		expect(transferCube(id, "reclaimers", "reclaimers")).toBe(false);
	});

	it("records a theft log entry", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		transferCube(id, "reclaimers", "volt_collective");

		const log = getTheftLog();
		expect(log.length).toBe(1);
		expect(log[0].cubeId).toBe(id);
		expect(log[0].materialType).toBe("iron");
		expect(log[0].fromFaction).toBe("reclaimers");
		expect(log[0].toFaction).toBe("volt_collective");
	});

	it("records multiple theft events", () => {
		const id1 = spawnCube("reclaimers", "iron", 0, 0);
		const id2 = spawnCube("signal_choir", "copper", 1, 1);

		transferCube(id1, "reclaimers", "volt_collective");
		transferCube(id2, "signal_choir", "iron_creed");

		const log = getTheftLog();
		expect(log.length).toBe(2);
	});

	it("allows a cube to be transferred multiple times", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		transferCube(id, "reclaimers", "volt_collective");
		transferCube(id, "volt_collective", "signal_choir");

		const cube = getCube(id);
		expect(cube!.faction).toBe("signal_choir");

		const log = getTheftLog();
		expect(log.length).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// getCubeCount
// ---------------------------------------------------------------------------

describe("getCubeCount", () => {
	it("returns 0 for a faction with no cubes", () => {
		expect(getCubeCount("reclaimers")).toBe(0);
	});

	it("counts all cubes for a faction", () => {
		spawnCube("reclaimers", "iron", 0, 0);
		spawnCube("reclaimers", "copper", 1, 1);
		spawnCube("reclaimers", "iron", 2, 2);
		expect(getCubeCount("reclaimers")).toBe(3);
	});

	it("filters by material type when provided", () => {
		spawnCube("reclaimers", "iron", 0, 0);
		spawnCube("reclaimers", "copper", 1, 1);
		spawnCube("reclaimers", "iron", 2, 2);
		expect(getCubeCount("reclaimers", "iron")).toBe(2);
		expect(getCubeCount("reclaimers", "copper")).toBe(1);
		expect(getCubeCount("reclaimers", "steel")).toBe(0);
	});

	it("does not count cubes belonging to other factions", () => {
		spawnCube("reclaimers", "iron", 0, 0);
		spawnCube("volt_collective", "iron", 1, 1);
		expect(getCubeCount("reclaimers")).toBe(1);
		expect(getCubeCount("volt_collective")).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getCubeValue
// ---------------------------------------------------------------------------

describe("getCubeValue", () => {
	it("returns 0 for a faction with no cubes", () => {
		expect(getCubeValue("reclaimers")).toBe(0);
	});

	it("sums values of all cubes owned by a faction", () => {
		spawnCube("reclaimers", "iron", 0, 0); // value 1
		spawnCube("reclaimers", "copper", 1, 1); // value 3
		spawnCube("reclaimers", "steel", 2, 2); // value 5
		expect(getCubeValue("reclaimers")).toBe(9);
	});

	it("does not include cubes from other factions", () => {
		spawnCube("reclaimers", "steel", 0, 0); // value 5
		spawnCube("volt_collective", "processor", 1, 1); // value 20
		expect(getCubeValue("reclaimers")).toBe(5);
		expect(getCubeValue("volt_collective")).toBe(20);
	});

	it("includes zero-value cubes in total (scrap)", () => {
		spawnCube("reclaimers", "scrap", 0, 0); // value 0
		spawnCube("reclaimers", "iron", 1, 1); // value 1
		expect(getCubeValue("reclaimers")).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getCubesByFaction
// ---------------------------------------------------------------------------

describe("getCubesByFaction", () => {
	it("returns empty array for faction with no cubes", () => {
		expect(getCubesByFaction("reclaimers")).toEqual([]);
	});

	it("returns all cubes for a faction", () => {
		spawnCube("reclaimers", "iron", 0, 0);
		spawnCube("reclaimers", "copper", 1, 1);
		spawnCube("volt_collective", "steel", 2, 2);

		const cubes = getCubesByFaction("reclaimers");
		expect(cubes.length).toBe(2);
		expect(cubes.every((c) => c.faction === "reclaimers")).toBe(true);
	});

	it("returns copies not references to internal state", () => {
		const _id = spawnCube("reclaimers", "iron", 0, 0);
		const cubes1 = getCubesByFaction("reclaimers");
		const cubes2 = getCubesByFaction("reclaimers");

		expect(cubes1[0]).toEqual(cubes2[0]);
		expect(cubes1[0]).not.toBe(cubes2[0]);
	});
});

// ---------------------------------------------------------------------------
// getCube
// ---------------------------------------------------------------------------

describe("getCube", () => {
	it("returns undefined for nonexistent cube", () => {
		expect(getCube("fake_id")).toBeUndefined();
	});

	it("returns a copy of the cube", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		const c1 = getCube(id);
		const c2 = getCube(id);
		expect(c1).toEqual(c2);
		expect(c1).not.toBe(c2);
	});
});

// ---------------------------------------------------------------------------
// damageCube
// ---------------------------------------------------------------------------

describe("damageCube", () => {
	it("reduces cube health by the damage amount", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0); // health 100
		const remaining = damageCube(id, 30);
		expect(remaining).toBe(70);
	});

	it("clamps health at 0", () => {
		const id = spawnCube("reclaimers", "scrap", 0, 0); // health 50
		const remaining = damageCube(id, 999);
		expect(remaining).toBe(0);
	});

	it("returns -1 for nonexistent cube", () => {
		expect(damageCube("fake_id", 10)).toBe(-1);
	});

	it("stacks multiple damage calls", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0); // health 100
		damageCube(id, 20);
		damageCube(id, 30);
		const remaining = damageCube(id, 10);
		expect(remaining).toBe(40);
	});
});

// ---------------------------------------------------------------------------
// cubeEconomySystem — tick: decay and destruction
// ---------------------------------------------------------------------------

describe("cubeEconomySystem — decay and destruction", () => {
	it("does not decay cubes at full health", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0); // health 100
		cubeEconomySystem();

		const cube = getCube(id);
		expect(cube!.health).toBe(100);
	});

	it("decays damaged cubes by 1 per tick", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0); // health 100
		damageCube(id, 10); // health → 90
		cubeEconomySystem(); // should decay to 89

		const cube = getCube(id);
		expect(cube!.health).toBe(89);
	});

	it("destroys cubes when health reaches 0", () => {
		const id = spawnCube("reclaimers", "scrap", 0, 0); // health 50
		damageCube(id, 49); // health → 1
		cubeEconomySystem(); // decay → 0, should be destroyed

		const destroyed = getCube(id);
		expect(destroyed).toBeUndefined();
	});

	it("returns IDs of destroyed cubes", () => {
		const id = spawnCube("reclaimers", "scrap", 0, 0); // health 50
		damageCube(id, 49); // health → 1

		const destroyed = cubeEconomySystem();
		expect(destroyed).toContain(id);
	});

	it("does not destroy undamaged cubes", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);

		const destroyed = cubeEconomySystem();
		expect(destroyed).not.toContain(id);
		expect(getCube(id)).toBeDefined();
	});

	it("returns empty array when no cubes are destroyed", () => {
		spawnCube("reclaimers", "iron", 0, 0);
		const destroyed = cubeEconomySystem();
		expect(destroyed).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// cubeEconomySystem — value recalculation
// ---------------------------------------------------------------------------

describe("cubeEconomySystem — value recalculation", () => {
	it("recalculates value based on health ratio after damage", () => {
		const id = spawnCube("reclaimers", "steel", 0, 0); // value 5, health 200
		damageCube(id, 100); // health → 100 (50%)
		cubeEconomySystem(); // decay → 99, value = floor(5 * 99/200)

		const cube = getCube(id);
		expect(cube!.value).toBe(Math.floor(5 * (99 / 200)));
	});

	it("value remains full for undamaged cubes", () => {
		const id = spawnCube("reclaimers", "processor", 0, 0); // value 20
		cubeEconomySystem();

		const cube = getCube(id);
		expect(cube!.value).toBe(20);
	});

	it("value drops to 0 when health is very low", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0); // value 1, health 100
		damageCube(id, 98); // health → 2
		cubeEconomySystem(); // decay → 1, value = floor(1 * 1/100) = 0

		const cube = getCube(id);
		expect(cube!.value).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Theft log
// ---------------------------------------------------------------------------

describe("theft log", () => {
	it("starts empty", () => {
		expect(getTheftLog()).toEqual([]);
	});

	it("returns copies not references", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		transferCube(id, "reclaimers", "volt_collective");

		const log1 = getTheftLog();
		const log2 = getTheftLog();
		expect(log1[0]).toEqual(log2[0]);
		expect(log1[0]).not.toBe(log2[0]);
	});

	it("tracks timestamp via tick count", () => {
		const id1 = spawnCube("reclaimers", "iron", 0, 0);
		cubeEconomySystem(); // tick 1
		cubeEconomySystem(); // tick 2
		transferCube(id1, "reclaimers", "volt_collective"); // at tick 2

		const log = getTheftLog();
		expect(log[0].timestamp).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// resetCubeEconomy
// ---------------------------------------------------------------------------

describe("resetCubeEconomy", () => {
	it("clears all cubes", () => {
		spawnCube("reclaimers", "iron", 0, 0);
		spawnCube("volt_collective", "steel", 1, 1);
		resetCubeEconomy();

		expect(getCubeCount("reclaimers")).toBe(0);
		expect(getCubeCount("volt_collective")).toBe(0);
	});

	it("clears theft log", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		transferCube(id, "reclaimers", "volt_collective");
		resetCubeEconomy();

		expect(getTheftLog()).toEqual([]);
	});

	it("resets cube ID counter", () => {
		spawnCube("reclaimers", "iron", 0, 0);
		resetCubeEconomy();

		const id = spawnCube("reclaimers", "iron", 0, 0);
		expect(id).toBe("cube_1");
	});

	it("resets tick counter", () => {
		cubeEconomySystem(); // tick 1
		cubeEconomySystem(); // tick 2
		resetCubeEconomy();

		const id = spawnCube("reclaimers", "iron", 0, 0);
		transferCube(id, "reclaimers", "volt_collective");
		const log = getTheftLog();
		expect(log[0].timestamp).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Multi-faction independence
// ---------------------------------------------------------------------------

describe("multi-faction independence", () => {
	it("factions have independent cube inventories", () => {
		spawnCube("reclaimers", "iron", 0, 0);
		spawnCube("reclaimers", "copper", 1, 1);
		spawnCube("volt_collective", "steel", 2, 2);
		spawnCube("signal_choir", "processor", 3, 3);

		expect(getCubeCount("reclaimers")).toBe(2);
		expect(getCubeCount("volt_collective")).toBe(1);
		expect(getCubeCount("signal_choir")).toBe(1);
		expect(getCubeCount("iron_creed")).toBe(0);
	});

	it("transferring a cube updates counts for both factions", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		spawnCube("reclaimers", "copper", 1, 1);

		transferCube(id, "reclaimers", "volt_collective");

		expect(getCubeCount("reclaimers")).toBe(1);
		expect(getCubeCount("volt_collective")).toBe(1);
	});

	it("economic values are independent per faction", () => {
		spawnCube("reclaimers", "iron", 0, 0); // value 1
		spawnCube("reclaimers", "copper", 1, 1); // value 3
		spawnCube("volt_collective", "power_core", 2, 2); // value 25

		expect(getCubeValue("reclaimers")).toBe(4);
		expect(getCubeValue("volt_collective")).toBe(25);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles picking up, dropping, and picking up again", () => {
		const id = spawnCube("reclaimers", "iron", 0, 0);
		pickupCube(id, "player_1");
		dropCube(id, 5, 5);

		const ok = pickupCube(id, "player_2");
		expect(ok).toBe(true);
		expect(getCube(id)!.heldBy).toBe("player_2");
	});

	it("getCubeValue reflects transfers", () => {
		const id = spawnCube("reclaimers", "power_core", 0, 0); // value 25
		spawnCube("reclaimers", "iron", 1, 1); // value 1

		expect(getCubeValue("reclaimers")).toBe(26);

		transferCube(id, "reclaimers", "volt_collective");

		expect(getCubeValue("reclaimers")).toBe(1);
		expect(getCubeValue("volt_collective")).toBe(25);
	});

	it("destroying a cube reduces faction count", () => {
		const id = spawnCube("reclaimers", "scrap", 0, 0); // health 50
		spawnCube("reclaimers", "iron", 1, 1);
		expect(getCubeCount("reclaimers")).toBe(2);

		damageCube(id, 49); // health → 1
		cubeEconomySystem(); // destroyed

		expect(getCubeCount("reclaimers")).toBe(1);
	});

	it("spawning many cubes gives unique IDs", () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(spawnCube("reclaimers", "iron", i, i));
		}
		expect(ids.size).toBe(100);
	});

	it("continuous decay eventually destroys a damaged cube", () => {
		const id = spawnCube("reclaimers", "scrap", 0, 0); // health 50
		damageCube(id, 1); // health → 49

		// Tick 49 times to decay from 49 to 0
		for (let i = 0; i < 49; i++) {
			cubeEconomySystem();
		}

		expect(getCube(id)).toBeUndefined();
		expect(getCubeCount("reclaimers")).toBe(0);
	});

	it("high-value cubes contribute more to faction wealth", () => {
		spawnCube("reclaimers", "scrap", 0, 0); // value 0
		spawnCube("reclaimers", "scrap", 1, 1); // value 0
		spawnCube("reclaimers", "scrap", 2, 2); // value 0
		spawnCube("volt_collective", "power_core", 3, 3); // value 25

		expect(getCubeValue("reclaimers")).toBe(0);
		expect(getCubeValue("volt_collective")).toBe(25);
	});
});
