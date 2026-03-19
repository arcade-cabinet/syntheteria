import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { Tile, TileHighlight } from "../../traits/tile";
import { revealFog } from "../fogRevealSystem";

describe("fogRevealSystem", () => {
	let world: ReturnType<typeof createWorld>;

	function spawnTile(x: number, z: number) {
		return world.spawn(
			Tile({ x, z, elevation: 0, passable: true, explored: true, visibility: 1 }),
			TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
		);
	}

	beforeEach(() => {
		world = createWorld();
	});

	it("tiles start explored with full visibility", () => {
		spawnTile(2, 2);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			expect(tile.explored).toBe(true);
			expect(tile.visibility).toBe(1.0);
		}
	});

	it("revealFog is a no-op on already-explored tiles", () => {
		for (let z = 0; z < 5; z++) {
			for (let x = 0; x < 5; x++) {
				spawnTile(x, z);
			}
		}

		revealFog(world, 2, 2, 2);

		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			expect(tile.explored).toBe(true);
			expect(tile.visibility).toBe(1.0);
		}
	});

	it("never decreases visibility", () => {
		const entity = spawnTile(3, 3);

		revealFog(world, 0, 0, 1);

		const tile = entity.get(Tile)!;
		expect(tile.explored).toBe(true);
		expect(tile.visibility).toBe(1.0);
	});
});
