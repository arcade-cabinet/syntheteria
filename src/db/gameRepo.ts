import { randomUUID } from "../lib/uuid";
import type { SqliteAdapter } from "./adapter";
import type {
	BuildingRecord,
	CampaignStatisticsRecord,
	EventRecord,
	ExploredRecord,
	FactionResourceSnapshotRecord,
	GameRecord,
	GameSummary,
	ResourceRecord,
	TileRecord,
	TileResourceRecord,
	TurnEventLogRecord,
	TurnSnapshotRecord,
	UnitRecord,
} from "./types";

export class GameRepo {
	constructor(private db: SqliteAdapter) {}

	async createGame(
		seed: string,
		boardW: number,
		boardH: number,
		difficulty: "easy" | "normal" | "hard",
		tileSizeM = 2.0,
		opts?: {
			climateProfile?: string;
			stormProfile?: string;
			gameDifficulty?: string;
			factionSlots?: string;
		},
	): Promise<string> {
		const id = randomUUID();
		const now = new Date().toISOString();
		await this.db.run(
			`INSERT INTO games (id, seed, board_w, board_h, tile_size_m, difficulty, turn, climate_profile, storm_profile, game_difficulty, faction_slots, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				seed,
				boardW,
				boardH,
				tileSizeM,
				difficulty,
				opts?.climateProfile ?? "temperate",
				opts?.stormProfile ?? "volatile",
				opts?.gameDifficulty ?? "standard",
				opts?.factionSlots ?? "[]",
				now,
				now,
			],
		);
		return id;
	}

	async updateTurn(gameId: string, turn: number): Promise<void> {
		const now = new Date().toISOString();
		await this.db.run(
			"UPDATE games SET turn = ?, updated_at = ? WHERE id = ?",
			[turn, now, gameId],
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
			"SELECT id, seed, board_w, board_h, difficulty, turn, created_at FROM games ORDER BY created_at DESC",
		);
		return rows.map(rowToSummary);
	}

	async saveTiles(gameId: string, tiles: TileRecord[]): Promise<void> {
		for (const t of tiles) {
			await this.db.run(
				"INSERT OR REPLACE INTO tiles (game_id, x, z, zone, elevation, passable) VALUES (?, ?, ?, ?, ?, ?)",
				[gameId, t.x, t.z, t.zone ?? "", t.elevation, t.passable ? 1 : 0],
			);
		}
	}

	async loadTiles(gameId: string): Promise<TileRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM tiles WHERE game_id = ? ORDER BY z, x",
			[gameId],
		);
		return rows.map(rowToTile);
	}

	async saveTileResources(
		gameId: string,
		resources: TileResourceRecord[],
	): Promise<void> {
		for (const r of resources) {
			await this.db.run(
				"INSERT OR REPLACE INTO tile_resources (game_id, x, z, resource_type, amount, depleted) VALUES (?, ?, ?, ?, ?, ?)",
				[gameId, r.x, r.z, r.resourceType, r.amount, r.depleted ? 1 : 0],
			);
		}
	}

	async upsertUnit(gameId: string, unit: UnitRecord): Promise<void> {
		await this.db.run(
			`INSERT OR REPLACE INTO units (id, game_id, faction_id, tile_x, tile_z, hp, max_hp, ap, max_ap, mp, max_mp, model_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				unit.id,
				gameId,
				unit.factionId,
				unit.tileX,
				unit.tileZ,
				unit.hp,
				unit.maxHp,
				unit.ap,
				unit.maxAp,
				unit.mp,
				unit.maxMp,
				unit.modelId,
			],
		);
	}

	async saveUnits(gameId: string, units: UnitRecord[]): Promise<void> {
		for (const u of units) {
			await this.upsertUnit(gameId, u);
		}
	}

	async loadUnits(gameId: string): Promise<UnitRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM units WHERE game_id = ?",
			[gameId],
		);
		return rows.map(rowToUnit);
	}

	async upsertBuilding(gameId: string, b: BuildingRecord): Promise<void> {
		await this.db.run(
			`INSERT OR REPLACE INTO buildings (id, game_id, faction_id, tile_x, tile_z, type, hp, max_hp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[b.id, gameId, b.factionId, b.tileX, b.tileZ, b.type, b.hp, b.maxHp],
		);
	}

	async saveBuildings(gameId: string, buildings: BuildingRecord[]): Promise<void> {
		for (const b of buildings) {
			await this.upsertBuilding(gameId, b);
		}
	}

	async loadBuildings(gameId: string): Promise<BuildingRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM buildings WHERE game_id = ?",
			[gameId],
		);
		return rows.map(rowToBuilding);
	}

	async saveExplored(gameId: string, explored: ExploredRecord[]): Promise<void> {
		for (const e of explored) {
			await this.db.run(
				`INSERT OR REPLACE INTO game_explored (game_id, tile_x, tile_z, explored, visibility)
       VALUES (?, ?, ?, ?, ?)`,
				[gameId, e.tileX, e.tileZ, e.explored ? 1 : 0, e.visibility],
			);
		}
	}

	async loadExplored(gameId: string): Promise<ExploredRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM game_explored WHERE game_id = ?",
			[gameId],
		);
		return rows.map(rowToExplored);
	}

	async saveResources(gameId: string, resources: ResourceRecord[]): Promise<void> {
		for (const r of resources) {
			await this.db.run(
				`INSERT OR REPLACE INTO game_resources (game_id, faction_id, material, amount)
       VALUES (?, ?, ?, ?)`,
				[gameId, r.factionId, r.material, r.amount],
			);
		}
	}

	async loadResources(gameId: string): Promise<ResourceRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM game_resources WHERE game_id = ?",
			[gameId],
		);
		return rows.map(rowToResource);
	}

	async appendEvent(
		gameId: string,
		turn: number,
		type: string,
		payload: unknown,
	): Promise<void> {
		await this.db.run(
			"INSERT INTO events (game_id, turn, type, payload) VALUES (?, ?, ?, ?)",
			[gameId, turn, type, JSON.stringify(payload)],
		);
	}

	async advanceTurn(gameId: string): Promise<number> {
		await this.db.run(
			"UPDATE games SET turn = turn + 1, updated_at = ? WHERE id = ?",
			[new Date().toISOString(), gameId],
		);
		const rows = await this.db.query<{ turn: number }>(
			"SELECT turn FROM games WHERE id = ?",
			[gameId],
		);
		return rows[0]?.turn ?? 1;
	}

	// ─── Campaign Statistics ──────────────────────────────────────────────────

	async saveCampaignStats(gameId: string, statsJson: string): Promise<void> {
		const now = new Date().toISOString();
		await this.db.run(
			`INSERT OR REPLACE INTO campaign_statistics (game_id, stats_json, updated_at)
       VALUES (?, ?, ?)`,
			[gameId, statsJson, now],
		);
	}

	async loadCampaignStats(gameId: string): Promise<CampaignStatisticsRecord | null> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM campaign_statistics WHERE game_id = ?",
			[gameId],
		);
		if (rows.length === 0) return null;
		return rowToCampaignStats(rows[0]!);
	}

	// ─── Turn Event Logs ──────────────────────────────────────────────────────

	async appendTurnEventLog(gameId: string, turn: number, eventsJson: string): Promise<void> {
		await this.db.run(
			"INSERT INTO turn_event_logs (game_id, turn, events_json) VALUES (?, ?, ?)",
			[gameId, turn, eventsJson],
		);
	}

	async loadTurnEventLogs(gameId: string, fromTurn?: number, toTurn?: number): Promise<TurnEventLogRecord[]> {
		let sql = "SELECT * FROM turn_event_logs WHERE game_id = ?";
		const params: unknown[] = [gameId];

		if (fromTurn !== undefined) {
			sql += " AND turn >= ?";
			params.push(fromTurn);
		}
		if (toTurn !== undefined) {
			sql += " AND turn <= ?";
			params.push(toTurn);
		}
		sql += " ORDER BY turn ASC";

		const rows = await this.db.query<Record<string, unknown>>(sql, params);
		return rows.map(rowToTurnEventLog);
	}

	// ─── Faction Resource Snapshots ───────────────────────────────────────────

	async saveFactionResourceSnapshot(
		gameId: string,
		turn: number,
		factionId: string,
		resourcesJson: string,
	): Promise<void> {
		await this.db.run(
			`INSERT INTO faction_resource_snapshots (game_id, turn, faction_id, resources_json)
       VALUES (?, ?, ?, ?)`,
			[gameId, turn, factionId, resourcesJson],
		);
	}

	async loadFactionResourceSnapshots(
		gameId: string,
		factionId?: string,
	): Promise<FactionResourceSnapshotRecord[]> {
		let sql = "SELECT * FROM faction_resource_snapshots WHERE game_id = ?";
		const params: unknown[] = [gameId];

		if (factionId) {
			sql += " AND faction_id = ?";
			params.push(factionId);
		}
		sql += " ORDER BY turn ASC, faction_id ASC";

		const rows = await this.db.query<Record<string, unknown>>(sql, params);
		return rows.map(rowToFactionResourceSnapshot);
	}

	// ─── Turn Snapshots ───────────────────────────────────────────────────────

	async saveTurnSnapshot(gameId: string, turn: number, snapshotJson: string): Promise<void> {
		await this.db.run(
			"INSERT INTO turn_snapshots (game_id, turn, snapshot_json) VALUES (?, ?, ?)",
			[gameId, turn, snapshotJson],
		);
	}

	async loadTurnSnapshots(gameId: string): Promise<TurnSnapshotRecord[]> {
		const rows = await this.db.query<Record<string, unknown>>(
			"SELECT * FROM turn_snapshots WHERE game_id = ? ORDER BY turn ASC",
			[gameId],
		);
		return rows.map(rowToTurnSnapshot);
	}
}

function rowToGame(row: Record<string, unknown>): GameRecord {
	return {
		id: String(row.id),
		seed: String(row.seed),
		boardW: Number(row.board_w),
		boardH: Number(row.board_h),
		tileSizeM: Number(row.tile_size_m),
		difficulty: String(row.difficulty) as "easy" | "normal" | "hard",
		turn: Number(row.turn),
		climateProfile: String(row.climate_profile ?? "temperate"),
		stormProfile: String(row.storm_profile ?? "volatile"),
		gameDifficulty: String(row.game_difficulty ?? "standard"),
		factionSlots: String(row.faction_slots ?? "[]"),
		createdAt: String(row.created_at),
		updatedAt: String(row.updated_at),
	};
}

function rowToSummary(row: Record<string, unknown>): GameSummary {
	return {
		id: String(row.id),
		seed: String(row.seed),
		boardW: Number(row.board_w),
		boardH: Number(row.board_h),
		difficulty: String(row.difficulty),
		turn: Number(row.turn),
		createdAt: String(row.created_at),
	};
}

function rowToTile(row: Record<string, unknown>): TileRecord {
	return {
		gameId: String(row.game_id),
		x: Number(row.x),
		z: Number(row.z),
		zone: String(row.zone),
		elevation: Number(row.elevation),
		passable: Number(row.passable) === 1,
	};
}

function rowToUnit(row: Record<string, unknown>): UnitRecord {
	return {
		id: String(row.id),
		gameId: String(row.game_id),
		factionId: String(row.faction_id),
		tileX: Number(row.tile_x),
		tileZ: Number(row.tile_z),
		hp: Number(row.hp),
		maxHp: Number(row.max_hp),
		ap: Number(row.ap),
		maxAp: Number(row.max_ap),
		mp: Number(row.mp ?? 3),
		maxMp: Number(row.max_mp ?? 3),
		modelId: String(row.model_id),
	};
}

function rowToBuilding(row: Record<string, unknown>): BuildingRecord {
	return {
		id: String(row.id),
		gameId: String(row.game_id),
		factionId: String(row.faction_id),
		tileX: Number(row.tile_x),
		tileZ: Number(row.tile_z),
		type: String(row.type),
		hp: Number(row.hp),
		maxHp: Number(row.max_hp),
	};
}

function rowToExplored(row: Record<string, unknown>): ExploredRecord {
	return {
		gameId: String(row.game_id),
		tileX: Number(row.tile_x),
		tileZ: Number(row.tile_z),
		explored: Number(row.explored) === 1,
		visibility: Number(row.visibility),
	};
}

function rowToResource(row: Record<string, unknown>): ResourceRecord {
	return {
		gameId: String(row.game_id),
		factionId: String(row.faction_id),
		material: String(row.material),
		amount: Number(row.amount),
	};
}

function rowToCampaignStats(row: Record<string, unknown>): CampaignStatisticsRecord {
	return {
		gameId: String(row.game_id),
		statsJson: String(row.stats_json),
		updatedAt: String(row.updated_at),
	};
}

function rowToTurnEventLog(row: Record<string, unknown>): TurnEventLogRecord {
	return {
		gameId: String(row.game_id),
		turn: Number(row.turn),
		eventsJson: String(row.events_json),
	};
}

function rowToFactionResourceSnapshot(row: Record<string, unknown>): FactionResourceSnapshotRecord {
	return {
		gameId: String(row.game_id),
		turn: Number(row.turn),
		factionId: String(row.faction_id),
		resourcesJson: String(row.resources_json),
	};
}

function rowToTurnSnapshot(row: Record<string, unknown>): TurnSnapshotRecord {
	return {
		gameId: String(row.game_id),
		turn: Number(row.turn),
		snapshotJson: String(row.snapshot_json),
	};
}
