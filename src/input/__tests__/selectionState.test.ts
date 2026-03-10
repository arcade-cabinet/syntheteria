import {
	_resetSelectionState,
	getSelected,
	onSelectionChange,
	setSelected,
} from "../selectionState.ts";

describe("selectionState", () => {
	beforeEach(() => {
		_resetSelectionState();
	});

	// ─── Basic get/set ──────────────────────────────────────────────────

	it("starts with null selection", () => {
		expect(getSelected()).toBeNull();
	});

	it("setSelected stores entity ID, getSelected retrieves it", () => {
		setSelected("entity_42");
		expect(getSelected()).toBe("entity_42");
	});

	it("setSelected replaces previous selection", () => {
		setSelected("entity_1");
		setSelected("entity_2");
		expect(getSelected()).toBe("entity_2");
	});

	it("setSelected(null) clears selection", () => {
		setSelected("entity_1");
		setSelected(null);
		expect(getSelected()).toBeNull();
	});

	// ─── Subscriber pattern ─────────────────────────────────────────────

	it("onSelectionChange fires callback with { newId, oldId }", () => {
		const cb = jest.fn();
		onSelectionChange(cb);

		setSelected("entity_a");

		expect(cb).toHaveBeenCalledTimes(1);
		expect(cb).toHaveBeenCalledWith({ newId: "entity_a", oldId: null });
	});

	it("callback receives previous selection as oldId", () => {
		const cb = jest.fn();
		onSelectionChange(cb);

		setSelected("entity_a");
		setSelected("entity_b");

		expect(cb).toHaveBeenCalledTimes(2);
		expect(cb).toHaveBeenLastCalledWith({
			newId: "entity_b",
			oldId: "entity_a",
		});
	});

	it("callback fires when clearing selection", () => {
		const cb = jest.fn();
		setSelected("entity_x");
		onSelectionChange(cb);

		setSelected(null);

		expect(cb).toHaveBeenCalledWith({ newId: null, oldId: "entity_x" });
	});

	it("multiple subscribers all receive events", () => {
		const cb1 = jest.fn();
		const cb2 = jest.fn();
		onSelectionChange(cb1);
		onSelectionChange(cb2);

		setSelected("entity_multi");

		expect(cb1).toHaveBeenCalledTimes(1);
		expect(cb2).toHaveBeenCalledTimes(1);
	});

	// ─── Unsubscribe ────────────────────────────────────────────────────

	it("unsubscribe stops callbacks", () => {
		const cb = jest.fn();
		const unsub = onSelectionChange(cb);

		setSelected("entity_before");
		expect(cb).toHaveBeenCalledTimes(1);

		unsub();

		setSelected("entity_after");
		expect(cb).toHaveBeenCalledTimes(1); // still 1, not 2
	});

	it("unsubscribe only removes the specific listener", () => {
		const cb1 = jest.fn();
		const cb2 = jest.fn();
		const unsub1 = onSelectionChange(cb1);
		onSelectionChange(cb2);

		unsub1();
		setSelected("entity_test");

		expect(cb1).not.toHaveBeenCalled();
		expect(cb2).toHaveBeenCalledTimes(1);
	});

	// ─── Edge cases ─────────────────────────────────────────────────────

	it("setSelected same ID still fires callback", () => {
		const cb = jest.fn();
		onSelectionChange(cb);

		setSelected("entity_same");
		setSelected("entity_same");

		expect(cb).toHaveBeenCalledTimes(2);
		expect(cb).toHaveBeenLastCalledWith({
			newId: "entity_same",
			oldId: "entity_same",
		});
	});

	it("setSelected(null) when already null fires callback", () => {
		const cb = jest.fn();
		onSelectionChange(cb);

		setSelected(null);

		expect(cb).toHaveBeenCalledWith({ newId: null, oldId: null });
	});
});
