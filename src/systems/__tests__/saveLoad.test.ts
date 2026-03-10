/**
 * Tests for the save/load system.
 *
 * Tests cover:
 * - Serializer registration/unregistration
 * - Save creates correct format
 * - Load restores system state
 * - Save slots (create, load, delete, max limit)
 * - Autosave interval
 * - Version checking on load
 * - Multiple systems serialize independently
 * - Edge cases
 */

import {
	checkAutosave,
	createSave,
	deleteSaveSlot,
	getCurrentGameTick,
	getLastSaveTimestamp,
	getRegisteredSystems,
	getSaveSlots,
	hasSaveSlot,
	loadFromSlot,
	loadSave,
	registerSerializer,
	resetSaveLoad,
	saveToSlot,
	setAutosaveInterval,
	unregisterSerializer,
} from "../saveLoad";

beforeEach(() => {
	resetSaveLoad();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSerializer(id: string, initialValue: number) {
	let value = initialValue;
	return {
		serializer: {
			id,
			serialize: () => ({ value }),
			deserialize: (data: unknown) => {
				value = (data as { value: number }).value;
			},
		},
		getValue: () => value,
		setValue: (v: number) => {
			value = v;
		},
	};
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("serializer registration", () => {
	it("registers a serializer", () => {
		const { serializer } = makeSerializer("test_system", 0);
		registerSerializer(serializer);
		expect(getRegisteredSystems()).toContain("test_system");
	});

	it("unregisters a serializer", () => {
		const { serializer } = makeSerializer("test_system", 0);
		registerSerializer(serializer);
		unregisterSerializer("test_system");
		expect(getRegisteredSystems()).not.toContain("test_system");
	});

	it("lists all registered systems", () => {
		registerSerializer(makeSerializer("sys_a", 0).serializer);
		registerSerializer(makeSerializer("sys_b", 0).serializer);
		registerSerializer(makeSerializer("sys_c", 0).serializer);

		const systems = getRegisteredSystems();
		expect(systems).toHaveLength(3);
		expect(systems).toContain("sys_a");
		expect(systems).toContain("sys_b");
		expect(systems).toContain("sys_c");
	});
});

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

describe("createSave", () => {
	it("creates save with correct version and tick", () => {
		const save = createSave(1000);
		expect(save.version).toBe(1);
		expect(save.gameTick).toBe(1000);
		expect(save.timestamp).toBeGreaterThan(0);
	});

	it("includes all registered systems", () => {
		registerSerializer(makeSerializer("sys_a", 42).serializer);
		registerSerializer(makeSerializer("sys_b", 99).serializer);

		const save = createSave(100);
		expect(save.systems["sys_a"]).toEqual({ value: 42 });
		expect(save.systems["sys_b"]).toEqual({ value: 99 });
	});

	it("captures current system state", () => {
		const { serializer, setValue } = makeSerializer("counter", 0);
		registerSerializer(serializer);

		setValue(10);
		const save = createSave(50);
		expect(save.systems["counter"]).toEqual({ value: 10 });
	});

	it("updates last save timestamp", () => {
		createSave(100);
		expect(getLastSaveTimestamp()).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

describe("loadSave", () => {
	it("restores system state from save data", () => {
		const { serializer, setValue, getValue } = makeSerializer("counter", 0);
		registerSerializer(serializer);

		setValue(42);
		const save = createSave(100);

		setValue(0); // change state
		expect(getValue()).toBe(0);

		loadSave(save);
		expect(getValue()).toBe(42);
	});

	it("restores game tick", () => {
		const save = createSave(5000);
		loadSave(save);
		expect(getCurrentGameTick()).toBe(5000);
	});

	it("returns false for wrong version", () => {
		const save = createSave(100);
		save.version = 999;
		expect(loadSave(save)).toBe(false);
	});

	it("returns true for valid save", () => {
		const save = createSave(100);
		expect(loadSave(save)).toBe(true);
	});

	it("handles missing system data gracefully", () => {
		const { serializer, getValue } = makeSerializer("sys_a", 10);
		registerSerializer(serializer);

		// Save without sys_a in systems
		const save = createSave(100);
		delete save.systems["sys_a"];

		// Should not crash, sys_a keeps its current state
		loadSave(save);
		expect(getValue()).toBe(10);
	});

	it("restores multiple systems independently", () => {
		const a = makeSerializer("sys_a", 0);
		const b = makeSerializer("sys_b", 0);
		registerSerializer(a.serializer);
		registerSerializer(b.serializer);

		a.setValue(11);
		b.setValue(22);
		const save = createSave(100);

		a.setValue(0);
		b.setValue(0);
		loadSave(save);

		expect(a.getValue()).toBe(11);
		expect(b.getValue()).toBe(22);
	});
});

// ---------------------------------------------------------------------------
// Save slots
// ---------------------------------------------------------------------------

describe("save slots", () => {
	it("saves to a named slot", () => {
		const slotId = saveToSlot("Quick Save", 100);
		expect(hasSaveSlot(slotId)).toBe(true);
	});

	it("lists save slots", () => {
		saveToSlot("Save 1", 100);
		saveToSlot("Save 2", 200);

		const slots = getSaveSlots();
		expect(slots).toHaveLength(2);
		expect(slots[0].name).toBe("Save 1");
		expect(slots[1].name).toBe("Save 2");
	});

	it("loads from a save slot", () => {
		const { serializer, setValue, getValue } = makeSerializer("sys", 0);
		registerSerializer(serializer);

		setValue(42);
		const slotId = saveToSlot("My Save", 100);

		setValue(0);
		const result = loadFromSlot(slotId);
		expect(result).toBe(true);
		expect(getValue()).toBe(42);
	});

	it("returns false for non-existent slot", () => {
		expect(loadFromSlot("nonexistent")).toBe(false);
	});

	it("deletes a save slot", () => {
		const slotId = saveToSlot("To Delete", 100);
		expect(deleteSaveSlot(slotId)).toBe(true);
		expect(hasSaveSlot(slotId)).toBe(false);
	});

	it("returns false when deleting non-existent slot", () => {
		expect(deleteSaveSlot("nonexistent")).toBe(false);
	});

	it("enforces max save slots (10)", () => {
		for (let i = 0; i < 12; i++) {
			saveToSlot(`Save ${i}`, i * 100);
		}

		const slots = getSaveSlots();
		expect(slots.length).toBeLessThanOrEqual(10);
	});

	it("overwrites oldest slot when at max", () => {
		const ids: string[] = [];
		for (let i = 0; i < 10; i++) {
			ids.push(saveToSlot(`Save ${i}`, i * 100));
		}

		// Save one more — should overwrite oldest
		saveToSlot("Save 10", 1000);

		const slots = getSaveSlots();
		expect(slots).toHaveLength(10);
		// Newest should be there
		expect(slots.some((s) => s.name === "Save 10")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Autosave
// ---------------------------------------------------------------------------

describe("autosave", () => {
	it("disabled by default", () => {
		expect(checkAutosave(1000)).toBeNull();
	});

	it("triggers at configured interval", () => {
		setAutosaveInterval(100);

		expect(checkAutosave(50)).toBeNull(); // too early
		const save = checkAutosave(100);
		expect(save).not.toBeNull();
		expect(save!.gameTick).toBe(100);
	});

	it("does not trigger again until next interval", () => {
		setAutosaveInterval(100);
		checkAutosave(100); // triggers
		expect(checkAutosave(150)).toBeNull(); // too early
		expect(checkAutosave(200)).not.toBeNull(); // next interval
	});

	it("includes all system data", () => {
		registerSerializer(makeSerializer("sys", 99).serializer);
		setAutosaveInterval(100);

		const save = checkAutosave(100);
		expect(save!.systems["sys"]).toEqual({ value: 99 });
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetSaveLoad", () => {
	it("clears all state", () => {
		registerSerializer(makeSerializer("sys", 0).serializer);
		saveToSlot("Test", 100);
		setAutosaveInterval(100);

		resetSaveLoad();

		expect(getRegisteredSystems()).toHaveLength(0);
		expect(getSaveSlots()).toHaveLength(0);
		expect(getLastSaveTimestamp()).toBe(0);
		expect(getCurrentGameTick()).toBe(0);
	});
});
