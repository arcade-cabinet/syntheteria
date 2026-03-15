import { FloorCell } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	getFloorCellEntity,
	loadStructuralFragment,
	resetFloorCellEntities,
	setFloorCellDiscovery,
	spawnFloorCells,
} from "../structuralSpace";

afterEach(() => {
	// Clean up all FloorCell entities and index
	resetFloorCellEntities();
	// Also destroy any stray entities
	for (const e of Array.from(world.query(FloorCell))) {
		if (e.isAlive()) e.destroy();
	}
});

test("spawnFloorCells creates FloorCell entities in the world", () => {
	spawnFloorCells([
		{
			q: 1,
			r: 2,
			fragmentId: "frag1",
			structuralZone: "industrial",
			floorPresetId: "preset_a",
			discoveryState: 0,
			passable: true,
		},
	]);

	const cells = Array.from(world.query(FloorCell));
	expect(cells.length).toBe(1);
	const c = cells[0].get(FloorCell)!;
	expect(c.q).toBe(1);
	expect(c.r).toBe(2);
	expect(c.fragmentId).toBe("frag1");
	expect(c.discoveryState).toBe(0);
	expect(c.passable).toBe(true);
});

test("spawnFloorCells updates existing entity rather than spawning duplicate", () => {
	spawnFloorCells([
		{
			q: 3,
			r: 4,
			fragmentId: "frag1",
			structuralZone: "storage",
			floorPresetId: "preset_b",
			discoveryState: 0,
			passable: true,
		},
	]);

	// Spawn again with same key
	spawnFloorCells([
		{
			q: 3,
			r: 4,
			fragmentId: "frag1",
			structuralZone: "storage",
			floorPresetId: "preset_b",
			discoveryState: 1,
			passable: true,
		},
	]);

	const cells = Array.from(world.query(FloorCell));
	expect(cells.length).toBe(1);
	expect(cells[0].get(FloorCell)!.discoveryState).toBe(1);
});

test("getFloorCellEntity returns the entity for a given coordinate", () => {
	spawnFloorCells([
		{
			q: 5,
			r: 6,
			fragmentId: "f2",
			structuralZone: "power",
			floorPresetId: "preset_c",
			discoveryState: 2,
			passable: false,
		},
	]);

	const entity = getFloorCellEntity(5, 6, "f2");
	expect(entity).toBeDefined();
	expect(entity!.get(FloorCell)!.discoveryState).toBe(2);
});

test("getFloorCellEntity returns undefined for unknown coordinates", () => {
	expect(getFloorCellEntity(99, 99, "nonexistent")).toBeUndefined();
});

test("setFloorCellDiscovery updates discoveryState on the entity", () => {
	spawnFloorCells([
		{
			q: 1,
			r: 2,
			fragmentId: "frag1",
			structuralZone: "industrial",
			floorPresetId: "preset_a",
			discoveryState: 0,
			passable: true,
		},
	]);

	setFloorCellDiscovery(1, 2, "frag1", 2);

	const entity = getFloorCellEntity(1, 2, "frag1");
	expect(entity!.get(FloorCell)!.discoveryState).toBe(2);
});

test("setFloorCellDiscovery is a no-op for unknown coordinates", () => {
	// Should not throw
	expect(() => setFloorCellDiscovery(99, 99, "nope", 1)).not.toThrow();
});

test("resetFloorCellEntities destroys all FloorCell entities", () => {
	spawnFloorCells([
		{
			q: 1,
			r: 1,
			fragmentId: "f",
			structuralZone: "z",
			floorPresetId: "p",
			discoveryState: 0,
			passable: true,
		},
		{
			q: 2,
			r: 2,
			fragmentId: "f",
			structuralZone: "z",
			floorPresetId: "p",
			discoveryState: 0,
			passable: true,
		},
	]);

	expect(Array.from(world.query(FloorCell)).length).toBe(2);
	resetFloorCellEntities();
	expect(Array.from(world.query(FloorCell)).length).toBe(0);
	expect(getFloorCellEntity(1, 1, "f")).toBeUndefined();
});
