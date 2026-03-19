import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import {
	buildPlacementFlags,
	computeSpawnCenters,
	getSpawnCenters,
	placeRobots,
	type SimpleBoardInfo,
} from "../robots/placement";
import { UnitFaction, UnitPos } from "../traits/unit";

function makeBoard(width: number, height: number): SimpleBoardInfo {
	return {
		width,
		height,
		isPassable: () => true,
		getFloorType: () => "durasteel_span",
	};
}

describe("placeRobots", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("spawns robots from built placement flags", () => {
		const board = makeBoard(16, 16);
		const allIds = [
			"reclaimers",
			"volt_collective",
			"signal_choir",
			"iron_creed",
		];
		computeSpawnCenters(board, "reclaimers", allIds);
		const flags = buildPlacementFlags("reclaimers", allIds);
		placeRobots(world, flags, board);

		const units = world.query(UnitPos);
		// 6 player + 4+4+4 AI = 18 total
		expect(units.length).toBe(18);
	});

	it("places player units near spawn center", () => {
		const board = makeBoard(16, 16);
		computeSpawnCenters(board, "reclaimers", ["reclaimers"]);
		placeRobots(
			world,
			[
				{
					robotType: "infantry",
					factionId: "player",
					count: 1,
					zone: "player_start",
				},
			],
			board,
		);

		const units = world.query(UnitPos, UnitFaction);
		expect(units.length).toBe(1);
		const pos = units[0].get(UnitPos)!;
		const center = getSpawnCenters().get("player");
		expect(center).toBeDefined();
		expect(Math.abs(pos.tileX - center!.x)).toBeLessThanOrEqual(5);
		expect(Math.abs(pos.tileZ - center!.z)).toBeLessThanOrEqual(5);
	});

	it("places faction units near their spawn center", () => {
		const board = makeBoard(32, 32);
		computeSpawnCenters(board, null, ["reclaimers"]);
		placeRobots(
			world,
			[
				{
					robotType: "infantry",
					factionId: "reclaimers",
					count: 1,
					zone: "faction_start",
				},
			],
			board,
		);

		const units = world.query(UnitPos);
		expect(units.length).toBe(1);
		const pos = units[0].get(UnitPos)!;
		const center = getSpawnCenters().get("reclaimers");
		if (center) {
			expect(Math.abs(pos.tileX - center.x)).toBeLessThanOrEqual(5);
			expect(Math.abs(pos.tileZ - center.z)).toBeLessThanOrEqual(5);
		}
	});

	it("does not double-place on same tile", () => {
		const board = makeBoard(16, 16);
		computeSpawnCenters(board, "reclaimers", ["reclaimers"]);
		placeRobots(
			world,
			[
				{
					robotType: "infantry",
					factionId: "player",
					count: 3,
					zone: "player_start",
				},
			],
			board,
		);

		const positions = new Set<string>();
		for (const e of world.query(UnitPos)) {
			const p = e.get(UnitPos)!;
			const key = `${p.tileX},${p.tileZ}`;
			expect(positions.has(key)).toBe(false);
			positions.add(key);
		}
	});

	it("handles impassable board gracefully", () => {
		const board: SimpleBoardInfo = {
			width: 4,
			height: 4,
			isPassable: () => false,
		};
		computeSpawnCenters(board, "reclaimers", ["reclaimers"]);
		placeRobots(
			world,
			[
				{
					robotType: "infantry",
					factionId: "player",
					count: 1,
					zone: "player_start",
				},
			],
			board,
		);

		expect(world.query(UnitPos).length).toBe(0);
	});

	it("enforces minimum distance between faction spawns", () => {
		const board = makeBoard(64, 64);
		computeSpawnCenters(board);

		const centers = getSpawnCenters();
		const points = Array.from(centers.values());

		for (let i = 0; i < points.length; i++) {
			for (let j = i + 1; j < points.length; j++) {
				const dist =
					Math.abs(points[i].x - points[j].x) +
					Math.abs(points[i].z - points[j].z);
				expect(dist).toBeGreaterThanOrEqual(10);
			}
		}
	});

	it("terrain affinity prefers matching terrain clusters", () => {
		const board: SimpleBoardInfo = {
			width: 32,
			height: 32,
			isPassable: () => true,
			getFloorType: (x, z) => {
				if (x >= 3 && x <= 8 && z >= 3 && z <= 8) return "collapsed_zone";
				return "durasteel_span";
			},
		};
		computeSpawnCenters(board);

		const reclaimerCenter = getSpawnCenters().get("reclaimers");
		if (reclaimerCenter) {
			expect(reclaimerCenter.x).toBeLessThan(20);
			expect(reclaimerCenter.z).toBeLessThan(20);
		}
	});
});
