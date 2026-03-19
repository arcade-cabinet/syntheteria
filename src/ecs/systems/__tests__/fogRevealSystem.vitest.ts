import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { Tile, TileHighlight } from "../../traits/tile";
import { revealFog } from "../fogRevealSystem";

describe("fogRevealSystem", () => {
	let world: ReturnType<typeof createWorld>;

	function spawnTile(x: number, z: number) {
		return world.spawn(
			Tile({ x, z, elevation: 0, passable: true, explored: false, visibility: 0 }),
			TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
		);
	}

	beforeEach(() => {
		world = createWorld();
	});

	it("sets explored=true and visibility=1.0 for tiles within scanRange", () => {
		// 5x5 grid centered at (2,2)
		for (let z = 0; z < 5; z++) {
			for (let x = 0; x < 5; x++) {
				spawnTile(x, z);
			}
		}

		revealFog(world, 2, 2, 2);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			const dist = Math.abs(tile.x - 2) + Math.abs(tile.z - 2);
			if (dist <= 2) {
				expect(tile.explored, `(${tile.x},${tile.z}) should be explored`).toBe(true);
				expect(tile.visibility, `(${tile.x},${tile.z}) should have visibility 1.0`).toBe(1.0);
			}
		}
	});

	it("sets 0.7 visibility at scanRange+1 and 0.4 at scanRange+2", () => {
		// 11x11 grid centered at (5,5)
		for (let z = 0; z < 11; z++) {
			for (let x = 0; x < 11; x++) {
				spawnTile(x, z);
			}
		}

		const scanRange = 3;
		revealFog(world, 5, 5, scanRange);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			const dist = Math.abs(tile.x - 5) + Math.abs(tile.z - 5);

			if (dist <= scanRange) {
				expect(tile.explored).toBe(true);
				expect(tile.visibility).toBe(1.0);
			} else if (dist === scanRange + 1) {
				expect(tile.explored).toBe(false);
				expect(tile.visibility).toBe(0.7);
			} else if (dist === scanRange + 2) {
				expect(tile.explored).toBe(false);
				expect(tile.visibility).toBe(0.4);
			} else {
				// Beyond fringe — untouched
				expect(tile.explored).toBe(false);
				expect(tile.visibility).toBe(0);
			}
		}
	});

	it("never decreases visibility on already-explored tiles", () => {
		const entity = spawnTile(3, 3);
		entity.set(Tile, {
			...entity.get(Tile)!,
			explored: true,
			visibility: 1.0,
		});

		// Reveal from far away — tile is outside new scanRange + fringe
		revealFog(world, 0, 0, 1);

		const tile = entity.get(Tile)!;
		expect(tile.explored).toBe(true);
		expect(tile.visibility).toBe(1.0);
	});

	it("never decreases partial fringe visibility", () => {
		const entity = spawnTile(4, 0);
		entity.set(Tile, {
			...entity.get(Tile)!,
			visibility: 0.8,
		});

		// Reveal from (0,0) with scanRange=2 — tile at dist=4 is scanRange+2, fringeVis=0.4
		// Should not decrease from 0.8
		revealFog(world, 0, 0, 2);

		const tile = entity.get(Tile)!;
		expect(tile.visibility).toBe(0.8);
	});

	it("does not affect tiles beyond scanRange + 2", () => {
		spawnTile(0, 0);
		spawnTile(10, 0);

		revealFog(world, 0, 0, 2);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			if (tile.x === 10) {
				expect(tile.explored).toBe(false);
				expect(tile.visibility).toBe(0);
			}
		}
	});

	it("uses Manhattan distance (not Euclidean)", () => {
		// Tile at (2,2) from origin — Manhattan dist = 4
		spawnTile(0, 0);
		spawnTile(2, 2);

		revealFog(world, 0, 0, 3);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			if (tile.x === 2 && tile.z === 2) {
				// Manhattan distance = 4, which is scanRange+1 → fringe visibility 0.7
				expect(tile.explored).toBe(false);
				expect(tile.visibility).toBe(0.7);
			}
		}
	});

	it("handles scanRange of 0", () => {
		for (let z = 0; z < 3; z++) {
			for (let x = 0; x < 3; x++) {
				spawnTile(x, z);
			}
		}

		revealFog(world, 1, 1, 0);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			const dist = Math.abs(tile.x - 1) + Math.abs(tile.z - 1);
			if (dist === 0) {
				expect(tile.explored).toBe(true);
				expect(tile.visibility).toBe(1.0);
			} else if (dist === 1) {
				expect(tile.visibility).toBe(0.7);
			} else if (dist === 2) {
				expect(tile.visibility).toBe(0.4);
			}
		}
	});
});
