import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { generateBoard } from "../../board/generator";
import type { BoardConfig } from "../../board/types";
import { TECH_TREE } from "../../config/techTreeDefs";
import { initWorldFromBoard } from "../../init-world";
import { Building, Faction } from "../../traits";
import { ResearchState } from "../researchSystem";
import {
	finalizeTurnDeltas,
	resetResourceDeltas,
	trackExpenditure,
	trackIncome,
} from "../resourceDeltaSystem";
import { resetTurnEventLog } from "../turnEventLog";
import {
	clearTurnSummary,
	collectTurnSummary,
	getRivalMilestones,
	getTurnSummary,
	resetTurnSummary,
	subscribeTurnSummary,
} from "../turnSummary";

const SMALL_CONFIG: BoardConfig = {
	width: 16,
	height: 16,
	seed: "turn-summary-test",
	difficulty: "normal",
	climateProfile: "arid",
};

function makeWorld() {
	const board = generateBoard(SMALL_CONFIG);
	const world = createWorld();
	initWorldFromBoard(world, board, {
		climateProfile: "arid",
		stormProfile: "stable",
		difficulty: "standard",
		factionSlots: [{ factionId: "reclaimers", role: "ai" }],
	});
	return { world, board };
}

beforeEach(() => {
	resetTurnSummary();
	resetResourceDeltas();
	resetTurnEventLog();
});

describe("turnSummary", () => {
	it("returns null before any collection", () => {
		expect(getTurnSummary()).toBeNull();
		expect(getRivalMilestones()).toEqual([]);
	});

	it("collects resource changes from finalized deltas", () => {
		const { world, board } = makeWorld();

		// Simulate a turn's resource income
		trackIncome("scrap_metal", 5);
		trackIncome("ferrous_scrap", 3);
		trackExpenditure("e_waste", 2);
		finalizeTurnDeltas();

		const { summary } = collectTurnSummary(world, board, 2);

		expect(summary.turn).toBe(2);
		expect(summary.resourceChanges.length).toBeGreaterThan(0);

		const scr = summary.resourceChanges.find(
			(r) => r.material === "scrap_metal",
		);
		expect(scr).toBeDefined();
		expect(scr!.net).toBe(5);
		expect(scr!.shortName).toBe("SCR");

		const ews = summary.resourceChanges.find((r) => r.material === "e_waste");
		expect(ews).toBeDefined();
		expect(ews!.net).toBe(-2);
	});

	it("reports territory total", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();

		const { summary } = collectTurnSummary(world, board, 2);
		// Territory total should be a number (may be 0 on a tiny board with no player)
		expect(typeof summary.territoryTotal).toBe("number");
	});

	it("collects pending completions (empty when no jobs)", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();

		const { summary } = collectTurnSummary(world, board, 2);
		expect(Array.isArray(summary.pendingCompletions)).toBe(true);
	});

	it("clearTurnSummary resets to null", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();

		collectTurnSummary(world, board, 2);
		expect(getTurnSummary()).not.toBeNull();

		clearTurnSummary();
		expect(getTurnSummary()).toBeNull();
	});

	it("notifies subscribers on collection", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();

		let notified = false;
		const unsub = subscribeTurnSummary(() => {
			notified = true;
		});

		collectTurnSummary(world, board, 2);
		expect(notified).toBe(true);

		unsub();
	});

	it("notifies subscribers on clear", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();
		collectTurnSummary(world, board, 2);

		let notified = false;
		const unsub = subscribeTurnSummary(() => {
			notified = true;
		});

		clearTurnSummary();
		expect(notified).toBe(true);

		unsub();
	});

	it("resource changes are sorted by absolute net descending", () => {
		const { world, board } = makeWorld();

		trackIncome("scrap_metal", 1);
		trackIncome("ferrous_scrap", 10);
		trackIncome("e_waste", 5);
		finalizeTurnDeltas();

		const { summary } = collectTurnSummary(world, board, 2);
		const nets = summary.resourceChanges.map((r) => Math.abs(r.net));
		for (let i = 1; i < nets.length; i++) {
			expect(nets[i]).toBeLessThanOrEqual(nets[i - 1]!);
		}
	});

	it("limits resource changes to top 6", () => {
		const { world, board } = makeWorld();

		// Add income for all 13 materials
		const materials = [
			"ferrous_scrap",
			"alloy_stock",
			"polymer_salvage",
			"conductor_wire",
			"electrolyte",
			"silicon_wafer",
			"storm_charge",
			"el_crystal",
			"scrap_metal",
			"e_waste",
			"intact_components",
			"thermal_fluid",
			"depth_salvage",
		] as const;
		for (const mat of materials) {
			trackIncome(mat, 1);
		}
		finalizeTurnDeltas();

		const { summary } = collectTurnSummary(world, board, 2);
		expect(summary.resourceChanges.length).toBeLessThanOrEqual(6);
	});

	it("resetTurnSummary clears everything including territory baseline", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();
		collectTurnSummary(world, board, 2);

		resetTurnSummary();
		expect(getTurnSummary()).toBeNull();
		expect(getRivalMilestones()).toEqual([]);
	});
});

// ─── Rival milestone detection ──────────────────────────────────────────────

describe("detectRivalMilestones", () => {
	it("detects research milestone when rival completes a tech", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();

		// First collection — establish baseline (0 researched techs)
		collectTurnSummary(world, board, 2);

		// Now give reclaimers a completed tech
		for (const e of world.query(Faction, ResearchState)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") {
				e.set(ResearchState, {
					researchedTechs: "advanced_harvesting",
					currentTechId: "",
					progressPoints: 0,
				});
			}
		}

		resetResourceDeltas();
		finalizeTurnDeltas();
		const { milestones } = collectTurnSummary(world, board, 3);

		const researchMilestone = milestones.find(
			(m) => m.factionId === "reclaimers" && m.message.includes("ACHIEVED"),
		);
		expect(researchMilestone).toBeDefined();
		expect(researchMilestone!.factionName).toBe("RECLAIMERS");
	});

	it("does not report research milestone when count unchanged", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();

		// Baseline — reclaimers has 1 tech
		for (const e of world.query(Faction, ResearchState)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") {
				e.set(ResearchState, {
					researchedTechs: "advanced_harvesting",
					currentTechId: "",
					progressPoints: 0,
				});
			}
		}
		collectTurnSummary(world, board, 2);

		// Second call — no change to research
		resetResourceDeltas();
		finalizeTurnDeltas();
		const { milestones } = collectTurnSummary(world, board, 3);

		const researchMilestone = milestones.find(
			(m) => m.factionId === "reclaimers" && m.message.includes("ACHIEVED"),
		);
		expect(researchMilestone).toBeUndefined();
	});

	it("detects building milestone when rival gains +3 buildings", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();

		// Baseline
		collectTurnSummary(world, board, 2);

		// Add 3 buildings for reclaimers (triggers "+3 threshold")
		for (let i = 0; i < 3; i++) {
			world.spawn(
				Building({
					tileX: i,
					tileZ: 0,
					buildingType: "storage_hub",
					modelId: "storage_hub",
					factionId: "reclaimers",
					hp: 50,
					maxHp: 50,
				}),
			);
		}

		resetResourceDeltas();
		finalizeTurnDeltas();
		const { milestones } = collectTurnSummary(world, board, 3);

		const buildMilestone = milestones.find(
			(m) =>
				m.factionId === "reclaimers" && m.message.includes("INFRASTRUCTURE"),
		);
		expect(buildMilestone).toBeDefined();
		expect(buildMilestone!.message).toContain("STRUCTURES");
	});

	it("does not report building milestone for +2 buildings (below threshold)", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();

		// Baseline
		collectTurnSummary(world, board, 2);

		// Add only 2 buildings — not enough for milestone
		for (let i = 0; i < 2; i++) {
			world.spawn(
				Building({
					tileX: i,
					tileZ: 0,
					buildingType: "storage_hub",
					modelId: "storage_hub",
					factionId: "reclaimers",
					hp: 50,
					maxHp: 50,
				}),
			);
		}

		resetResourceDeltas();
		finalizeTurnDeltas();
		const { milestones } = collectTurnSummary(world, board, 3);

		const buildMilestone = milestones.find(
			(m) =>
				m.factionId === "reclaimers" && m.message.includes("INFRASTRUCTURE"),
		);
		expect(buildMilestone).toBeUndefined();
	});

	it("milestones include faction color", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();
		collectTurnSummary(world, board, 2);

		// Give reclaimers a tech
		for (const e of world.query(Faction, ResearchState)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") {
				e.set(ResearchState, {
					researchedTechs: "advanced_harvesting",
					currentTechId: "",
					progressPoints: 0,
				});
			}
		}

		resetResourceDeltas();
		finalizeTurnDeltas();
		const { milestones } = collectTurnSummary(world, board, 3);

		const ms = milestones.find((m) => m.factionId === "reclaimers");
		expect(ms).toBeDefined();
		expect(ms!.color).toBe("#f6c56a"); // reclaimers color
	});

	it("clearTurnSummary also clears milestones", () => {
		const { world, board } = makeWorld();
		finalizeTurnDeltas();
		collectTurnSummary(world, board, 2);

		// Generate a milestone
		for (const e of world.query(Faction, ResearchState)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") {
				e.set(ResearchState, {
					researchedTechs: "advanced_harvesting",
					currentTechId: "",
					progressPoints: 0,
				});
			}
		}
		resetResourceDeltas();
		finalizeTurnDeltas();
		collectTurnSummary(world, board, 3);
		expect(getRivalMilestones().length).toBeGreaterThan(0);

		clearTurnSummary();
		expect(getRivalMilestones()).toEqual([]);
	});
});
