/**
 * Tests for crosshairTooltip pure functions.
 */

import {
	formatDistance,
	getCrosshairStyle,
	getCrosshairTooltipInfo,
} from "../crosshairTooltip";

// ─── getCrosshairStyle ────────────────────────────────────────────────────────

describe("getCrosshairStyle", () => {
	it("returns 'build' when in build mode regardless of entity type", () => {
		expect(getCrosshairStyle(null, true, false)).toBe("build");
		expect(getCrosshairStyle("unit", true, false)).toBe("build");
		expect(getCrosshairStyle("oreDeposit", true, false)).toBe("build");
	});

	it("returns 'none' when no entity is hovered", () => {
		expect(getCrosshairStyle(null, false, false)).toBe("none");
	});

	it("returns 'none' for ground", () => {
		expect(getCrosshairStyle("ground", false, false)).toBe("none");
	});

	it("returns 'harvest' for oreDeposit", () => {
		expect(getCrosshairStyle("oreDeposit", false, false)).toBe("harvest");
	});

	it("returns 'combat' for enemy unit", () => {
		expect(getCrosshairStyle("unit", false, true)).toBe("combat");
	});

	it("returns 'interact' for friendly unit", () => {
		expect(getCrosshairStyle("unit", false, false)).toBe("interact");
	});

	it("returns 'interact' for building", () => {
		expect(getCrosshairStyle("building", false, false)).toBe("interact");
	});

	it("returns 'interact' for furnace", () => {
		expect(getCrosshairStyle("furnace", false, false)).toBe("interact");
	});

	it("returns 'interact' for belt", () => {
		expect(getCrosshairStyle("belt", false, false)).toBe("interact");
	});

	it("returns 'interact' for wire", () => {
		expect(getCrosshairStyle("wire", false, false)).toBe("interact");
	});

	it("returns 'interact' for miner", () => {
		expect(getCrosshairStyle("miner", false, false)).toBe("interact");
	});

	it("returns 'interact' for processor", () => {
		expect(getCrosshairStyle("processor", false, false)).toBe("interact");
	});

	it("returns 'interact' for otter", () => {
		expect(getCrosshairStyle("otter", false, false)).toBe("interact");
	});

	it("returns 'interact' for hackable", () => {
		expect(getCrosshairStyle("hackable", false, false)).toBe("interact");
	});

	it("returns 'interact' for signalRelay", () => {
		expect(getCrosshairStyle("signalRelay", false, false)).toBe("interact");
	});

	it("returns 'interact' for item", () => {
		expect(getCrosshairStyle("item", false, false)).toBe("interact");
	});
});

// ─── getCrosshairTooltipInfo ──────────────────────────────────────────────────

describe("getCrosshairTooltipInfo", () => {
	it("returns build info when in build mode", () => {
		const info = getCrosshairTooltipInfo(null, null, null, true, false);
		expect(info.style).toBe("build");
		expect(info.entityLabel).toBeNull();
		expect(info.distance).toBeNull();
		expect(info.actions).toContainEqual({ key: "CLICK", label: "Place" });
		expect(info.actions).toContainEqual({ key: "ESC", label: "Cancel" });
	});

	it("returns empty info when no entity and not build mode", () => {
		const info = getCrosshairTooltipInfo(null, null, null, false, false);
		expect(info.style).toBe("none");
		expect(info.entityLabel).toBeNull();
		expect(info.distance).toBeNull();
		expect(info.actions).toHaveLength(0);
	});

	it("returns empty info for ground entity", () => {
		const info = getCrosshairTooltipInfo("ground", null, 2.0, false, false);
		expect(info.style).toBe("none");
		expect(info.entityLabel).toBeNull();
	});

	it("includes entity label for ore deposit", () => {
		const info = getCrosshairTooltipInfo("oreDeposit", null, 3.5, false, false);
		expect(info.style).toBe("harvest");
		expect(info.entityLabel).toBe("Ore Deposit");
		expect(info.distance).toBeCloseTo(3.5);
		expect(info.actions).toContainEqual({ key: "F", label: "Harvest" });
	});

	it("uses custom entity name when provided", () => {
		const info = getCrosshairTooltipInfo("unit", "Alpha Bot", 2.0, false, false);
		expect(info.entityLabel).toBe("Alpha Bot (Unit)");
	});

	it("falls back to category label when no entity name", () => {
		const info = getCrosshairTooltipInfo("furnace", null, 1.5, false, false);
		expect(info.entityLabel).toBe("Furnace");
	});

	it("returns combat style for enemy unit", () => {
		const info = getCrosshairTooltipInfo("unit", "Enemy Bot", 4.0, false, true);
		expect(info.style).toBe("combat");
		expect(info.entityLabel).toBe("Enemy Bot (Unit)");
		expect(info.distance).toBeCloseTo(4.0);
	});

	it("includes furnace actions", () => {
		const info = getCrosshairTooltipInfo("furnace", null, 1.0, false, false);
		expect(info.actions).toContainEqual({ key: "E", label: "Open Furnace" });
		expect(info.actions).toContainEqual({ key: "G", label: "Deposit Cube" });
	});

	it("includes otter talk action", () => {
		const info = getCrosshairTooltipInfo("otter", "Otter", 2.0, false, false);
		expect(info.actions).toContainEqual({ key: "E", label: "Talk" });
	});

	it("includes hackable hack action", () => {
		const info = getCrosshairTooltipInfo("hackable", null, 2.0, false, false);
		expect(info.actions).toContainEqual({ key: "E", label: "Hack" });
	});

	it("includes item pick up action", () => {
		const info = getCrosshairTooltipInfo("item", null, 1.0, false, false);
		expect(info.actions).toContainEqual({ key: "G", label: "Pick Up" });
	});

	it("passes through null distance", () => {
		const info = getCrosshairTooltipInfo("building", null, null, false, false);
		expect(info.distance).toBeNull();
	});

	it("includes miner configure action", () => {
		const info = getCrosshairTooltipInfo("miner", null, 2.0, false, false);
		expect(info.actions).toContainEqual({ key: "E", label: "Configure" });
	});
});

// ─── formatDistance ───────────────────────────────────────────────────────────

describe("formatDistance", () => {
	it("returns null for null input", () => {
		expect(formatDistance(null)).toBeNull();
	});

	it("formats distance with one decimal", () => {
		expect(formatDistance(3.0)).toBe("3.0m");
	});

	it("rounds to one decimal place", () => {
		expect(formatDistance(2.567)).toBe("2.6m");
	});

	it("formats zero", () => {
		expect(formatDistance(0)).toBe("0.0m");
	});

	it("formats large distance", () => {
		expect(formatDistance(100.5)).toBe("100.5m");
	});
});
