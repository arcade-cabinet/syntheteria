/**
 * Research System — tech tree progression through powered research labs.
 *
 * Each powered research lab contributes 1 research point per turn toward
 * the currently queued tech. When enough points accumulate, the tech is
 * completed and its effects are applied globally.
 *
 * Research state is per-faction, stored as an ECS trait on faction entities.
 * Tech prerequisites form a DAG validated at queue time.
 */

import type { World } from "koota";
import { trait } from "koota";
import { playSfx } from "../audio/sfx";
import type { TechDef, TechEffectType } from "../config/techTreeDefs";
import { TECH_BY_ID, TECH_TREE } from "../config/techTreeDefs";
import { Building, Faction, Powered } from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { pushToast } from "./toastNotifications";

// ─── Research State Trait ────────────────────────────────────────────────────

/**
 * Per-faction research state. Stored on the faction entity.
 * - researchedTechs: comma-separated tech IDs already completed
 * - currentTechId: tech being researched (empty = none)
 * - progressPoints: accumulated points toward current tech
 */
export const ResearchState = trait({
	/** Comma-separated IDs of completed techs. */
	researchedTechs: "",
	/** ID of the tech currently being researched. Empty = idle. */
	currentTechId: "",
	/** Research points accumulated toward current tech. */
	progressPoints: 0,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseResearched(str: string): string[] {
	if (!str) return [];
	return str.split(",");
}

function hasResearched(
	state: { researchedTechs: string },
	techId: string,
): boolean {
	return parseResearched(state.researchedTechs).includes(techId);
}

// ─── Query Functions ─────────────────────────────────────────────────────────

/**
 * Count powered research labs for a faction.
 */
export function countResearchLabs(world: World, factionId: string): number {
	let count = 0;
	for (const e of world.query(Building, Powered)) {
		const b = e.get(Building);
		if (b && b.buildingType === "research_lab" && b.factionId === factionId) {
			count++;
		}
	}
	return count;
}

/**
 * Get the current research state for a faction.
 * Returns null if the faction has no research state.
 */
export function getResearchState(
	world: World,
	factionId: string,
): {
	researchedTechs: string[];
	currentTechId: string;
	progressPoints: number;
	labCount: number;
} | null {
	for (const e of world.query(Faction, ResearchState)) {
		const f = e.get(Faction);
		if (f?.id === factionId) {
			const rs = e.get(ResearchState);
			if (!rs) continue;
			return {
				researchedTechs: parseResearched(rs.researchedTechs),
				currentTechId: rs.currentTechId,
				progressPoints: rs.progressPoints,
				labCount: countResearchLabs(world, factionId),
			};
		}
	}
	return null;
}

/**
 * Get techs available for research (prerequisites met, not yet researched).
 */
export function getAvailableTechs(world: World, factionId: string): TechDef[] {
	const state = getResearchState(world, factionId);
	if (!state) return [];

	const researched = new Set(state.researchedTechs);
	return TECH_TREE.filter((tech) => {
		if (researched.has(tech.id)) return false;
		return tech.prerequisites.every((prereq) => researched.has(prereq));
	});
}

/**
 * Check if a tech has been researched by a faction.
 */
export function isTechResearched(
	world: World,
	factionId: string,
	techId: string,
): boolean {
	for (const e of world.query(Faction, ResearchState)) {
		const f = e.get(Faction);
		if (f?.id !== factionId) continue;
		const rs = e.get(ResearchState);
		if (!rs) continue;
		return hasResearched(rs, techId);
	}
	return false;
}

/**
 * Check if a faction has a specific tech effect active.
 */
export function hasTechEffect(
	world: World,
	factionId: string,
	effectType: TechEffectType,
): boolean {
	for (const e of world.query(Faction, ResearchState)) {
		const f = e.get(Faction);
		if (f?.id !== factionId) continue;
		const rs = e.get(ResearchState);
		if (!rs) continue;
		const researched = parseResearched(rs.researchedTechs);
		for (const techId of researched) {
			const tech = TECH_BY_ID.get(techId);
			if (tech?.effects.some((eff) => eff.type === effectType)) return true;
		}
	}
	return false;
}

/**
 * Get the total value of a specific tech effect across all researched techs.
 */
export function getTechEffectValue(
	world: World,
	factionId: string,
	effectType: TechEffectType,
): number {
	let total = 0;
	for (const e of world.query(Faction, ResearchState)) {
		const f = e.get(Faction);
		if (f?.id !== factionId) continue;
		const rs = e.get(ResearchState);
		if (!rs) continue;
		const researched = parseResearched(rs.researchedTechs);
		for (const techId of researched) {
			const tech = TECH_BY_ID.get(techId);
			if (!tech) continue;
			for (const eff of tech.effects) {
				if (eff.type === effectType) total += eff.value;
			}
		}
	}
	return total;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type QueueResearchResult =
	| { ok: true }
	| {
			ok: false;
			reason:
				| "no_faction"
				| "already_researching"
				| "already_researched"
				| "prerequisites_not_met"
				| "no_such_tech";
	  };

/**
 * Queue a tech for research. Only one tech can be researched at a time.
 */
export function queueResearch(
	world: World,
	factionId: string,
	techId: string,
): QueueResearchResult {
	const tech = TECH_BY_ID.get(techId);
	if (!tech) return { ok: false, reason: "no_such_tech" };

	for (const e of world.query(Faction, ResearchState)) {
		const f = e.get(Faction);
		if (f?.id !== factionId) continue;
		const rs = e.get(ResearchState);
		if (!rs) continue;

		if (rs.currentTechId) return { ok: false, reason: "already_researching" };
		if (hasResearched(rs, techId))
			return { ok: false, reason: "already_researched" };

		// Check prerequisites
		const researched = parseResearched(rs.researchedTechs);
		for (const prereq of tech.prerequisites) {
			if (!researched.includes(prereq)) {
				return { ok: false, reason: "prerequisites_not_met" };
			}
		}

		e.set(ResearchState, { ...rs, currentTechId: techId, progressPoints: 0 });
		return { ok: true };
	}

	return { ok: false, reason: "no_faction" };
}

/**
 * Cancel the current research. Progress is lost.
 */
export function cancelResearch(world: World, factionId: string): boolean {
	for (const e of world.query(Faction, ResearchState)) {
		const f = e.get(Faction);
		if (f?.id !== factionId) continue;
		const rs = e.get(ResearchState);
		if (!rs || !rs.currentTechId) continue;
		e.set(ResearchState, { ...rs, currentTechId: "", progressPoints: 0 });
		return true;
	}
	return false;
}

// ─── Per-Turn Processing ─────────────────────────────────────────────────────

/**
 * Run research for all factions. Called each turn during the environment phase.
 * Each powered research lab contributes 1 research point per turn.
 * Returns the number of techs completed this turn.
 */
export function runResearch(world: World): number {
	let completed = 0;

	for (const e of world.query(Faction, ResearchState)) {
		const f = e.get(Faction);
		const rs = e.get(ResearchState);
		if (!f?.id || !rs || !rs.currentTechId) continue;

		const tech = TECH_BY_ID.get(rs.currentTechId);
		if (!tech) continue;

		const labCount = countResearchLabs(world, f.id);
		if (labCount === 0) continue;

		const newPoints = rs.progressPoints + labCount;

		if (newPoints >= tech.turnsToResearch) {
			// Research complete
			const researched = rs.researchedTechs
				? `${rs.researchedTechs},${tech.id}`
				: tech.id;
			e.set(ResearchState, {
				researchedTechs: researched,
				currentTechId: "",
				progressPoints: 0,
			});
			completed++;
			pushTurnEvent(`Research complete: ${tech.name}`);
			playSfx("build_complete");
			pushToast(
				"system",
				`TECHNOLOGY UNLOCKED: ${tech.name.toUpperCase()}`,
				tech.description.toUpperCase(),
			);
		} else {
			e.set(ResearchState, { ...rs, progressPoints: newPoints });
		}
	}

	return completed;
}
