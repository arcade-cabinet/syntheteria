/**
 * Radial providers: Build, Fabricate, Synthesize, Upgrade.
 *
 * Construction and production actions for the radial context menu.
 * Each provider self-registers via registerRadialProvider().
 */

import { playSfx } from "../../audio/sfx";
import { BUILDING_DEFS } from "../../buildings/definitions";
import { hasClassAction } from "../../robots/classActions";
import type { BotMark } from "../../robots/marks";
import { MARK_DEFS } from "../../robots/marks";
import type { RobotClass } from "../../robots/types";
import { startBuildPlacement } from "../../systems/buildSystem";
import { queueFabrication, ROBOT_COSTS } from "../../systems/fabricationSystem";
import { clearHighlights } from "../../systems/highlightSystem";
import { canSpawnUnit } from "../../systems/populationSystem";
import { canAfford } from "../../systems/resourceSystem";
import {
	FUSION_RECIPES,
	queueSynthesis,
	SynthesisQueue,
} from "../../systems/synthesisSystem";
import { applyMark, getMaxTier, hasMark } from "../../systems/upgradeSystem";
import {
	BotFabricator,
	Building,
	type BuildingType,
	Powered,
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitUpgrade,
} from "../../traits";
import type { RadialOpenContext } from "../radialMenu";
import { registerRadialProvider } from "../radialMenu";
import {
	getSelectedPlayerUnit,
	getSelectedUnitId,
	getWorldRef,
} from "./providerState";

// --- BUILD provider ---

registerRadialProvider({
	id: "build",
	category: {
		id: "build",
		label: "Build",
		icon: "\uD83D\uDD27",
		tone: "construct",
		priority: 4,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "empty_sector") return [];
		const worldRef = getWorldRef();
		if (!worldRef) return [];

		// Only workers can build
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const unitStats = unitEntity.get(UnitStats);
		if (
			!unitStats ||
			!hasClassAction(unitStats.robotClass as RobotClass, "build")
		)
			return [];

		const world = worldRef;

		return (Object.keys(BUILDING_DEFS) as BuildingType[]).map((type) => {
			const def = BUILDING_DEFS[type];
			const affordable = canAfford(world, "player", def.buildCost);
			return {
				id: `build_${type}`,
				label: def.displayName,
				icon: "\uD83D\uDD27",
				tone: "construct",
				enabled: affordable,
				disabledReason: affordable ? undefined : "Not enough resources",
				onExecute: () => {
					startBuildPlacement(world, type);
				},
			};
		});
	},
});

// --- FABRICATE provider ---

registerRadialProvider({
	id: "fabricate",
	category: {
		id: "fabricate",
		label: "Fabricate",
		icon: "\u2699",
		tone: "construct",
		priority: 5,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "building") return [];
		const worldRef = getWorldRef();
		if (!worldRef || !ctx.targetEntityId) return [];
		if (ctx.targetFaction !== "player") return [];

		const world = worldRef;
		const buildingId = Number(ctx.targetEntityId);

		// Find the building entity and verify it's a motor pool with fabricator
		let motorPoolEntity = null;
		for (const e of world.query(Building, BotFabricator)) {
			if (e.id() === buildingId) {
				motorPoolEntity = e;
				break;
			}
		}
		if (!motorPoolEntity) return [];

		const b = motorPoolEntity.get(Building);
		if (!b || b.buildingType !== "motor_pool") return [];

		const isPowered = motorPoolEntity.has(Powered);
		const fab = motorPoolEntity.get(BotFabricator);
		const slotsFull = fab ? fab.queueSize >= fab.fabricationSlots : true;
		const atPopCap = !canSpawnUnit(world, "player");

		return (Object.keys(ROBOT_COSTS) as RobotClass[]).map((robotClass) => {
			const cost = ROBOT_COSTS[robotClass];
			const affordable = canAfford(world, "player", cost.materials);
			const enabled = isPowered && !slotsFull && affordable && !atPopCap;

			let disabledReason: string | undefined;
			if (!isPowered) disabledReason = "No power";
			else if (atPopCap) disabledReason = "Population cap reached";
			else if (slotsFull) disabledReason = "Queue full";
			else if (!affordable) disabledReason = "Not enough resources";

			return {
				id: `fab_${robotClass}`,
				label: `${robotClass.replace(/_/g, " ")} (${cost.buildTime}t)`,
				icon: "\u2699",
				tone: "construct",
				enabled,
				disabledReason,
				onExecute: () => {
					if (!motorPoolEntity) return;
					const result = queueFabrication(world, motorPoolEntity, robotClass);
					if (result.ok) {
						playSfx("build_complete");
						clearHighlights(world);
					}
				},
			};
		});
	},
});

// --- SYNTHESIZE provider ---

registerRadialProvider({
	id: "synthesize",
	category: {
		id: "synthesize",
		label: "Synthesize",
		icon: "\u2697",
		tone: "construct",
		priority: 6,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "building") return [];
		const worldRef = getWorldRef();
		if (!worldRef || !ctx.targetEntityId) return [];
		if (ctx.targetFaction !== "player") return [];

		const world = worldRef;
		const buildingId = Number(ctx.targetEntityId);

		// Find the building entity and verify it's a powered synthesizer
		let synthEntity = null;
		for (const e of world.query(Building, Powered)) {
			if (e.id() === buildingId) {
				synthEntity = e;
				break;
			}
		}
		if (!synthEntity) return [];

		const b = synthEntity.get(Building);
		if (!b || b.buildingType !== "synthesizer") return [];

		const hasQueue = synthEntity.has(SynthesisQueue);

		return FUSION_RECIPES.map((recipe) => {
			const affordable = canAfford(world, "player", recipe.inputs);
			const enabled = !hasQueue && affordable;

			let disabledReason: string | undefined;
			if (hasQueue) disabledReason = "Already synthesizing";
			else if (!affordable) disabledReason = "Not enough resources";

			return {
				id: `synth_${recipe.id}`,
				label: recipe.label,
				icon: "\u2697",
				tone: "construct",
				enabled,
				disabledReason,
				onExecute: () => {
					const success = queueSynthesis(world, buildingId, recipe.id);
					if (success) {
						playSfx("build_complete");
						clearHighlights(world);
					}
				},
			};
		});
	},
});

// --- UPGRADE provider ---

registerRadialProvider({
	id: "upgrade",
	category: {
		id: "upgrade",
		label: "Upgrade",
		icon: "\u2B06",
		tone: "construct",
		priority: 7,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "building") return [];
		const worldRef = getWorldRef();
		const selectedUnitId = getSelectedUnitId();
		if (!worldRef || !ctx.targetEntityId) return [];
		if (ctx.targetFaction !== "player") return [];
		if (selectedUnitId == null) return [];

		const world = worldRef;
		const bayId = Number(ctx.targetEntityId);
		const unitId = selectedUnitId;

		// Verify it's a powered maintenance bay
		let bayEntity = null;
		for (const e of world.query(Building, Powered)) {
			if (e.id() === bayId) {
				bayEntity = e;
				break;
			}
		}
		if (!bayEntity) return [];

		const b = bayEntity.get(Building);
		if (!b || b.buildingType !== "maintenance_bay") return [];

		// Find the selected player unit and check adjacency
		let unitEntity = null;
		for (const e of world.query(UnitPos, UnitStats, UnitFaction)) {
			if (e.id() === unitId) {
				unitEntity = e;
				break;
			}
		}
		if (!unitEntity) return [];

		const unitFaction = unitEntity.get(UnitFaction);
		if (!unitFaction || unitFaction.factionId !== "player") return [];

		const unitPos = unitEntity.get(UnitPos)!;
		const dist =
			Math.abs(unitPos.tileX - b.tileX) + Math.abs(unitPos.tileZ - b.tileZ);
		if (dist > 1) return [];

		const maxTier = getMaxTier(world, "player");
		const upgrade = unitEntity.get(UnitUpgrade);
		const currentMarks = upgrade?.marks ?? "";

		return (Object.keys(MARK_DEFS) as BotMark[]).map((mark) => {
			const def = MARK_DEFS[mark];
			const alreadyHas = hasMark(currentMarks, mark);
			const tierLocked = def.minTier > maxTier;
			const affordable = canAfford(world, "player", def.cost);
			const enabled = !alreadyHas && !tierLocked && affordable;

			let disabledReason: string | undefined;
			if (alreadyHas) disabledReason = "Already applied";
			else if (tierLocked)
				disabledReason = `Needs tier ${def.minTier} (build research lab)`;
			else if (!affordable) disabledReason = "Not enough resources";

			return {
				id: `mark_${mark}`,
				label: def.label,
				icon: "\u2B06",
				tone: "construct",
				enabled,
				disabledReason,
				onExecute: () => {
					applyMark(world, unitId, bayId, mark);
					clearHighlights(world);
				},
			};
		});
	},
});
