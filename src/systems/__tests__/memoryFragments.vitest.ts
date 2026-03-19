import { beforeEach, describe, expect, it } from "vitest";
import {
	checkProximity,
	getAllFragmentDefinitions,
	getFragmentDefinition,
	getFragmentProgress,
	getInteractionRadius,
	getPlacedFragments,
	getReadFragments,
	isDiscovered,
	isRead,
	placeFragment,
	placeFragmentsInWorld,
	readFragment,
	resetMemoryFragments,
} from "../memoryFragments";

beforeEach(() => {
	resetMemoryFragments();
});

describe("config access", () => {
	it("getAllFragmentDefinitions returns fragments", () => {
		const defs = getAllFragmentDefinitions();
		expect(defs.length).toBeGreaterThan(0);
		expect(defs[0]).toHaveProperty("id");
		expect(defs[0]).toHaveProperty("title");
		expect(defs[0]).toHaveProperty("text");
	});

	it("getFragmentDefinition returns correct fragment", () => {
		const def = getFragmentDefinition("fragment_001");
		expect(def).toBeDefined();
		expect(def!.title).toBe("Colony Log Alpha-7");
	});

	it("getInteractionRadius returns positive number", () => {
		expect(getInteractionRadius()).toBeGreaterThan(0);
	});
});

describe("placing fragments", () => {
	it("placeFragment adds to placed list", () => {
		placeFragment("fragment_001", 10, 20);
		const placed = getPlacedFragments();
		expect(placed).toHaveLength(1);
		expect(placed[0]!.fragmentId).toBe("fragment_001");
		expect(placed[0]!.worldX).toBe(10);
		expect(placed[0]!.worldZ).toBe(20);
		expect(placed[0]!.discovered).toBe(false);
	});

	it("placeFragmentsInWorld places multiple from locations", () => {
		const locations = [
			{ x: 5, z: 5 },
			{ x: 15, z: 15 },
			{ x: 25, z: 25 },
		];
		placeFragmentsInWorld(locations, 42);
		expect(getPlacedFragments()).toHaveLength(3);
	});
});

describe("proximity discovery", () => {
	it("discovers fragments within radius", () => {
		placeFragment("fragment_001", 10, 10);
		const discovered = checkProximity(10, 10); // Exact position
		expect(discovered).toContain("fragment_001");
		expect(isDiscovered("fragment_001")).toBe(true);
	});

	it("does not discover fragments outside radius", () => {
		placeFragment("fragment_001", 10, 10);
		const discovered = checkProximity(100, 100); // Far away
		expect(discovered).toHaveLength(0);
		expect(isDiscovered("fragment_001")).toBe(false);
	});

	it("does not re-discover already discovered fragments", () => {
		placeFragment("fragment_001", 10, 10);
		checkProximity(10, 10);
		const second = checkProximity(10, 10);
		expect(second).toHaveLength(0); // Already discovered
	});
});

describe("reading fragments", () => {
	it("readFragment returns definition and marks as read", () => {
		placeFragment("fragment_001", 10, 10);
		checkProximity(10, 10);

		const def = readFragment("fragment_001");
		expect(def).toBeDefined();
		expect(def!.id).toBe("fragment_001");
		expect(isRead("fragment_001")).toBe(true);
	});

	it("readFragment returns null for unknown fragment", () => {
		expect(readFragment("nonexistent")).toBeNull();
	});

	it("getReadFragments returns all read fragments", () => {
		placeFragment("fragment_001", 10, 10);
		placeFragment("fragment_002", 20, 20);
		checkProximity(10, 10);
		readFragment("fragment_001");

		const read = getReadFragments();
		expect(read).toHaveLength(1);
		expect(read[0]!.id).toBe("fragment_001");
	});
});

describe("progress tracking", () => {
	it("getFragmentProgress tracks counts", () => {
		const totalFragments = getAllFragmentDefinitions().length;

		placeFragment("fragment_001", 10, 10);
		placeFragment("fragment_002", 20, 20);

		let progress = getFragmentProgress();
		expect(progress.discovered).toBe(0);
		expect(progress.read).toBe(0);
		expect(progress.total).toBe(totalFragments);

		checkProximity(10, 10);
		progress = getFragmentProgress();
		expect(progress.discovered).toBe(1);

		readFragment("fragment_001");
		progress = getFragmentProgress();
		expect(progress.read).toBe(1);
	});
});

describe("reset", () => {
	it("resetMemoryFragments clears all state", () => {
		placeFragment("fragment_001", 10, 10);
		checkProximity(10, 10);
		readFragment("fragment_001");

		resetMemoryFragments();

		expect(getPlacedFragments()).toHaveLength(0);
		expect(isDiscovered("fragment_001")).toBe(false);
		expect(isRead("fragment_001")).toBe(false);
	});
});
