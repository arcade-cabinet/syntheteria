/**
 * Human→Cult transition integration test — verifies epoch-aware encounter routing
 * and the EL arrival transition event across the full epoch spectrum.
 */

import type { World } from "koota";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeEpoch } from "../config";
import {
	_resetCultEncounters,
	fireCultEncounter,
	fireELArrival,
	fireHumanEncounter,
	hasELArrivalFired,
	hasFiredEncounter,
	hasFiredHumanEncounter,
} from "../systems/cultEncounterTracker";
import { _resetToasts, getVisibleToasts } from "../systems/toastNotifications";
import { Board } from "../traits";

function makeWorld(turn: number): World {
	const world = createWorld();
	world.spawn(Board({ width: 20, height: 20, seed: "transition-test", turn }));
	return world;
}

describe("Human to Cult Transition Integration", () => {
	let world: World;

	beforeEach(() => {
		_resetCultEncounters();
		_resetToasts();
	});

	afterEach(() => {
		if (world) world.destroy();
	});

	it("epoch 1-2 encounters use human terminology", () => {
		world = makeWorld(5);

		const epoch = computeEpoch(1, 5);
		expect(epoch.number).toBeLessThan(3);

		const fired = fireCultEncounter(world, "first_cult_sighting");
		expect(fired).toBe(true);

		expect(hasFiredHumanEncounter("first_human_sighting")).toBe(true);
		expect(hasFiredEncounter("first_cult_sighting")).toBe(false);

		const toasts = getVisibleToasts();
		const contactToast = toasts.find((t) => t.title === "Contact");
		expect(contactToast).toBeDefined();
		expect(contactToast!.message).toContain("machine intelligence");
	});

	it("epoch 3 triggers EL arrival", () => {
		world = makeWorld(31);

		const epoch = computeEpoch(1, 31);
		expect(epoch.number).toBeGreaterThanOrEqual(3);

		const fired = fireELArrival(world);
		expect(fired).toBe(true);
		expect(hasELArrivalFired()).toBe(true);

		const toasts = getVisibleToasts();
		const arrivalToast = toasts.find((t) => t.title === "The Wormhole Opens");
		expect(arrivalToast).toBeDefined();
	});

	it("epoch 3+ encounters use cult terminology", () => {
		world = makeWorld(31);

		const fired = fireCultEncounter(world, "first_cult_sighting");
		expect(fired).toBe(true);
		expect(hasFiredEncounter("first_cult_sighting")).toBe(true);

		const toasts = getVisibleToasts();
		const cultToast = toasts.find((t) => t.title === "Contact");
		expect(cultToast).toBeDefined();
		expect(cultToast!.message).toContain("Cult of EL");
	});

	it("human encounters fire exactly once per trigger", () => {
		world = makeWorld(5);

		expect(fireHumanEncounter(world, "first_human_sighting")).toBe(true);
		expect(fireHumanEncounter(world, "first_human_sighting")).toBe(false);
	});

	it("EL arrival fires exactly once", () => {
		world = makeWorld(31);

		expect(fireELArrival(world)).toBe(true);
		expect(fireELArrival(world)).toBe(false);
	});

	it("epoch 2 cult_structure trigger routes to human_city_found", () => {
		world = makeWorld(15);

		const fired = fireCultEncounter(world, "first_cult_structure");
		expect(fired).toBe(true);
		expect(hasFiredHumanEncounter("human_city_found")).toBe(true);
	});

	it("reset clears all encounter state", () => {
		world = makeWorld(5);

		fireHumanEncounter(world, "first_human_sighting");
		fireELArrival(world);

		_resetCultEncounters();

		expect(hasFiredHumanEncounter("first_human_sighting")).toBe(false);
		expect(hasELArrivalFired()).toBe(false);
	});
});
