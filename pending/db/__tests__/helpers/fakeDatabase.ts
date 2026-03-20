import type { SyncDatabase, SyncRunResult } from "../../types";

type SaveGameRow = {
	id: number;
	name: string;
	world_seed: number;
	sector_scale: string;
	difficulty: string;
	climate_profile: string;
	storm_profile: string;
	created_at: number;
	last_played_at: number;
	playtime_seconds: number;
};

type EcumenopolisMapRow = {
	id: number;
	save_game_id: number;
	width: number;
	height: number;
	sector_scale: string;
	climate_profile: string;
	storm_profile: string;
	spawn_sector_id: string;
	spawn_anchor_key: string;
	generated_at: number;
};

type SectorCellRow = {
	id: number;
	ecumenopolis_id: number;
	q: number;
	r: number;
	structural_zone: string;
	floor_preset_id: string;
	discovery_state: number;
	passable: number;
	sector_archetype: string;
	storm_exposure: "shielded" | "stressed" | "exposed";
	impassable_class: "none" | "breach" | "sealed_power" | "structural_void";
	anchor_key: string;
};

type SectorStructureRow = {
	id: number;
	ecumenopolis_id: number;
	district_structure_id: string;
	anchor_key: string;
	q: number;
	r: number;
	model_id: string;
	placement_layer: string;
	edge: string | null;
	rotation_quarter_turns: number;
	offset_x: number;
	offset_y: number;
	offset_z: number;
	target_span: number;
	sector_archetype: string;
	source: "seeded_district" | "boundary" | "landmark" | "constructed";
	controller_faction: string | null;
};

type WorldPoiRow = {
	id: number;
	ecumenopolis_id: number;
	type: string;
	name: string;
	q: number;
	r: number;
	discovered: number;
};

type CityInstanceRow = {
	id: number;
	ecumenopolis_id: number;
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
	bot_archetype_id: string | null;
	mark_level: number | null;
	speech_profile: string | null;
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

type HarvestStateRow = {
	id: number;
	save_game_id: number;
	consumed_structure_ids_json: string;
	active_harvests_json: string;
	consumed_floor_tiles_json: string;
	last_synced_at: number;
};

type TurnStateRow = {
	id: number;
	save_game_id: number;
	turn_number: number;
	phase: string;
	active_faction: string;
	unit_states_json: string;
	last_synced_at: number;
};

type FactionResourceStateRow = {
	id: number;
	save_game_id: number;
	faction_id: string;
	resources_json: string;
	last_synced_at: number;
};

type CampaignStatisticsRow = {
	id: number;
	save_game_id: number;
	stats_json: string;
	last_synced_at: number;
};

type TurnEventLogRow = {
	id: number;
	save_game_id: number;
	turn_number: number;
	events_json: string;
};

export class FakeDatabase implements SyncDatabase {
	public execCalls: string[] = [];
	private nextId = 1;
	private saveGames: SaveGameRow[] = [];
	private ecumenopolisMaps: EcumenopolisMapRow[] = [];
	private sectorCells: SectorCellRow[] = [];
	private sectorStructures: SectorStructureRow[] = [];
	private worldPois: WorldPoiRow[] = [];
	private cityInstances: CityInstanceRow[] = [];
	private campaignStates: CampaignStateRow[] = [];
	private resourceStates: ResourceStateRow[] = [];
	private worldEntities: WorldEntityRow[] = [];
	private harvestStates: HarvestStateRow[] = [];
	private turnStates: TurnStateRow[] = [];
	private factionResourceStates: FactionResourceStateRow[] = [];
	private campaignStatistics: CampaignStatisticsRow[] = [];
	private turnEventLogs: TurnEventLogRow[] = [];
	private tableColumns = new Map<string, string[]>([
		[
			"save_games",
			[
				"id",
				"name",
				"world_seed",
				"sector_scale",
				"difficulty",
				"climate_profile",
				"storm_profile",
				"created_at",
				"last_played_at",
				"playtime_seconds",
			],
		],
		[
			"ecumenopolis_maps",
			[
				"id",
				"save_game_id",
				"width",
				"height",
				"sector_scale",
				"climate_profile",
				"storm_profile",
				"spawn_sector_id",
				"spawn_anchor_key",
				"generated_at",
			],
		],
		[
			"sector_cells",
			[
				"id",
				"ecumenopolis_id",
				"q",
				"r",
				"structural_zone",
				"floor_preset_id",
				"discovery_state",
				"passable",
				"sector_archetype",
				"storm_exposure",
				"impassable_class",
				"anchor_key",
			],
		],
		[
			"sector_structures",
			[
				"id",
				"ecumenopolis_id",
				"district_structure_id",
				"anchor_key",
				"q",
				"r",
				"model_id",
				"placement_layer",
				"edge",
				"rotation_quarter_turns",
				"offset_x",
				"offset_y",
				"offset_z",
				"target_span",
				"sector_archetype",
				"source",
				"controller_faction",
			],
		],
		[
			"world_points_of_interest",
			["id", "ecumenopolis_id", "type", "name", "q", "r", "discovered"],
		],
		[
			"city_instances",
			[
				"id",
				"ecumenopolis_id",
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
				"bot_archetype_id",
				"mark_level",
				"speech_profile",
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
		[
			"harvest_states",
			[
				"id",
				"save_game_id",
				"consumed_structure_ids_json",
				"active_harvests_json",
				"consumed_floor_tiles_json",
				"last_synced_at",
			],
		],
		[
			"turn_states",
			[
				"id",
				"save_game_id",
				"turn_number",
				"phase",
				"active_faction",
				"unit_states_json",
				"last_synced_at",
			],
		],
		[
			"faction_resource_states",
			["id", "save_game_id", "faction_id", "resources_json", "last_synced_at"],
		],
		[
			"campaign_statistics",
			["id", "save_game_id", "stats_json", "last_synced_at"],
		],
		["turn_event_logs", ["id", "save_game_id", "turn_number", "events_json"]],
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

		if (source.includes("FROM sector_cells")) {
			const worldMapId = Number(params[0]);
			return this.sectorCells
				.filter((row) => row.ecumenopolis_id === worldMapId)
				.sort((a, b) => a.r - b.r || a.q - b.q) as T[];
		}

		if (source.includes("FROM world_points_of_interest")) {
			const worldMapId = Number(params[0]);
			return this.worldPois
				.filter((row) => row.ecumenopolis_id === worldMapId)
				.sort((a, b) => a.id - b.id) as T[];
		}

		if (source.includes("FROM sector_structures")) {
			const worldMapId = Number(params[0]);
			return this.sectorStructures
				.filter((row) => row.ecumenopolis_id === worldMapId)
				.sort((a, b) => a.q - b.q || a.r - b.r || a.id - b.id) as T[];
		}

		if (source.includes("FROM city_instances")) {
			const worldMapId = Number(params[0]);
			return this.cityInstances
				.filter((row) => row.ecumenopolis_id === worldMapId)
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

		if (source.includes("FROM faction_resource_states")) {
			const saveGameId = Number(params[0]);
			return this.factionResourceStates
				.filter((row) => row.save_game_id === saveGameId)
				.sort((a, b) => a.faction_id.localeCompare(b.faction_id)) as T[];
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
			source.includes("FROM ecumenopolis_maps") &&
			source.includes("WHERE save_game_id = ?")
		) {
			const saveGameId = Number(params[0]);
			return (this.ecumenopolisMaps.find(
				(row) => row.save_game_id === saveGameId,
			) ?? null) as T | null;
		}

		if (
			source.includes("FROM harvest_states") &&
			source.includes("WHERE save_game_id = ?")
		) {
			const saveGameId = Number(params[0]);
			return (this.harvestStates.find(
				(row) => row.save_game_id === saveGameId,
			) ?? null) as T | null;
		}

		if (
			source.includes("FROM turn_states") &&
			source.includes("WHERE save_game_id = ?")
		) {
			const saveGameId = Number(params[0]);
			return (this.turnStates.find((row) => row.save_game_id === saveGameId) ??
				null) as T | null;
		}

		if (
			source.includes("FROM campaign_statistics") &&
			source.includes("WHERE save_game_id = ?")
		) {
			const saveGameId = Number(params[0]);
			return (this.campaignStatistics.find(
				(row) => row.save_game_id === saveGameId,
			) ?? null) as T | null;
		}

		throw new Error(`Unsupported getFirstSync query: ${source}`);
	}

	runSync(source: string, ...params: unknown[]): SyncRunResult {
		if (source.includes("INSERT INTO save_games")) {
			const row: SaveGameRow = {
				id: this.nextId++,
				name: String(params[0]),
				world_seed: Number(params[1]),
				sector_scale: String(params[2]),
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

		if (
			source.includes("DELETE FROM city_instances WHERE ecumenopolis_id IN")
		) {
			const saveGameId = Number(params[0]);
			const worldMapIds = new Set(
				this.ecumenopolisMaps
					.filter((row) => row.save_game_id === saveGameId)
					.map((row) => row.id),
			);
			this.cityInstances = this.cityInstances.filter(
				(row) => !worldMapIds.has(row.ecumenopolis_id),
			);
			return { lastInsertRowId: 0 };
		}

		if (
			source.includes("DELETE FROM sector_structures WHERE ecumenopolis_id IN")
		) {
			const saveGameId = Number(params[0]);
			const worldMapIds = new Set(
				this.ecumenopolisMaps
					.filter((row) => row.save_game_id === saveGameId)
					.map((row) => row.id),
			);
			this.sectorStructures = this.sectorStructures.filter(
				(row) => !worldMapIds.has(row.ecumenopolis_id),
			);
			return { lastInsertRowId: 0 };
		}

		if (
			source.includes(
				"DELETE FROM world_points_of_interest WHERE ecumenopolis_id IN",
			)
		) {
			const saveGameId = Number(params[0]);
			const worldMapIds = new Set(
				this.ecumenopolisMaps
					.filter((row) => row.save_game_id === saveGameId)
					.map((row) => row.id),
			);
			this.worldPois = this.worldPois.filter(
				(row) => !worldMapIds.has(row.ecumenopolis_id),
			);
			return { lastInsertRowId: 0 };
		}

		if (source.includes("DELETE FROM sector_cells WHERE ecumenopolis_id IN")) {
			const saveGameId = Number(params[0]);
			const worldMapIds = new Set(
				this.ecumenopolisMaps
					.filter((row) => row.save_game_id === saveGameId)
					.map((row) => row.id),
			);
			this.sectorCells = this.sectorCells.filter(
				(row) => !worldMapIds.has(row.ecumenopolis_id),
			);
			return { lastInsertRowId: 0 };
		}

		if (
			source.includes("DELETE FROM ecumenopolis_maps WHERE save_game_id = ?")
		) {
			const saveGameId = Number(params[0]);
			this.ecumenopolisMaps = this.ecumenopolisMaps.filter(
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

		if (source.includes("INSERT INTO ecumenopolis_maps")) {
			const row: EcumenopolisMapRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				width: Number(params[1]),
				height: Number(params[2]),
				sector_scale: String(params[3]),
				climate_profile: String(params[4]),
				storm_profile: String(params[5]),
				spawn_sector_id: String(params[6]),
				spawn_anchor_key: String(params[7]),
				generated_at: Number(params[8]),
			};
			this.ecumenopolisMaps.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO sector_cells")) {
			const row: SectorCellRow = {
				id: this.nextId++,
				ecumenopolis_id: Number(params[0]),
				q: Number(params[1]),
				r: Number(params[2]),
				structural_zone: String(params[3]),
				floor_preset_id: String(params[4]),
				discovery_state: Number(params[5]),
				passable: Number(params[6]),
				sector_archetype: String(params[7]),
				storm_exposure: params[8] as SectorCellRow["storm_exposure"],
				impassable_class: params[9] as SectorCellRow["impassable_class"],
				anchor_key: String(params[10]),
			};
			this.sectorCells.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO sector_structures")) {
			const row: SectorStructureRow = {
				id: this.nextId++,
				ecumenopolis_id: Number(params[0]),
				district_structure_id: String(params[1]),
				anchor_key: String(params[2]),
				q: Number(params[3]),
				r: Number(params[4]),
				model_id: String(params[5]),
				placement_layer: String(params[6]),
				edge: params[7] == null ? null : String(params[7]),
				rotation_quarter_turns: Number(params[8]),
				offset_x: Number(params[9]),
				offset_y: Number(params[10]),
				offset_z: Number(params[11]),
				target_span: Number(params[12]),
				sector_archetype: String(params[13]),
				source: params[14] as SectorStructureRow["source"],
				controller_faction: params[15] == null ? null : String(params[15]),
			};
			this.sectorStructures.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("INSERT INTO world_points_of_interest")) {
			const row: WorldPoiRow = {
				id: this.nextId++,
				ecumenopolis_id: Number(params[0]),
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
				ecumenopolis_id: Number(params[0]),
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
				bot_archetype_id: params[6] == null ? null : String(params[6]),
				mark_level: params[7] == null ? null : Number(params[7]),
				speech_profile: params[8] == null ? null : String(params[8]),
				building_type: params[9] == null ? null : String(params[9]),
				display_name: params[10] == null ? null : String(params[10]),
				fragment_id: params[11] == null ? null : String(params[11]),
				x: Number(params[12]),
				y: Number(params[13]),
				z: Number(params[14]),
				speed: params[15] == null ? null : Number(params[15]),
				selected: Number(params[16]),
				components_json: String(params[17]),
				navigation_json: params[18] == null ? null : String(params[18]),
				ai_role: params[19] == null ? null : String(params[19]),
				ai_state_json: params[20] == null ? null : String(params[20]),
				powered: params[21] == null ? null : Number(params[21]),
				operational: params[22] == null ? null : Number(params[22]),
				rod_capacity: params[23] == null ? null : Number(params[23]),
				current_output: params[24] == null ? null : Number(params[24]),
				protection_radius: params[25] == null ? null : Number(params[25]),
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

		if (source.includes("UPDATE sector_cells SET discovery_state = ?")) {
			const row = this.sectorCells.find(
				(candidate) =>
					candidate.ecumenopolis_id === Number(params[1]) &&
					candidate.q === Number(params[2]) &&
					candidate.r === Number(params[3]),
			);
			if (row) {
				row.discovery_state = Number(params[0]);
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

		// ─── Harvest States ──────────────────────────────────────────────
		if (source.includes("INSERT INTO harvest_states")) {
			const row: HarvestStateRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				consumed_structure_ids_json: String(params[1]),
				active_harvests_json: String(params[2]),
				consumed_floor_tiles_json: String(params[3] ?? "[]"),
				last_synced_at: Number(params[4]),
			};
			this.harvestStates.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("UPDATE harvest_states")) {
			const row = this.harvestStates.find(
				(candidate) => candidate.save_game_id === Number(params[4]),
			);
			if (row) {
				row.consumed_structure_ids_json = String(params[0]);
				row.active_harvests_json = String(params[1]);
				row.consumed_floor_tiles_json = String(params[2] ?? "[]");
				row.last_synced_at = Number(params[3]);
			}
			return { lastInsertRowId: row?.id ?? 0 };
		}

		// ─── Turn States ─────────────────────────────────────────────────
		if (source.includes("INSERT INTO turn_states")) {
			const row: TurnStateRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				turn_number: Number(params[1]),
				phase: String(params[2]),
				active_faction: String(params[3]),
				unit_states_json: String(params[4]),
				last_synced_at: Number(params[5]),
			};
			this.turnStates.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("UPDATE turn_states")) {
			const row = this.turnStates.find(
				(candidate) => candidate.save_game_id === Number(params[5]),
			);
			if (row) {
				row.turn_number = Number(params[0]);
				row.phase = String(params[1]);
				row.active_faction = String(params[2]);
				row.unit_states_json = String(params[3]);
				row.last_synced_at = Number(params[4]);
			}
			return { lastInsertRowId: row?.id ?? 0 };
		}

		// ─── Faction Resource States ─────────────────────────────────────
		if (
			source.includes(
				"DELETE FROM faction_resource_states WHERE save_game_id = ?",
			)
		) {
			const saveGameId = Number(params[0]);
			this.factionResourceStates = this.factionResourceStates.filter(
				(row) => row.save_game_id !== saveGameId,
			);
			return { lastInsertRowId: 0 };
		}

		if (source.includes("INSERT INTO faction_resource_states")) {
			const row: FactionResourceStateRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				faction_id: String(params[1]),
				resources_json: String(params[2]),
				last_synced_at: Number(params[3]),
			};
			this.factionResourceStates.push(row);
			return { lastInsertRowId: row.id };
		}

		// ─── Campaign Statistics ─────────────────────────────────────────
		if (source.includes("INSERT INTO campaign_statistics")) {
			const row: CampaignStatisticsRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				stats_json: String(params[1]),
				last_synced_at: Number(params[2]),
			};
			this.campaignStatistics.push(row);
			return { lastInsertRowId: row.id };
		}

		if (source.includes("UPDATE campaign_statistics")) {
			const row = this.campaignStatistics.find(
				(candidate) => candidate.save_game_id === Number(params[2]),
			);
			if (row) {
				row.stats_json = String(params[0]);
				row.last_synced_at = Number(params[1]);
			}
			return { lastInsertRowId: row?.id ?? 0 };
		}

		// ─── Turn Event Logs ─────────────────────────────────────────────
		if (source.includes("INSERT INTO turn_event_logs")) {
			const row: TurnEventLogRow = {
				id: this.nextId++,
				save_game_id: Number(params[0]),
				turn_number: Number(params[1]),
				events_json: String(params[2]),
			};
			this.turnEventLogs.push(row);
			return { lastInsertRowId: row.id };
		}

		// ─── Game data seeder (INSERT OR REPLACE into definition tables) ─
		if (
			source.includes("INSERT OR REPLACE INTO model_definitions") ||
			source.includes("INSERT OR REPLACE INTO tile_definitions") ||
			source.includes("INSERT OR REPLACE INTO robot_definitions") ||
			source.includes("INSERT OR REPLACE INTO game_config")
		) {
			return { lastInsertRowId: 0 };
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
		return this.ecumenopolisMaps;
	}

	getWorldTiles() {
		return this.sectorCells;
	}

	getSectorStructures() {
		return this.sectorStructures;
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
