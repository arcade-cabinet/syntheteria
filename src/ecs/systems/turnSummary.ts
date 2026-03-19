/**
 * Turn Summary — collects a snapshot of what happened during a turn.
 *
 * Called after advanceTurn() to gather resource deltas, combat results,
 * research progress, fabrication completions, territory changes, and
 * cult escalation events. Feeds the TurnSummaryPanel UI.
 *
 * Also detects AI faction milestones and emits rival announcements.
 */

import type { World } from "koota";
import type { GeneratedBoard } from "../../board/types";
import type { ResourceMaterial } from "../terrain/types";
import { getResourceDeltas, type ResourceDeltaMap } from "./resourceDeltaSystem";
import { getCompletedTurnLogs, type TurnEvent } from "./turnEventLog";
import { computeTerritory } from "./territorySystem";
import { getResearchState } from "./researchSystem";
import { TECH_BY_ID } from "../../config/techTreeDefs";
import { FabricationJob } from "./fabricationSystem";
import { SynthesisQueue, FUSION_RECIPES } from "./synthesisSystem";
import { Building, Powered } from "../traits/building";
import { Faction } from "../traits/faction";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResourceChange {
	material: string;
	shortName: string;
	net: number;
}

export interface CombatResult {
	message: string;
}

export interface TurnSummaryData {
	turn: number;
	/** Resource changes with non-zero net */
	resourceChanges: ResourceChange[];
	/** Territory tiles gained/lost this turn */
	territoryDelta: number;
	/** Current territory count for player */
	territoryTotal: number;
	/** Combat events that occurred */
	combats: CombatResult[];
	/** Research progress: tech name and turns remaining */
	researchProgress: { techName: string; turnsLeft: number } | null;
	/** Fabrication completions this turn */
	fabricationCompleted: string[];
	/** What completes next turn */
	pendingCompletions: string[];
	/** Cult events (spawns, escalation) */
	cultEvents: string[];
}

export interface RivalMilestone {
	factionId: string;
	factionName: string;
	message: string;
	color: string;
}

// ─── Short names ────────────────────────────────────────────────────────────

const SHORT_NAMES: Record<string, string> = {
	ferrous_scrap: "FER",
	alloy_stock: "ALY",
	polymer_salvage: "PLY",
	conductor_wire: "CND",
	electrolyte: "ELT",
	silicon_wafer: "SIL",
	storm_charge: "STM",
	el_crystal: "ELC",
	scrap_metal: "SCR",
	e_waste: "EWS",
	intact_components: "CMP",
	thermal_fluid: "THR",
	depth_salvage: "DEP",
};

const FACTION_DISPLAY: Record<string, { name: string; color: string }> = {
	reclaimers: { name: "RECLAIMERS", color: "#f6c56a" },
	volt_collective: { name: "VOLT COLLECTIVE", color: "#ffff66" },
	signal_choir: { name: "SIGNAL CHOIR", color: "#b088d8" },
	iron_creed: { name: "IRON CREED", color: "#ff8f8f" },
};

// ─── State ───────────────────────────────────────────────────────────────────

let lastTerritoryCount = 0;
let lastRivalResearchCounts = new Map<string, number>();
let lastRivalBuildingCounts = new Map<string, number>();
let lastRivalUnitCounts = new Map<string, number>();

const listeners = new Set<() => void>();
let currentSummary: TurnSummaryData | null = null;
let currentMilestones: RivalMilestone[] = [];

function notify() {
	for (const listener of listeners) listener();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Collect turn summary after advanceTurn() has completed.
 * Call this from main.tsx handleEndTurn, after advanceTurn and before UI updates.
 */
export function collectTurnSummary(
	world: World,
	board: GeneratedBoard,
	turn: number,
): { summary: TurnSummaryData; milestones: RivalMilestone[] } {
	const deltas = getResourceDeltas();
	const resourceChanges = collectResourceChanges(deltas);
	const territory = computeTerritory(world, board.config.width, board.config.height);
	const playerTerritory = territory.counts.get("player") ?? 0;
	const territoryDelta = playerTerritory - lastTerritoryCount;
	lastTerritoryCount = playerTerritory;

	const turnEvents = extractLastTurnEvents(turn);
	const combats = extractCombats(turnEvents);
	const cultEvents = extractCultEvents(turnEvents);
	const fabricationCompleted = extractFabricationCompletions(turnEvents);

	const researchProgress = getResearchProgressForPlayer(world);
	const pendingCompletions = collectPendingCompletions(world);
	const milestones = detectRivalMilestones(world, territory);

	const summary: TurnSummaryData = {
		turn,
		resourceChanges,
		territoryDelta,
		territoryTotal: playerTerritory,
		combats,
		researchProgress,
		fabricationCompleted,
		pendingCompletions,
		cultEvents,
	};

	currentSummary = summary;
	currentMilestones = milestones;
	notify();

	return { summary, milestones };
}

export function getTurnSummary(): TurnSummaryData | null {
	return currentSummary;
}

export function getRivalMilestones(): RivalMilestone[] {
	return currentMilestones;
}

export function subscribeTurnSummary(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function clearTurnSummary(): void {
	currentSummary = null;
	currentMilestones = [];
	notify();
}

export function resetTurnSummary(): void {
	currentSummary = null;
	currentMilestones = [];
	lastTerritoryCount = 0;
	lastRivalResearchCounts = new Map();
	lastRivalBuildingCounts = new Map();
	lastRivalUnitCounts = new Map();
}

// ─── Internals ───────────────────────────────────────────────────────────────

function collectResourceChanges(deltas: ResourceDeltaMap | null): ResourceChange[] {
	if (!deltas) return [];
	const changes: ResourceChange[] = [];
	for (const [mat, delta] of Object.entries(deltas)) {
		if (!delta || delta.net === 0) continue;
		changes.push({
			material: mat,
			shortName: SHORT_NAMES[mat] ?? mat.toUpperCase(),
			net: delta.net,
		});
	}
	// Sort by absolute value descending
	changes.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
	return changes.slice(0, 6); // Top 6 changes
}

function extractLastTurnEvents(turn: number): TurnEvent[] {
	const logs = getCompletedTurnLogs();
	// The just-completed turn's log
	const lastLog = logs.find((l) => l.turnNumber === turn - 1) ?? logs[logs.length - 1];
	return lastLog?.events ?? [];
}

function extractCombats(events: TurnEvent[]): CombatResult[] {
	return events
		.filter((e) => e.type === "combat" || e.type === "unit_destroyed")
		.map((e) => ({
			message: formatCombatEvent(e),
		}))
		.slice(0, 4); // Max 4 combat results in summary
}

function formatCombatEvent(e: TurnEvent): string {
	if (e.type === "unit_destroyed") {
		const modelId = (e.details.modelId as string) ?? "unit";
		return `${modelId.replace(/_/g, " ")} destroyed`;
	}
	const attacker = (e.details.attackerModel as string) ?? "attacker";
	const target = (e.details.targetModel as string) ?? "target";
	const damage = (e.details.damage as number) ?? 0;
	return `${attacker.replace(/_/g, " ")} hit ${target.replace(/_/g, " ")} for ${damage}`;
}

function extractCultEvents(events: TurnEvent[]): string[] {
	return events
		.filter((e) => e.type === "cultist_spawn" || e.type === "cultist_attack")
		.map((e) => {
			if (e.type === "cultist_spawn") {
				const count = (e.details.count as number) ?? 1;
				return `${count} cult mech${count > 1 ? "s" : ""} emerged`;
			}
			return "Cult forces attacking";
		})
		.slice(0, 3);
}

function extractFabricationCompletions(events: TurnEvent[]): string[] {
	return events
		.filter((e) => e.type === "fabrication" && e.details.completed)
		.map((e) => {
			const robotClass = (e.details.robotClass as string) ?? "unit";
			return robotClass.replace(/_/g, " ");
		});
}

function getResearchProgressForPlayer(world: World): { techName: string; turnsLeft: number } | null {
	const state = getResearchState(world, "player");
	if (!state || !state.currentTechId) return null;
	const tech = TECH_BY_ID.get(state.currentTechId);
	if (!tech) return null;
	return {
		techName: tech.name,
		turnsLeft: Math.max(0, tech.turnsToResearch - state.progressPoints),
	};
}

function collectPendingCompletions(world: World): string[] {
	const pending: string[] = [];

	// Fabrication: jobs completing next turn
	for (const e of world.query(FabricationJob)) {
		const job = e.get(FabricationJob);
		if (!job || job.factionId !== "player") continue;
		if (job.turnsRemaining === 1) {
			pending.push(`${job.robotClass.replace(/_/g, " ")} fabrication`);
		}
	}

	// Synthesis: jobs completing next turn
	for (const e of world.query(Building, SynthesisQueue)) {
		const b = e.get(Building);
		const sq = e.get(SynthesisQueue);
		if (!b || !sq || b.factionId !== "player") continue;
		if (sq.ticksRemaining === 1) {
			const recipe = FUSION_RECIPES.find((r) => r.id === sq.recipeId);
			pending.push(`${recipe?.label ?? sq.recipeId} synthesis`);
		}
	}

	// Research: tech completing next turn
	const research = getResearchProgressForPlayer(world);
	if (research && research.turnsLeft === 1) {
		pending.push(`${research.techName} research`);
	}

	return pending;
}

/**
 * Detect notable AI faction milestones by comparing current state
 * to the state from the previous turn.
 */
function detectRivalMilestones(
	world: World,
	territory: ReturnType<typeof computeTerritory>,
): RivalMilestone[] {
	const milestones: RivalMilestone[] = [];

	const rivalFactions = ["reclaimers", "volt_collective", "signal_choir", "iron_creed"];

	for (const fid of rivalFactions) {
		const display = FACTION_DISPLAY[fid];
		if (!display) continue;

		// Check research milestones
		const research = getResearchState(world, fid);
		const researchCount = research?.researchedTechs.length ?? 0;
		const prevResearch = lastRivalResearchCounts.get(fid) ?? 0;
		if (researchCount > prevResearch && researchCount > 0) {
			// Find what they just researched
			const latestTechId = research?.researchedTechs[researchCount - 1];
			const tech = latestTechId ? TECH_BY_ID.get(latestTechId) : null;
			if (tech) {
				milestones.push({
					factionId: fid,
					factionName: display.name,
					message: `${tech.name.toUpperCase()} ACHIEVED`,
					color: display.color,
				});
			}
		}
		lastRivalResearchCounts.set(fid, researchCount);

		// Check building milestones (new building types)
		let buildingCount = 0;
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b?.factionId === fid) buildingCount++;
		}
		const prevBuildings = lastRivalBuildingCounts.get(fid) ?? 0;
		// Report milestone on every 3rd building (significant expansion)
		if (buildingCount >= prevBuildings + 3) {
			milestones.push({
				factionId: fid,
				factionName: display.name,
				message: `INFRASTRUCTURE EXPANDING (${buildingCount} STRUCTURES)`,
				color: display.color,
			});
			lastRivalBuildingCounts.set(fid, buildingCount);
		} else if (buildingCount > prevBuildings) {
			lastRivalBuildingCounts.set(fid, buildingCount);
		}

		// Check territory milestones (crossing 10%, 20%, 30%...)
		const territoryPct = territory.totalTiles > 0
			? Math.floor(((territory.counts.get(fid) ?? 0) / territory.totalTiles) * 100)
			: 0;
		const prevTerritory = lastRivalUnitCounts.get(fid) ?? 0;
		const newThreshold = Math.floor(territoryPct / 10) * 10;
		const prevThreshold = Math.floor(prevTerritory / 10) * 10;
		if (newThreshold > prevThreshold && newThreshold >= 10) {
			milestones.push({
				factionId: fid,
				factionName: display.name,
				message: `TERRITORY CONTROL: ${territoryPct}%`,
				color: display.color,
			});
		}
		lastRivalUnitCounts.set(fid, territoryPct);
	}

	return milestones;
}
