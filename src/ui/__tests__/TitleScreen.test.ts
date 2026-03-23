import { getTitleMenuLayout } from "../titleScreenModel";

describe("title screen layout model", () => {
	it("shows new game and settings when no saves exist", () => {
		expect(getTitleMenuLayout(0).map((button) => button.id)).toEqual([
			"new_game",
			"settings",
		]);
	});

	it("shows continue between new game and settings when a save exists", () => {
		expect(getTitleMenuLayout(1).map((button) => button.id)).toEqual([
			"new_game",
			"load_game",
			"settings",
		]);
	});
});
