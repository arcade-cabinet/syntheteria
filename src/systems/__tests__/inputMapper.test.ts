/**
 * Tests for the input mapper system.
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	onKeyDown,
	onKeyUp,
	flushInputFrame,
	getActionState,
	isActionActive,
	wasActionPressed,
	wasActionReleased,
	getBindings,
	getBinding,
	rebindAction,
	rebindSecondary,
	isKeyBound,
	resetBindings,
	exportBindings,
	importBindings,
	resetInputMapper,
} from "../inputMapper";

beforeEach(() => {
	resetInputMapper();
});

// ---------------------------------------------------------------------------
// Key events
// ---------------------------------------------------------------------------

describe("key events", () => {
	it("tracks key press", () => {
		onKeyDown("KeyW");
		expect(isActionActive("move_forward")).toBe(true);
	});

	it("tracks key release", () => {
		onKeyDown("KeyW");
		flushInputFrame();
		onKeyUp("KeyW");
		expect(wasActionReleased("move_forward")).toBe(true);
	});

	it("held state after first frame", () => {
		onKeyDown("KeyW");
		flushInputFrame(); // clear justPressed
		expect(getActionState("move_forward")).toBe("held");
	});

	it("idle when not pressed", () => {
		expect(getActionState("move_forward")).toBe("idle");
	});

	it("pressed only on first frame", () => {
		onKeyDown("KeyW");
		expect(wasActionPressed("move_forward")).toBe(true);

		flushInputFrame();
		expect(wasActionPressed("move_forward")).toBe(false);
		expect(isActionActive("move_forward")).toBe(true); // still held
	});

	it("flushInputFrame clears per-frame state", () => {
		onKeyDown("KeyW");
		flushInputFrame();
		expect(wasActionPressed("move_forward")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Action state queries
// ---------------------------------------------------------------------------

describe("action state queries", () => {
	it("isActionActive for pressed", () => {
		onKeyDown("KeyW");
		expect(isActionActive("move_forward")).toBe(true);
	});

	it("isActionActive for held", () => {
		onKeyDown("KeyW");
		flushInputFrame();
		expect(isActionActive("move_forward")).toBe(true);
	});

	it("isActionActive false when idle", () => {
		expect(isActionActive("move_forward")).toBe(false);
	});

	it("unknown action returns idle", () => {
		expect(getActionState("nonexistent" as any)).toBe("idle");
	});

	it("secondary binding works", () => {
		// inventory has secondary: Tab
		onKeyDown("Tab");
		expect(isActionActive("inventory")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Binding management
// ---------------------------------------------------------------------------

describe("binding management", () => {
	it("getBindings returns all bindings", () => {
		const bindings = getBindings();
		expect(bindings.length).toBeGreaterThan(10);
	});

	it("getBinding returns specific binding", () => {
		const binding = getBinding("move_forward");
		expect(binding).not.toBeNull();
		expect(binding!.primary).toBe("KeyW");
	});

	it("getBinding returns null for unknown", () => {
		expect(getBinding("nonexistent" as any)).toBeNull();
	});

	it("getBindings returns copies", () => {
		const b1 = getBindings();
		const b2 = getBindings();
		expect(b1).not.toBe(b2);
	});

	it("rebindAction changes primary key", () => {
		rebindAction("move_forward", "ArrowUp");
		const binding = getBinding("move_forward");
		expect(binding!.primary).toBe("ArrowUp");

		onKeyDown("ArrowUp");
		expect(isActionActive("move_forward")).toBe(true);
	});

	it("rebindAction returns false for unknown", () => {
		expect(rebindAction("nonexistent" as any, "KeyX")).toBe(false);
	});

	it("rebindSecondary sets secondary key", () => {
		rebindSecondary("move_forward", "ArrowUp");
		onKeyDown("ArrowUp");
		expect(isActionActive("move_forward")).toBe(true);
	});

	it("rebindSecondary can clear secondary", () => {
		rebindSecondary("inventory", undefined);
		onKeyDown("Tab");
		// Tab was inventory's secondary — now cleared
		expect(isActionActive("inventory")).toBe(false);
	});

	it("isKeyBound finds existing binding", () => {
		const action = isKeyBound("KeyW");
		expect(action).toBe("move_forward");
	});

	it("isKeyBound finds secondary binding", () => {
		const action = isKeyBound("Tab");
		expect(action).toBe("inventory");
	});

	it("isKeyBound returns null for unbound key", () => {
		expect(isKeyBound("F12")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Reset bindings
// ---------------------------------------------------------------------------

describe("resetBindings", () => {
	it("restores default bindings", () => {
		rebindAction("move_forward", "ArrowUp");
		resetBindings();

		const binding = getBinding("move_forward");
		expect(binding!.primary).toBe("KeyW");
	});
});

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

describe("export/import", () => {
	it("exports as JSON string", () => {
		const json = exportBindings();
		expect(typeof json).toBe("string");
		const parsed = JSON.parse(json);
		expect(Array.isArray(parsed)).toBe(true);
	});

	it("imports valid JSON", () => {
		rebindAction("move_forward", "ArrowUp");
		const json = exportBindings();

		resetBindings(); // back to defaults
		expect(getBinding("move_forward")!.primary).toBe("KeyW");

		importBindings(json);
		expect(getBinding("move_forward")!.primary).toBe("ArrowUp");
	});

	it("import returns false for invalid JSON", () => {
		expect(importBindings("not json")).toBe(false);
	});

	it("import returns false for non-array", () => {
		expect(importBindings('{"foo": 1}')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetInputMapper", () => {
	it("clears all state", () => {
		onKeyDown("KeyW");
		rebindAction("move_forward", "ArrowUp");

		resetInputMapper();

		expect(isActionActive("move_forward")).toBe(false);
		expect(getBinding("move_forward")!.primary).toBe("KeyW"); // back to default
	});
});

// ---------------------------------------------------------------------------
// Multiple simultaneous inputs
// ---------------------------------------------------------------------------

describe("multiple inputs", () => {
	it("tracks multiple keys simultaneously", () => {
		onKeyDown("KeyW");
		onKeyDown("KeyA");

		expect(isActionActive("move_forward")).toBe(true);
		expect(isActionActive("move_left")).toBe(true);
	});

	it("releasing one key doesn't affect others", () => {
		onKeyDown("KeyW");
		onKeyDown("KeyA");
		flushInputFrame();

		onKeyUp("KeyA");
		expect(isActionActive("move_forward")).toBe(true);
		expect(wasActionReleased("move_left")).toBe(true);
	});
});
