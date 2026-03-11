/**
 * Tests for OpponentConfig — pure logic functions for opponent slot management.
 *
 * The addOpponent and removeOpponent logic is extracted from the component
 * and tested as pure functions that mirror what the component does internally.
 */

import type { OpponentSlot } from "../OpponentConfig";

// ---------------------------------------------------------------------------
// Pure logic mirrors (extracted from OpponentConfig component)
// ---------------------------------------------------------------------------

const ALL_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;
type FactionId = (typeof ALL_FACTIONS)[number];

function addOpponent(
	opponents: OpponentSlot[],
	playerFaction: FactionId,
): OpponentSlot[] {
	if (opponents.length >= 4) return opponents;
	const usedFactions = new Set([
		playerFaction,
		...opponents.map((o) => o.faction),
	]);
	const available = ALL_FACTIONS.filter(
		(f): f is FactionId => !usedFactions.has(f as FactionId),
	);
	const faction =
		available.length > 0
			? available[0]
			: ALL_FACTIONS.filter((f) => f !== playerFaction)[0];
	return [...opponents, { faction, difficulty: "normal" } as OpponentSlot];
}

function removeOpponent(
	opponents: OpponentSlot[],
	index: number,
): OpponentSlot[] {
	return opponents.filter((_, i) => i !== index);
}

function updateSlot(
	opponents: OpponentSlot[],
	index: number,
	patch: Partial<OpponentSlot>,
): OpponentSlot[] {
	return opponents.map((slot, i) =>
		i === index ? { ...slot, ...patch } : slot,
	);
}

// ---------------------------------------------------------------------------
// addOpponent
// ---------------------------------------------------------------------------

describe("addOpponent", () => {
	it("adds one opponent to an empty list", () => {
		const result = addOpponent([], "reclaimers");
		expect(result).toHaveLength(1);
	});

	it("does not pick the player faction as AI faction", () => {
		const result = addOpponent([], "reclaimers");
		expect(result[0].faction).not.toBe("reclaimers");
	});

	it("does not add beyond 4 opponents", () => {
		let opponents: OpponentSlot[] = [];
		opponents = addOpponent(opponents, "reclaimers");
		opponents = addOpponent(opponents, "reclaimers");
		opponents = addOpponent(opponents, "reclaimers");
		opponents = addOpponent(opponents, "reclaimers");
		// Now at 4 — should not grow
		const before = opponents.length;
		opponents = addOpponent(opponents, "reclaimers");
		expect(opponents).toHaveLength(before);
	});

	it("adds opponent with 'normal' difficulty by default", () => {
		const result = addOpponent([], "reclaimers");
		expect(result[0].difficulty).toBe("normal");
	});

	it("picks a faction not already used", () => {
		const existing: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
		];
		const result = addOpponent(existing, "reclaimers");
		const newFaction = result[result.length - 1].faction;
		expect(newFaction).not.toBe("reclaimers");
		expect(newFaction).not.toBe("volt_collective");
	});

	it("prefers factions not used by player or existing opponents", () => {
		const existing: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "easy" },
			{ faction: "signal_choir", difficulty: "hard" },
		];
		const result = addOpponent(existing, "reclaimers");
		const newFaction = result[result.length - 1].faction;
		// Only iron_creed is unused
		expect(newFaction).toBe("iron_creed");
	});

	it("returns a new array (does not mutate original)", () => {
		const original: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
		];
		const result = addOpponent(original, "reclaimers");
		expect(result).not.toBe(original);
		expect(original).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// removeOpponent
// ---------------------------------------------------------------------------

describe("removeOpponent", () => {
	it("removes opponent at given index", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
			{ faction: "signal_choir", difficulty: "easy" },
		];
		const result = removeOpponent(opponents, 0);
		expect(result).toHaveLength(1);
		expect(result[0].faction).toBe("signal_choir");
	});

	it("removes last opponent", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
			{ faction: "signal_choir", difficulty: "easy" },
		];
		const result = removeOpponent(opponents, 1);
		expect(result).toHaveLength(1);
		expect(result[0].faction).toBe("volt_collective");
	});

	it("returns empty array when removing the only opponent", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "iron_creed", difficulty: "hard" },
		];
		const result = removeOpponent(opponents, 0);
		expect(result).toHaveLength(0);
	});

	it("does not mutate the original array", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
			{ faction: "signal_choir", difficulty: "easy" },
		];
		removeOpponent(opponents, 0);
		expect(opponents).toHaveLength(2);
	});

	it("preserves remaining opponents in order", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "reclaimers", difficulty: "easy" },
			{ faction: "volt_collective", difficulty: "normal" },
			{ faction: "signal_choir", difficulty: "hard" },
		];
		const result = removeOpponent(opponents, 1);
		expect(result[0].faction).toBe("reclaimers");
		expect(result[1].faction).toBe("signal_choir");
	});
});

// ---------------------------------------------------------------------------
// updateSlot
// ---------------------------------------------------------------------------

describe("updateSlot", () => {
	it("updates difficulty of slot at index", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
		];
		const result = updateSlot(opponents, 0, { difficulty: "hard" });
		expect(result[0].difficulty).toBe("hard");
	});

	it("updates faction of slot at index", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
		];
		const result = updateSlot(opponents, 0, { faction: "iron_creed" });
		expect(result[0].faction).toBe("iron_creed");
	});

	it("does not modify other slots", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
			{ faction: "signal_choir", difficulty: "easy" },
		];
		const result = updateSlot(opponents, 0, { difficulty: "hard" });
		expect(result[1]).toEqual(opponents[1]);
	});

	it("does not mutate the original array", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
		];
		updateSlot(opponents, 0, { difficulty: "hard" });
		expect(opponents[0].difficulty).toBe("normal");
	});

	it("preserves unpatched fields in updated slot", () => {
		const opponents: OpponentSlot[] = [
			{ faction: "volt_collective", difficulty: "normal" },
		];
		const result = updateSlot(opponents, 0, { difficulty: "easy" });
		expect(result[0].faction).toBe("volt_collective");
	});
});

// ---------------------------------------------------------------------------
// OpponentSlot shape
// ---------------------------------------------------------------------------

describe("OpponentSlot shape", () => {
	it("has faction and difficulty fields", () => {
		const slot: OpponentSlot = { faction: "reclaimers", difficulty: "normal" };
		expect(slot).toHaveProperty("faction");
		expect(slot).toHaveProperty("difficulty");
	});

	it("difficulty accepts easy/normal/hard", () => {
		const difficulties: OpponentSlot["difficulty"][] = [
			"easy",
			"normal",
			"hard",
		];
		for (const d of difficulties) {
			const slot: OpponentSlot = { faction: "reclaimers", difficulty: d };
			expect(slot.difficulty).toBe(d);
		}
	});
});
