import {
	dismissToast,
	getToasts,
	purgeExpiredToasts,
	pushToast,
	resetToastStore,
	subscribeToasts,
} from "../toastStore";

describe("toastStore", () => {
	afterEach(() => {
		resetToastStore();
	});

	it("starts empty", () => {
		expect(getToasts()).toHaveLength(0);
	});

	it("pushes toasts and limits to 4", () => {
		pushToast("a", "info");
		pushToast("b", "success");
		pushToast("c", "warn");
		pushToast("d", "error");
		pushToast("e", "info");
		expect(getToasts()).toHaveLength(4);
		// Most recent first
		expect(getToasts()[0].text).toBe("e");
	});

	it("dismisses a toast by id", () => {
		pushToast("hello", "info");
		const id = getToasts()[0].id;
		dismissToast(id);
		expect(getToasts()).toHaveLength(0);
	});

	it("purges expired toasts", () => {
		jest.spyOn(Date, "now").mockReturnValue(1000);
		pushToast("old", "info");

		jest.spyOn(Date, "now").mockReturnValue(7000);
		purgeExpiredToasts(5000);

		expect(getToasts()).toHaveLength(0);
		jest.restoreAllMocks();
	});

	it("notifies subscribers", () => {
		const listener = jest.fn();
		const unsub = subscribeToasts(listener);
		pushToast("test", "info");
		expect(listener).toHaveBeenCalledTimes(1);
		unsub();
		pushToast("test2", "info");
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("resets cleanly", () => {
		pushToast("x", "info");
		resetToastStore();
		expect(getToasts()).toHaveLength(0);
	});
});
