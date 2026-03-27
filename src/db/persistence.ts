/**
 * persistence.ts — High-level save/load orchestrator.
 *
 * SQLite is NON-FATAL: if the DB fails, the game continues from ECS in memory.
 * All public methods catch errors and return success/failure booleans.
 */

import type { World } from "koota";
import type { SqliteAdapter } from "./adapter";
import { GameRepo } from "./gameRepo";
import { runMigrations } from "./migrations";
import {
	applyBuildings,
	applyResources,
	applyUnits,
	serializeBuildings,
	serializeResources,
	serializeScavengePoints,
	serializeUnits,
} from "./serialize";
import type { GameSummary } from "./types";

let repo: GameRepo | null = null;
let adapter: SqliteAdapter | null = null;
let available = false;

/** Initialize the persistence layer. Non-fatal on failure. */
export async function initPersistence(db: SqliteAdapter): Promise<boolean> {
	try {
		await runMigrations(db);
		repo = new GameRepo(db);
		adapter = db;
		available = true;
		return true;
	} catch (err) {
		console.error("[persistence] DB init failed, save/load unavailable:", err);
		available = false;
		return false;
	}
}

/** Is save/load currently available? */
export function isPersistenceAvailable(): boolean {
	return available;
}

/** Save the full game state to SQLite. Returns the save ID or null on failure. */
export async function saveGame(
	world: World,
	seed: string,
	difficulty: "easy" | "normal" | "hard",
	elapsedTicks: number,
	gameSpeed: number,
): Promise<string | null> {
	if (!repo || !available) {
		console.warn("[persistence] Save skipped — DB not available");
		return null;
	}

	try {
		const gameId = await repo.createGame(
			seed,
			difficulty,
			elapsedTicks,
			gameSpeed,
		);

		const units = serializeUnits(world, gameId);
		const { buildings, rods } = serializeBuildings(world, gameId);
		const resources = serializeResources(gameId);
		const scavengePoints = serializeScavengePoints(gameId);

		await repo.saveUnits(gameId, units);
		await repo.saveBuildings(gameId, buildings);
		await repo.saveLightningRods(gameId, rods);
		await repo.saveResources(gameId, resources);
		await repo.saveScavengePoints(gameId, scavengePoints);

		if (import.meta.env.DEV) {
			console.log(
				`[persistence] Saved game ${gameId}: ${units.length} units, ${buildings.length} buildings`,
			);
		}
		return gameId;
	} catch (err) {
		console.error("[persistence] Save failed:", err);
		return null;
	}
}

/** Load a saved game into the ECS world. Returns true on success. */
export async function loadGame(world: World, gameId: string): Promise<boolean> {
	if (!repo || !available) {
		console.warn("[persistence] Load skipped — DB not available");
		return false;
	}

	try {
		const game = await repo.getGame(gameId);
		if (!game) {
			console.error(`[persistence] Game ${gameId} not found`);
			return false;
		}

		const units = await repo.loadUnits(gameId);
		const buildings = await repo.loadBuildings(gameId);
		const rods = await repo.loadLightningRods(gameId);
		const resources = await repo.loadResources(gameId);

		applyUnits(world, units);
		applyBuildings(world, buildings, rods);
		if (resources) applyResources(resources);

		if (import.meta.env.DEV) {
			console.log(
				`[persistence] Loaded game ${gameId}: ${units.length} units, ${buildings.length} buildings, tick ${game.elapsedTicks}`,
			);
		}
		return true;
	} catch (err) {
		console.error("[persistence] Load failed:", err);
		return false;
	}
}

/** List available saves. Returns empty array on failure. */
export async function listSaves(): Promise<GameSummary[]> {
	if (!repo || !available) return [];
	try {
		return await repo.listGames();
	} catch (err) {
		console.error("[persistence] List saves failed:", err);
		return [];
	}
}

/** Delete a save. Returns true on success. */
export async function deleteSave(gameId: string): Promise<boolean> {
	if (!repo || !available) return false;
	try {
		await repo.deleteGame(gameId);
		return true;
	} catch (err) {
		console.error("[persistence] Delete failed:", err);
		return false;
	}
}

/** Shut down the persistence layer. */
export async function closePersistence(): Promise<void> {
	if (adapter) {
		try {
			await adapter.close();
		} catch (e) {
			// Non-fatal: DB close may fail if already closed
			console.warn("[persistence] close error:", e);
		}
		adapter = null;
		repo = null;
		available = false;
	}
}
