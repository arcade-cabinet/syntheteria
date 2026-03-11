/**
 * Unit tests for the game over detection system.
 *
 * Tests cover:
 * - Victory condition: final quest completed triggers win
 * - Loss condition: all player bot components non-functional triggers loss
 * - Loss condition: no player bots remaining triggers loss
 * - No trigger when game is still in progress
 * - Detection only fires once (idempotent after trigger)
 * - Listener callbacks fire on game over
 * - Reset clears game over state
 */

// Compat layer: defer world access until iteration time to avoid circular init issues
jest.mock("../../ecs/koota/compat", () => ({
	get playerBots() {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require("../../ecs/world").playerBots;
	},
}));

// Mock questSystem — control quest completion state
jest.mock("../questSystem", () => ({
	getQuestSequence: jest.fn(() => [
		{ id: "quest_first_harvest" },
		{ id: "quest_first_cube" },
		{ id: "quest_defend_raid" },
	]),
	isQuestComplete: jest.fn(() => false),
}));

import type { Entity, UnitComponent } from "../../ecs/types";
import { world } from "../../ecs/world";
import {
	checkGameOver,
	getGameOverState,
	onGameOver,
	resetGameOver,
} from "../gameOverDetection";
import { getQuestSequence, isQuestComplete } from "../questSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponents(
	overrides: Partial<Record<string, boolean>> = {},
): UnitComponent[] {
	const defaults: Record<string, boolean> = {
		camera: true,
		arms: true,
		legs: true,
		power_cell: true,
		...overrides,
	};
	return Object.entries(defaults).map(([name, functional]) => ({
		name,
		functional,
		material: "metal" as const,
	}));
}

function makePlayerBot(
	id: string,
	opts: {
		components?: UnitComponent[];
		isActive?: boolean;
	} = {},
): Entity {
	const entity = world.add({
		id,
		faction: "player" as const,
		worldPosition: { x: 0, y: 0, z: 0 },
		mapFragment: { fragmentId: "test_frag" },
		unit: {
			type: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			components: opts.components ?? makeComponents(),
		},
		navigation: { path: [], pathIndex: 0, moving: false },
		playerControlled: {
			isActive: opts.isActive ?? true,
			yaw: 0,
			pitch: 0,
		},
	} as Partial<Entity> as Entity);
	trackedEntities.push(entity);
	return entity;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const trackedEntities: Entity[] = [];

beforeEach(() => {
	resetGameOver();
	jest.clearAllMocks();

	// Default mock: no quest is complete
	jest.mocked(isQuestComplete).mockReturnValue(false);
	jest.mocked(getQuestSequence).mockReturnValue([
		{ id: "quest_first_harvest" } as ReturnType<typeof getQuestSequence>[number],
		{ id: "quest_first_cube" } as ReturnType<typeof getQuestSequence>[number],
		{ id: "quest_defend_raid" } as ReturnType<typeof getQuestSequence>[number],
	]);
});

afterEach(() => {
	for (const e of trackedEntities) {
		try {
			world.remove(e);
		} catch {
			// already removed
		}
	}
	trackedEntities.length = 0;
});

// ---------------------------------------------------------------------------
// No game over
// ---------------------------------------------------------------------------

describe("gameOverDetection — no trigger", () => {
	it("returns null when game is in progress (bots functional, quests incomplete)", () => {
		makePlayerBot("p1");
		const result = checkGameOver();
		expect(result).toBeNull();
		expect(getGameOverState()).toBeNull();
	});

	it("returns null when some but not all components are broken", () => {
		makePlayerBot("p1", {
			components: makeComponents({ camera: false, arms: false }),
		});
		const result = checkGameOver();
		expect(result).toBeNull();
	});

	it("returns null when one bot is broken but another is functional", () => {
		makePlayerBot("p1", {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
			isActive: false,
		});
		makePlayerBot("p2", { isActive: true });

		const result = checkGameOver();
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Victory
// ---------------------------------------------------------------------------

describe("gameOverDetection — victory", () => {
	it("triggers victory when final quest is completed", () => {
		makePlayerBot("p1");

		// Mock the final quest as complete
		jest.mocked(isQuestComplete).mockImplementation(
			(id: string) => id === "quest_defend_raid",
		);

		const result = checkGameOver();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(true);
		expect(result!.reason).toContain("quest");
	});

	it("does not trigger victory for non-final quest completion", () => {
		makePlayerBot("p1");

		jest.mocked(isQuestComplete).mockImplementation(
			(id: string) => id === "quest_first_harvest",
		);

		const result = checkGameOver();
		expect(result).toBeNull();
	});

	it("victory takes precedence over loss (edge case)", () => {
		// All components broken AND final quest complete
		makePlayerBot("p1", {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		jest.mocked(isQuestComplete).mockImplementation(
			(id: string) => id === "quest_defend_raid",
		);

		const result = checkGameOver();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Loss
// ---------------------------------------------------------------------------

describe("gameOverDetection — loss", () => {
	it("triggers loss when all player bot components are non-functional", () => {
		makePlayerBot("p1", {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		const result = checkGameOver();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(false);
		expect(result!.reason).toContain("non-functional");
	});

	it("triggers loss when all player bots have all components broken", () => {
		const allBroken = makeComponents({
			camera: false,
			arms: false,
			legs: false,
			power_cell: false,
		});

		makePlayerBot("p1", { components: [...allBroken.map((c) => ({ ...c }))], isActive: true });
		makePlayerBot("p2", { components: [...allBroken.map((c) => ({ ...c }))], isActive: false });

		const result = checkGameOver();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(false);
	});

	it("triggers loss when no player bots exist", () => {
		// Don't spawn any player bots
		const result = checkGameOver();
		expect(result).not.toBeNull();
		expect(result!.won).toBe(false);
		expect(result!.reason).toContain("destroyed");
	});
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe("gameOverDetection — idempotency", () => {
	it("only triggers once even if called multiple times", () => {
		makePlayerBot("p1", {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		const first = checkGameOver();
		const second = checkGameOver();

		expect(first).not.toBeNull();
		expect(second).toBeNull(); // second call returns null
		expect(getGameOverState()).toEqual(first); // state persists
	});
});

// ---------------------------------------------------------------------------
// Listeners
// ---------------------------------------------------------------------------

describe("gameOverDetection — listeners", () => {
	it("notifies listeners on game over", () => {
		const callback = jest.fn();
		onGameOver(callback);

		makePlayerBot("p1", {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		checkGameOver();
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(
			expect.objectContaining({ won: false }),
		);
	});

	it("unsubscribe removes listener", () => {
		const callback = jest.fn();
		const unsub = onGameOver(callback);
		unsub();

		makePlayerBot("p1", {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		checkGameOver();
		expect(callback).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("gameOverDetection — reset", () => {
	it("resetGameOver clears state so detection can trigger again", () => {
		makePlayerBot("p1", {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		checkGameOver();
		expect(getGameOverState()).not.toBeNull();

		resetGameOver();
		expect(getGameOverState()).toBeNull();

		// Can trigger again
		const result = checkGameOver();
		expect(result).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Empty quest sequence
// ---------------------------------------------------------------------------

describe("gameOverDetection — edge cases", () => {
	it("handles empty quest sequence without crashing", () => {
		jest.mocked(getQuestSequence).mockReturnValue([]);
		makePlayerBot("p1");

		const result = checkGameOver();
		expect(result).toBeNull();
	});
});
