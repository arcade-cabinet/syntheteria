/**
 * Full game lifecycle integration test — init through 50 turns with ALL systems.
 * Verifies every major system fires correctly in sequence.
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetAIRuntime } from "../ai/yukaAiTurnSystem";
import { generateBoard } from "../board/generator";
import type { GeneratedBoard } from "../board/types";
import { computeEpoch } from "../config";
import { initWorldFromBoard } from "../init-world";
import { clearBuildingUpgradeJobs } from "../systems/buildingUpgradeSystem";
import { resetCampaignStats } from "../systems/campaignStats";
import { _resetDiplomacy } from "../systems/diplomacySystem";
import { _resetPOIDiscovery } from "../systems/poiDiscoverySystem";
import { resetResourceDeltas } from "../systems/resourceDeltaSystem";
import {
	_resetScoreSystem,
	calculateFactionScore,
} from "../systems/scoreSystem";
import { _resetToasts } from "../systems/toastNotifications";
import { resetTurnEventLog } from "../systems/turnEventLog";
import {
	_resetEpochEvents,
	advanceTurn,
	getCurrentTurn,
} from "../systems/turnSystem";
import { resetTutorialTooltips } from "../systems/tutorialTooltips";
import { _resetVictory } from "../systems/victorySystem";
import type { ResourceMaterial } from "../terrain";
import {
	Building,
	Faction,
	ResourcePool,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../traits";

const ALL_MATERIALS: readonly ResourceMaterial[] = [
	"stone",
	"timber",
	"iron_ore",
	"coal",
	"food",
	"fiber",
	"sand",
	"clay",
	"steel",
	"concrete",
	"glass",
	"circuits",
	"fuel",
	"alloy",
	"nanomaterial",
	"fusion_cell",
	"quantum_crystal",
];

describe("Game Lifecycle Integration", () => {
	let world: ReturnType<typeof createWorld>;
	let board: GeneratedBoard;

	beforeEach(() => {
		resetAIRuntime();
		_resetVictory();
		_resetScoreSystem();
		_resetEpochEvents();
		clearBuildingUpgradeJobs();
		resetTutorialTooltips();
		_resetToasts();
		resetTurnEventLog();
		resetCampaignStats();
		resetResourceDeltas();
		_resetDiplomacy();
		_resetPOIDiscovery();

		world = createWorld();
		board = generateBoard({
			width: 32,
			height: 32,
			seed: "lifecycle-test-50",
			difficulty: "normal",
		});

		initWorldFromBoard(world, board, {
			difficulty: "standard",
			factionSlots: [
				{ factionId: "reclaimers", role: "ai" },
				{ factionId: "volt_collective", role: "ai" },
				{ factionId: "signal_choir", role: "ai" },
				{ factionId: "iron_creed", role: "ai" },
			],
		});
	});

	afterEach(() => {
		world.destroy();
	});

	it("runs 50 turns with all systems producing expected outcomes", () => {
		const initialBuildingCount = world.query(Building).length;
		const initialUnitCount = world.query(UnitFaction).length;

		expect(getCurrentTurn(world)).toBe(1);
		expect(initialBuildingCount).toBeGreaterThan(0);
		expect(initialUnitCount).toBeGreaterThan(0);

		for (let t = 1; t <= 50; t++) {
			advanceTurn(world, board, { observerMode: true });
		}

		const finalTurn = getCurrentTurn(world);
		expect(finalTurn).toBe(51);

		const finalBuildingCount = world.query(Building).length;
		expect(finalBuildingCount).toBeGreaterThan(initialBuildingCount);

		const epoch = computeEpoch(1, finalTurn);
		expect(epoch.number).toBeGreaterThanOrEqual(2);

		const factionIds = [
			"reclaimers",
			"volt_collective",
			"signal_choir",
			"iron_creed",
		];
		let anyScorePositive = false;
		for (const fid of factionIds) {
			const score = calculateFactionScore(world, fid);
			if (score > 0) anyScorePositive = true;
		}
		expect(anyScorePositive).toBe(true);

		let totalResources = 0;
		for (const e of world.query(Faction, ResourcePool)) {
			const r = e.get(ResourcePool);
			if (!r) continue;
			for (const mat of ALL_MATERIALS) {
				totalResources += (r as Record<string, number>)[mat] ?? 0;
			}
		}
		expect(totalResources).toBeGreaterThan(0);

		const unitCountChanged =
			world.query(UnitFaction).length !== initialUnitCount;
		expect(unitCountChanged).toBe(true);
	}, 120_000);
});
