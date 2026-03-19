/**
 * Unified specialization track registry.
 *
 * Maps every trackId to its robot class, label, description, actions,
 * stat mods (for ranged tracks), and the tech IDs that gate/upgrade it.
 * Single source of truth consumed by fabrication, AI, UI, and save/load.
 */

import type { ClassActionDef } from "../classActions";
import type { RobotClass } from "../types";

import { SCOUT_TRACKS, SCOUT_TRACK_TECHS, getTrackActions as getScoutActions } from "./scoutTracks";
import { INFANTRY_TRACKS, INFANTRY_TRACK_TECHS, getInfantryTrackActions } from "./infantryTracks";
import { CAVALRY_TRACKS, CAVALRY_TRACK_TECHS, getTrackActions as getCavalryActions } from "./cavalryTracks";
import { RANGED_TRACKS, RANGED_SPEC_TECHS, getRangedTrackActions } from "./rangedTracks";
import { SUPPORT_TRACKS, SUPPORT_TRACK_TECHS, getTrackActions as getSupportActions } from "./supportTracks";
import { WORKER_TRACKS, WORKER_TRACK_TECHS, getWorkerTrackActions } from "./workerTracks";
import type { TechDef } from "../../../config/techTreeDefs";

// ─── Track Entry ────────────────────────────────────────────────────────────

export interface TrackEntry {
	readonly trackId: string;
	readonly robotClass: RobotClass;
	readonly label: string;
	readonly description: string;
	/** Tech ID that must be researched to unlock this track (gate tech). */
	readonly gateTechId: string;
	/** Tech ID that upgrades this track to v2. */
	readonly v2TechId: string;
	/** Stat modifiers applied at fabrication (ranged tracks only). */
	readonly statMods?: Readonly<Record<string, number>>;
	/** v2 stat modifiers (ranged tracks only). */
	readonly v2StatMods?: Readonly<Record<string, number>>;
}

// ─── Build Registry ─────────────────────────────────────────────────────────

function buildRegistry(): ReadonlyMap<string, TrackEntry> {
	const map = new Map<string, TrackEntry>();

	// Scout: 2 tracks
	for (const [id, def] of Object.entries(SCOUT_TRACKS)) {
		map.set(id, {
			trackId: id,
			robotClass: "scout",
			label: def.label,
			description: def.description,
			gateTechId: SCOUT_TRACK_TECHS[0]!.id,
			v2TechId: SCOUT_TRACK_TECHS[1]!.id,
		});
	}

	// Infantry: 2 tracks
	for (const [id, def] of Object.entries(INFANTRY_TRACKS)) {
		map.set(id, {
			trackId: id,
			robotClass: "infantry",
			label: def.label,
			description: def.description,
			gateTechId: INFANTRY_TRACK_TECHS[0]!.id,
			v2TechId: INFANTRY_TRACK_TECHS[1]!.id,
		});
	}

	// Cavalry: 2 tracks
	for (const [id, def] of Object.entries(CAVALRY_TRACKS)) {
		map.set(id, {
			trackId: id,
			robotClass: "cavalry",
			label: def.label,
			description: def.description,
			gateTechId: CAVALRY_TRACK_TECHS[0]!.id,
			v2TechId: CAVALRY_TRACK_TECHS[1]!.id,
		});
	}

	// Ranged: 2 tracks (with stat mods)
	for (const [id, def] of Object.entries(RANGED_TRACKS)) {
		map.set(id, {
			trackId: id,
			robotClass: "ranged",
			label: def.label,
			description: def.description,
			gateTechId: RANGED_SPEC_TECHS.find(t => t.id === (id === "sniper" ? "precision_targeting" : "area_suppression"))!.id,
			v2TechId: "", // ranged v2 uses existing mark_iv + prereqs
			statMods: def.statMods as Record<string, number>,
			v2StatMods: def.v2.statMods as Record<string, number>,
		});
	}

	// Support: 3 tracks
	for (const [id, def] of Object.entries(SUPPORT_TRACKS)) {
		map.set(id, {
			trackId: id,
			robotClass: "support",
			label: def.label,
			description: def.description,
			gateTechId: SUPPORT_TRACK_TECHS[0]!.id,
			v2TechId: SUPPORT_TRACK_TECHS[1]!.id,
		});
	}

	// Worker: 3 tracks
	for (const [id, def] of Object.entries(WORKER_TRACKS)) {
		map.set(id, {
			trackId: id,
			robotClass: "worker",
			label: def.label,
			description: def.description,
			gateTechId: WORKER_TRACK_TECHS[0]!.id,
			v2TechId: WORKER_TRACK_TECHS[1]!.id,
		});
	}

	return map;
}

export const TRACK_REGISTRY: ReadonlyMap<string, TrackEntry> = buildRegistry();

// ─── Query Helpers ──────────────────────────────────────────────────────────

/** Get all track entries for a given robot class. */
export function getTracksForClass(robotClass: RobotClass): TrackEntry[] {
	const result: TrackEntry[] = [];
	for (const entry of TRACK_REGISTRY.values()) {
		if (entry.robotClass === robotClass) result.push(entry);
	}
	return result;
}

/** Get the actions granted by a specialization track. */
export function getSpecializedActions(trackId: string): readonly ClassActionDef[] {
	const entry = TRACK_REGISTRY.get(trackId);
	if (!entry) return [];

	switch (entry.robotClass) {
		case "scout": return getScoutActions(trackId as "pathfinder" | "infiltrator");
		case "infantry": return getInfantryTrackActions(trackId as "vanguard" | "shock_trooper");
		case "cavalry": return getCavalryActions(trackId as "flanker" | "interceptor");
		case "ranged": return getRangedTrackActions(trackId as "sniper" | "suppressor");
		case "support": return getSupportActions(trackId as "field_medic" | "signal_booster" | "war_caller");
		case "worker": return getWorkerTrackActions(trackId as "deep_miner" | "fabricator" | "salvager");
		default: return [];
	}
}

/** Collect all track-related techs from all 6 class files. */
export function getAllTrackTechs(): readonly TechDef[] {
	return [
		...SCOUT_TRACK_TECHS,
		...INFANTRY_TRACK_TECHS,
		...CAVALRY_TRACK_TECHS,
		...RANGED_SPEC_TECHS,
		...SUPPORT_TRACK_TECHS,
		...WORKER_TRACK_TECHS,
	];
}
