jest.mock("../index", () => ({
	isEntityExecutingAITask: () => false,
	getWorldAIService: () => ({ runtime: { reset: jest.fn() } }),
}));

import {
	clearActiveWorldSession,
	setActiveWorldSession,
} from "../../world/session";
import { SectorNavigationAdapter } from "./SectorNavigationAdapter";
import { SquareGridNavigationAdapter } from "./SquareGridNavigationAdapter";

function buildPassableCells() {
	const cells = [];
	for (let q = 0; q <= 6; q++) {
		for (let r = 0; r <= 6; r++) {
			cells.push({
				id: q * 100 + r,
				ecumenopolis_id: 1,
				q,
				r,
				structural_zone: "command",
				floor_preset_id: "default",
				discovery_state: 2,
				passable: 1,
				sector_archetype: "command_arcology",
				storm_exposure: "shielded" as const,
				impassable_class: "none" as const,
				anchor_key: `${q},${r}`,
			});
		}
	}
	return cells;
}

describe("navigation adapters", () => {
	beforeEach(() => {
		setActiveWorldSession({
			saveGame: {
				id: 1,
				name: "Nav Test",
				world_seed: 1,
				sector_scale: "standard",
				difficulty: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				created_at: 0,
				last_played_at: 0,
				playtime_seconds: 0,
			},
			config: {
				worldSeed: 1,
				sectorScale: "standard",
				difficulty: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			},
			ecumenopolis: {
				id: 1,
				save_game_id: 1,
				width: 40,
				height: 40,
				sector_scale: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				spawn_sector_id: "command_arcology",
				spawn_anchor_key: "0,0",
				generated_at: 0,
			},
			sectorCells: buildPassableCells(),
			sectorStructures: [],
			pointsOfInterest: [],
			cityInstances: [],
			campaignState: {
				id: 1,
				save_game_id: 1,
				active_scene: "world",
				active_city_instance_id: null,
				current_tick: 0,
				last_synced_at: 0,
			},
			resourceState: {
				id: 1,
				save_game_id: 1,
				scrap_metal: 0,
				e_waste: 0,
				intact_components: 0,
				last_synced_at: 0,
			},
		});
	});

	afterEach(() => {
		clearActiveWorldSession();
	});

	it("uses the current sector-surface path contract", () => {
		const adapter = new SectorNavigationAdapter();
		const path = adapter.findPath({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 10 });

		expect(adapter.kind).toBe("sector");
		expect(Array.isArray(path)).toBe(true);
		for (const node of path) {
			expect(node).toEqual(
				expect.objectContaining({
					q: expect.any(Number),
					r: expect.any(Number),
				}),
			);
		}
	});

	it("keeps the future square-grid adapter deterministic", () => {
		const adapter = new SquareGridNavigationAdapter();

		expect(
			adapter.findPath({ x: 1, y: 0, z: 1 }, { x: 4, y: 0, z: 4 }),
		).toEqual([
			{ q: 2, r: 2 },
			{ q: 3, r: 3 },
			{ q: 4, r: 4 },
		]);
	});
});
