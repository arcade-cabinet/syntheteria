import { describe, expect, it } from "vitest";
import { computeEpoch } from "../epochDefs";
import { GAME_SPEEDS, type GameSpeed, getSpeedConfig } from "../gameSpeedDefs";

describe("gameSpeedDefs", () => {
	const speeds: GameSpeed[] = ["quick", "standard", "epic", "marathon"];

	it("all 4 speed configs have valid values", () => {
		for (const speed of speeds) {
			const config = GAME_SPEEDS[speed];
			expect(config.label).toBeTruthy();
			expect(config.turnCap).toBeGreaterThan(0);
			expect(config.epochTurns).toHaveLength(4);
			expect(config.buildTimeMultiplier).toBeGreaterThan(0);
			expect(config.upgradeTimeMultiplier).toBeGreaterThan(0);
			expect(config.boardSize.width).toBeGreaterThan(0);
			expect(config.boardSize.height).toBeGreaterThan(0);
			expect(config.startingResources).toBeGreaterThan(0);
			expect(config.victoryScaleMultiplier).toBeGreaterThan(0);
		}
	});

	it("quick has smaller board and shorter turns than standard", () => {
		const quick = GAME_SPEEDS.quick;
		const standard = GAME_SPEEDS.standard;
		expect(quick.boardSize.width).toBeLessThan(standard.boardSize.width);
		expect(quick.turnCap).toBeLessThan(standard.turnCap);
	});

	it("multipliers are ordered correctly", () => {
		const q = GAME_SPEEDS.quick;
		const s = GAME_SPEEDS.standard;
		const e = GAME_SPEEDS.epic;
		const m = GAME_SPEEDS.marathon;

		// Build time multipliers: quick < standard < epic < marathon
		expect(q.buildTimeMultiplier).toBeLessThan(s.buildTimeMultiplier);
		expect(s.buildTimeMultiplier).toBeLessThan(e.buildTimeMultiplier);
		expect(e.buildTimeMultiplier).toBeLessThan(m.buildTimeMultiplier);

		// Turn caps: quick < standard < epic < marathon
		expect(q.turnCap).toBeLessThan(s.turnCap);
		expect(s.turnCap).toBeLessThan(e.turnCap);
		expect(e.turnCap).toBeLessThan(m.turnCap);

		// Board sizes: quick < standard < epic < marathon
		expect(q.boardSize.width).toBeLessThan(s.boardSize.width);
		expect(s.boardSize.width).toBeLessThanOrEqual(e.boardSize.width);
		expect(e.boardSize.width).toBeLessThan(m.boardSize.width);
	});

	it("getSpeedConfig returns correct config", () => {
		expect(getSpeedConfig("quick")).toBe(GAME_SPEEDS.quick);
		expect(getSpeedConfig("standard")).toBe(GAME_SPEEDS.standard);
		expect(getSpeedConfig("epic")).toBe(GAME_SPEEDS.epic);
		expect(getSpeedConfig("marathon")).toBe(GAME_SPEEDS.marathon);
	});

	it("epoch turns scale with game speed", () => {
		for (const speed of speeds) {
			const config = GAME_SPEEDS[speed];
			// Each epoch turn threshold should be ascending
			for (let i = 1; i < config.epochTurns.length; i++) {
				expect(config.epochTurns[i]).toBeGreaterThan(config.epochTurns[i - 1]!);
			}
		}
	});

	describe("computeEpoch with custom epoch turns", () => {
		it("uses standard thresholds by default", () => {
			expect(computeEpoch(1, 1).number).toBe(1);
			expect(computeEpoch(1, 10).number).toBe(2);
			expect(computeEpoch(1, 30).number).toBe(3);
			expect(computeEpoch(1, 60).number).toBe(4);
			expect(computeEpoch(1, 100).number).toBe(5);
		});

		it("respects quick epoch turns", () => {
			const quickTurns = GAME_SPEEDS.quick.epochTurns;
			expect(computeEpoch(1, 1, quickTurns).number).toBe(1);
			expect(computeEpoch(1, 5, quickTurns).number).toBe(2);
			expect(computeEpoch(1, 15, quickTurns).number).toBe(3);
			expect(computeEpoch(1, 30, quickTurns).number).toBe(4);
			expect(computeEpoch(1, 50, quickTurns).number).toBe(5);
		});

		it("respects marathon epoch turns", () => {
			const marathonTurns = GAME_SPEEDS.marathon.epochTurns;
			expect(computeEpoch(1, 1, marathonTurns).number).toBe(1);
			expect(computeEpoch(1, 49, marathonTurns).number).toBe(1);
			expect(computeEpoch(1, 50, marathonTurns).number).toBe(2);
			expect(computeEpoch(1, 500, marathonTurns).number).toBe(5);
		});
	});
});
