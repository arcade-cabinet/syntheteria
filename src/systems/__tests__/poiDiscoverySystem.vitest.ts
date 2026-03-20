import type { World } from "koota";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	Board,
	Faction,
	POIMarker,
	ResourcePool,
	UnitFaction,
	UnitPos,
} from "../../traits";
import {
	_resetPOIDiscovery,
	getActivePOIBonuses,
	hasActiveBonus,
	runPOIDiscovery,
} from "../poiDiscoverySystem";
import { placePOIs } from "../poiPlacement";
import { _resetToasts, getVisibleToasts } from "../toastNotifications";
import { resetTurnEventLog } from "../turnEventLog";

function setupWorld(): World {
	const world = createWorld();
	world.spawn(Board({ width: 20, height: 20, seed: "test", turn: 1 }));
	world.spawn(
		Faction({ id: "player", isPlayer: true, displayName: "Player" }),
		ResourcePool({}),
	);
	return world;
}

describe("POI placement", () => {
	let world: World;

	beforeEach(() => {
		world = setupWorld();
		_resetPOIDiscovery();
		_resetToasts();
		resetTurnEventLog();
	});

	afterEach(() => {
		world.destroy();
	});

	it("places POIs at correct tile coordinates", () => {
		placePOIs(world, 20, 20);

		const pois: Array<{ poiType: string; tileX: number; tileZ: number }> = [];
		for (const e of world.query(POIMarker)) {
			const m = e.get(POIMarker);
			if (m) pois.push({ poiType: m.poiType, tileX: m.tileX, tileZ: m.tileZ });
		}

		expect(pois.length).toBeGreaterThan(0);

		const homeBase = pois.find((p) => p.poiType === "home_base");
		expect(homeBase).toBeDefined();
		expect(homeBase!.tileX).toBe(Math.floor(0.5 * 20));
		expect(homeBase!.tileZ).toBe(Math.floor(0.5 * 20));

		const observatory = pois.find((p) => p.poiType === "holocron_observatory");
		expect(observatory).toBeDefined();
		expect(observatory!.tileX).toBe(Math.floor(0.1 * 20));
		expect(observatory!.tileZ).toBe(Math.floor(0.85 * 20));
	});

	it("places all 19 POI definitions", () => {
		placePOIs(world, 20, 20);

		let count = 0;
		for (const _e of world.query(POIMarker)) {
			count++;
		}
		expect(count).toBe(19);
	});
});

describe("POI discovery", () => {
	let world: World;

	beforeEach(() => {
		world = setupWorld();
		_resetPOIDiscovery();
		_resetToasts();
		resetTurnEventLog();
	});

	afterEach(() => {
		world.destroy();
	});

	it("unit moving to POI tile triggers discovery", () => {
		world.spawn(
			POIMarker({
				poiType: "ruin_depot",
				name: "Ruined Supply Depot",
				discovered: false,
				cleared: false,
				tileX: 5,
				tileZ: 5,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);

		runPOIDiscovery(world);

		for (const e of world.query(POIMarker)) {
			const m = e.get(POIMarker);
			if (m && m.poiType === "ruin_depot") {
				expect(m.discovered).toBe(true);
				expect(m.cleared).toBe(true);
			}
		}
	});

	it("grants correct reward type for ruin POI", () => {
		world.spawn(
			POIMarker({
				poiType: "ruin_depot",
				name: "Ruined Supply Depot",
				discovered: false,
				cleared: false,
				tileX: 5,
				tileZ: 5,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);

		runPOIDiscovery(world);

		for (const e of world.query(ResourcePool, Faction)) {
			const f = e.get(Faction);
			if (!f || f.id !== "player") continue;
			const pool = e.get(ResourcePool);
			expect(pool!.stone).toBe(75);
		}
	});

	it("each POI can only be discovered once", () => {
		world.spawn(
			POIMarker({
				poiType: "ruin_factory",
				name: "Abandoned Factory",
				discovered: false,
				cleared: false,
				tileX: 3,
				tileZ: 3,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 3, tileZ: 3 }),
			UnitFaction({ factionId: "player" }),
		);

		runPOIDiscovery(world);
		_resetToasts();

		runPOIDiscovery(world);

		const toasts = getVisibleToasts();
		expect(toasts.length).toBe(0);
	});

	it("holocron bonus activates correctly for observatory", () => {
		world.spawn(
			POIMarker({
				poiType: "holocron_observatory",
				name: "Shattered Observatory",
				discovered: false,
				cleared: false,
				tileX: 7,
				tileZ: 7,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 7, tileZ: 7 }),
			UnitFaction({ factionId: "player" }),
		);

		runPOIDiscovery(world);

		expect(hasActiveBonus("holocron_observatory")).toBe(true);
		const bonuses = getActivePOIBonuses();
		const obs = bonuses.find((b) => b.poiType === "holocron_observatory");
		expect(obs).toBeDefined();
		expect(obs!.turnsRemaining).toBe(20);
	});

	it("holocron bunker grants resources directly", () => {
		world.spawn(
			POIMarker({
				poiType: "holocron_bunker",
				name: "Pre-Storm Bunker",
				discovered: false,
				cleared: false,
				tileX: 8,
				tileZ: 8,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 8, tileZ: 8 }),
			UnitFaction({ factionId: "player" }),
		);

		runPOIDiscovery(world);

		for (const e of world.query(ResourcePool, Faction)) {
			const f = e.get(Faction);
			if (!f || f.id !== "player") continue;
			const pool = e.get(ResourcePool);
			expect(pool!.stone).toBe(100);
			expect(pool!.iron_ore).toBe(50);
			expect(pool!.timber).toBe(50);
		}
	});

	it("holocron EL site reveals cult POIs", () => {
		world.destroy();
		world = createWorld();
		world.spawn(Board({ width: 20, height: 20, seed: "test", turn: 31 }));
		world.spawn(
			Faction({ id: "player", isPlayer: true, displayName: "Player" }),
			ResourcePool({}),
		);

		world.spawn(
			POIMarker({
				poiType: "holocron_el_site",
				name: "EL Arrival Crater",
				discovered: false,
				cleared: false,
				tileX: 4,
				tileZ: 4,
			}),
		);
		world.spawn(
			POIMarker({
				poiType: "northern_cult_site",
				name: "Fracture Rift",
				discovered: false,
				cleared: false,
				tileX: 2,
				tileZ: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 4, tileZ: 4 }),
			UnitFaction({ factionId: "player" }),
		);

		runPOIDiscovery(world);

		for (const e of world.query(POIMarker)) {
			const m = e.get(POIMarker);
			if (m && m.poiType === "northern_cult_site") {
				expect(m.discovered).toBe(true);
			}
		}
	});

	it("non-player units do not trigger discovery", () => {
		world.spawn(
			POIMarker({
				poiType: "ruin_depot",
				name: "Ruined Supply Depot",
				discovered: false,
				cleared: false,
				tileX: 5,
				tileZ: 5,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "enemy" }),
		);

		runPOIDiscovery(world);

		for (const e of world.query(POIMarker)) {
			const m = e.get(POIMarker);
			if (m && m.poiType === "ruin_depot") {
				expect(m.discovered).toBe(false);
			}
		}
	});
});
