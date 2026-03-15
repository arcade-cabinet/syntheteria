import { TerritoryCell as TerritoryCellTrait } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	clearTerritoryCells,
	getTerritoryOwner,
	resetTerritorySystem,
	spawnTerritoryCell,
} from "../territorySystem";

afterEach(() => {
	resetTerritorySystem();
	// Destroy any stray TerritoryCell entities
	for (const e of Array.from(world.query(TerritoryCellTrait))) {
		if (e.isAlive()) e.destroy();
	}
});

test("spawnTerritoryCell creates a TerritoryCell entity in the world", () => {
	spawnTerritoryCell(3, 5, "reclaimers", 2);

	const cells = Array.from(world.query(TerritoryCellTrait));
	expect(cells.length).toBe(1);
	const c = cells[0].get(TerritoryCellTrait)!;
	expect(c.q).toBe(3);
	expect(c.r).toBe(5);
	expect(c.owner).toBe("reclaimers");
	expect(c.strength).toBe(2);
});

test("spawnTerritoryCell updates existing entity rather than spawning duplicate", () => {
	spawnTerritoryCell(1, 1, "volt_collective", 1);
	spawnTerritoryCell(1, 1, "volt_collective", 3);

	const cells = Array.from(world.query(TerritoryCellTrait));
	expect(cells.length).toBe(1);
	expect(cells[0].get(TerritoryCellTrait)!.strength).toBe(3);
});

test("getTerritoryOwner returns the owner faction after spawn", () => {
	spawnTerritoryCell(2, 4, "iron_creed", 1);
	expect(getTerritoryOwner(2, 4)).toBe("iron_creed");
});

test("getTerritoryOwner returns null for unclaimed cells", () => {
	expect(getTerritoryOwner(99, 99)).toBeNull();
});

test("clearTerritoryCells destroys all TerritoryCell entities", () => {
	spawnTerritoryCell(0, 0, "reclaimers", 1);
	spawnTerritoryCell(1, 0, "volt_collective", 1);

	expect(Array.from(world.query(TerritoryCellTrait)).length).toBe(2);
	clearTerritoryCells();
	expect(Array.from(world.query(TerritoryCellTrait)).length).toBe(0);
	expect(getTerritoryOwner(0, 0)).toBeNull();
});

test("resetTerritorySystem clears all TerritoryCell entities", () => {
	spawnTerritoryCell(5, 5, "signal_choir", 2);
	resetTerritorySystem();
	expect(Array.from(world.query(TerritoryCellTrait)).length).toBe(0);
	expect(getTerritoryOwner(5, 5)).toBeNull();
});
