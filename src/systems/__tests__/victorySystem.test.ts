import {
	checkVictoryConditions,
	getVictoryResult,
	resetVictorySystem,
	type VictoryInputs,
} from "../victorySystem";

function makeInputs(overrides: Partial<VictoryInputs> = {}): VictoryInputs {
	return {
		totalDiscoveredCells: 100,
		controlledCells: new Map([
			["player", 30],
			["rogue", 20],
		]),
		unitCounts: new Map([
			["player", 5],
			["rogue", 3],
		]),
		unitMarkLevels: new Map([
			["player", [1, 2, 3]],
			["rogue", [1, 1]],
		]),
		wormholeComplete: new Map([
			["player", false],
			["rogue", false],
		]),
		allFactions: ["player", "rogue"],
		turnNumber: 10,
		...overrides,
	};
}

describe("victorySystem", () => {
	beforeEach(() => {
		resetVictorySystem();
	});

	it("returns null when no victory conditions are met", () => {
		const result = checkVictoryConditions(makeInputs());
		expect(result).toBeNull();
		expect(getVictoryResult()).toBeNull();
	});

	it("detects subjugation victory at 60% territory", () => {
		const result = checkVictoryConditions(
			makeInputs({
				controlledCells: new Map([
					["player", 61],
					["rogue", 10],
				]),
			}),
		);
		expect(result).not.toBeNull();
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("subjugation");
		expect(result!.turnNumber).toBe(10);
	});

	it("detects subjugation for rival faction", () => {
		const result = checkVictoryConditions(
			makeInputs({
				controlledCells: new Map([
					["player", 10],
					["rogue", 65],
				]),
			}),
		);
		expect(result!.winner).toBe("rogue");
		expect(result!.type).toBe("subjugation");
	});

	it("does not trigger subjugation with 0 discovered cells", () => {
		const result = checkVictoryConditions(
			makeInputs({
				totalDiscoveredCells: 0,
				controlledCells: new Map([["player", 0]]),
			}),
		);
		expect(result).toBeNull();
	});

	it("detects technical supremacy with 3+ Mark V units", () => {
		const result = checkVictoryConditions(
			makeInputs({
				unitMarkLevels: new Map([
					["player", [5, 5, 5, 2, 1]],
					["rogue", [1, 1]],
				]),
			}),
		);
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("technical_supremacy");
	});

	it("does not trigger tech supremacy with only 2 Mark V units", () => {
		const result = checkVictoryConditions(
			makeInputs({
				unitMarkLevels: new Map([
					["player", [5, 5, 4, 3]],
					["rogue", [1]],
				]),
			}),
		);
		expect(result).toBeNull();
	});

	it("detects elimination when only one faction has units", () => {
		const result = checkVictoryConditions(
			makeInputs({
				unitCounts: new Map([
					["player", 3],
					["rogue", 0],
				]),
			}),
		);
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("elimination");
	});

	it("does not trigger elimination when multiple factions alive", () => {
		const result = checkVictoryConditions(makeInputs());
		expect(result).toBeNull();
	});

	it("detects wormhole victory", () => {
		const result = checkVictoryConditions(
			makeInputs({
				wormholeComplete: new Map([
					["player", true],
					["rogue", false],
				]),
			}),
		);
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("wormhole");
	});

	it("locks in the first victory and ignores subsequent checks", () => {
		checkVictoryConditions(
			makeInputs({
				controlledCells: new Map([
					["player", 65],
					["rogue", 10],
				]),
			}),
		);
		expect(getVictoryResult()!.type).toBe("subjugation");

		// Even if wormhole completes later, victory is already locked
		const second = checkVictoryConditions(
			makeInputs({
				wormholeComplete: new Map([
					["player", false],
					["rogue", true],
				]),
			}),
		);
		expect(second!.type).toBe("subjugation");
		expect(second!.winner).toBe("player");
	});

	it("prioritizes subjugation over tech supremacy", () => {
		const result = checkVictoryConditions(
			makeInputs({
				controlledCells: new Map([
					["player", 70],
					["rogue", 5],
				]),
				unitMarkLevels: new Map([
					["player", [5, 5, 5]],
					["rogue", [1]],
				]),
			}),
		);
		expect(result!.type).toBe("subjugation");
	});

	it("resets victory state", () => {
		checkVictoryConditions(
			makeInputs({
				controlledCells: new Map([["player", 80]]),
			}),
		);
		expect(getVictoryResult()).not.toBeNull();

		resetVictorySystem();
		expect(getVictoryResult()).toBeNull();
	});
});
