import type { SyncDatabase, SyncRunResult } from "../../types";

type SaveGameRow = {
	id: number;
	name: string;
	world_seed: number;
	map_size: string;
	difficulty: string;
	climate_profile: string;
	storm_profile: string;
	created_at: number;
	last_played_at: number;
	playtime_seconds: number;
};

type WorldMapRow = {
	id: number;
	save_game_id: number;
	width: number;
	height: number;
	map_size: string;
	climate_profile: string;
	storm_profile: string;
	spawn_q: number;
	spawn_r: number;
	generated_at: number;
};

type WorldTileRow = {
	id: number;
	world_map_id: number;
	q: number;
	r: number;
	biome: string;
	terrain_set_id: string;
	fog_state: number;
	passable: number;
};

type WorldPoiRow = {
	id: number;
	world_map_id: number;
	type: string;
	name: string;
	q: number;
	r: number;
	discovered: number;
};

type CityInstanceRow = {
	id: number;
	world_map_id: number;
	poi_id: number | null;
	name: string;
	world_q: number;
	world_r: number;
	layout_seed: number;
	generation_status: string;
	state: string;
};

type CampaignStateRow = {
	id: number;
	save_game_id: number;
	active_scene: "world" | "city";
	active_city_instance_id: number | null;
	current_tick: number;
	last_synced_at: number;
};

type ResourceStateRow = {
	id: number;
	save_game_id: number;
	scrap_metal: number;
	e_waste: number;
	intact_components: number;
	last_synced_at: number;
};

type WorldEntityRow = {
	id: number;
	save_game_id: number;
	entity_id: string;
	scene_location: "world" | "interior";
	scene_building_id: string | null;
	faction: string;
	unit_type: string | null;
	building_type: string | null;
	display_name: string | null;
	fragment_id: string | null;
	x: number;
	y: number;
	z: number;
	speed: number | null;
	selected: number;
	components_json: string;
	navigation_json: string | null;
	ai_role: string | null;
	ai_state_json: string | null;
	powered: number | null;
	operational: number | null;
	rod_capacity: number | null;
	current_output: number | null;
	protection_radius: number | null;
};

export class FakeDatabase implements SyncDatabase {
	public execCalls: string[] = [];
	private nextId = 1;
	private saveGames: SaveGameRow[] = [];
	private worldMaps: WorldMapRow[] = [];
	private worldTiles: WorldTileRow[] = [];
	private worldPois: WorldPoiRow[] = [];
	private cityInstances: CityInstanceRow[] = [];
	private campaignStates: CampaignStateRow[] = [];
	private resourceStates: ResourceStateRow[] = [];
	private worldEntities: WorldEntityRow[] = [];
	private tableColumns = new Map<string, string[]>([
		[
			"save_games",
			[
				"id",
				"name",
				"world_seed",
				"map_size",
				"difficulty",
				"climate_profile",
				"storm_profile",
				"created_at",
				"last_played_at",
				"playtime_seconds",
			],
		],
		[
			"world_maps",
			[
				"id",
				"save_game_id",
				"width",
				"height",
				"map_size",
				"climate_profile",
				"storm_profile",
				"spawn_q",
				"spawn_r",
				"generated_at",
			],
		],
		[
			"world_tiles",
			[
				"id",
				"world_map_id",
				"q",
				"r",
				"biome",
				"terrain_set_id",
				"fog_state",
				"passable",
			],
		],
		[
			"world_points_of_interest",
			["id", "world_map_id", "type", "name", "q", "r", "discovered"],
		],
		[
			"city_instances",
			[
				"id",
				"world_map_id",
				"poi_id",
				"name",
				"world_q",
				"world_r",
				"layout_seed",
				"generation_status",
				"state",
			],
		],
		[
			"campaign_states",
			[
				"id",
				"save_game_id",
				"active_scene",
				"active_city_instance_id",
				"current_tick",
				"last_synced_at",
			],
		],
		[
			"resource_states",
			[
				"id",
				"save_game_id",
				"scrap_metal",
				"e_waste",
				"intact_components",
				"last_synced_at",
			],
		],
		[
			"world_entities",
			[
				"id",
				"save_game_id",
				"entity_id",
				"scene_location",
				"scene_building_id",
				"faction",
				"unit_type",
				"building_type",
				"display_name",
				"fragment_id",
				"x",
				"y",
				"z",
				"speed",
				"selected",
				"components_json",
				"navigation_json",
				"ai_role",
				"ai_state_json",
				"powered",
				"operational",
				"rod_capacity",
				"current_output",
				"protection_radius",
			],
		],
		[
			"unlocked_techniques",
			["id", "save_game_id", "technique_id", "unlocked_at"],
		],
		[
			"map_discovery",
			["id", "save_game_id", "chunk_x", "chunk_y", "discovered_state"],
		],
	]);

	execSync(source: string): void {
		this.execCalls.push(source);
		const alterMatch = source.match(/ALTER TABLE (\w+) ADD COLUMN (\w+) /i);
		if (alterMatch) {
			const [, tableName, columnName] = alterMatch;
			const columns = this.tableColumns.get(tableName) ?? [];
			if (!columns.includes(columnName)) {
				this.tableColumns.set(tableName, [...columns, columnName]);
			}
		}
	}

	getAllSync<T>(source: string, ...params: unknown[]): T[] {
		if (source.startsWith("PRAGMA table_info(")) {
			const tableName = source.match(/PRAGMA table_info\((\w+)\)/)?.[1];
			const columns = tableName ? (this.tableColumns.get(tableName) ?? []) : [];
			return columns.map((name) => ({ name })) as T[];
		}

		if (source.includes("FROM world_tiles")) {
			const worldMapId = Number(params[0]);
			return this.worldTiles
				.filter((row) => row.world_map_id === worldMapId)
				.sort((a, b) => a.r - b.r || a.q - b.q) as T[];
		}

		if (source.includes("FROM world_points_of_interest")) {
			const worldMapId = Number(params[0]);
			return this.worldPois
				.filter((row) => row.world_map_id === worldMapId)
				.sort((a, b) => a.id - b.id) as T[];
		}

		if (source.includes("FROM city_instances")) {
			const worldMapId = Number(params[0]);
			return this.cityInstances
				.filter((row) => row.world_map_id === worldMapId)
				.sort((a, b) => a.id - b.id) as T[];
		}

		if (source.includes("FROM resource_states")) {
			const saveGameId = Number(params[0]);
			return this.resourceStates.filter(
				(row) => row.save_game_id === saveGameId,
			) as T[];
		}

		if (source.includes("FROM world_entities")) {
			const saveGameId = Number(params[0]);
			return this.worldEntities
				.filter((row) => row.save_game_id === saveGameId)
				.sort((a, b) => a.id - b.id) as T[];
		}

		throw new Error(`Unsupported getAllSync query: ${source}`);
	}

	getFirstSync<T>(source: string, ...params: unknown[]): T | null {
		if (source.includes("SELECT COUNT(*) as count FROM save_games")) {
			return { count: this.saveGames.length } as T;
		}

		if (source.includes("FROM save_games") && source.includes("WHERE id = ?")) {
			const saveGameId = Number(params[0]);
			return (this.saveGames.find((row) => row.id === saveGameId) ??
				null) as T | null;
		}

		if (
			source.includes("FROM save_games") &&
			source.includes("ORDER BY last_played_at DESC")
		) {
			const latest = [...this.saveGames].sort(
				(a, b) => b.last_played_at - a.last_played_at || b.id - a.id,
			)[0];
			return (latest ?? null) as T | null;
		}

		if (
			source.includes("FROM campaign_states") &&
			source.includes("WHERE save_game_id = ?")
		) {
			const saveGameId = Number(params[0]);
			return (this.campaignStates.find(
				(row) => row.save_game_id === saveGameId,
			) ?? null) as T | null;
		}

		if (
			source.includes("FROM resource_states") &&
			source.includes("WHERE save_game_id = ?")
		) {
			const saveGameId = Number(params[0]);
			return (this.resourceStates.find(
				(row) => row.save_game_id === saveGameId,
			) ?? null) as T | null;
		}

		if (
			source.includes("FROM campaign_states") &&
			source.includes("WHERE id = ?")
		) {
			const id = Number(params[0]);
			return (this.campaignStates.find((row) => row.id === id) ??
				null) as T | null;
		}

		if (
			source.includes("FROM resource_states") &&
			source.includes("WHERE id = ?")
		) {
			const id = Number(params[0]);
			return (this.resourceStates.find((row) => row.id === id) ??
				null) as T | null;
		}

		if (
			source.includes("FROM world_maps") &&
			source.includes("WHERE save_game_id = ?")
		) {
			const saveGameId = Number(params[0]);
			return (this.worldMaps.find((row) => row.save_game_id === saveGameId) ??
				null) as T | null;
		}

		throw new Error(`Unsupported getFirstSync query: ${source}`);
	}

	runSync(source: string, ...params: unknown[]): SyncRunResult {
		if (source.includes("INSERT INTO save_games")) {
			const row: SaveGameRow = {
				id: this.nextId++,
				name: String(params[0]),
				world_seed: Number(params[1]),
				map_size: String(params[2]),
				difficulty: String(params[3]),
				climate_profile: String(params[4]),
				storm_profile: String(params[5]),
				created_at: Number(params[6]),
				last_played_at: Number(params[7]),
				playtime_seconds: 0,
			};
			this.saveGames.push(row);
			return { lastInsertRowId: row.id };
		}

		if (
			source.includes("UPDATE save_games SET last_played_at = ? WHERE id = ?")
		) {
			const nextPlayedAt = Number(params[0]);
			const saveGameId = Number(params[1]);
			const row = this.saveGames.find(
				(candidate) => candidate.id === saveGameId,
			);
			if (row) {
				row.last_played_at = nextPlayedAt;
			}
			return { lastInsertRowId: saveGameId };
		}

		if (source.includes("DELETE FROM city_instances WHERE world_map_id IN")) {
			const saveGameId = Number(params[0]);
			const worldMapIds = new Set(
				this.worldMaps
					.filter((row) => row.save_game_id === saveGameId)
					.map((row) => row.id),
			);
			this.cityInstances = this.cityInstances.filter(
				(row) => !worldMapIds.has(row.world_map_id),
			);
			return { lastInsertRowId: 0 };
		}

		if (
			source.includes(
				"DELETE FROM world_points_of_interest WHERE world_map_id IN",
			)
		) {
			const saveGameId = Number(params[0]);
			const worldMapIds = new Set(
				this.worldMaps
					.filter((row) => row.save_game_id === saveGameId)
					.map((row) => row.id),
			);
			this.worldPois = this.worldPois.filter(
				(row) => !worldMapIds.has(row.world_map_id),
			);
			return { lastInsertRowId: 0 };
		}

		if (source.includes("DELETE FROM world_tiles WHERE world_map_id IN")) {
			const saveGameId = Number(params[0]);
			const worldMapIds = new Set(
				this.worldMaps
					.filter((row) => row.save_game_id === saveGameId)
					.map((row) => row.id),
			);
			this.worldTiles = this.worldTiles.filter(
				(row) => !worldMapIds.has(row.world_map_id),
			);
			return { lastInsertRowId: 0 };
		}

		if (source.includes("DELETE FROM world_maps WHERE save_game_id = ?")) {
			const saveGameId = Number(params[0]);
			this.worldMaps = this.worldMaps.filter(
				(row) => row.save_game_id !== saveGameId,
			);
			return { lastInsertRowId: 0 };
		}

		if (source.includes("DELETE FROM world_entities WHERE save_game_id = ?")) {
			const saveGameId = Number(params[0]);
			this.worldEntities = this.worldEntities.filter(
				(row) => row.save_game_id !== saveGameId,
			);
			return { lastInsertRowId: 0 };
		}

		if (source.includes("INSERT INTO world_maps")) {
			const row: WorldMapRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				width: Number(params[1]),
				height: Number(params[2]),
				map_size: String(params[3]),
				climate_profile: String(params[4]),
				storm_profile: String(params[5]),
				spawn_q: Number(params[6]),
				spawn_r: Number(params[7]),
				generated_at: Number(params[8]),
			};
			this.worldMaps.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO world_tiles")) {
			const row: WorldTileRow = {
				id: this.nextId++,
				world_map_id: Number(params[0]),
				q: Number(params[1]),
				r: Number(params[2]),
				biome: String(params[3]),
				terrain_set_id: String(params[4]),
				fog_state: Number(params[5]),
				passable: Number(params[6]),
			};
			this.worldTiles.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO world_points_of_interest")) {
			const row: WorldPoiRow = {
				id: this.nextId++,
				world_map_id: Number(params[0]),
				type: String(params[1]),
				name: String(params[2]),
				q: Number(params[3]),
				r: Number(params[4]),
				discovered: Number(params[5]),
			};
			this.worldPois.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO city_instances")) {
			const row: CityInstanceRow = {
				id: this.nextId++,
				world_map_id: Number(params[0]),
				poi_id: params[1] === null ? null : Number(params[1]),
				name: String(params[2]),
				world_q: Number(params[3]),
				world_r: Number(params[4]),
				layout_seed: Number(params[5]),
				generation_status: String(params[6]),
				state: String(params[7]),
			};
			this.cityInstances.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO campaign_states")) {
			const row: CampaignStateRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				active_scene: "world",
				active_city_instance_id: null,
				current_tick: 0,
				last_synced_at: Number(params[1]),
			};
			this.campaignStates.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO resource_states")) {
			const row: ResourceStateRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				scrap_metal: 0,
				e_waste: 0,
				intact_components: 0,
				last_synced_at: Number(params[1]),
			};
			this.resourceStates.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO world_entities")) {
			const row: WorldEntityRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				entity_id: String(params[1]),
				scene_location: params[2] as "world" | "interior",
				scene_building_id: params[3] == null ? null : String(params[3]),
				faction: String(params[4]),
				unit_type: params[5] == null ? null : String(params[5]),
				building_type: params[6] == null ? null : String(params[6]),
				display_name: params[7] == null ? null : String(params[7]),
				fragment_id: params[8] == null ? null : String(params[8]),
				x: Number(params[9]),
				y: Number(params[10]),
				z: Number(params[11]),
				speed: params[12] == null ? null : Number(params[12]),
				selected: Number(params[13]),
				components_json: String(params[14]),
				navigation_json: params[15] == null ? null : String(params[15]),
				ai_role: params[16] == null ? null : String(params[16]),
				ai_state_json: params[17] == null ? null : String(params[17]),
				powered: params[18] == null ? null : Number(params[18]),
				operational: params[19] == null ? null : Number(params[19]),
				rod_capacity: params[20] == null ? null : Number(params[20]),
				current_output: params[21] == null ? null : Number(params[21]),
				protection_radius: params[22] == null ? null : Number(params[22]),
			};
			this.worldEntities.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("UPDATE campaign_states")) {
			const row = this.campaignStates.find(
				(candidate) => candidate.save_game_id === Number(params[4]),
			);
			if (row) {
				row.active_scene = params[0] as "world" | "city";
				row.active_city_instance_id =
					params[1] === null ? null : Number(params[1]);
				row.current_tick = Number(params[2]);
				row.last_synced_at = Number(params[3]);
			}
			return { lastInsertRowId: row?.id ?? 0 };
		}

		if (source.includes("UPDATE resource_states")) {
			const row = this.resourceStates.find(
				(candidate) => candidate.save_game_id === Number(params[4]),
			);
			if (row) {
				row.scrap_metal = Number(params[0]);
				row.e_waste = Number(params[1]);
				row.intact_components = Number(params[2]);
				row.last_synced_at = Number(params[3]);
			}
			return { lastInsertRowId: row?.id ?? 0 };
		}

		if (source.includes("UPDATE world_tiles SET fog_state = ?")) {
			const row = this.worldTiles.find(
				(candidate) =>
					candidate.world_map_id === Number(params[1]) &&
					candidate.q === Number(params[2]) &&
					candidate.r === Number(params[3]),
			);
			if (row) {
				row.fog_state = Number(params[0]);
			}
			return { lastInsertRowId: row?.id ?? 0 };
		}

		if (source.includes("UPDATE world_points_of_interest SET discovered = ?")) {
			const row = this.worldPois.find(
				(candidate) => candidate.id === Number(params[1]),
			);
			if (row) {
				row.discovered = Number(params[0]);
			}
			return { lastInsertRowId: row?.id ?? 0 };
		}

		if (source.includes("UPDATE city_instances SET state = ?")) {
			const row = this.cityInstances.find(
				(candidate) => candidate.id === Number(params[1]),
			);
			if (row) {
				row.state = String(params[0]);
			}
			return { lastInsertRowId: row?.id ?? 0 };
		}

		throw new Error(`Unsupported runSync query: ${source}`);
	}

	setColumns(tableName: string, columns: string[]) {
		this.tableColumns.set(tableName, columns);
	}

	getSaveGames() {
		return this.saveGames;
	}

	getWorldMaps() {
		return this.worldMaps;
	}

	getWorldTiles() {
		return this.worldTiles;
	}

	getWorldPointsOfInterest() {
		return this.worldPois;
	}

	getCityInstances() {
		return this.cityInstances;
	}

	getWorldEntities() {
		return this.worldEntities;
	}
}
