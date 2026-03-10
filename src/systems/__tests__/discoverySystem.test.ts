/**
 * Unit tests for the discovery system.
 *
 * Tests cover:
 * - Proximity detection starts scan
 * - Scan completes after scanTime
 * - Each discovery claimed only once
 * - Camera bots scan faster
 * - Rewards granted on discovery
 * - Multiple discoveries tracked independently
 * - Reset clears state
 * - Edge cases: no units, no sites, out-of-range
 */

import {
	discoverySystem,
	getDiscoveries,
	getDiscoveredSites,
	getDiscoveryEvents,
	placeDiscoverySite,
	resetDiscoveries,
	setGetUnits,
	setOnDiscovery,
} from "../discoverySystem";
import type { UnitInfo, DiscoveryEvent } from "../discoverySystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetDiscoveries();
});

// ---------------------------------------------------------------------------
// Proximity detection
// ---------------------------------------------------------------------------

describe("discovery — proximity detection", () => {
	it("starts scan when unit is within proximity range", () => {
		placeDiscoverySite(10, 10, "ore_vein"); // proximityRange: 5.0
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 12, z: 10, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem();

		const sites = getDiscoveries();
		expect(sites[0].scanProgress).toBeGreaterThan(0);
	});

	it("does not start scan when unit is outside proximity range", () => {
		placeDiscoverySite(10, 10, "ore_vein"); // proximityRange: 5.0
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 100, z: 100, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem();

		const sites = getDiscoveries();
		expect(sites[0].scanProgress).toBe(0);
	});

	it("scan progresses by 1 per tick for normal units", () => {
		placeDiscoverySite(0, 0, "data_cache"); // scanTime: 8
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem();
		discoverySystem();
		discoverySystem();

		const sites = getDiscoveries();
		expect(sites[0].scanProgress).toBe(3);
	});

	it("unit at exact boundary of proximity range triggers scan", () => {
		placeDiscoverySite(0, 0, "ancient_ruin"); // proximityRange: 3.0
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 3, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem();

		const sites = getDiscoveries();
		expect(sites[0].scanProgress).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Scan completion
// ---------------------------------------------------------------------------

describe("discovery — scan completion", () => {
	it("completes scan after scanTime ticks", () => {
		placeDiscoverySite(0, 0, "ore_vein"); // scanTime: 2
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem(); // scanProgress: 1
		discoverySystem(); // scanProgress: 2 -> discovered

		const sites = getDiscoveries();
		expect(sites[0].discovered).toBe(true);
		expect(sites[0].discoveredBy).toBe("player");
	});

	it("does not complete scan before scanTime", () => {
		placeDiscoverySite(0, 0, "data_cache"); // scanTime: 8
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		for (let i = 0; i < 7; i++) {
			discoverySystem();
		}

		const sites = getDiscoveries();
		expect(sites[0].discovered).toBe(false);
		expect(sites[0].scanProgress).toBe(7);
	});

	it("fires onDiscovery callback on completion", () => {
		const cb = jest.fn();
		setOnDiscovery(cb);

		placeDiscoverySite(0, 0, "ore_vein"); // scanTime: 2
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem();
		discoverySystem();

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ore_vein",
				faction: "player",
				reward: expect.objectContaining({ type: "resource" }),
			}),
		);
	});

	it("provides reward information in discovery event", () => {
		placeDiscoverySite(0, 0, "data_cache"); // reward: { type: "compute", value: 100 }
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		for (let i = 0; i < 8; i++) {
			discoverySystem();
		}

		const events = getDiscoveryEvents();
		expect(events).toHaveLength(1);
		expect(events[0].reward.type).toBe("compute");
		expect(events[0].reward.value).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// Each discovery claimed only once
// ---------------------------------------------------------------------------

describe("discovery — single claim", () => {
	it("already discovered sites are not scanned again", () => {
		placeDiscoverySite(0, 0, "ore_vein"); // scanTime: 2
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem(); // 1
		discoverySystem(); // 2 -> discovered

		const cb = jest.fn();
		setOnDiscovery(cb);

		// Additional ticks should not re-trigger
		discoverySystem();
		discoverySystem();
		discoverySystem();

		expect(cb).not.toHaveBeenCalled();
	});

	it("different factions cannot claim an already-discovered site", () => {
		placeDiscoverySite(0, 0, "ore_vein"); // scanTime: 2

		// Player discovers it first
		setGetUnits(() => [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		]);
		discoverySystem();
		discoverySystem(); // discovered by player

		// Enemy unit moves in
		setGetUnits(() => [
			{ id: "e1", faction: "volt_collective", x: 0, z: 0, hasCamera: false },
		]);
		discoverySystem();

		const sites = getDiscoveries();
		expect(sites[0].discoveredBy).toBe("player"); // still player's
	});
});

// ---------------------------------------------------------------------------
// Camera bots scan faster
// ---------------------------------------------------------------------------

describe("discovery — camera bonus", () => {
	it("camera-equipped bots scan at double speed", () => {
		placeDiscoverySite(0, 0, "data_cache"); // scanTime: 8
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: true },
		];
		setGetUnits(() => units);

		// Camera bot: 2 per tick, so 4 ticks = 8 scan progress
		for (let i = 0; i < 4; i++) {
			discoverySystem();
		}

		const sites = getDiscoveries();
		expect(sites[0].discovered).toBe(true);
	});

	it("normal bot takes full scanTime ticks", () => {
		placeDiscoverySite(0, 0, "data_cache"); // scanTime: 8
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		// Normal bot: 1 per tick, so 4 ticks = only 4 progress
		for (let i = 0; i < 4; i++) {
			discoverySystem();
		}

		const sites = getDiscoveries();
		expect(sites[0].discovered).toBe(false);
		expect(sites[0].scanProgress).toBe(4);
	});

	it("camera bonus completes otter_nest scan in 2 ticks instead of 3", () => {
		placeDiscoverySite(0, 0, "otter_nest"); // scanTime: 3
		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: true },
		];
		setGetUnits(() => units);

		discoverySystem(); // 2
		discoverySystem(); // 4 >= 3 -> discovered

		const sites = getDiscoveries();
		expect(sites[0].discovered).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Multiple discoveries
// ---------------------------------------------------------------------------

describe("discovery — multiple sites", () => {
	it("tracks discoveries independently", () => {
		const siteA = placeDiscoverySite(0, 0, "ore_vein"); // scanTime: 2
		const siteB = placeDiscoverySite(50, 50, "data_cache"); // scanTime: 8

		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem();
		discoverySystem();

		const sites = getDiscoveries();
		const a = sites.find((s) => s.id === siteA)!;
		const b = sites.find((s) => s.id === siteB)!;

		expect(a.discovered).toBe(true);
		expect(b.discovered).toBe(false);
		expect(b.scanProgress).toBe(0); // unit was never near site B
	});

	it("different units can scan different sites simultaneously", () => {
		placeDiscoverySite(0, 0, "ore_vein"); // scanTime: 2
		placeDiscoverySite(50, 50, "ore_vein"); // scanTime: 2

		const units: UnitInfo[] = [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
			{ id: "u2", faction: "player", x: 50, z: 50, hasCamera: false },
		];
		setGetUnits(() => units);

		discoverySystem();
		discoverySystem();

		const sites = getDiscoveries();
		expect(sites[0].discovered).toBe(true);
		expect(sites[1].discovered).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getDiscoveredSites
// ---------------------------------------------------------------------------

describe("discovery — getDiscoveredSites", () => {
	it("returns only sites discovered by the specified faction", () => {
		placeDiscoverySite(0, 0, "ore_vein");
		placeDiscoverySite(50, 50, "ore_vein");

		// Player discovers first site
		setGetUnits(() => [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		]);
		discoverySystem();
		discoverySystem();

		// Enemy discovers second site
		setGetUnits(() => [
			{ id: "e1", faction: "volt_collective", x: 50, z: 50, hasCamera: false },
		]);
		discoverySystem();
		discoverySystem();

		const playerSites = getDiscoveredSites("player");
		const enemySites = getDiscoveredSites("volt_collective");

		expect(playerSites).toHaveLength(1);
		expect(enemySites).toHaveLength(1);
		expect(playerSites[0].discoveredBy).toBe("player");
		expect(enemySites[0].discoveredBy).toBe("volt_collective");
	});

	it("returns empty array for faction with no discoveries", () => {
		placeDiscoverySite(0, 0, "ore_vein");
		expect(getDiscoveredSites("iron_creed")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("discovery — reset", () => {
	it("clears all sites", () => {
		placeDiscoverySite(0, 0, "ore_vein");
		placeDiscoverySite(10, 10, "data_cache");

		resetDiscoveries();

		expect(getDiscoveries()).toHaveLength(0);
	});

	it("clears events", () => {
		placeDiscoverySite(0, 0, "ore_vein");
		setGetUnits(() => [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		]);
		discoverySystem();
		discoverySystem();

		resetDiscoveries();
		expect(getDiscoveryEvents()).toHaveLength(0);
	});

	it("resets site ID counter", () => {
		placeDiscoverySite(0, 0, "ore_vein");
		resetDiscoveries();

		const id = placeDiscoverySite(5, 5, "data_cache");
		expect(id).toBe("discovery_1");
	});

	it("resets hooks to defaults", () => {
		const customCb = jest.fn();
		setOnDiscovery(customCb);

		resetDiscoveries();

		placeDiscoverySite(0, 0, "ore_vein");
		setGetUnits(() => [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		]);
		discoverySystem();
		discoverySystem();

		// After reset, the custom callback should not be called
		expect(customCb).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("discovery — edge cases", () => {
	it("runs safely with no units", () => {
		placeDiscoverySite(0, 0, "ore_vein");
		setGetUnits(() => []);

		expect(() => discoverySystem()).not.toThrow();

		const sites = getDiscoveries();
		expect(sites[0].scanProgress).toBe(0);
	});

	it("runs safely with no sites", () => {
		setGetUnits(() => [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		]);

		expect(() => discoverySystem()).not.toThrow();
		expect(getDiscoveryEvents()).toHaveLength(0);
	});

	it("handles unknown discovery type gracefully", () => {
		placeDiscoverySite(0, 0, "nonexistent_type");
		setGetUnits(() => [
			{ id: "u1", faction: "player", x: 0, z: 0, hasCamera: false },
		]);

		expect(() => discoverySystem()).not.toThrow();

		const sites = getDiscoveries();
		expect(sites[0].scanProgress).toBe(0);
		expect(sites[0].discovered).toBe(false);
	});

	it("getDiscoveries returns a copy, not the internal array", () => {
		placeDiscoverySite(0, 0, "ore_vein");
		const sites1 = getDiscoveries();
		const sites2 = getDiscoveries();
		expect(sites1).not.toBe(sites2);
		expect(sites1).toEqual(sites2);
	});
});
