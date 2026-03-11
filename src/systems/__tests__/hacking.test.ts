/**
 * Unit tests for the hacking system.
 *
 * Tests cover:
 * - Progress tracking over time
 * - Proximity requirements (start range 4, cancel range 8)
 * - Compute power effects on hack speed
 * - Faction transfer when progress reaches 1.0
 * - Cancellation when out of range
 * - Edge cases: already hacked, same faction, zero compute
 * - Only one hack at a time
 * - Module state resets between tests
 */

// ---------------------------------------------------------------------------
// Mock declarations for jest.mock factory hoisting
// ---------------------------------------------------------------------------

const mockWorld = [] as any[];
const mockHackables = [] as any[];
const mockPlayerBots = [] as any[];
const mockCompute = { value: 0 };

jest.mock("../../ecs/world", () => ({
	world: mockWorld,
	hackables: mockHackables,
	playerBots: mockPlayerBots,
}));

// Also mock the Koota compat layer (hacking.ts now imports from here)
jest.mock("../../ecs/koota/compat", () => ({
	hackables: mockHackables,
	playerBots: mockPlayerBots,
}));

jest.mock("../signalNetwork", () => ({
	getGlobalCompute: () => mockCompute.value,
}));

// Import after mocks are set up
import {
	cancelHack,
	getActiveHackTarget,
	getComputePool,
	hackingSystem,
	startHack,
} from "../hacking";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let entityIdCounter = 0;

function makeHackable(opts: {
	difficulty?: number;
	x?: number;
	z?: number;
	hacked?: boolean;
	beingHacked?: boolean;
	hackProgress?: number;
	faction?: string;
}) {
	const id = `hackable_${++entityIdCounter}`;
	const entity = {
		id,
		faction: opts.faction ?? "cultist",
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
		hackable: {
			difficulty: opts.difficulty ?? 10,
			hackProgress: opts.hackProgress ?? 0,
			beingHacked: opts.beingHacked ?? false,
			hacked: opts.hacked ?? false,
		},
	};
	mockWorld.push(entity);
	mockHackables.push(entity);
	return entity;
}

function makePlayerBot(opts: {
	x?: number;
	z?: number;
	isActive?: boolean;
}) {
	const id = `player_${++entityIdCounter}`;
	const entity = {
		id,
		faction: "player",
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
		playerControlled: { isActive: opts.isActive ?? true, yaw: 0, pitch: 0 },
		unit: {
			type: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			components: [],
		},
	};
	mockPlayerBots.push(entity);
	return entity;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	entityIdCounter = 0;
	mockWorld.length = 0;
	mockHackables.length = 0;
	mockPlayerBots.length = 0;
	mockCompute.value = 0;
});

afterEach(() => {
	// Cancel any lingering hack BEFORE clearing arrays (cancelHack needs
	// to find the entity in mockWorld to clear activeHackTargetId).
	const target = getActiveHackTarget();
	if (target !== null) {
		cancelHack(target);
	}

	mockWorld.length = 0;
	mockHackables.length = 0;
	mockPlayerBots.length = 0;
	mockCompute.value = 0;
});

// ---------------------------------------------------------------------------
// getComputePool
// ---------------------------------------------------------------------------

describe("getComputePool", () => {
	it("returns the global compute value from signalNetwork", () => {
		mockCompute.value = 42;
		expect(getComputePool()).toBe(42);
	});

	it("returns 0 when no compute available", () => {
		mockCompute.value = 0;
		expect(getComputePool()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// startHack — proximity requirements
// ---------------------------------------------------------------------------

describe("startHack — proximity", () => {
	it("returns true when player is within start range (4 units)", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 3, z: 0 }); // distance = 3

		expect(startHack(target.id)).toBe(true);
	});

	it("returns true when player is exactly at start range boundary (4 units)", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 4, z: 0 }); // distance = 4

		expect(startHack(target.id)).toBe(true);
	});

	it("returns false when player is beyond start range (> 4 units)", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 5, z: 0 }); // distance = 5

		expect(startHack(target.id)).toBe(false);
	});

	it("uses XZ distance (ignores Y)", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		// Entity is at (3,0,0) with world position — only XZ matters
		const target = makeHackable({ x: 3, z: 0 });

		expect(startHack(target.id)).toBe(true);
	});

	it("calculates distance to nearest player bot", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 100, z: 100 }); // far away
		makePlayerBot({ x: 2, z: 0 }); // close
		const target = makeHackable({ x: 0, z: 0 }); // distance to nearest = 2

		expect(startHack(target.id)).toBe(true);
	});

	it("ignores inactive player bots for proximity", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0, isActive: false }); // nearby but inactive
		const target = makeHackable({ x: 1, z: 0 });

		// No active player bot = Infinity distance
		expect(startHack(target.id)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// startHack — compute requirements
// ---------------------------------------------------------------------------

describe("startHack — compute requirements", () => {
	it("returns false when compute pool is 0", () => {
		mockCompute.value = 0;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0 });

		expect(startHack(target.id)).toBe(false);
	});

	it("returns true when compute pool is positive", () => {
		mockCompute.value = 1;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0 });

		expect(startHack(target.id)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// startHack — edge cases
// ---------------------------------------------------------------------------

describe("startHack — edge cases", () => {
	it("returns false for non-existent entity", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });

		expect(startHack("nonexistent")).toBe(false);
	});

	it("returns false for already hacked entity", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, hacked: true });

		expect(startHack(target.id)).toBe(false);
	});

	it("returns false for entity already being hacked", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, beingHacked: true });

		expect(startHack(target.id)).toBe(false);
	});

	it("only allows one hack at a time", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target1 = makeHackable({ x: 1, z: 0 });
		const target2 = makeHackable({ x: 2, z: 0 });

		expect(startHack(target1.id)).toBe(true);
		expect(startHack(target2.id)).toBe(false);
	});

	it("allows starting a new hack after cancelling the current one", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target1 = makeHackable({ x: 1, z: 0 });
		const target2 = makeHackable({ x: 2, z: 0 });

		startHack(target1.id);
		cancelHack(target1.id);

		expect(startHack(target2.id)).toBe(true);
	});

	it("sets beingHacked and resets hackProgress on start", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, hackProgress: 0.5 });

		startHack(target.id);

		expect(target.hackable.beingHacked).toBe(true);
		expect(target.hackable.hackProgress).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// cancelHack
// ---------------------------------------------------------------------------

describe("cancelHack", () => {
	it("resets hack progress and beingHacked flag", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0 });

		startHack(target.id);
		target.hackable.hackProgress = 0.5; // simulate partial progress

		cancelHack(target.id);

		expect(target.hackable.beingHacked).toBe(false);
		expect(target.hackable.hackProgress).toBe(0);
	});

	it("clears the active hack target", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0 });

		startHack(target.id);
		expect(getActiveHackTarget()).toBe(target.id);

		cancelHack(target.id);
		expect(getActiveHackTarget()).toBeNull();
	});

	it("does nothing for non-existent entity", () => {
		expect(() => cancelHack("nonexistent")).not.toThrow();
	});

	it("does nothing for entity without hackable component", () => {
		const entity = { id: "not_hackable", faction: "cultist" };
		mockWorld.push(entity);

		expect(() => cancelHack("not_hackable")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// hackingSystem — progress tracking
// ---------------------------------------------------------------------------

describe("hackingSystem — progress tracking", () => {
	it("advances hackProgress by compute / difficulty per tick", () => {
		mockCompute.value = 5;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10 });

		startHack(target.id);
		hackingSystem();

		// progressPerTick = 5 / 10 = 0.5
		expect(target.hackable.hackProgress).toBeCloseTo(0.5);
	});

	it("accumulates progress across multiple ticks", () => {
		mockCompute.value = 2;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10 });

		startHack(target.id);

		// Each tick: 2 / 10 = 0.2 progress
		hackingSystem();
		expect(target.hackable.hackProgress).toBeCloseTo(0.2);

		hackingSystem();
		expect(target.hackable.hackProgress).toBeCloseTo(0.4);

		hackingSystem();
		expect(target.hackable.hackProgress).toBeCloseTo(0.6);
	});

	it("clamps progress to 1.0 maximum", () => {
		mockCompute.value = 100;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10 });

		startHack(target.id);
		hackingSystem();

		// progressPerTick = 100 / 10 = 10, clamped to 1.0
		expect(target.hackable.hackProgress).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// hackingSystem — compute power effects
// ---------------------------------------------------------------------------

describe("hackingSystem — compute power effects", () => {
	it("higher compute means faster hacking", () => {
		makePlayerBot({ x: 0, z: 0 });

		// Low compute
		mockCompute.value = 2;
		const slow = makeHackable({ x: 1, z: 0, difficulty: 10 });
		startHack(slow.id);
		hackingSystem();
		const slowProgress = slow.hackable.hackProgress;
		cancelHack(slow.id);

		// High compute
		mockCompute.value = 8;
		const fast = makeHackable({ x: 2, z: 0, difficulty: 10 });
		startHack(fast.id);
		hackingSystem();
		const fastProgress = fast.hackable.hackProgress;

		expect(fastProgress).toBeGreaterThan(slowProgress);
		expect(slowProgress).toBeCloseTo(0.2);
		expect(fastProgress).toBeCloseTo(0.8);
	});

	it("higher difficulty means slower hacking", () => {
		mockCompute.value = 5;
		makePlayerBot({ x: 0, z: 0 });

		// Low difficulty
		const easy = makeHackable({ x: 1, z: 0, difficulty: 5 });
		startHack(easy.id);
		hackingSystem();
		const easyProgress = easy.hackable.hackProgress;
		cancelHack(easy.id);

		// High difficulty
		const hard = makeHackable({ x: 2, z: 0, difficulty: 50 });
		startHack(hard.id);
		hackingSystem();
		const hardProgress = hard.hackable.hackProgress;

		expect(easyProgress).toBeCloseTo(1.0); // 5/5 = 1.0
		expect(hardProgress).toBeCloseTo(0.1); // 5/50 = 0.1
	});

	it("stalls (does not cancel) when compute drops to 0", () => {
		mockCompute.value = 5;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10 });

		startHack(target.id);
		hackingSystem();
		expect(target.hackable.hackProgress).toBeCloseTo(0.5);

		// Compute drops to 0
		mockCompute.value = 0;
		hackingSystem();

		// Progress unchanged — hack stalls but doesn't cancel
		expect(target.hackable.hackProgress).toBeCloseTo(0.5);
		expect(target.hackable.beingHacked).toBe(true);
		expect(getActiveHackTarget()).toBe(target.id);
	});

	it("resumes when compute becomes available again", () => {
		mockCompute.value = 5;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10 });

		startHack(target.id);
		hackingSystem(); // progress = 0.5

		mockCompute.value = 0;
		hackingSystem(); // stalls at 0.5

		mockCompute.value = 5;
		hackingSystem(); // progress = 0.5 + 0.5 = 1.0

		expect(target.hackable.hackProgress).toBeCloseTo(1.0);
		expect(target.hackable.hacked).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// hackingSystem — faction transfer on completion
// ---------------------------------------------------------------------------

describe("hackingSystem — hack completion", () => {
	it("sets hacked=true when progress reaches 1.0", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10 });

		startHack(target.id);
		hackingSystem();

		expect(target.hackable.hacked).toBe(true);
	});

	it("sets beingHacked=false after completion", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10 });

		startHack(target.id);
		hackingSystem();

		expect(target.hackable.beingHacked).toBe(false);
	});

	it("transfers entity faction to player", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10, faction: "cultist" });

		expect(target.faction).toBe("cultist");

		startHack(target.id);
		hackingSystem();

		expect(target.faction).toBe("player");
	});

	it("clears active hack target after completion", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 10 });

		startHack(target.id);
		hackingSystem();

		expect(getActiveHackTarget()).toBeNull();
	});

	it("allows starting a new hack after previous completes", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target1 = makeHackable({ x: 1, z: 0, difficulty: 10 });
		const target2 = makeHackable({ x: 2, z: 0, difficulty: 10 });

		startHack(target1.id);
		hackingSystem(); // completes

		expect(startHack(target2.id)).toBe(true);
		expect(getActiveHackTarget()).toBe(target2.id);
	});
});

// ---------------------------------------------------------------------------
// hackingSystem — cancellation when out of range
// ---------------------------------------------------------------------------

describe("hackingSystem — range cancellation", () => {
	it("cancels hack when player moves beyond cancel range (8 units)", () => {
		mockCompute.value = 5;
		const bot = makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 100 });

		startHack(target.id);
		hackingSystem(); // some progress

		// Player moves far away
		bot.worldPosition.x = 100;
		hackingSystem();

		expect(target.hackable.beingHacked).toBe(false);
		expect(target.hackable.hackProgress).toBe(0);
		expect(getActiveHackTarget()).toBeNull();
	});

	it("does not cancel when player is within cancel range (8 units)", () => {
		mockCompute.value = 5;
		const bot = makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 100 });

		startHack(target.id);

		// Player moves to 7 units away from target (within cancel range of 8)
		bot.worldPosition.x = -6; // distance to target at (1,0) = 7
		hackingSystem();

		expect(target.hackable.beingHacked).toBe(true);
		expect(target.hackable.hackProgress).toBeGreaterThan(0);
	});

	it("cancels when player is exactly beyond cancel range boundary", () => {
		mockCompute.value = 5;
		const bot = makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 0, z: 0, difficulty: 100 });

		startHack(target.id);

		// Move player to distance > 8 from target at (0,0)
		bot.worldPosition.x = 8.01;
		hackingSystem();

		expect(target.hackable.beingHacked).toBe(false);
		expect(target.hackable.hackProgress).toBe(0);
	});

	it("does not cancel when player is at exactly cancel range boundary (8 units)", () => {
		mockCompute.value = 5;
		const bot = makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 0, z: 0, difficulty: 100 });

		startHack(target.id);

		// Move player exactly to 8 units away
		bot.worldPosition.x = 8;
		hackingSystem();

		expect(target.hackable.beingHacked).toBe(true);
	});

	it("resets progress to 0 when cancelled by range", () => {
		mockCompute.value = 5;
		const bot = makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0, difficulty: 20 });

		startHack(target.id);
		hackingSystem(); // progress = 5/20 = 0.25
		expect(target.hackable.hackProgress).toBeCloseTo(0.25);

		// Move out of range
		bot.worldPosition.x = 100;
		hackingSystem();

		expect(target.hackable.hackProgress).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// hackingSystem — skips non-active entities
// ---------------------------------------------------------------------------

describe("hackingSystem — iteration behavior", () => {
	it("skips hackable entities that are not being hacked", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const inactive = makeHackable({ x: 1, z: 0, difficulty: 10 });
		// Don't start hack — beingHacked is false

		hackingSystem();

		expect(inactive.hackable.hackProgress).toBe(0);
		expect(inactive.hackable.hacked).toBe(false);
	});

	it("handles entity whose beingHacked was set externally", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({
			x: 1,
			z: 0,
			difficulty: 10,
			beingHacked: true,
			hackProgress: 0.5,
		});

		hackingSystem();

		// Should advance progress: 0.5 + (10/10) = 1.5, clamped to 1.0
		expect(target.hackable.hackProgress).toBeCloseTo(1.0);
		expect(target.hackable.hacked).toBe(true);
		expect(target.faction).toBe("player");
	});
});

// ---------------------------------------------------------------------------
// getActiveHackTarget
// ---------------------------------------------------------------------------

describe("getActiveHackTarget", () => {
	it("returns null when no hack is active", () => {
		expect(getActiveHackTarget()).toBeNull();
	});

	it("returns the target entity ID during active hack", () => {
		mockCompute.value = 10;
		makePlayerBot({ x: 0, z: 0 });
		const target = makeHackable({ x: 1, z: 0 });

		startHack(target.id);

		expect(getActiveHackTarget()).toBe(target.id);
	});
});
