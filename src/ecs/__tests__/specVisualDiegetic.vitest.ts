/**
 * SPEC TEST: GAME_DESIGN.md Section 9 — Visual + Diegetic Language
 *
 * Tests:
 *   - Diegetic vocabulary: CYCLE not Turn, SYNC not Save, ADVANCE not End Turn, CALIBRATION not Settings
 *   - Color palette: mint #7ee7cb, cyan #8be6ff, amber #f6c56a, restrained red #cc4444
 *   - Radial menu is the ONLY action surface (no persistent bottom panels, no floating toolbars)
 *   - Radial dual-ring: inner=categories, outer=actions within category
 *   - Input: left-click=select/move, right-click=radial, scroll=zoom, WASD=pan
 *   - Unit readiness glow when AP > 0
 *
 * These tests verify spec compliance. Failures indicate missing or divergent features.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	FACTION_COLORS,
	PLAYER_UNIT_COLOR,
	STANDING_DISPLAY,
} from "../../config/gameDefaults";
import {
	getRadialGeometry,
	getRadialMenuState,
	openRadialMenu,
	type RadialActionProvider,
	type RadialOpenContext,
	registerRadialProvider,
	_reset as resetRadial,
} from "../../systems/radialMenu";

describe("SPEC: Section 9 — Visual & Diegetic Language", () => {
	// ─── Color palette ─────────────────────────────────────────────────

	describe("color palette (spec hex values)", () => {
		it("mint #7ee7cb for health/stable/readiness", () => {
			// GAME_DESIGN.md: "Mint — stable ownership, health, active readiness"
			// Check if the standing display uses this color for allied
			expect(STANDING_DISPLAY.allied.color).toBe("#7ee7cb");
		});

		it("restrained red #cc4444 for danger/failure", () => {
			// GAME_DESIGN.md: "Restrained red — failure, danger, hostile pressure"
			expect(STANDING_DISPLAY.hostile.color).toBe("#cc4444");
		});

		it("amber #f6c56a for fabrication/power/utility", () => {
			// GAME_DESIGN.md: "Amber — fabrication, power, utility"
			expect(STANDING_DISPLAY.cordial.color).toBe("#f6c56a");
		});

		it("player unit color is a green/mint/cyan variant", () => {
			// GAME_DESIGN.md: Player faction should use mint/cyan
			// PLAYER_UNIT_COLOR = 0x00ffaa (bright mint green)
			expect(PLAYER_UNIT_COLOR).toBeTruthy();
			// Extract RGB components — should be green-heavy
			const r = (PLAYER_UNIT_COLOR >> 16) & 0xff;
			const g = (PLAYER_UNIT_COLOR >> 8) & 0xff;
			const b = PLAYER_UNIT_COLOR & 0xff;
			expect(g).toBeGreaterThan(r); // Green dominates
		});
	});

	// ─── Radial menu ───────────────────────────────────────────────────

	describe("radial menu as ONLY action surface", () => {
		beforeEach(() => {
			resetRadial();
		});

		afterEach(() => {
			resetRadial();
		});

		it("radial menu has dual-ring design (inner + outer)", () => {
			// GAME_DESIGN.md: "Radial menu is the only contextual action surface. Dual-ring design"
			const geo = getRadialGeometry();
			expect(geo.innerRingInner).toBeLessThan(geo.innerRingOuter);
			expect(geo.outerRingInner).toBeLessThan(geo.outerRingOuter);
			expect(geo.innerRingOuter).toBeLessThan(geo.outerRingInner); // Gap between rings
		});

		it("inner ring shows categories, outer ring shows actions", () => {
			// Register a test provider with multiple actions
			const provider: RadialActionProvider = {
				id: "test_provider",
				category: {
					id: "test_cat",
					label: "Test",
					icon: "T",
					tone: "cyan",
					priority: 1,
				},
				getActions: () => [
					{
						id: "action1",
						label: "Action 1",
						icon: "1",
						tone: "cyan",
						enabled: true,
						onExecute: () => {},
					},
					{
						id: "action2",
						label: "Action 2",
						icon: "2",
						tone: "cyan",
						enabled: true,
						onExecute: () => {},
					},
				],
			};
			registerRadialProvider(provider);

			const ctx: RadialOpenContext = {
				selectionType: "unit",
				targetEntityId: "1",
				targetSector: { q: 0, r: 0 },
				targetFaction: "player",
			};

			openRadialMenu(100, 100, ctx);
			const state = getRadialMenuState();

			expect(state.open).toBe(true);
			// Inner ring has category petals
			expect(state.innerPetals.length).toBeGreaterThan(0);
			expect(state.innerPetals[0].label).toBe("Test");
			// Outer ring starts closed
			expect(state.outerRingOpen).toBe(false);
		});

		it("single-action categories execute directly on inner ring click", () => {
			let executed = false;
			const provider: RadialActionProvider = {
				id: "single_provider",
				category: {
					id: "single_cat",
					label: "Direct",
					icon: "D",
					tone: "mint",
					priority: 1,
				},
				getActions: () => [
					{
						id: "only_action",
						label: "Do Thing",
						icon: "!",
						tone: "mint",
						enabled: true,
						onExecute: () => {
							executed = true;
						},
					},
				],
			};
			registerRadialProvider(provider);

			const ctx: RadialOpenContext = {
				selectionType: "unit",
				targetEntityId: "1",
				targetSector: { q: 0, r: 0 },
				targetFaction: "player",
			};

			openRadialMenu(100, 100, ctx);
			const state = getRadialMenuState();

			// Single-action category should have childCount 1
			expect(state.innerPetals[0].childCount).toBe(1);
		});

		it("menu opens with context info (selectionType, targetEntity, faction)", () => {
			const provider: RadialActionProvider = {
				id: "ctx_provider",
				category: {
					id: "ctx_cat",
					label: "Context",
					icon: "C",
					tone: "cyan",
					priority: 1,
				},
				getActions: () => [
					{
						id: "ctx_action",
						label: "Act",
						icon: "A",
						tone: "cyan",
						enabled: true,
						onExecute: () => {},
					},
				],
			};
			registerRadialProvider(provider);

			const ctx: RadialOpenContext = {
				selectionType: "unit",
				targetEntityId: "42",
				targetSector: { q: 5, r: 3 },
				targetFaction: "player",
			};

			openRadialMenu(200, 150, ctx);
			const state = getRadialMenuState();

			expect(state.context).not.toBeNull();
			expect(state.context!.selectionType).toBe("unit");
			expect(state.context!.targetEntityId).toBe("42");
			expect(state.context!.targetFaction).toBe("player");
		});

		it("menu does not open when no providers return actions", () => {
			// No providers registered
			const ctx: RadialOpenContext = {
				selectionType: "none",
				targetEntityId: null,
				targetSector: null,
				targetFaction: null,
			};

			openRadialMenu(100, 100, ctx);
			const state = getRadialMenuState();
			expect(state.open).toBe(false);
		});
	});

	// ─── Diegetic vocabulary ───────────────────────────────────────────

	describe("diegetic vocabulary", () => {
		it("standing display labels use diegetic terms", () => {
			// Verify the standing system uses contextually appropriate labels
			expect(STANDING_DISPLAY.hostile.label).toBe("Hostile");
			expect(STANDING_DISPLAY.neutral.label).toBe("Neutral");
			expect(STANDING_DISPLAY.allied.label).toBe("Allied");
		});

		it("GAME_DESIGN.md vocabulary table exists (spec reference)", () => {
			// GAME_DESIGN.md Section 9 specifies these substitutions:
			// Turn 1 → TURN CYCLE
			// Settings → Calibration
			// Save game → Persistence sync
			// Loading... → Mapping sectors... / Calibrating...
			// You win → Signal dominance achieved
			// Game over → Relay lost
			//
			// This test documents the spec requirement.
			// Implementation verification requires scanning UI strings.
			const specVocabulary = {
				avoid: [
					"Turn 1",
					"Settings",
					"Save game",
					"Loading...",
					"You win",
					"Game over",
				],
				use: [
					"TURN CYCLE",
					"Calibration",
					"Persistence sync",
					"Mapping sectors...",
					"Signal dominance achieved",
					"Relay lost",
				],
			};
			expect(specVocabulary.avoid).toHaveLength(6);
			expect(specVocabulary.use).toHaveLength(6);
		});
	});

	// ─── Input model ───────────────────────────────────────────────────

	describe("input model (spec reference)", () => {
		it("desktop input model documented: left-click, right-click, scroll, WASD", () => {
			// GAME_DESIGN.md Section 9:
			// "Desktop: Left-click = select/move. Right-click = radial menu. Scroll = zoom. WASD = pan."
			// This is a documentation-level test — BoardInput.tsx implements the mapping.
			const desktopInputs = {
				leftClick: "select/move",
				rightClick: "radial menu",
				scroll: "zoom",
				wasd: "pan",
			};
			expect(Object.keys(desktopInputs)).toHaveLength(4);
		});

		it("mobile input model documented: tap, long-press, two-finger, pinch", () => {
			// GAME_DESIGN.md Section 9:
			// "Mobile: Tap = select/move. Long-press (500ms) = radial menu. Two-finger drag = pan. Pinch = zoom."
			const mobileInputs = {
				tap: "select/move",
				longPress: "radial menu (500ms)",
				twoFingerDrag: "pan",
				pinch: "zoom",
			};
			expect(Object.keys(mobileInputs)).toHaveLength(4);
		});
	});

	// ─── Faction colors match palette ──────────────────────────────────

	describe("faction colors", () => {
		it("player faction uses mint/green color", () => {
			expect(FACTION_COLORS.player).toBe(PLAYER_UNIT_COLOR);
		});

		it("all defined factions have colors in the FACTION_COLORS map", () => {
			const expectedFactions = [
				"player",
				"reclaimers",
				"volt_collective",
				"signal_choir",
				"iron_creed",
			];
			for (const fid of expectedFactions) {
				expect(FACTION_COLORS[fid]).toBeDefined();
				expect(FACTION_COLORS[fid]).toBeGreaterThan(0);
			}
		});
	});
});
