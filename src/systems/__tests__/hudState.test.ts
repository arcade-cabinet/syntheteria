/**
 * Tests for the HUD state manager.
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	getHUDState,
	subscribeHUD,
	updatePowderGauge,
	updateCompression,
	updateCrosshair,
	openRadialMenu,
	closeRadialMenu,
	selectRadialItem,
	updateStatusBar,
	updateCoords,
	updateBotInfo,
	updateGameInfo,
	setCubesCarried,
	triggerDamageFlash,
	toggleOverlay,
	setOverlay,
	hudTick,
	updateXPBar,
	resetHUDState,
} from "../hudState";

beforeEach(() => {
	resetHUDState();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
	it("has default values", () => {
		const state = getHUDState();
		expect(state.powderGauge.current).toBe(0);
		expect(state.crosshair.visible).toBe(true);
		expect(state.crosshair.style).toBe("default");
		expect(state.radialMenu.open).toBe(false);
		expect(state.showMinimap).toBe(true);
		expect(state.showInventory).toBe(false);
	});

	it("returns a copy", () => {
		const s1 = getHUDState();
		const s2 = getHUDState();
		expect(s1).not.toBe(s2);
	});
});

// ---------------------------------------------------------------------------
// Powder gauge
// ---------------------------------------------------------------------------

describe("powder gauge", () => {
	it("updates powder gauge", () => {
		updatePowderGauge({ current: 50, resourceType: "scrapMetal" });
		const state = getHUDState();
		expect(state.powderGauge.current).toBe(50);
		expect(state.powderGauge.resourceType).toBe("scrapMetal");
		expect(state.powderGauge.max).toBe(100); // unchanged
	});
});

// ---------------------------------------------------------------------------
// Compression overlay
// ---------------------------------------------------------------------------

describe("compression overlay", () => {
	it("activates compression", () => {
		updateCompression({ active: true, progress: 0.5, pressure: 0.7 });
		const state = getHUDState();
		expect(state.compression.active).toBe(true);
		expect(state.compression.progress).toBe(0.5);
	});
});

// ---------------------------------------------------------------------------
// Crosshair
// ---------------------------------------------------------------------------

describe("crosshair", () => {
	it("changes crosshair style", () => {
		updateCrosshair({ style: "harvest", targetName: "Iron Ore" });
		const state = getHUDState();
		expect(state.crosshair.style).toBe("harvest");
		expect(state.crosshair.targetName).toBe("Iron Ore");
	});
});

// ---------------------------------------------------------------------------
// Radial menu
// ---------------------------------------------------------------------------

describe("radial menu", () => {
	it("opens with items", () => {
		openRadialMenu(
			[
				{ id: "harvest", label: "Harvest", icon: "⛏", enabled: true },
				{ id: "scan", label: "Scan", icon: "📡", enabled: true },
			],
			"ore_1",
			"ore_deposit",
		);

		const state = getHUDState();
		expect(state.radialMenu.open).toBe(true);
		expect(state.radialMenu.items).toHaveLength(2);
		expect(state.radialMenu.targetId).toBe("ore_1");
	});

	it("closes menu", () => {
		openRadialMenu([{ id: "a", label: "A", icon: "", enabled: true }]);
		closeRadialMenu();

		const state = getHUDState();
		expect(state.radialMenu.open).toBe(false);
		expect(state.radialMenu.items).toHaveLength(0);
	});

	it("selects item", () => {
		openRadialMenu([
			{ id: "a", label: "A", icon: "", enabled: true },
			{ id: "b", label: "B", icon: "", enabled: true },
		]);
		selectRadialItem(1);

		expect(getHUDState().radialMenu.selectedIndex).toBe(1);
	});

	it("ignores out-of-bounds selection", () => {
		openRadialMenu([{ id: "a", label: "A", icon: "", enabled: true }]);
		selectRadialItem(5);
		expect(getHUDState().radialMenu.selectedIndex).toBe(-1);
	});
});

// ---------------------------------------------------------------------------
// Status bars
// ---------------------------------------------------------------------------

describe("status bars", () => {
	it("updates health bar", () => {
		updateStatusBar("componentHealth", { current: 50 });
		expect(getHUDState().componentHealth.current).toBe(50);
	});

	it("auto-sets low health warning", () => {
		updateStatusBar("componentHealth", { current: 20 });
		expect(getHUDState().lowHealthWarning).toBe(true);
	});

	it("clears low health warning when health recovers", () => {
		updateStatusBar("componentHealth", { current: 20 });
		updateStatusBar("componentHealth", { current: 80 });
		expect(getHUDState().lowHealthWarning).toBe(false);
	});

	it("auto-sets low power warning", () => {
		updateStatusBar("powerLevel", { current: 10 });
		expect(getHUDState().lowPowerWarning).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Info updates
// ---------------------------------------------------------------------------

describe("info updates", () => {
	it("updates coordinates", () => {
		updateCoords(15.7, 23.2);
		expect(getHUDState().coords).toEqual({ x: 16, z: 23 });
	});

	it("updates bot info", () => {
		updateBotInfo("Heavy Bot", "reclaimers");
		const state = getHUDState();
		expect(state.botName).toBe("Heavy Bot");
		expect(state.factionName).toBe("reclaimers");
	});

	it("updates game info", () => {
		updateGameInfo(2, 1500, "chrome_ridge");
		const state = getHUDState();
		expect(state.gameSpeed).toBe(2);
		expect(state.tickCount).toBe(1500);
		expect(state.currentBiome).toBe("chrome_ridge");
	});

	it("updates cubes carried", () => {
		setCubesCarried(3, 8);
		const state = getHUDState();
		expect(state.cubesCarried).toBe(3);
		expect(state.maxCubesCarried).toBe(8);
	});
});

// ---------------------------------------------------------------------------
// Damage flash
// ---------------------------------------------------------------------------

describe("damage flash", () => {
	it("triggers damage flash", () => {
		triggerDamageFlash(0.8);
		expect(getHUDState().damageFlashIntensity).toBe(0.8);
	});

	it("caps at 1.0", () => {
		triggerDamageFlash(5.0);
		expect(getHUDState().damageFlashIntensity).toBe(1.0);
	});

	it("decays over time", () => {
		triggerDamageFlash(1.0);
		hudTick(0.25); // decay by 0.5 (0.25 * 2)
		expect(getHUDState().damageFlashIntensity).toBe(0.5);
	});

	it("does not go below 0", () => {
		triggerDamageFlash(0.1);
		hudTick(1.0); // decay by 2.0
		expect(getHUDState().damageFlashIntensity).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

describe("overlays", () => {
	it("toggle opens overlay", () => {
		toggleOverlay("showInventory");
		expect(getHUDState().showInventory).toBe(true);
	});

	it("toggle closes overlay", () => {
		toggleOverlay("showInventory"); // open
		toggleOverlay("showInventory"); // close
		expect(getHUDState().showInventory).toBe(false);
	});

	it("setOverlay sets directly", () => {
		setOverlay("showBuildMenu", true);
		expect(getHUDState().showBuildMenu).toBe(true);

		setOverlay("showBuildMenu", false);
		expect(getHUDState().showBuildMenu).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

describe("subscriptions", () => {
	it("notifies on state change", () => {
		let count = 0;
		subscribeHUD(() => count++);

		updatePowderGauge({ current: 10 });
		expect(count).toBe(1);

		updateCrosshair({ style: "combat" });
		expect(count).toBe(2);
	});

	it("unsubscribes correctly", () => {
		let count = 0;
		const unsub = subscribeHUD(() => count++);

		updatePowderGauge({ current: 10 });
		expect(count).toBe(1);

		unsub();
		updatePowderGauge({ current: 20 });
		expect(count).toBe(1); // not called after unsub
	});
});

// ---------------------------------------------------------------------------
// XP bar
// ---------------------------------------------------------------------------

describe("xpBar", () => {
	it("has default XP bar state", () => {
		const state = getHUDState();
		expect(state.xpBar.totalXP).toBe(0);
		expect(state.xpBar.level).toBe(0);
		expect(state.xpBar.xpToNextLevel).toBe(100);
		expect(state.xpBar.pendingMilestoneNotifications).toEqual([]);
	});

	it("updates totalXP and level", () => {
		updateXPBar({ totalXP: 400, level: 2, xpToNextLevel: 500 });
		const state = getHUDState();
		expect(state.xpBar.totalXP).toBe(400);
		expect(state.xpBar.level).toBe(2);
		expect(state.xpBar.xpToNextLevel).toBe(500);
	});

	it("partial update preserves unchanged fields", () => {
		updateXPBar({ totalXP: 100 });
		expect(getHUDState().xpBar.level).toBe(0); // unchanged
		expect(getHUDState().xpBar.xpToNextLevel).toBe(100); // unchanged
	});

	it("stores pending milestone notification messages", () => {
		updateXPBar({
			pendingMilestoneNotifications: [
				"First cube compressed. Belt system unlocked.",
			],
		});
		expect(
			getHUDState().xpBar.pendingMilestoneNotifications,
		).toHaveLength(1);
		expect(
			getHUDState().xpBar.pendingMilestoneNotifications[0],
		).toBe("First cube compressed. Belt system unlocked.");
	});

	it("notifies subscribers when XP bar updates", () => {
		let count = 0;
		subscribeHUD(() => count++);
		updateXPBar({ totalXP: 50 });
		expect(count).toBe(1);
	});

	it("resets xpBar on resetHUDState", () => {
		updateXPBar({
			totalXP: 9999,
			level: 10,
			xpToNextLevel: 0,
			pendingMilestoneNotifications: ["some notification"],
		});
		resetHUDState();
		const state = getHUDState();
		expect(state.xpBar.totalXP).toBe(0);
		expect(state.xpBar.level).toBe(0);
		expect(state.xpBar.xpToNextLevel).toBe(100);
		expect(state.xpBar.pendingMilestoneNotifications).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("resets to default state", () => {
		updatePowderGauge({ current: 50 });
		updateCrosshair({ style: "combat" });
		toggleOverlay("showInventory");

		resetHUDState();

		const state = getHUDState();
		expect(state.powderGauge.current).toBe(0);
		expect(state.crosshair.style).toBe("default");
		expect(state.showInventory).toBe(false);
	});

	it("clears listeners on reset", () => {
		let count = 0;
		subscribeHUD(() => count++);

		resetHUDState();
		updatePowderGauge({ current: 10 });
		expect(count).toBe(0); // listener was cleared
	});
});
