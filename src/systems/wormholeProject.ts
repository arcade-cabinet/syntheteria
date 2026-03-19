/**
 * Wormhole Project — endgame victory path through stabilizer construction.
 *
 * Requirements to start:
 *   - Both tier-5 techs researched (mark_v_transcendence + wormhole_stabilization)
 *   - Can afford 50 advanced materials (intact_components, storm_charge, etc.)
 *   - Building placed at map center (within 3 tiles of center)
 *
 * When construction starts:
 *   - All factions are notified (toast + turn event)
 *   - 20-turn countdown begins
 *   - Building must survive — if destroyed, project fails
 *   - On completion: wormhole victory
 *
 * The Wormhole Stabilizer is placed via the normal build system
 * (confirmBuildPlacement). This module tracks the project timer
 * and checks completion/destruction.
 */

import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import { WORMHOLE_PROJECT_TURNS } from "../config/gameDefaults";
import { Board, Building } from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { isTechResearched } from "./researchSystem";
import { pushToast } from "./toastNotifications";

// ─── Types ──────────────────────────────────────────────────────────────────

export type WormholeProjectState =
	| { status: "inactive" }
	| {
			status: "building";
			turnsRemaining: number;
			buildingEntityId: number;
			startTurn: number;
	  }
	| { status: "completed"; completionTurn: number }
	| { status: "destroyed" };

// ─── Module state ───────────────────────────────────────────────────────────

let projectState: WormholeProjectState = { status: "inactive" };

// ─── Required techs ─────────────────────────────────────────────────────────

const REQUIRED_TIER5_TECHS = [
	"mark_v_transcendence",
	"wormhole_stabilization",
] as const;

/** Max manhattan distance from board center for valid placement. */
const CENTER_PLACEMENT_RADIUS = 3;

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Check if a faction has all prerequisites to build the Wormhole Stabilizer.
 */
export function canStartWormholeProject(
	world: World,
	factionId: string,
): boolean {
	// Must not already be active or completed
	if (projectState.status === "building" || projectState.status === "completed")
		return false;

	// Both tier-5 techs required
	for (const techId of REQUIRED_TIER5_TECHS) {
		if (!isTechResearched(world, factionId, techId)) return false;
	}

	return true;
}

/**
 * Check if a tile is valid for wormhole stabilizer placement (near center).
 */
export function isValidWormholePlacement(
	world: World,
	tileX: number,
	tileZ: number,
): boolean {
	const center = getBoardCenter(world);
	if (!center) return false;

	const dist = Math.abs(tileX - center.x) + Math.abs(tileZ - center.z);
	return dist <= CENTER_PLACEMENT_RADIUS;
}

// ─── Actions ────────────────────────────────────────────────────────────────

/**
 * Called when a wormhole_stabilizer building is placed.
 * Starts the project countdown and notifies all factions.
 */
export function onWormholeStabilizerPlaced(
	world: World,
	buildingEntityId: number,
	factionId: string,
): void {
	const turn = readCurrentTurn(world);

	projectState = {
		status: "building",
		turnsRemaining: WORMHOLE_PROJECT_TURNS,
		buildingEntityId,
		startTurn: turn,
	};

	// Notify everyone — this is a global event
	pushTurnEvent(`WORMHOLE STABILIZER CONSTRUCTION BEGUN by ${factionId}`);
	pushToast(
		"system",
		"WORMHOLE STABILIZER INITIATED",
		`${WORMHOLE_PROJECT_TURNS} CYCLES TO COMPLETION — ALL FACTIONS ALERTED`,
	);
	playSfx("build_complete");
}

// ─── Per-Turn Processing ────────────────────────────────────────────────────

export type WormholeTickResult =
	| { event: "none" }
	| { event: "progress"; turnsRemaining: number }
	| { event: "completed" }
	| { event: "destroyed" };

/**
 * Process wormhole project each turn. Called during environment phase.
 *
 * Checks if the stabilizer building still exists, decrements timer,
 * and triggers completion or destruction.
 */
export function tickWormholeProject(world: World): WormholeTickResult {
	if (projectState.status !== "building") return { event: "none" };

	// Check if the building still exists
	let buildingAlive = false;
	for (const e of world.query(Building)) {
		if (e.id() === projectState.buildingEntityId) {
			const b = e.get(Building);
			if (b && b.buildingType === "wormhole_stabilizer") {
				buildingAlive = true;
			}
			break;
		}
	}

	if (!buildingAlive) {
		projectState = { status: "destroyed" };
		pushTurnEvent("WORMHOLE STABILIZER DESTROYED — project failed");
		pushToast("combat", "WORMHOLE STABILIZER DESTROYED", "PROJECT TERMINATED");
		playSfx("attack_hit");
		return { event: "destroyed" };
	}

	// Decrement timer
	const newRemaining = projectState.turnsRemaining - 1;

	if (newRemaining <= 0) {
		const completionTurn = readCurrentTurn(world);
		projectState = { status: "completed", completionTurn };
		pushTurnEvent("WORMHOLE STABILIZER COMPLETE — wormhole victory achieved");
		pushToast(
			"system",
			"WORMHOLE STABILIZED",
			"THE PATH IS OPEN — VICTORY THROUGH TRANSCENDENCE",
		);
		playSfx("build_complete");
		return { event: "completed" };
	}

	projectState = { ...projectState, turnsRemaining: newRemaining };

	// Periodic progress notifications
	if (newRemaining % 5 === 0 || newRemaining <= 3) {
		pushTurnEvent(`Wormhole Stabilizer: ${newRemaining} cycles remaining`);
		pushToast(
			"system",
			"STABILIZER PROGRESS",
			`${newRemaining} CYCLES REMAINING`,
		);
	}

	return { event: "progress", turnsRemaining: newRemaining };
}

// ─── Query ──────────────────────────────────────────────────────────────────

/** Get current wormhole project state. */
export function getWormholeProjectState(): WormholeProjectState {
	return projectState;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBoardCenter(world: World): { x: number; z: number } | null {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return { x: Math.floor(b.width / 2), z: Math.floor(b.height / 2) };
	}
	return null;
}

function readCurrentTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

/** Reset module state — for tests. */
export function _resetWormholeProject(): void {
	projectState = { status: "inactive" };
}
