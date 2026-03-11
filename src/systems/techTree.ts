/**
 * Tech tree progression system — DELEGATES to techResearch.ts.
 *
 * This module previously maintained its own state from config/technology.json
 * tiers. It now re-exports from techResearch.ts (the canonical system) and
 * provides compatibility shims for callers that expect the old TechNode shape.
 *
 * The TechNode type maps TechDefinition fields to the legacy interface so
 * existing UI and effect consumers continue to work.
 */

import {
	cancelResearch as _cancelResearch,
	getAvailableTechs as _getAvailableTechs,
	getResearchedTechs as _getResearchedTechs,
	getResearchProgress as _getResearchProgress,
	getTechNode as _getTechNode,
	getTechTree as _getTechTree,
	isResearched as _isResearched,
	startResearch as _startResearch,
	resetTechResearch,
	type TechDefinition,
} from "./techResearch";

// ---------------------------------------------------------------------------
// Legacy TechNode shape — adapts TechDefinition for existing consumers
// ---------------------------------------------------------------------------

export interface TechNode {
	id: string;
	name: string;
	description: string;
	tier: number;
	prerequisites: string[];
	cost: { cubes: number; time: number };
	unlocks: string[];
}

function toTechNode(def: TechDefinition): TechNode {
	return {
		id: def.id,
		name: def.name,
		description: def.description ?? `${def.name} (Tier ${def.tier})`,
		tier: def.tier,
		prerequisites: def.prerequisites,
		cost: { cubes: def.researchCost, time: def.researchCost * 2 },
		unlocks: def.effects.unlocks,
	};
}

// ---------------------------------------------------------------------------
// Re-exports with TechNode adaptation
// ---------------------------------------------------------------------------

export function getTechTree(): TechNode[] {
	return _getTechTree().map(toTechNode);
}

export function getTechNode(techId: string): TechNode | undefined {
	const def = _getTechNode(techId);
	return def ? toTechNode(def) : undefined;
}

export function isResearched(factionId: string, techId: string): boolean {
	return _isResearched(factionId, techId);
}

export function getAvailableTechs(factionId: string): TechNode[] {
	return _getAvailableTechs(factionId).map(toTechNode);
}

export function startResearch(factionId: string, techId: string): boolean {
	return _startResearch(factionId, techId);
}

export function getResearchProgress(
	factionId: string,
): { techId: string; progress: number; totalTime: number } | null {
	const p = _getResearchProgress(factionId);
	if (!p) return null;
	return { techId: p.techId, progress: p.progress, totalTime: p.cost };
}

export function getResearchedTechs(factionId: string): string[] {
	return _getResearchedTechs(factionId);
}

export function cancelResearch(factionId: string): string | null {
	return _cancelResearch(factionId);
}

export function resetTechTree(): void {
	resetTechResearch();
}

/**
 * @deprecated Use techResearchSystem from techResearch.ts instead.
 * This shim exists for backward compatibility with gameState.ts.
 */
export function updateResearch(
	factionId: string,
	_delta: number,
): string | null {
	// The old tick-based updateResearch is replaced by the compute-point-based
	// techResearchSystem. This shim is intentionally a no-op — callers should
	// migrate to techResearchSystem.
	void factionId;
	void _delta;
	return null;
}
