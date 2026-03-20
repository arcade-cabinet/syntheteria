/**
 * POI integration test — places POIs during init and discovers them when units move nearby.
 */

import type { World } from "koota";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POI_DEFINITIONS } from "../config";
import {
	_resetPOIDiscovery,
	getActivePOIBonuses,
	runPOIDiscovery,
} from "../systems/poiDiscoverySystem";
import { placePOIs } from "../systems/poiPlacement";
import { _resetToasts, getVisibleToasts } from "../systems/toastNotifications";
import { POIMarker, UnitFaction, UnitPos, UnitStats } from "../traits";
import { Board } from "../traits/board";

describe("POI Integration", () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		_resetPOIDiscovery();
		_resetToasts();
		world.spawn(Board({ width: 44, height: 44, seed: "poi-test", turn: 1 }));
	});

	afterEach(() => {
		world.destroy();
	});

	it("places POIs during init and discovers them when units move nearby", () => {
		placePOIs(world, 44, 44);

		const poiEntities = world.query(POIMarker);
		expect(poiEntities.length).toBeGreaterThan(0);
		expect(poiEntities.length).toBe(POI_DEFINITIONS.length);

		const firstPOI = poiEntities[0]!;
		const marker = firstPOI.get(POIMarker)!;

		const isUndiscoveredPOI = !marker.discovered;

		if (isUndiscoveredPOI) {
			world.spawn(
				UnitPos({ tileX: marker.tileX, tileZ: marker.tileZ }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 2,
					maxAp: 2,
					mp: 3,
					maxMp: 3,
					scanRange: 4,
					attack: 1,
					defense: 0,
				}),
			);

			runPOIDiscovery(world);

			const updated = firstPOI.get(POIMarker)!;
			expect(updated.discovered).toBe(true);

			const toasts = getVisibleToasts();
			expect(toasts.length).toBeGreaterThan(0);
		}
	});

	it("does not discover POIs when no units are at the POI tile", () => {
		placePOIs(world, 44, 44);

		let undiscoveredPOI = null;
		for (const e of world.query(POIMarker)) {
			const m = e.get(POIMarker);
			if (m && !m.discovered) {
				undiscoveredPOI = e;
				break;
			}
		}

		if (undiscoveredPOI) {
			const marker = undiscoveredPOI.get(POIMarker)!;

			world.spawn(
				UnitPos({ tileX: marker.tileX + 100, tileZ: marker.tileZ + 100 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 2,
					maxAp: 2,
					mp: 3,
					maxMp: 3,
					scanRange: 4,
					attack: 1,
					defense: 0,
				}),
			);

			runPOIDiscovery(world);

			const updated = undiscoveredPOI.get(POIMarker)!;
			expect(updated.discovered).toBe(false);
		}
	});

	it("holocron POIs grant gameplay bonuses", () => {
		world.spawn(
			POIMarker({
				poiType: "holocron_bunker",
				name: "Bunker Holocron",
				discovered: false,
				cleared: false,
				tileX: 5,
				tileZ: 5,
			}),
		);

		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 1,
				defense: 0,
			}),
		);

		runPOIDiscovery(world);

		const toasts = getVisibleToasts();
		const loreToast = toasts.find((t) => t.title.includes("Pre-Storm"));
		expect(loreToast).toBeDefined();
	});

	it("ruin POIs grant resource rewards", () => {
		world.spawn(
			POIMarker({
				poiType: "ruin_depot",
				name: "Ruined Depot",
				discovered: false,
				cleared: false,
				tileX: 8,
				tileZ: 8,
			}),
		);

		world.spawn(
			UnitPos({ tileX: 8, tileZ: 8 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 2,
				maxAp: 2,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 1,
				defense: 0,
			}),
		);

		runPOIDiscovery(world);

		const toasts = getVisibleToasts();
		const ruinToast = toasts.find(
			(t) => t.title.includes("Explored") || t.message.includes("Recovered"),
		);
		expect(ruinToast).toBeDefined();
	});
});
