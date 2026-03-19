import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	_resetToasts,
	dismissAllToasts,
	dismissToast,
	getMutedCategories,
	getVisibleToasts,
	isCategoryMuted,
	muteCategory,
	pushToast,
	subscribeToasts,
	unmuteCategory,
} from "../toastNotifications";

beforeEach(() => {
	_resetToasts();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("toastNotifications", () => {
	it("pushes a toast and returns it from getVisibleToasts", () => {
		pushToast("system", "Test", "Hello", 5000);
		const visible = getVisibleToasts();
		expect(visible).toHaveLength(1);
		expect(visible[0]!.title).toBe("Test");
		expect(visible[0]!.message).toBe("Hello");
		expect(visible[0]!.category).toBe("system");
	});

	it("limits visible toasts to 3", () => {
		pushToast("system", "A", "1");
		pushToast("system", "B", "2");
		pushToast("system", "C", "3");
		pushToast("system", "D", "4");
		const visible = getVisibleToasts();
		expect(visible).toHaveLength(3);
		// Most recent first
		expect(visible[0]!.title).toBe("D");
	});

	it("auto-dismisses after duration", () => {
		pushToast("system", "Temp", "Goes away", 3000);
		expect(getVisibleToasts()).toHaveLength(1);

		vi.advanceTimersByTime(3001);
		expect(getVisibleToasts()).toHaveLength(0);
	});

	it("dismisses a specific toast by ID", () => {
		const id = pushToast("system", "A", "msg");
		pushToast("system", "B", "msg");
		expect(getVisibleToasts()).toHaveLength(2);

		dismissToast(id);
		expect(getVisibleToasts()).toHaveLength(1);
		expect(getVisibleToasts()[0]!.title).toBe("B");
	});

	it("dismisses all toasts", () => {
		pushToast("combat", "A", "msg");
		pushToast("harvest", "B", "msg");
		pushToast("turn", "C", "msg");

		dismissAllToasts();
		expect(getVisibleToasts()).toHaveLength(0);
	});

	it("mutes a category and prevents new toasts", () => {
		muteCategory("combat");
		expect(isCategoryMuted("combat")).toBe(true);

		const id = pushToast("combat", "Muted", "Should not appear");
		expect(id).toBe("");
		expect(getVisibleToasts()).toHaveLength(0);
	});

	it("unmutes a category", () => {
		muteCategory("harvest");
		unmuteCategory("harvest");
		expect(isCategoryMuted("harvest")).toBe(false);

		pushToast("harvest", "Back", "Visible again");
		expect(getVisibleToasts()).toHaveLength(1);
	});

	it("returns muted categories", () => {
		muteCategory("combat");
		muteCategory("turn");
		const muted = getMutedCategories();
		expect(muted).toContain("combat");
		expect(muted).toContain("turn");
		expect(muted).not.toContain("system");
	});

	it("notifies listeners on push", () => {
		const listener = vi.fn();
		const unsub = subscribeToasts(listener);

		pushToast("system", "Test", "msg");
		expect(listener).toHaveBeenCalled();

		unsub();
	});

	it("notifies listeners on dismiss", () => {
		const id = pushToast("system", "Test", "msg");
		const listener = vi.fn();
		const unsub = subscribeToasts(listener);

		dismissToast(id);
		expect(listener).toHaveBeenCalled();

		unsub();
	});

	it("unsubscribes correctly", () => {
		const listener = vi.fn();
		const unsub = subscribeToasts(listener);
		unsub();

		pushToast("system", "Test", "msg");
		expect(listener).not.toHaveBeenCalled();
	});

	it("generates unique IDs", () => {
		const id1 = pushToast("system", "A", "msg");
		const id2 = pushToast("system", "B", "msg");
		expect(id1).not.toBe(id2);
	});
});
