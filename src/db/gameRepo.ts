/**
 * Game repository — CRUD operations on save data.
 * All methods are async-compatible (adapter may be sync or async).
 */
import type { SqliteAdapter } from "./adapter";
import type {
	BuildingRecord,
	GameRecord,
	GameSummary,
	LightningRodRecord,
	ResourcePoolRecord,
	ScavengePointRecord,
	UnitRecord,
} from "./types";

let idCounter = 0;
function generateId(): string {
	return `save_${Date.now()}_${idCounter++}`;
}

export class GameRepo {
	constructor(private db: SqliteAdapter) {}

	// ─── Games ────────────────────────────────────────────────────────────────

	async createGame(
		seed: string,
		difficulty: "easy" | "normal" | "hard",
		elapsedTicks: number,
		gameSpeed: number,
	): Promise<string> {
		const id = generateId();
		const now = new Date().toISOString();
		await this.db.run(
			`INSERT INTO games (id, seed, difficulty, elapsed_ticks, game_speed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[id, seed, difficulty, elapsedTicks, gameSpeed, now, now],
		);
		return id;
	}

	async updateGame(
		gameId: string,
		elapsedTicks: number,
		gameSpeed: number,
	): Promise<void> {
		const now = new Date().toISOString();
		await this.db.run(
			"UPDATE games SET elapsed_ticks = ?, game_speed = ?, updated_at = ? WHERE id = ?",
			[elapsedTicks, gameSpeed, now, gameId],
		);
	}

	async getGame(id: string): Promise<GameRecord | null> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM games WHERE id = ?",
			[id],
		);
		if (rows.length === 0) return null;
		return rowToGame(rows[0]!);
	}

	async listGames(): Promise<GameSummary[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT id, seed, difficulty, elapsed_ticks, created_at FROM games ORDER BY updated_at DESC",
		);
		return rows.map(rowToSummary);
	}

	async deleteGame(gameId: string): Promise<void> {
		for (const table of [
			"scavenge_points",
			"resources",
			"lightning_rods",
			"buildings",
			"units",
			"games",
		]) {
			const col = table === "games" ? "id" : "game_id";
			await this.db.run(`DELETE FROM ${table} WHERE ${col} = ?`, [gameId]);
		}
	}

	// ─── Units ────────────────────────────────────────────────────────────────

	async saveUnits(gameId: string, units: UnitRecord[]): Promise<void> {
		await this.db.run("DELETE FROM units WHERE game_id = ?", [gameId]);
		for (const u of units) {
			await this.db.run(
				`INSERT INTO units (id, game_id, entity_id, unit_type, display_name, faction, x, y, z, speed, fragment_id, components_json, path_json, path_index, moving)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					u.id,
					gameId,
					u.entityId,
					u.unitType,
					u.displayName,
					u.faction,
					u.x,
					u.y,
					u.z,
					u.speed,
					u.fragmentId,
					u.componentsJson,
					u.pathJson,
					u.pathIndex,
					u.moving ? 1 : 0,
				],
			);
		}
	}

	async loadUnits(gameId: string): Promise<UnitRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM units WHERE game_id = ?",
			[gameId],
		);
		return rows.map(rowToUnit);
	}

	// ─── Buildings ────────────────────────────────────────────────────────────

	async saveBuildings(
		gameId: string,
		buildings: BuildingRecord[],
	): Promise<void> {
		await this.db.run("DELETE FROM buildings WHERE game_id = ?", [gameId]);
		for (const b of buildings) {
			await this.db.run(
				`INSERT INTO buildings (id, game_id, entity_id, building_type, faction, x, y, z, powered, operational, fragment_id, building_components_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					b.id,
					gameId,
					b.entityId,
					b.buildingType,
					b.faction,
					b.x,
					b.y,
					b.z,
					b.powered ? 1 : 0,
					b.operational ? 1 : 0,
					b.fragmentId,
					b.buildingComponentsJson,
				],
			);
		}
	}

	async loadBuildings(gameId: string): Promise<BuildingRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM buildings WHERE game_id = ?",
			[gameId],
		);
		return rows.map(rowToBuilding);
	}

	// ─── Lightning Rods ───────────────────────────────────────────────────────

	async saveLightningRods(
		gameId: string,
		rods: LightningRodRecord[],
	): Promise<void> {
		await this.db.run("DELETE FROM lightning_rods WHERE game_id = ?", [gameId]);
		for (const r of rods) {
			await this.db.run(
				`INSERT INTO lightning_rods (building_id, game_id, rod_capacity, current_output, protection_radius)
         VALUES (?, ?, ?, ?, ?)`,
				[
					r.buildingId,
					gameId,
					r.rodCapacity,
					r.currentOutput,
					r.protectionRadius,
				],
			);
		}
	}

	async loadLightningRods(gameId: string): Promise<LightningRodRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM lightning_rods WHERE game_id = ?",
			[gameId],
		);
		return rows.map(rowToLightningRod);
	}

	// ─── Resources ────────────────────────────────────────────────────────────

	async saveResources(gameId: string, pool: ResourcePoolRecord): Promise<void> {
		await this.db.run(
			`INSERT OR REPLACE INTO resources (game_id, scrap_metal, circuitry, power_cells, durasteel)
       VALUES (?, ?, ?, ?, ?)`,
			[
				gameId,
				pool.scrapMetal,
				pool.circuitry,
				pool.powerCells,
				pool.durasteel,
			],
		);
	}

	async loadResources(gameId: string): Promise<ResourcePoolRecord | null> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM resources WHERE game_id = ?",
			[gameId],
		);
		if (rows.length === 0) return null;
		return rowToResources(rows[0]!);
	}

	// ─── Scavenge Points ──────────────────────────────────────────────────────

	async saveScavengePoints(
		gameId: string,
		points: ScavengePointRecord[],
	): Promise<void> {
		await this.db.run("DELETE FROM scavenge_points WHERE game_id = ?", [
			gameId,
		]);
		for (const p of points) {
			await this.db.run(
				`INSERT INTO scavenge_points (game_id, x, z, remaining, resource_type, amount_per_scavenge)
         VALUES (?, ?, ?, ?, ?, ?)`,
				[gameId, p.x, p.z, p.remaining, p.resourceType, p.amountPerScavenge],
			);
		}
	}

	async loadScavengePoints(gameId: string): Promise<ScavengePointRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM scavenge_points WHERE game_id = ?",
			[gameId],
		);
		return rows.map(rowToScavengePoint);
	}
}

// ─── Row mappers ────────────────────────────────────────────────────────────

function rowToGame(row: Record<string, unknown>): GameRecord {
	return {
		id: String(row.id),
		seed: String(row.seed),
		difficulty: String(row.difficulty) as "easy" | "normal" | "hard",
		elapsedTicks: Number(row.elapsed_ticks),
		gameSpeed: Number(row.game_speed),
		createdAt: String(row.created_at),
		updatedAt: String(row.updated_at),
	};
}

function rowToSummary(row: Record<string, unknown>): GameSummary {
	return {
		id: String(row.id),
		seed: String(row.seed),
		difficulty: String(row.difficulty),
		elapsedTicks: Number(row.elapsed_ticks),
		createdAt: String(row.created_at),
	};
}

function rowToUnit(row: Record<string, unknown>): UnitRecord {
	return {
		id: String(row.id),
		gameId: String(row.game_id),
		entityId: String(row.entity_id),
		unitType: String(row.unit_type),
		displayName: String(row.display_name),
		faction: String(row.faction),
		x: Number(row.x),
		y: Number(row.y),
		z: Number(row.z),
		speed: Number(row.speed),
		fragmentId: String(row.fragment_id),
		componentsJson: String(row.components_json),
		pathJson: String(row.path_json),
		pathIndex: Number(row.path_index),
		moving: Number(row.moving) === 1,
	};
}

function rowToBuilding(row: Record<string, unknown>): BuildingRecord {
	return {
		id: String(row.id),
		gameId: String(row.game_id),
		entityId: String(row.entity_id),
		buildingType: String(row.building_type),
		faction: String(row.faction),
		x: Number(row.x),
		y: Number(row.y),
		z: Number(row.z),
		powered: Number(row.powered) === 1,
		operational: Number(row.operational) === 1,
		fragmentId: String(row.fragment_id),
		buildingComponentsJson: String(row.building_components_json),
	};
}

function rowToLightningRod(row: Record<string, unknown>): LightningRodRecord {
	return {
		buildingId: String(row.building_id),
		gameId: String(row.game_id),
		rodCapacity: Number(row.rod_capacity),
		currentOutput: Number(row.current_output),
		protectionRadius: Number(row.protection_radius),
	};
}

function rowToResources(row: Record<string, unknown>): ResourcePoolRecord {
	return {
		gameId: String(row.game_id),
		scrapMetal: Number(row.scrap_metal),
		circuitry: Number(row.circuitry),
		powerCells: Number(row.power_cells),
		durasteel: Number(row.durasteel),
	};
}

function rowToScavengePoint(row: Record<string, unknown>): ScavengePointRecord {
	return {
		gameId: String(row.game_id),
		x: Number(row.x),
		z: Number(row.z),
		remaining: Number(row.remaining),
		resourceType: String(row.resource_type),
		amountPerScavenge: Number(row.amount_per_scavenge),
	};
}
