import type { World } from "koota";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Board } from "../../traits";
import {
	_resetCultEncounters,
	fireCultEncounter,
	fireELArrival,
	fireHumanEncounter,
	hasELArrivalFired,
	hasFiredEncounter,
	hasFiredHumanEncounter,
} from "../cultEncounterTracker";
import { _resetToasts, getVisibleToasts } from "../toastNotifications";

function makeWorld(turn: number): World {
	const world = createWorld();
	world.spawn(Board({ width: 20, height: 20, seed: "test", turn }));
	return world;
}

describe("Human → Cult transition (epoch-aware encounters)", () => {
	let world: World;

	beforeEach(() => {
		_resetCultEncounters();
		_resetToasts();
	});

	afterEach(() => {
		if (world) world.destroy();
	});

	it("Epoch 1-2: cult triggers re-route to human-themed messages", () => {
		world = makeWorld(5);

		const fired = fireCultEncounter(world, "first_cult_sighting");
		expect(fired).toBe(true);
		expect(hasFiredHumanEncounter("first_human_sighting")).toBe(true);
		expect(hasFiredEncounter("first_cult_sighting")).toBe(false);

		const toasts = getVisibleToasts();
		const contactToast = toasts.find((t) => t.title === "Contact");
		expect(contactToast).toBeDefined();
		expect(contactToast!.message).toContain("machine intelligence");
	});

	it("Epoch 1-2: cult triggers without human mapping are suppressed", () => {
		world = makeWorld(5);

		const fired = fireCultEncounter(world, "cult_archon_appears");
		expect(fired).toBe(false);
	});

	it("Epoch 3: EL arrival transition event fires", () => {
		world = makeWorld(31);

		const fired = fireELArrival(world);
		expect(fired).toBe(true);
		expect(hasELArrivalFired()).toBe(true);

		const toasts = getVisibleToasts();
		const arrivalToast = toasts.find((t) => t.title === "The Wormhole Opens");
		expect(arrivalToast).toBeDefined();
		expect(arrivalToast!.message).toContain("THE WORMHOLE OPENS");
	});

	it("Epoch 3+: cult encounters fire normally", () => {
		world = makeWorld(31);

		const fired = fireCultEncounter(world, "first_cult_sighting");
		expect(fired).toBe(true);
		expect(hasFiredEncounter("first_cult_sighting")).toBe(true);

		const toasts = getVisibleToasts();
		const cultToast = toasts.find((t) => t.title === "Contact");
		expect(cultToast).toBeDefined();
		expect(cultToast!.message).toContain("Cult of EL");
	});

	it("EL arrival transition fires exactly once", () => {
		world = makeWorld(31);

		const first = fireELArrival(world);
		expect(first).toBe(true);

		const second = fireELArrival(world);
		expect(second).toBe(false);
	});

	it("human encounters fire exactly once", () => {
		world = makeWorld(5);

		const first = fireHumanEncounter(world, "first_human_sighting");
		expect(first).toBe(true);

		const second = fireHumanEncounter(world, "first_human_sighting");
		expect(second).toBe(false);
	});

	it("Epoch 2: human_city_found fires via cult_structure trigger", () => {
		world = makeWorld(15);

		const fired = fireCultEncounter(world, "first_cult_structure");
		expect(fired).toBe(true);
		expect(hasFiredHumanEncounter("human_city_found")).toBe(true);

		const toasts = getVisibleToasts();
		const settleToast = toasts.find((t) => t.title === "Human Settlement");
		expect(settleToast).toBeDefined();
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
