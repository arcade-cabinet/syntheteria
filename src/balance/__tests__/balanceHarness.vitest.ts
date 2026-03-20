import { describe, expect, it } from "vitest";
import { printBalanceSummary, runBalanceTier } from "..";

describe("Balance Harness", () => {
	it("Tier 1: 5 runs × 10 turns — startup balance", () => {
		const report = runBalanceTier(1, 10, 5);
		printBalanceSummary(report);

		expect(report.runs.length).toBe(5);

		const criticals = report.diagnostics.filter(
			(d) => d.severity === "critical",
		);
		expect(criticals.length).toBe(0);
	}, 30_000);

	it("Tier 2: 5 runs × 100 turns — mid-game balance", () => {
		const report = runBalanceTier(2, 100, 5);
		printBalanceSummary(report);

		expect(report.runs.length).toBe(5);

		const finalCheckpoint = report.checkpoints[report.checkpoints.length - 1];
		expect(finalCheckpoint?.epoch.mean).toBeGreaterThanOrEqual(3);

		for (const stats of Object.values(report.factions)) {
			expect(stats.avgBuildingCount).toBeGreaterThan(0);
		}
	}, 60_000);

	it("Tier 3: 3 runs × 200 turns — full game", () => {
		const report = runBalanceTier(3, 200, 3);
		printBalanceSummary(report);

		expect(report.runs.length).toBe(3);

		const scores = Object.values(report.factions).map((f) => f.avgFinalScore);
		const maxScore = Math.max(...scores);
		const minScore = Math.min(...scores);
		expect(maxScore).toBeGreaterThan(minScore);
	}, 120_000);
});
