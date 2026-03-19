import {
	isAutosaveEnabled,
	setAutosaveEnabled,
	setAutosaveNotify,
} from "../autosave";

describe("autosave", () => {
	afterEach(() => {
		setAutosaveEnabled(true);
		setAutosaveNotify(null);
	});

	it("can be enabled and disabled", () => {
		expect(isAutosaveEnabled()).toBe(true);
		setAutosaveEnabled(false);
		expect(isAutosaveEnabled()).toBe(false);
		setAutosaveEnabled(true);
		expect(isAutosaveEnabled()).toBe(true);
	});

	it("accepts a notification callback", () => {
		const cb = jest.fn();
		setAutosaveNotify(cb);
		// Callback is stored but not called until a turn triggers it
		expect(cb).not.toHaveBeenCalled();
		setAutosaveNotify(null);
	});
});
