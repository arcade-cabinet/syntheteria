/**
 * Tests for roboformOverlay — the roboforming visual progression overlay.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	clearRoboformData,
	getRoboformLevel,
	getRoboformSnapshot,
	setRoboformLevel,
} from "../renderers/roboformOverlay";

describe("roboformOverlay", () => {
	beforeEach(() => {
		clearRoboformData();
	});

	describe("setRoboformLevel / getRoboformLevel", () => {
		it("returns 0 for tiles with no roboform data", () => {
			expect(getRoboformLevel(5, 10)).toBe(0);
		});

		it("stores and retrieves roboform level for a tile", () => {
			setRoboformLevel(3, 7, 2, "player");
			expect(getRoboformLevel(3, 7)).toBe(2);
		});

		it("stores fractional levels", () => {
			setRoboformLevel(1, 1, 2.5, "player");
			expect(getRoboformLevel(1, 1)).toBe(2.5);
		});

		it("clamps level to max 4", () => {
			setRoboformLevel(0, 0, 10, "player");
			expect(getRoboformLevel(0, 0)).toBe(4);
		});

		it("removes tile data when level is set to 0", () => {
			setRoboformLevel(2, 2, 3, "player");
			expect(getRoboformLevel(2, 2)).toBe(3);
			setRoboformLevel(2, 2, 0, "player");
			expect(getRoboformLevel(2, 2)).toBe(0);
		});

		it("removes tile data when level is negative", () => {
			setRoboformLevel(2, 2, 3, "player");
			setRoboformLevel(2, 2, -1, "player");
			expect(getRoboformLevel(2, 2)).toBe(0);
		});

		it("overwrites existing level for same tile", () => {
			setRoboformLevel(4, 4, 1, "player");
			setRoboformLevel(4, 4, 3, "alpha");
			expect(getRoboformLevel(4, 4)).toBe(3);
		});
	});

	describe("getRoboformSnapshot", () => {
		it("returns empty map initially", () => {
			const snap = getRoboformSnapshot();
			expect(snap.size).toBe(0);
		});

		it("contains all set tiles", () => {
			setRoboformLevel(0, 0, 1, "player");
			setRoboformLevel(5, 3, 4, "alpha");
			setRoboformLevel(10, 10, 2.5, "beta");

			const snap = getRoboformSnapshot();
			expect(snap.size).toBe(3);
			expect(snap.get("0,0")?.level).toBe(1);
			expect(snap.get("0,0")?.factionId).toBe("player");
			expect(snap.get("5,3")?.level).toBe(4);
			expect(snap.get("5,3")?.factionId).toBe("alpha");
			expect(snap.get("10,10")?.level).toBe(2.5);
		});
	});

	describe("clearRoboformData", () => {
		it("removes all roboform data", () => {
			setRoboformLevel(0, 0, 2, "player");
			setRoboformLevel(1, 1, 3, "alpha");
			clearRoboformData();
			expect(getRoboformSnapshot().size).toBe(0);
			expect(getRoboformLevel(0, 0)).toBe(0);
			expect(getRoboformLevel(1, 1)).toBe(0);
		});
	});
});
