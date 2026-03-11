/**
 * Tests for ideologySystem.ts — Faith/Ideology resource and doctrine unlocks.
 *
 * Covers:
 * - Shrine placement + faith generation
 * - Temple and Grand Cathedral placement
 * - Faith accumulation per tick (including Volt storm bonus)
 * - Doctrine unlock at faith thresholds
 * - Faith bonus on doctrine unlock
 * - Faith/Reason tension (research speed multiplier)
 * - Conversion resistance (reason reduces vulnerability)
 * - Grand Cathedral required for enlightenment eligibility
 * - Enlightenment victory progress tracking
 * - Config alignment assertions
 */

import victoryPathsConfig from "../../../config/victoryPaths.json";
import buildingsConfig from "../../../config/buildings.json";
import {
	_resetIdeologyState,
	addFaith,
	addReason,
	checkDoctrineUnlocks,
	computeFaithPerTick,
	getFaith,
	getFactionIdeologyState,
	getFactionShrines,
	getEnlightenmentProgress,
	getInfluenceZones,
	getReason,
	getResearchSpeedMultiplier,
	getConversionResistance,
	getUnlockedDoctrines,
	placeShrine,
	recordConversion,
	recordCultLeaderActive,
	removeShrine,
	updateIdeology,
} from "../ideologySystem";

const faithCfg = victoryPathsConfig.faithSystem;
const victoryEnlightenment = victoryPathsConfig.victoryEnlightenment;

const ORIGIN = { x: 0, y: 0, z: 0 };

beforeEach(() => {
	_resetIdeologyState();
});

// ---------------------------------------------------------------------------
// Shrine placement
// ---------------------------------------------------------------------------

describe("placeShrine", () => {
	it("registers a shrine for a faction", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		expect(getFactionShrines("reclaimers")).toHaveLength(1);
	});

	it("returns a ShrineRecord with the correct type", () => {
		const shrine = placeShrine("reclaimers", "temple", ORIGIN, 1);
		expect(shrine.type).toBe("temple");
		expect(shrine.faction).toBe("reclaimers");
	});

	it("gives each shrine a unique ID", () => {
		const a = placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const b = placeShrine("reclaimers", "shrine", { x: 10, y: 0, z: 10 }, 2);
		expect(a.id).not.toBe(b.id);
	});

	it("placing grand_cathedral sets grandCathedralBuilt", () => {
		placeShrine("iron_creed", "grand_cathedral", ORIGIN, 1);
		expect(getFactionIdeologyState("iron_creed")?.grandCathedralBuilt).toBe(true);
	});

	it("placing shrine does NOT set grandCathedralBuilt", () => {
		placeShrine("iron_creed", "shrine", ORIGIN, 1);
		expect(getFactionIdeologyState("iron_creed")?.grandCathedralBuilt).toBe(false);
	});

	it("multiple factions can have shrines independently", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		placeShrine("volt_collective", "temple", { x: 5, y: 0, z: 5 }, 1);
		expect(getFactionShrines("reclaimers")).toHaveLength(1);
		expect(getFactionShrines("volt_collective")).toHaveLength(1);
	});
});

describe("removeShrine", () => {
	it("removes a shrine by ID", () => {
		const shrine = placeShrine("reclaimers", "shrine", ORIGIN, 1);
		removeShrine("reclaimers", shrine.id);
		expect(getFactionShrines("reclaimers")).toHaveLength(0);
	});

	it("returns true when successfully removed", () => {
		const shrine = placeShrine("reclaimers", "shrine", ORIGIN, 1);
		expect(removeShrine("reclaimers", shrine.id)).toBe(true);
	});

	it("returns false for non-existent shrine ID", () => {
		expect(removeShrine("reclaimers", "ghost_shrine")).toBe(false);
	});

	it("clears grandCathedralBuilt when cathedral removed", () => {
		const cat = placeShrine("iron_creed", "grand_cathedral", ORIGIN, 1);
		expect(getFactionIdeologyState("iron_creed")?.grandCathedralBuilt).toBe(true);
		removeShrine("iron_creed", cat.id);
		expect(getFactionIdeologyState("iron_creed")?.grandCathedralBuilt).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Faith generation
// ---------------------------------------------------------------------------

describe("computeFaithPerTick", () => {
	it("returns 0 with no shrines", () => {
		expect(computeFaithPerTick("reclaimers")).toBe(0);
	});

	it("shrine generates shrine faithOutputPerTick", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const expected = (buildingsConfig.religious as any).shrine.faithOutputPerTick;
		expect(computeFaithPerTick("reclaimers")).toBe(expected);
	});

	it("temple generates temple faithOutputPerTick", () => {
		placeShrine("reclaimers", "temple", ORIGIN, 1);
		const expected = (buildingsConfig.religious as any).temple.faithOutputPerTick;
		expect(computeFaithPerTick("reclaimers")).toBe(expected);
	});

	it("grand_cathedral generates cathedral faithOutputPerTick", () => {
		placeShrine("reclaimers", "grand_cathedral", ORIGIN, 1);
		const expected = (buildingsConfig.religious as any).grand_cathedral.faithOutputPerTick;
		expect(computeFaithPerTick("reclaimers")).toBe(expected);
	});

	it("multiple shrines add together", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		placeShrine("reclaimers", "shrine", { x: 5, y: 0, z: 5 }, 1);
		const shrineOutput = (buildingsConfig.religious as any).shrine.faithOutputPerTick;
		expect(computeFaithPerTick("reclaimers")).toBe(shrineOutput * 2);
	});

	it("Volt Collective gets storm bonus during active storm", () => {
		placeShrine("volt_collective", "shrine", ORIGIN, 1);
		const base = computeFaithPerTick("volt_collective", false);
		const withStorm = computeFaithPerTick("volt_collective", true);
		expect(withStorm).toBeGreaterThan(base);
	});

	it("Non-Volt factions do not get storm bonus", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		const base = computeFaithPerTick("reclaimers", false);
		const withStorm = computeFaithPerTick("reclaimers", true);
		expect(withStorm).toBe(base);
	});
});

describe("addFaith", () => {
	it("increases faith", () => {
		addFaith("reclaimers", 50, "test", 1);
		expect(getFaith("reclaimers")).toBe(50);
	});

	it("caps at maxFaith", () => {
		addFaith("reclaimers", faithCfg.maxFaith + 999, "test", 1);
		expect(getFaith("reclaimers")).toBe(faithCfg.maxFaith);
	});

	it("faith starts at 0 for new faction", () => {
		expect(getFaith("unknown_faction")).toBe(0);
	});
});

describe("updateIdeology", () => {
	it("generates faith from shrines each tick", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		updateIdeology("reclaimers", 1);
		expect(getFaith("reclaimers")).toBeGreaterThan(0);
	});

	it("does nothing if no shrines", () => {
		updateIdeology("reclaimers", 1);
		expect(getFaith("reclaimers")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Reason
// ---------------------------------------------------------------------------

describe("addReason", () => {
	it("increases reason", () => {
		addReason("signal_choir", 100);
		expect(getReason("signal_choir")).toBe(100);
	});

	it("caps at maxReason", () => {
		const maxReason = victoryPathsConfig.reasonSystem.maxReason;
		addReason("signal_choir", maxReason + 500);
		expect(getReason("signal_choir")).toBe(maxReason);
	});
});

// ---------------------------------------------------------------------------
// Doctrine unlocks
// ---------------------------------------------------------------------------

describe("doctrine unlocks", () => {
	it("no doctrines unlocked at low faith", () => {
		addFaith("reclaimers", 10, "test", 1);
		checkDoctrineUnlocks("reclaimers", 1);
		expect(getUnlockedDoctrines("reclaimers")).toHaveLength(0);
	});

	it("unlocks first doctrine at faithRequired threshold", () => {
		const firstDoctrine = (victoryPathsConfig.factionCults as any).reclaimers.doctrines[0];
		addFaith("reclaimers", firstDoctrine.faithRequired, "test", 1);
		checkDoctrineUnlocks("reclaimers", 1);
		const unlocked = getUnlockedDoctrines("reclaimers");
		expect(unlocked.some((d) => d.id === firstDoctrine.id)).toBe(true);
	});

	it("does not unlock the same doctrine twice", () => {
		const firstDoctrine = (victoryPathsConfig.factionCults as any).reclaimers.doctrines[0];
		addFaith("reclaimers", firstDoctrine.faithRequired, "test", 1);
		checkDoctrineUnlocks("reclaimers", 1);
		checkDoctrineUnlocks("reclaimers", 2);
		const unlocked = getUnlockedDoctrines("reclaimers").filter(
			(d) => d.id === firstDoctrine.id,
		);
		expect(unlocked).toHaveLength(1);
	});

	it("doctrine unlock gives a faith bonus", () => {
		const firstDoctrine = (victoryPathsConfig.factionCults as any).reclaimers.doctrines[0];
		addFaith("reclaimers", firstDoctrine.faithRequired, "test", 1);
		const before = getFaith("reclaimers");
		checkDoctrineUnlocks("reclaimers", 1);
		const after = getFaith("reclaimers");
		expect(after).toBeGreaterThan(before);
	});

	it("unknown faction returns empty array", () => {
		expect(checkDoctrineUnlocks("nonexistent", 1)).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Faith/Reason tension
// ---------------------------------------------------------------------------

describe("getResearchSpeedMultiplier", () => {
	it("returns 1.0 at zero faith", () => {
		expect(getResearchSpeedMultiplier("reclaimers")).toBe(1.0);
	});

	it("decreases as faith increases", () => {
		addFaith("reclaimers", faithCfg.maxFaith / 2, "test", 1);
		expect(getResearchSpeedMultiplier("reclaimers")).toBeLessThan(1.0);
	});

	it("never drops below 0.7", () => {
		addFaith("reclaimers", faithCfg.maxFaith, "test", 1);
		expect(getResearchSpeedMultiplier("reclaimers")).toBeGreaterThanOrEqual(0.7);
	});

	it("returns 1.0 for uninitialized faction", () => {
		expect(getResearchSpeedMultiplier("ghost_faction")).toBe(1.0);
	});
});

describe("getConversionResistance", () => {
	it("returns 1.0 (full vulnerability) at low reason", () => {
		expect(getConversionResistance("reclaimers")).toBe(1.0);
	});

	it("decreases (more resistant) as reason increases above threshold", () => {
		addReason("reclaimers", 300);
		expect(getConversionResistance("reclaimers")).toBeLessThan(1.0);
	});

	it("never returns negative", () => {
		addReason("reclaimers", 999999);
		expect(getConversionResistance("reclaimers")).toBeGreaterThanOrEqual(0);
	});
});

// ---------------------------------------------------------------------------
// Enlightenment victory progress
// ---------------------------------------------------------------------------

describe("getEnlightenmentProgress", () => {
	it("starts at 0 progress, not eligible", () => {
		const p = getEnlightenmentProgress("reclaimers");
		expect(p.faith).toBe(0);
		expect(p.isEligible).toBe(false);
	});

	it("is not eligible without grand cathedral", () => {
		addFaith("reclaimers", victoryEnlightenment.faithRequired, "test", 1);
		// Don't place grand cathedral
		const p = getEnlightenmentProgress("reclaimers");
		expect(p.isEligible).toBe(false);
	});

	it("is not eligible without cult leader surviving", () => {
		placeShrine("reclaimers", "grand_cathedral", ORIGIN, 1);
		addFaith("reclaimers", victoryEnlightenment.faithRequired, "test", 1);
		for (let i = 0; i < victoryEnlightenment.unitsConverted; i++) {
			recordConversion("reclaimers", 1);
		}
		// Force doctrine unlocks
		const doctrines = (victoryPathsConfig.factionCults as any).reclaimers.doctrines;
		addFaith("reclaimers", 999, "test", 2);
		checkDoctrineUnlocks("reclaimers", 2);
		// Don't call recordCultLeaderActive
		const p = getEnlightenmentProgress("reclaimers");
		expect(p.isEligible).toBe(false);
	});

	it("reports conversion progress", () => {
		recordConversion("reclaimers", 1);
		recordConversion("reclaimers", 2);
		const p = getEnlightenmentProgress("reclaimers");
		expect(p.unitsConverted).toBe(2);
	});

	it("tracks grand cathedral status", () => {
		placeShrine("reclaimers", "grand_cathedral", ORIGIN, 1);
		expect(getEnlightenmentProgress("reclaimers").grandCathedralBuilt).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Influence zones
// ---------------------------------------------------------------------------

describe("getInfluenceZones", () => {
	it("returns empty for faction with no shrines", () => {
		expect(getInfluenceZones("reclaimers")).toHaveLength(0);
	});

	it("returns one zone per shrine", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		placeShrine("reclaimers", "temple", { x: 10, y: 0, z: 0 }, 1);
		expect(getInfluenceZones("reclaimers")).toHaveLength(2);
	});

	it("temple zone has larger radius than shrine zone", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		placeShrine("reclaimers", "temple", { x: 10, y: 0, z: 0 }, 1);
		const zones = getInfluenceZones("reclaimers");
		const shrineZone = zones.find((z) => {
			const shrine = getFactionShrines("reclaimers").find((s) => s.id === z.shrineId);
			return shrine?.type === "shrine";
		});
		const templeZone = zones.find((z) => {
			const shrine = getFactionShrines("reclaimers").find((s) => s.id === z.shrineId);
			return shrine?.type === "temple";
		});
		expect(templeZone!.radius).toBeGreaterThan(shrineZone!.radius);
	});

	it("grand_cathedral zone has highest radius", () => {
		placeShrine("reclaimers", "shrine", ORIGIN, 1);
		placeShrine("reclaimers", "temple", { x: 5, y: 0, z: 0 }, 1);
		placeShrine("reclaimers", "grand_cathedral", { x: 10, y: 0, z: 0 }, 1);
		const zones = getInfluenceZones("reclaimers");
		const radii = zones.map((z) => z.radius).sort((a, b) => a - b);
		// Cathedral should have the largest radius
		expect(radii[2]).toBe(
			victoryPathsConfig.faithSystem.influenceZones.grand_cathedral.radius,
		);
	});
});

// ---------------------------------------------------------------------------
// Config alignment
// ---------------------------------------------------------------------------

describe("config alignment", () => {
	it("shrine faithOutputPerTick < temple < grand_cathedral", () => {
		const r = buildingsConfig.religious as any;
		expect(r.shrine.faithOutputPerTick).toBeLessThan(r.temple.faithOutputPerTick);
		expect(r.temple.faithOutputPerTick).toBeLessThan(r.grand_cathedral.faithOutputPerTick);
	});

	it("shrine influence radius < temple < grand_cathedral", () => {
		const iz = victoryPathsConfig.faithSystem.influenceZones;
		expect(iz.shrine.radius).toBeLessThan(iz.temple.radius);
		expect(iz.temple.radius).toBeLessThan(iz.grand_cathedral.radius);
	});

	it("all 4 factions have cult configs", () => {
		const cults = victoryPathsConfig.factionCults as any;
		expect(cults.reclaimers).toBeDefined();
		expect(cults.volt_collective).toBeDefined();
		expect(cults.signal_choir).toBeDefined();
		expect(cults.iron_creed).toBeDefined();
	});

	it("each faction has exactly 5 doctrines", () => {
		const cults = victoryPathsConfig.factionCults as any;
		for (const faction of ["reclaimers", "volt_collective", "signal_choir", "iron_creed"]) {
			expect(cults[faction].doctrines).toHaveLength(5);
		}
	});

	it("last doctrine per faction unlocks enlightenment victory", () => {
		const cults = victoryPathsConfig.factionCults as any;
		for (const faction of ["reclaimers", "volt_collective", "signal_choir", "iron_creed"]) {
			const lastDoctrine = cults[faction].doctrines[4];
			expect(lastDoctrine.effect.type).toBe("unlock_victory");
			expect(lastDoctrine.effect.victoryCheck).toBe("enlightenment");
		}
	});

	it("faithRequired for doctrines increases monotonically per faction", () => {
		const cults = victoryPathsConfig.factionCults as any;
		for (const faction of ["reclaimers", "volt_collective", "signal_choir", "iron_creed"]) {
			const doctrines = cults[faction].doctrines;
			for (let i = 1; i < doctrines.length; i++) {
				expect(doctrines[i].faithRequired).toBeGreaterThan(doctrines[i - 1].faithRequired);
			}
		}
	});

	it("enlightenment victory requires faith > 0 and grand cathedral", () => {
		expect(victoryEnlightenment.faithRequired).toBeGreaterThan(0);
		expect(victoryEnlightenment.grandCathedralRequired).toBe(true);
	});
});
