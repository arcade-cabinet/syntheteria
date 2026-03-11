/**
 * Tests for keyboard navigation logic in radial menus and tech tree.
 *
 * Pure logic functions are tested without rendering.
 * - getNextFocusIndex: arrow key cycling through enabled radial menu items
 * - Tech tree node keyboard logic: Enter/Space activation
 */

import { getNextFocusIndex } from "../RadialActionMenu";

// ---------------------------------------------------------------------------
// getNextFocusIndex — radial menu arrow key navigation
// ---------------------------------------------------------------------------

const allEnabled = [
	{ enabled: true },
	{ enabled: true },
	{ enabled: true },
	{ enabled: true },
];

const mixedEnabled = [
	{ enabled: true },
	{ enabled: false },
	{ enabled: true },
	{ enabled: false },
	{ enabled: true },
];

const singleEnabled = [
	{ enabled: false },
	{ enabled: true },
	{ enabled: false },
];

describe("getNextFocusIndex — forward navigation (ArrowRight/Down)", () => {
	it("moves from index 0 to 1 when all enabled", () => {
		expect(getNextFocusIndex(0, 1, allEnabled)).toBe(1);
	});

	it("moves from index 1 to 2 when all enabled", () => {
		expect(getNextFocusIndex(1, 1, allEnabled)).toBe(2);
	});

	it("wraps from last to first when all enabled", () => {
		expect(getNextFocusIndex(3, 1, allEnabled)).toBe(0);
	});

	it("skips disabled items forward", () => {
		// From index 0, skip index 1 (disabled), land on index 2
		expect(getNextFocusIndex(0, 1, mixedEnabled)).toBe(2);
	});

	it("skips multiple consecutive disabled items forward", () => {
		// From index 2, skip index 3 (disabled), land on index 4
		expect(getNextFocusIndex(2, 1, mixedEnabled)).toBe(4);
	});

	it("wraps forward past end and skips disabled items", () => {
		// From index 4, wraps to index 0 (enabled)
		expect(getNextFocusIndex(4, 1, mixedEnabled)).toBe(0);
	});
});

describe("getNextFocusIndex — backward navigation (ArrowLeft/Up)", () => {
	it("moves from index 3 to 2 backward", () => {
		expect(getNextFocusIndex(3, -1, allEnabled)).toBe(2);
	});

	it("moves from index 1 to 0 backward", () => {
		expect(getNextFocusIndex(1, -1, allEnabled)).toBe(0);
	});

	it("wraps from first to last backward", () => {
		expect(getNextFocusIndex(0, -1, allEnabled)).toBe(3);
	});

	it("skips disabled items backward", () => {
		// From index 2, skip index 1 (disabled), land on index 0
		expect(getNextFocusIndex(2, -1, mixedEnabled)).toBe(0);
	});

	it("wraps backward past beginning and skips disabled", () => {
		// From index 0, wrap backward to index 4 (enabled)
		expect(getNextFocusIndex(0, -1, mixedEnabled)).toBe(4);
	});
});

describe("getNextFocusIndex — no current focus (index -1)", () => {
	it("selects first enabled item going forward", () => {
		expect(getNextFocusIndex(-1, 1, allEnabled)).toBe(0);
	});

	it("selects last enabled item going backward", () => {
		expect(getNextFocusIndex(-1, -1, allEnabled)).toBe(3);
	});

	it("selects first enabled when some are disabled, forward", () => {
		// mixedEnabled: indices 0, 2, 4 are enabled
		expect(getNextFocusIndex(-1, 1, mixedEnabled)).toBe(0);
	});

	it("selects last enabled when some are disabled, backward", () => {
		expect(getNextFocusIndex(-1, -1, mixedEnabled)).toBe(4);
	});

	it("selects the only enabled item", () => {
		expect(getNextFocusIndex(-1, 1, singleEnabled)).toBe(1);
		expect(getNextFocusIndex(-1, -1, singleEnabled)).toBe(1);
	});
});

describe("getNextFocusIndex — edge cases", () => {
	it("returns -1 for empty actions array", () => {
		expect(getNextFocusIndex(0, 1, [])).toBe(-1);
		expect(getNextFocusIndex(-1, 1, [])).toBe(-1);
	});

	it("returns -1 when all items are disabled", () => {
		const allDisabled = [{ enabled: false }, { enabled: false }, { enabled: false }];
		expect(getNextFocusIndex(0, 1, allDisabled)).toBe(-1);
		expect(getNextFocusIndex(-1, 1, allDisabled)).toBe(-1);
	});

	it("handles single enabled item — wraps to itself", () => {
		expect(getNextFocusIndex(1, 1, singleEnabled)).toBe(1);
		expect(getNextFocusIndex(1, -1, singleEnabled)).toBe(1);
	});

	it("handles single item array that is enabled", () => {
		const single = [{ enabled: true }];
		expect(getNextFocusIndex(0, 1, single)).toBe(0);
		expect(getNextFocusIndex(-1, 1, single)).toBe(0);
	});

	it("handles single item array that is disabled", () => {
		const single = [{ enabled: false }];
		expect(getNextFocusIndex(0, 1, single)).toBe(-1);
	});

	it("handles two items both enabled", () => {
		const two = [{ enabled: true }, { enabled: true }];
		expect(getNextFocusIndex(0, 1, two)).toBe(1);
		expect(getNextFocusIndex(1, 1, two)).toBe(0);
		expect(getNextFocusIndex(0, -1, two)).toBe(1);
		expect(getNextFocusIndex(1, -1, two)).toBe(0);
	});

	it("result is always a valid index when items exist", () => {
		for (const startIdx of [-1, 0, 1, 2, 3]) {
			for (const dir of [1, -1] as const) {
				const result = getNextFocusIndex(startIdx, dir, allEnabled);
				expect(result).toBeGreaterThanOrEqual(0);
				expect(result).toBeLessThan(allEnabled.length);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Tech tree node keyboard activation logic (mirrors TechTreePanel.tsx)
// ---------------------------------------------------------------------------

function handleTechNodeKeyDown(key: string, isClickable: boolean, onClick: () => void): boolean {
	if (isClickable && (key === "Enter" || key === " ")) {
		onClick();
		return true; // preventDefault was called
	}
	return false;
}

describe("TechTreePanel keyboard activation", () => {
	it("activates node on Enter when clickable", () => {
		const onClick = jest.fn();
		const result = handleTechNodeKeyDown("Enter", true, onClick);
		expect(onClick).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it("activates node on Space when clickable", () => {
		const onClick = jest.fn();
		const result = handleTechNodeKeyDown(" ", true, onClick);
		expect(onClick).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it("does NOT activate when not clickable (locked or active)", () => {
		const onClick = jest.fn();
		const result = handleTechNodeKeyDown("Enter", false, onClick);
		expect(onClick).not.toHaveBeenCalled();
		expect(result).toBe(false);
	});

	it("does NOT activate on arrow keys", () => {
		const onClick = jest.fn();
		for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
			handleTechNodeKeyDown(key, true, onClick);
		}
		expect(onClick).not.toHaveBeenCalled();
	});

	it("does NOT activate on other keys", () => {
		const onClick = jest.fn();
		for (const key of ["Tab", "Escape", "a", "w", "s", "d"]) {
			handleTechNodeKeyDown(key, true, onClick);
		}
		expect(onClick).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Keyboard navigation direction constants
// ---------------------------------------------------------------------------

describe("arrow key direction mapping", () => {
	function getDirection(key: string): 1 | -1 | null {
		if (key === "ArrowRight" || key === "ArrowDown") return 1;
		if (key === "ArrowLeft" || key === "ArrowUp") return -1;
		return null;
	}

	it("ArrowRight maps to forward (1)", () => {
		expect(getDirection("ArrowRight")).toBe(1);
	});

	it("ArrowDown maps to forward (1)", () => {
		expect(getDirection("ArrowDown")).toBe(1);
	});

	it("ArrowLeft maps to backward (-1)", () => {
		expect(getDirection("ArrowLeft")).toBe(-1);
	});

	it("ArrowUp maps to backward (-1)", () => {
		expect(getDirection("ArrowUp")).toBe(-1);
	});

	it("other keys return null", () => {
		expect(getDirection("Tab")).toBeNull();
		expect(getDirection("Enter")).toBeNull();
		expect(getDirection("Escape")).toBeNull();
		expect(getDirection("a")).toBeNull();
	});
});
