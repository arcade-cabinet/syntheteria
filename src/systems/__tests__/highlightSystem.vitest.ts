import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import {
	clearHighlights,
	highlightReachableTiles,
} from "../highlightSystem";
import { Tile, TileHighlight } from "../../traits";

function spawn3x3Grid(world: ReturnType<typeof createWorld>) {
	for (let x = 0; x < 3; x++) {
		for (let z = 0; z < 3; z++) {
			world.spawn(
				Tile({ x, z, elevation: 0, passable: true }),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
			);
		}
	}
}

function getTileHighlight(
	world: ReturnType<typeof createWorld>,
	x: number,
	z: number,
) {
	for (const e of world.query(Tile, TileHighlight)) {
		const t = e.get(Tile)!;
		if (t.x === x && t.z === z) {
			return e.get(TileHighlight)!;
		}
	}
	return null;
}

describe("highlightSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	it("highlights center tile as selected", () => {
		spawn3x3Grid(world);
		highlightReachableTiles(world, 1, 1, 1);

		const center = getTileHighlight(world, 1, 1);
		expect(center).not.toBeNull();
		expect(center!.emissive).toBe(1.0);
		expect(center!.reason).toBe("selected");
	});

	it("highlights 4 neighbors as reachable with ap=1", () => {
		spawn3x3Grid(world);
		highlightReachableTiles(world, 1, 1, 1);

		const neighbors = [
			[0, 1],
			[2, 1],
			[1, 0],
			[1, 2],
		];
		for (const [x, z] of neighbors) {
			const h = getTileHighlight(world, x, z);
			expect(h).not.toBeNull();
			expect(h!.emissive).toBe(0.6);
			expect(h!.reason).toBe("reachable");
		}
	});

	it("does not highlight corners with ap=1", () => {
		spawn3x3Grid(world);
		highlightReachableTiles(world, 1, 1, 1);

		const corners = [
			[0, 0],
			[2, 0],
			[0, 2],
			[2, 2],
		];
		for (const [x, z] of corners) {
			const h = getTileHighlight(world, x, z);
			expect(h).not.toBeNull();
			expect(h!.emissive).toBe(0.0);
			expect(h!.reason).toBe("none");
		}
	});

	it("highlights all tiles with ap=2 on 3x3 grid", () => {
		spawn3x3Grid(world);
		highlightReachableTiles(world, 1, 1, 2);

		// All 9 tiles should be reachable or selected
		for (let x = 0; x < 3; x++) {
			for (let z = 0; z < 3; z++) {
				const h = getTileHighlight(world, x, z);
				expect(h).not.toBeNull();
				expect(h!.emissive).toBeGreaterThan(0);
			}
		}
	});

	it("clearHighlights sets all emissive to 0", () => {
		spawn3x3Grid(world);
		highlightReachableTiles(world, 1, 1, 1);
		clearHighlights(world);

		for (const e of world.query(TileHighlight)) {
			const h = e.get(TileHighlight)!;
			expect(h.emissive).toBe(0.0);
			expect(h.reason).toBe("none");
		}
	});

	it("respects impassable tiles", () => {
		// Spawn a 3x3 grid but make (1,0) impassable
		for (let x = 0; x < 3; x++) {
			for (let z = 0; z < 3; z++) {
				const passable = !(x === 1 && z === 0);
				world.spawn(
					Tile({ x, z, elevation: 0, passable }),
					TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
				);
			}
		}

		highlightReachableTiles(world, 1, 1, 1);

		// (1,0) should not be reachable
		const blocked = getTileHighlight(world, 1, 0);
		expect(blocked).not.toBeNull();
		expect(blocked!.reason).toBe("none");
	});
});
