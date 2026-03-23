import {
	getLayerVisibility,
	HUD_FADE_DURATION_MS,
	nextPhase,
	type UILayerPhase,
} from "../uiLayerState";

describe("uiLayerState (US-018)", () => {
	describe("nextPhase", () => {
		it("stays in loading when worldReady is false", () => {
			expect(nextPhase("loading", false)).toBe("loading");
		});

		it("transitions loading -> hud-entering when worldReady is true", () => {
			expect(nextPhase("loading", true)).toBe("hud-entering");
		});

		it("stays in hud-entering regardless of worldReady (time-based)", () => {
			expect(nextPhase("hud-entering", true)).toBe("hud-entering");
			expect(nextPhase("hud-entering", false)).toBe("hud-entering");
		});

		it("stays in hud-visible regardless of worldReady", () => {
			expect(nextPhase("hud-visible", true)).toBe("hud-visible");
			expect(nextPhase("hud-visible", false)).toBe("hud-visible");
		});
	});

	describe("getLayerVisibility", () => {
		it("shows only loading overlay in loading phase", () => {
			const vis = getLayerVisibility("loading", null);
			expect(vis.showLoading).toBe(true);
			expect(vis.showHud).toBe(false);
			expect(vis.showThoughtOverlay).toBe(false);
			expect(vis.showLocationPanel).toBe(false);
		});

		it("shows HUD but not overlays in hud-entering phase", () => {
			const vis = getLayerVisibility("hud-entering", null);
			expect(vis.showLoading).toBe(false);
			expect(vis.showHud).toBe(true);
			expect(vis.showThoughtOverlay).toBe(false);
			expect(vis.showLocationPanel).toBe(false);
		});

		it("shows HUD and thought overlay in hud-visible phase", () => {
			const vis = getLayerVisibility("hud-visible", null);
			expect(vis.showLoading).toBe(false);
			expect(vis.showHud).toBe(true);
			expect(vis.showThoughtOverlay).toBe(true);
			expect(vis.showLocationPanel).toBe(false);
		});

		it("shows location panel only when nearby POI exists and hud-visible", () => {
			const visWithPoi = getLayerVisibility("hud-visible", "Science Campus");
			expect(visWithPoi.showLocationPanel).toBe(true);

			const visNoPoi = getLayerVisibility("hud-visible", null);
			expect(visNoPoi.showLocationPanel).toBe(false);
		});

		it("hides location panel during hud-entering even with nearby POI", () => {
			const vis = getLayerVisibility("hud-entering", "Science Campus");
			expect(vis.showLocationPanel).toBe(false);
		});

		it("hides location panel during loading even with nearby POI", () => {
			const vis = getLayerVisibility("loading", "Science Campus");
			expect(vis.showLocationPanel).toBe(false);
		});
	});

	describe("phase progression order", () => {
		it("follows loading -> hud-entering -> hud-visible", () => {
			const phases: UILayerPhase[] = ["loading", "hud-entering", "hud-visible"];
			// loading can advance to hud-entering
			expect(nextPhase(phases[0], true)).toBe(phases[1]);
			// hud-entering does not advance via nextPhase (time-based)
			expect(nextPhase(phases[1], true)).toBe(phases[1]);
		});
	});

	describe("constants", () => {
		it("exports a positive fade duration", () => {
			expect(HUD_FADE_DURATION_MS).toBeGreaterThan(0);
		});
	});
});
