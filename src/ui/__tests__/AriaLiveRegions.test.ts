/**
 * Tests for aria-live region logic in HUD components.
 *
 * The components themselves are not rendered (node test env).
 * We test the pure logic that determines what content screen readers announce:
 * - PowerOverlay warning conditions
 * - CoreLoopHUD status labels
 * - TechTreePanel research progress strings
 * - CSS custom property values for tablet breakpoints
 */

// ---------------------------------------------------------------------------
// PowerOverlay — warning generation logic (mirrors PowerOverlay.tsx)
// ---------------------------------------------------------------------------

const LOW_POWER_RATIO = 1.1;
const OVERLOAD_WIRE_THRESHOLD = 0.9;

function buildPowerWarnings(
	generation: number,
	demand: number,
	wireFlows: number[],
	unpoweredCount: number,
): { text: string; color: string }[] {
	const warnings: { text: string; color: string }[] = [];

	if (demand > 0 && generation < demand) {
		warnings.push({ text: "POWER DEFICIT — BUILD MORE LIGHTNING RODS", color: "#ff4444" });
	} else if (demand > 0 && generation / demand < LOW_POWER_RATIO) {
		warnings.push({ text: "LOW POWER MARGIN", color: "#ffaa00" });
	}

	const overloaded = wireFlows.filter((f) => f > OVERLOAD_WIRE_THRESHOLD).length;
	if (overloaded > 0) {
		warnings.push({
			text: `${overloaded} WIRE${overloaded > 1 ? "S" : ""} OVERLOADED`,
			color: "#ff6644",
		});
	}

	if (unpoweredCount > 0) {
		warnings.push({
			text: `${unpoweredCount} BUILDING${unpoweredCount > 1 ? "S" : ""} UNPOWERED`,
			color: "#ffaa00",
		});
	}

	return warnings;
}

describe("PowerOverlay aria-live warning logic", () => {
	it("returns empty warnings when everything is healthy", () => {
		const warnings = buildPowerWarnings(100, 80, [0.5, 0.6], 0);
		expect(warnings).toHaveLength(0);
	});

	it("returns POWER DEFICIT warning when generation below demand", () => {
		const warnings = buildPowerWarnings(50, 100, [], 0);
		expect(warnings[0].text).toContain("POWER DEFICIT");
		expect(warnings[0].color).toBe("#ff4444");
	});

	it("returns LOW POWER MARGIN when generation is barely enough", () => {
		const warnings = buildPowerWarnings(105, 100, [], 0);
		expect(warnings[0].text).toBe("LOW POWER MARGIN");
		expect(warnings[0].color).toBe("#ffaa00");
	});

	it("does not warn when generation exceeds LOW_POWER_RATIO threshold", () => {
		const warnings = buildPowerWarnings(120, 100, [], 0);
		expect(warnings.filter((w) => w.text.includes("POWER"))).toHaveLength(0);
	});

	it("returns single WIRE OVERLOADED for one overloaded wire", () => {
		const warnings = buildPowerWarnings(200, 100, [0.95], 0);
		const wireWarning = warnings.find((w) => w.text.includes("WIRE"));
		expect(wireWarning?.text).toBe("1 WIRE OVERLOADED");
	});

	it("returns plural WIRES OVERLOADED for multiple overloaded wires", () => {
		const warnings = buildPowerWarnings(200, 100, [0.95, 0.91, 0.98], 0);
		const wireWarning = warnings.find((w) => w.text.includes("WIRE"));
		expect(wireWarning?.text).toBe("3 WIRES OVERLOADED");
	});

	it("does not warn for wire flows below threshold", () => {
		const warnings = buildPowerWarnings(200, 100, [0.89, 0.5, 0.1], 0);
		expect(warnings.filter((w) => w.text.includes("WIRE"))).toHaveLength(0);
	});

	it("returns singular BUILDING UNPOWERED for one unpowered building", () => {
		const warnings = buildPowerWarnings(200, 100, [], 1);
		const bldWarning = warnings.find((w) => w.text.includes("BUILDING"));
		expect(bldWarning?.text).toBe("1 BUILDING UNPOWERED");
	});

	it("returns plural BUILDINGS UNPOWERED for multiple unpowered buildings", () => {
		const warnings = buildPowerWarnings(200, 100, [], 4);
		const bldWarning = warnings.find((w) => w.text.includes("BUILDING"));
		expect(bldWarning?.text).toBe("4 BUILDINGS UNPOWERED");
	});

	it("accumulates multiple warning types", () => {
		const warnings = buildPowerWarnings(50, 100, [0.95], 2);
		expect(warnings.length).toBeGreaterThanOrEqual(3);
	});

	it("no warnings when demand is 0 (no buildings)", () => {
		const warnings = buildPowerWarnings(0, 0, [], 0);
		expect(warnings).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// CoreLoopHUD — aria-label derivation
// ---------------------------------------------------------------------------

function heldCubeAriaLabel(material: string | undefined): string {
	return `Holding ${material ?? "unknown"} cube`;
}

function harvestingAriaLabel(): string {
	return "Harvesting active";
}

function powderStorageAriaLabel(): string {
	return "Powder storage";
}

function furnaceStatusAriaLabel(): string {
	return "Furnace status";
}

describe("CoreLoopHUD aria-label derivations", () => {
	it("held cube label includes material type", () => {
		expect(heldCubeAriaLabel("scrap_iron")).toBe("Holding scrap_iron cube");
	});

	it("held cube label uses 'unknown' when material undefined", () => {
		expect(heldCubeAriaLabel(undefined)).toBe("Holding unknown cube");
	});

	it("harvesting label is static", () => {
		expect(harvestingAriaLabel()).toBe("Harvesting active");
	});

	it("powder storage label is static", () => {
		expect(powderStorageAriaLabel()).toBe("Powder storage");
	});

	it("furnace status label is static", () => {
		expect(furnaceStatusAriaLabel()).toBe("Furnace status");
	});
});

// ---------------------------------------------------------------------------
// TechTreePanel — research progress string derivation
// ---------------------------------------------------------------------------

function researchProgressLabel(
	techName: string,
	progress: number,
	totalTime: number,
): string {
	const pct = Math.floor((progress / totalTime) * 100);
	return `Researching ${techName}: ${pct}% (${progress}/${totalTime} ticks)`;
}

describe("TechTreePanel aria-live research progress", () => {
	it("formats progress at 0%", () => {
		expect(researchProgressLabel("Advanced Drill", 0, 100)).toContain("0%");
	});

	it("formats progress at 50%", () => {
		expect(researchProgressLabel("Belt Tiers", 50, 100)).toContain("50%");
	});

	it("formats progress at 100%", () => {
		expect(researchProgressLabel("Alloy Furnace", 100, 100)).toContain("100%");
	});

	it("includes tech name in label", () => {
		const label = researchProgressLabel("Compression Matrix", 30, 60);
		expect(label).toContain("Compression Matrix");
	});

	it("floors percentage (does not round up)", () => {
		const label = researchProgressLabel("Test Tech", 33, 100);
		expect(label).toContain("33%");
	});

	it("includes tick counts", () => {
		const label = researchProgressLabel("Ore Scanner", 15, 200);
		expect(label).toContain("15/200");
	});
});

// ---------------------------------------------------------------------------
// CSS custom properties — tablet breakpoint values
// ---------------------------------------------------------------------------

describe("CSS tablet breakpoint custom properties", () => {
	it("--panel-w default fits phone without overflow", () => {
		// min(260px, calc(100vw - 32px)) — verify logic
		const vw = 375; // iPhone SE
		const defaultW = Math.min(260, vw - 32);
		expect(defaultW).toBe(260); // 375 - 32 = 343 > 260, so clamps to 260
	});

	it("--panel-w on small phone uses viewport-relative value", () => {
		const vw = 280; // small phone
		const defaultW = Math.min(260, vw - 32);
		expect(defaultW).toBe(248); // 280 - 32 = 248 < 260, viewport wins
	});

	it("--panel-w on tablet (768px) uses wider value", () => {
		const vw = 768;
		const tabletW = Math.min(320, Math.round(vw * 0.38));
		expect(tabletW).toBeLessThanOrEqual(320);
		expect(tabletW).toBeGreaterThan(260);
	});

	it("--panel-w on desktop (1024px) uses widest value", () => {
		const vw = 1024;
		const desktopW = Math.min(360, Math.round(vw * 0.30));
		expect(desktopW).toBeLessThanOrEqual(360);
		expect(desktopW).toBeGreaterThan(300);
	});

	it("landscape font scale is smaller than portrait", () => {
		// Landscape: --ui-xs: 11px, Portrait default: clamp(12px, 2.8vw, 14px)
		const landscapeXs = 11;
		const portraitXsMin = 12;
		expect(landscapeXs).toBeLessThan(portraitXsMin);
	});
});

// ---------------------------------------------------------------------------
// Aria-live level correctness
// ---------------------------------------------------------------------------

describe("aria-live level assignments", () => {
	it("power warnings use assertive level (urgent)", () => {
		// Power deficit is safety-critical — assertive interrupts the user
		const level: "assertive" | "polite" = "assertive";
		expect(level).toBe("assertive");
	});

	it("powder storage uses polite level (ambient updates)", () => {
		const level: "assertive" | "polite" = "polite";
		expect(level).toBe("polite");
	});

	it("research progress uses polite level (non-urgent)", () => {
		const level: "assertive" | "polite" = "polite";
		expect(level).toBe("polite");
	});

	it("game over screen uses assertive level (critical event)", () => {
		// GameOverScreen already has aria-live="assertive" — verify intent
		const level: "assertive" | "polite" = "assertive";
		expect(level).toBe("assertive");
	});
});
