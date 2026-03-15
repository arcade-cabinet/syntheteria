/**
 * T16: POI as Koota entities
 *
 * Verifies that spawnPOIEntities creates POITrait entities from snapshots,
 * clearPOIEntities destroys them, and a second call to spawnPOIEntities
 * replaces the previous set.
 */

import { POITrait } from "../../ecs/traits";
import { world } from "../../ecs/world";
import { clearPOIEntities, spawnPOIEntities } from "../poiEntities";

// ── Helpers ──────────────────────────────────────────────────────────────────

function queryPOIs() {
	return Array.from(world.query(POITrait));
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

afterEach(() => {
	clearPOIEntities();
	for (const e of world.query(POITrait)) {
		if (e.isAlive()) e.destroy();
	}
});

// ── Tests ────────────────────────────────────────────────────────────────────

test("spawnPOIEntities creates one entity per snapshot", () => {
	spawnPOIEntities([
		{
			id: 1,
			ecumenopolis_id: 1,
			type: "home_base",
			name: "Base Alpha",
			q: 3,
			r: 7,
			discovered: 1,
		},
		{
			id: 2,
			ecumenopolis_id: 1,
			type: "research_site",
			name: "Lab 1",
			q: 10,
			r: 5,
			discovered: 0,
		},
	]);
	expect(queryPOIs().length).toBe(2);
});

test("spawned POI entity has correct field values", () => {
	spawnPOIEntities([
		{
			id: 5,
			ecumenopolis_id: 1,
			type: "faction_outpost",
			name: "Relay North",
			q: 4,
			r: 8,
			discovered: 1,
		},
	]);
	const poi = queryPOIs()[0].get(POITrait)!;
	expect(poi.q).toBe(4);
	expect(poi.r).toBe(8);
	expect(poi.poiType).toBe("faction_outpost");
	expect(poi.name).toBe("Relay North");
	expect(poi.discovered).toBe(true);
});

test("discovered: 0 maps to false", () => {
	spawnPOIEntities([
		{
			id: 6,
			ecumenopolis_id: 1,
			type: "ruin",
			name: "Ancient Ruin",
			q: 1,
			r: 1,
			discovered: 0,
		},
	]);
	expect(queryPOIs()[0].get(POITrait)!.discovered).toBe(false);
});

test("clearPOIEntities destroys all entities", () => {
	spawnPOIEntities([
		{
			id: 7,
			ecumenopolis_id: 1,
			type: "home_base",
			name: "Base",
			q: 0,
			r: 0,
			discovered: 1,
		},
	]);
	expect(queryPOIs().length).toBe(1);
	clearPOIEntities();
	expect(queryPOIs().length).toBe(0);
});

test("calling spawnPOIEntities twice replaces previous set", () => {
	spawnPOIEntities([
		{
			id: 8,
			ecumenopolis_id: 1,
			type: "home_base",
			name: "Old",
			q: 0,
			r: 0,
			discovered: 1,
		},
		{
			id: 9,
			ecumenopolis_id: 1,
			type: "ruin",
			name: "Old2",
			q: 1,
			r: 1,
			discovered: 0,
		},
	]);
	expect(queryPOIs().length).toBe(2);

	spawnPOIEntities([
		{
			id: 10,
			ecumenopolis_id: 1,
			type: "resource_depot",
			name: "New",
			q: 5,
			r: 5,
			discovered: 1,
		},
	]);
	expect(queryPOIs().length).toBe(1);
	expect(queryPOIs()[0].get(POITrait)!.name).toBe("New");
});

test("spawnPOIEntities with empty array clears all", () => {
	spawnPOIEntities([
		{
			id: 11,
			ecumenopolis_id: 1,
			type: "home_base",
			name: "Base",
			q: 0,
			r: 0,
			discovered: 1,
		},
	]);
	spawnPOIEntities([]);
	expect(queryPOIs().length).toBe(0);
});
