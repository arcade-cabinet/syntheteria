import { describe, expect, it } from "vitest";
import { isWebPlatform, platformSelect } from "./platform";

describe("platform", () => {
	it("isWebPlatform is true in jsdom", () => {
		expect(isWebPlatform).toBe(true);
	});

	it("platformSelect returns web value when on web", () => {
		expect(platformSelect({ web: "a", default: "b" })).toBe("a");
	});

	it("platformSelect returns default when web not provided", () => {
		expect(platformSelect({ default: "b" })).toBe("b");
	});
});
