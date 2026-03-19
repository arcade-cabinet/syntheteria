/**
 * Radial Menu Action Providers — class-specific action sets.
 *
 * Each provider registers itself at module scope. Import this file once
 * at startup to wire all providers into the radial menu system.
 *
 * Per task #45: each robot class has DISTINCT radial actions that make
 * each unit feel different to control. Actions are filtered based on
 * the selected unit's robotClass from UnitStats.
 *
 * Providers:
 *   1.  Move — "Move Here" (scout, infantry, cavalry only)
 *   2.  Harvest — "Harvest" (worker only)
 *   3.  Attack — class-specific attack (melee, ranged, charge, flank)
 *   4.  Build — "Build" (worker only, on empty sector)
 *   5.  Fabricate — "Fabricate" (on motor pool building)
 *   6.  Synthesize — "Synthesize" (on synthesizer building)
 *   7.  Upgrade — "Upgrade" (on maintenance bay building)
 *   8.  Diplomacy — "Declare War" / "Propose Alliance" (on non-player units)
 *   9.  Stage — "Stage" (ranged, support, worker — staging classes)
 *   10. Class-specific utility/combat actions (per classActions.ts)
 */
import type { RadialOpenContext } from "./radialMenu";
import { registerRadialProvider } from "./radialMenu";
import type { World } from "koota";
import type { BuildingType } from "../ecs/traits/building";
import { Building, BotFabricator, Powered } from "../ecs/traits/building";
import { BUILDING_DEFS } from "../ecs/buildings/definitions";
import { canAfford } from "../ecs/systems/resourceSystem";
import { startBuildPlacement } from "../ecs/systems/buildSystem";
import { startHarvest } from "../ecs/systems/harvestSystem";
import {
	queueFabrication,
	ROBOT_COSTS,
} from "../ecs/systems/fabricationSystem";
import { canSpawnUnit } from "../ecs/systems/populationSystem";
import {
	queueSynthesis,
	FUSION_RECIPES,
	SynthesisQueue,
} from "../ecs/systems/synthesisSystem";
import { clearHighlights } from "../ecs/systems/highlightSystem";
import { playSfx } from "../audio/sfx";
import {
	UnitAttack,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../ecs/traits/unit";
import { ResourceDeposit } from "../ecs/traits/resource";
import { createGridApi } from "../board/grid";
import type { GeneratedBoard } from "../board/types";
import type { RobotClass } from "../ecs/robots/types";
import type { BotMark } from "../ecs/robots/marks";
import { MARK_DEFS } from "../ecs/robots/marks";
import { applyMark, getMaxTier, hasMark } from "../ecs/systems/upgradeSystem";
import { declareWar, getDiplomacyPersonality, proposeAlliance } from "../ecs/systems/diplomacySystem";
import { getRelation } from "../ecs/factions/relations";
import { Board } from "../ecs/traits/board";
import { UnitUpgrade } from "../ecs/traits/unit";
import { hasClassAction } from "../ecs/robots/classActions";

/** World ref set by BoardInput so providers can query ECS state. */
let _worldRef: World | null = null;
let _selectedUnitId: number | null = null;
let _boardRef: GeneratedBoard | null = null;

export function setBuildProviderWorld(world: World): void {
	_worldRef = world;
}

export function setProviderSelectedUnit(id: number | null): void {
	_selectedUnitId = id;
}

export function setProviderBoard(board: GeneratedBoard): void {
	_boardRef = board;
}

/** Find the selected player unit and return its entity + stats. */
function getSelectedPlayerUnit() {
	if (!_worldRef || _selectedUnitId == null) return null;
	for (const e of _worldRef.query(UnitPos, UnitStats, UnitFaction)) {
		if (e.id() === _selectedUnitId) {
			const faction = e.get(UnitFaction);
			if (!faction || faction.factionId !== "player") return null;
			return e;
		}
	}
	return null;
}

// --- MOVE provider ---

registerRadialProvider({
	id: "move",
	category: {
		id: "move",
		label: "Move",
		icon: "\u2192",
		tone: "neutral",
		priority: 1,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (!ctx.targetSector) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];

		const pos = unitEntity.get(UnitPos);
		const stats = unitEntity.get(UnitStats);
		if (!pos || !stats) return [];

		// Only classes with "move" action (not staging classes)
		if (!hasClassAction(stats.robotClass as RobotClass, "move")) return [];
		if (stats.mp < 1) return [];

		const world = _worldRef!;

		// Check reachability
		const targetX = ctx.targetSector.q;
		const targetZ = ctx.targetSector.r;

		// Same tile = no move needed
		if (targetX === pos.tileX && targetZ === pos.tileZ) return [];

		let reachable = false;
		if (_boardRef) {
			const gridApi = createGridApi(_boardRef);
			const reachableSet = gridApi.reachable(pos.tileX, pos.tileZ, stats.mp);
			reachable = reachableSet.has(`${targetX},${targetZ}`);
		}

		return [
			{
				id: "move_here",
				label: "Move Here",
				icon: "\u2192",
				tone: "neutral",
				enabled: reachable,
				disabledReason: reachable ? undefined : "Out of range",
				onExecute: () => {
					if (!unitEntity) return;
					const currentPos = unitEntity.get(UnitPos);
					if (!currentPos) return;
					playSfx("unit_move");
					unitEntity.add(
						UnitMove({
							fromX: currentPos.tileX,
							fromZ: currentPos.tileZ,
							toX: targetX,
							toZ: targetZ,
							progress: 0,
							mpCost: 1,
						}),
					);
					clearHighlights(world);
				},
			},
		];
	},
});

// --- HARVEST provider ---

registerRadialProvider({
	id: "harvest",
	category: {
		id: "harvest",
		label: "Harvest",
		icon: "\u26cf",
		tone: "harvest",
		priority: 2,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "resource_node") return [];
		if (!_worldRef || _selectedUnitId == null) return [];
		if (!ctx.targetEntityId) return [];

		// Only workers can harvest
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const unitStats = unitEntity.get(UnitStats);
		if (!unitStats || !hasClassAction(unitStats.robotClass as RobotClass, "harvest")) return [];

		const world = _worldRef;
		const unitId = _selectedUnitId;
		const depositId = Number(ctx.targetEntityId);

		// Verify the deposit exists and is not depleted
		let depositExists = false;
		for (const e of world.query(ResourceDeposit)) {
			if (e.id() === depositId) {
				const dep = e.get(ResourceDeposit);
				if (dep && !dep.depleted) depositExists = true;
				break;
			}
		}
		if (!depositExists) return [];

		return [
			{
				id: "harvest",
				label: "Harvest",
				icon: "\u26cf",
				tone: "harvest",
				enabled: true,
				onExecute: () => {
					const success = startHarvest(world, unitId, depositId);
					if (success) {
						clearHighlights(world);
					}
				},
			},
		];
	},
});

// --- ATTACK provider ---

registerRadialProvider({
	id: "attack",
	category: {
		id: "attack",
		label: "Attack",
		icon: "\u2694",
		tone: "hostile",
		priority: 3,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction === "player") return [];
		if (!_worldRef || _selectedUnitId == null) return [];
		if (!ctx.targetEntityId) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];

		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos || stats.ap < 1) return [];

		const world = _worldRef;
		const targetId = Number(ctx.targetEntityId);

		// Determine attack type from class actions
		const robotClass = stats.robotClass as RobotClass;
		const attackAction = ["attack_melee", "attack_ranged", "charge", "flank"]
			.map(id => ({ id, has: hasClassAction(robotClass, id) }))
			.filter(a => a.has);
		if (attackAction.length === 0) return [];

		// Check staging requirement for ranged attack
		if (hasClassAction(robotClass, "attack_ranged") && !stats.staged) return [];

		// Check target distance
		let targetPos = null;
		for (const e of world.query(UnitPos, UnitFaction)) {
			if (e.id() === targetId) {
				targetPos = e.get(UnitPos);
				break;
			}
		}
		if (!targetPos) return [];

		const dist =
			Math.abs(pos.tileX - targetPos.tileX) +
			Math.abs(pos.tileZ - targetPos.tileZ);

		// Use class-specific range (melee=1, ranged=2-4)
		const attackRange = stats.attackRange || 1;
		const inRange = dist <= attackRange;

		// Pick the appropriate attack label/icon based on class
		let attackLabel = "Attack";
		let attackIcon = "\u2694";
		if (hasClassAction(robotClass, "attack_ranged")) {
			attackLabel = "Attack (Ranged)";
			attackIcon = "\uD83C\uDFF9";
		}

		return [
			{
				id: "attack",
				label: attackLabel,
				icon: attackIcon,
				tone: "hostile",
				enabled: inRange,
				disabledReason: inRange ? undefined : "Out of range",
				onExecute: () => {
					if (!unitEntity) return;
					playSfx("attack_hit");
					unitEntity.add(
						UnitAttack({ targetEntityId: targetId, damage: stats.attack || 2 }),
					);
					const newStats = unitEntity.get(UnitStats);
					if (newStats) {
						unitEntity.set(UnitStats, {
							...newStats,
							ap: Math.max(0, newStats.ap - 1),
						});
					}
					clearHighlights(world);
				},
			},
		];
	},
});

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
		if (!_worldRef) return [];

		// Only workers can build
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const unitStats = unitEntity.get(UnitStats);
		if (!unitStats || !hasClassAction(unitStats.robotClass as RobotClass, "build")) return [];

		const world = _worldRef;

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
		if (!_worldRef || !ctx.targetEntityId) return [];
		if (ctx.targetFaction !== "player") return [];

		const world = _worldRef;
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
		if (!_worldRef || !ctx.targetEntityId) return [];
		if (ctx.targetFaction !== "player") return [];

		const world = _worldRef;
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
		if (!_worldRef || !ctx.targetEntityId) return [];
		if (ctx.targetFaction !== "player") return [];
		if (_selectedUnitId == null) return [];

		const world = _worldRef;
		const bayId = Number(ctx.targetEntityId);
		const unitId = _selectedUnitId;

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
		const dist = Math.abs(unitPos.tileX - b.tileX) + Math.abs(unitPos.tileZ - b.tileZ);
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
			else if (tierLocked) disabledReason = `Needs tier ${def.minTier} (build research lab)`;
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

// --- DIPLOMACY provider ---

function readTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

registerRadialProvider({
	id: "diplomacy",
	category: {
		id: "diplomacy",
		label: "Diplomacy",
		icon: "\uD83E\uDD1D",
		tone: "neutral",
		priority: 8,
	},
	getActions: (ctx: RadialOpenContext) => {
		// Only show on non-player units
		if (ctx.selectionType !== "unit") return [];
		if (!ctx.targetFaction || ctx.targetFaction === "player") return [];
		if (!_worldRef) return [];

		const world = _worldRef;
		const targetFaction = ctx.targetFaction;

		const relation = getRelation(world, "player", targetFaction);
		const personality = getDiplomacyPersonality(targetFaction);
		const turn = readTurn(world);

		const actions: Array<{
			id: string;
			label: string;
			icon: string;
			tone: string;
			enabled: boolean;
			disabledReason?: string;
			onExecute: () => void;
		}> = [];

		if (relation !== "hostile") {
			// Can declare war if not already hostile
			actions.push({
				id: "declare_war",
				label: "Declare War",
				icon: "\u2694",
				tone: "hostile",
				enabled: true,
				onExecute: () => {
					declareWar(world, "player", targetFaction, turn);
					playSfx("attack_hit");
					clearHighlights(world);
				},
			});
		}

		if (relation === "neutral") {
			// Can propose alliance if neutral
			const canAlly = personality?.acceptsAlliance ?? false;
			actions.push({
				id: "propose_alliance",
				label: "Propose Alliance",
				icon: "\uD83E\uDD1D",
				tone: "neutral",
				enabled: canAlly,
				disabledReason: canAlly ? undefined : "This faction refuses alliances",
				onExecute: () => {
					const accepted = proposeAlliance(world, "player", targetFaction, turn);
					if (accepted) {
						playSfx("build_complete");
					}
					clearHighlights(world);
				},
			});
		}

		return actions;
	},
});

// --- STAGE provider (ranged, support, worker) ---

registerRadialProvider({
	id: "stage",
	category: {
		id: "stage",
		label: "Stage",
		icon: "\u23F9",
		tone: "neutral",
		priority: 0, // Show first — staging is prerequisite for other actions
	},
	getActions: (ctx: RadialOpenContext) => {
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		if (!stats) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "stage")) return [];
		if (stats.staged) return []; // Already staged

		const world = _worldRef!;

		return [
			{
				id: "stage",
				label: "Stage",
				icon: "\u23F9",
				tone: "neutral",
				enabled: true,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, staged: true });
					}
					clearHighlights(world);
				},
			},
		];
	},
});

// --- FORTIFY provider (infantry) ---

registerRadialProvider({
	id: "fortify",
	category: {
		id: "class_combat",
		label: "Tactics",
		icon: "\uD83D\uDEE1",
		tone: "neutral",
		priority: 3,
	},
	getActions: (ctx: RadialOpenContext) => {
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		if (!stats || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "fortify")) return [];

		const world = _worldRef!;

		return [
			{
				id: "fortify",
				label: "Fortify",
				icon: "\uD83D\uDEE1",
				tone: "neutral",
				enabled: true,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, {
							...cur,
							defense: cur.defense + 2,
							ap: Math.max(0, cur.ap - 1),
						});
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- GUARD provider (infantry) ---

registerRadialProvider({
	id: "guard",
	category: {
		id: "class_combat",
		label: "Tactics",
		icon: "\uD83D\uDEE1",
		tone: "neutral",
		priority: 3,
	},
	getActions: (ctx: RadialOpenContext) => {
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		if (!stats || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "guard")) return [];

		const world = _worldRef!;

		return [
			{
				id: "guard",
				label: "Guard",
				icon: "\u2693",
				tone: "neutral",
				enabled: true,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, {
							...cur,
							ap: Math.max(0, cur.ap - 1),
						});
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- CHARGE provider (cavalry) ---

registerRadialProvider({
	id: "charge",
	category: {
		id: "class_combat",
		label: "Tactics",
		icon: "\uD83D\uDEE1",
		tone: "neutral",
		priority: 3,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction === "player") return [];
		if (!ctx.targetEntityId) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "charge")) return [];

		const world = _worldRef!;
		const targetId = Number(ctx.targetEntityId);

		let targetPos = null;
		for (const e of world.query(UnitPos, UnitFaction)) {
			if (e.id() === targetId) {
				targetPos = e.get(UnitPos);
				break;
			}
		}
		if (!targetPos) return [];

		const dist = Math.abs(pos.tileX - targetPos.tileX) + Math.abs(pos.tileZ - targetPos.tileZ);
		const inRange = dist >= 2 && dist <= 3;

		return [
			{
				id: "charge",
				label: "Charge",
				icon: "\u26A1",
				tone: "hostile",
				enabled: inRange,
				disabledReason: inRange ? undefined : dist < 2 ? "Too close to charge" : "Out of charge range",
				onExecute: () => {
					if (!unitEntity) return;
					playSfx("attack_hit");
					// Charge does +2 bonus damage
					unitEntity.add(
						UnitAttack({ targetEntityId: targetId, damage: (stats.attack || 2) + 2 }),
					);
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					// Move to adjacent tile
					unitEntity.add(
						UnitMove({
							fromX: pos.tileX,
							fromZ: pos.tileZ,
							toX: targetPos!.tileX,
							toZ: targetPos!.tileZ,
							progress: 0,
							mpCost: 0, // Charge doesn't cost MP
						}),
					);
					clearHighlights(world);
				},
			},
		];
	},
});

// --- FLANK provider (cavalry) ---

registerRadialProvider({
	id: "flank",
	category: {
		id: "class_combat",
		label: "Tactics",
		icon: "\uD83D\uDEE1",
		tone: "neutral",
		priority: 3,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction === "player") return [];
		if (!ctx.targetEntityId) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "flank")) return [];

		const world = _worldRef!;
		const targetId = Number(ctx.targetEntityId);

		let targetPos = null;
		for (const e of world.query(UnitPos, UnitFaction)) {
			if (e.id() === targetId) {
				targetPos = e.get(UnitPos);
				break;
			}
		}
		if (!targetPos) return [];

		const dist = Math.abs(pos.tileX - targetPos.tileX) + Math.abs(pos.tileZ - targetPos.tileZ);

		return [
			{
				id: "flank",
				label: "Flank",
				icon: "\u21B7",
				tone: "hostile",
				enabled: dist <= 1,
				disabledReason: dist > 1 ? "Not adjacent" : undefined,
				onExecute: () => {
					if (!unitEntity) return;
					playSfx("attack_hit");
					// Flank does +3 bonus damage
					unitEntity.add(
						UnitAttack({ targetEntityId: targetId, damage: (stats.attack || 2) + 3 }),
					);
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					clearHighlights(world);
				},
			},
		];
	},
});

// --- REVEAL provider (scout) ---

registerRadialProvider({
	id: "reveal",
	category: {
		id: "class_utility",
		label: "Utility",
		icon: "\uD83D\uDC41",
		tone: "neutral",
		priority: 9,
	},
	getActions: (ctx: RadialOpenContext) => {
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		if (!stats || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "reveal")) return [];

		const world = _worldRef!;

		return [
			{
				id: "reveal",
				label: "Reveal",
				icon: "\uD83D\uDC41",
				tone: "neutral",
				enabled: true,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- SIGNAL provider (scout) ---

registerRadialProvider({
	id: "signal",
	category: {
		id: "class_utility",
		label: "Utility",
		icon: "\uD83D\uDC41",
		tone: "neutral",
		priority: 9,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction === "player") return [];
		if (!ctx.targetEntityId) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "signal")) return [];

		const world = _worldRef!;
		const targetId = Number(ctx.targetEntityId);

		let targetPos = null;
		for (const e of world.query(UnitPos, UnitFaction)) {
			if (e.id() === targetId) {
				targetPos = e.get(UnitPos);
				break;
			}
		}
		if (!targetPos) return [];

		const dist = Math.abs(pos.tileX - targetPos.tileX) + Math.abs(pos.tileZ - targetPos.tileZ);
		const inRange = dist <= 4;

		return [
			{
				id: "signal",
				label: "Signal Target",
				icon: "\uD83D\uDCE1",
				tone: "neutral",
				enabled: inRange,
				disabledReason: inRange ? undefined : "Out of signal range",
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- OVERWATCH provider (ranged) ---

registerRadialProvider({
	id: "overwatch",
	category: {
		id: "class_combat",
		label: "Tactics",
		icon: "\uD83D\uDEE1",
		tone: "neutral",
		priority: 3,
	},
	getActions: (ctx: RadialOpenContext) => {
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		if (!stats || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "overwatch")) return [];

		// Must be staged
		if (!stats.staged) return [];

		const world = _worldRef!;

		return [
			{
				id: "overwatch",
				label: "Overwatch",
				icon: "\uD83D\uDD2D",
				tone: "hostile",
				enabled: true,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- RETREAT provider (cavalry) ---

registerRadialProvider({
	id: "retreat",
	category: {
		id: "move",
		label: "Move",
		icon: "\u2192",
		tone: "neutral",
		priority: 1,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (!ctx.targetSector) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "retreat")) return [];
		if (stats.mp < 1) return [];

		const world = _worldRef!;
		const targetX = ctx.targetSector.q;
		const targetZ = ctx.targetSector.r;

		if (targetX === pos.tileX && targetZ === pos.tileZ) return [];

		let reachable = false;
		if (_boardRef) {
			const gridApi = createGridApi(_boardRef);
			const reachableSet = gridApi.reachable(pos.tileX, pos.tileZ, Math.min(2, stats.mp));
			reachable = reachableSet.has(`${targetX},${targetZ}`);
		}

		return [
			{
				id: "retreat",
				label: "Retreat",
				icon: "\u2190",
				tone: "neutral",
				enabled: reachable,
				disabledReason: reachable ? undefined : "Out of range",
				onExecute: () => {
					playSfx("unit_move");
					unitEntity.add(
						UnitMove({
							fromX: pos.tileX,
							fromZ: pos.tileZ,
							toX: targetX,
							toZ: targetZ,
							progress: 0,
							mpCost: 1,
						}),
					);
					clearHighlights(world);
				},
			},
		];
	},
});

// --- RELOCATE provider (ranged) ---

registerRadialProvider({
	id: "relocate",
	category: {
		id: "move",
		label: "Move",
		icon: "\u2192",
		tone: "neutral",
		priority: 1,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (!ctx.targetSector) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "relocate")) return [];
		// Must be staged to relocate
		if (!stats.staged) return [];

		const targetX = ctx.targetSector.q;
		const targetZ = ctx.targetSector.r;
		if (targetX === pos.tileX && targetZ === pos.tileZ) return [];

		const dist = Math.abs(targetX - pos.tileX) + Math.abs(targetZ - pos.tileZ);
		const inRange = dist <= 1;

		const world = _worldRef!;

		return [
			{
				id: "relocate",
				label: "Relocate",
				icon: "\u21C4",
				tone: "neutral",
				enabled: inRange,
				disabledReason: inRange ? undefined : "Max 1 tile",
				onExecute: () => {
					playSfx("unit_move");
					unitEntity.add(
						UnitMove({
							fromX: pos.tileX,
							fromZ: pos.tileZ,
							toX: targetX,
							toZ: targetZ,
							progress: 0,
							mpCost: 0, // Relocate doesn't cost MP
						}),
					);
					clearHighlights(world);
				},
			},
		];
	},
});

// --- REPAIR provider (support) ---

registerRadialProvider({
	id: "repair",
	category: {
		id: "class_utility",
		label: "Utility",
		icon: "\uD83D\uDC41",
		tone: "neutral",
		priority: 9,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction !== "player") return [];
		if (!ctx.targetEntityId) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "repair")) return [];
		if (!stats.staged) return [];

		const world = _worldRef!;
		const targetId = Number(ctx.targetEntityId);

		// Can't repair self
		if (targetId === _selectedUnitId) return [];

		let targetEntity = null;
		for (const e of world.query(UnitPos, UnitStats, UnitFaction)) {
			if (e.id() === targetId) {
				targetEntity = e;
				break;
			}
		}
		if (!targetEntity) return [];

		const targetPos = targetEntity.get(UnitPos)!;
		const targetStats = targetEntity.get(UnitStats)!;
		const dist = Math.abs(pos.tileX - targetPos.tileX) + Math.abs(pos.tileZ - targetPos.tileZ);

		// Already at max HP
		if (targetStats.hp >= targetStats.maxHp) return [];

		return [
			{
				id: "repair",
				label: "Repair",
				icon: "\uD83D\uDD27",
				tone: "neutral",
				enabled: dist <= 1,
				disabledReason: dist > 1 ? "Not adjacent" : undefined,
				onExecute: () => {
					// Heal 3 HP
					const cur = targetEntity!.get(UnitStats)!;
					targetEntity!.set(UnitStats, {
						...cur,
						hp: Math.min(cur.maxHp, cur.hp + 3),
					});
					const myStats = unitEntity.get(UnitStats);
					if (myStats) {
						unitEntity.set(UnitStats, { ...myStats, ap: Math.max(0, myStats.ap - 1) });
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- BUFF provider (support) ---

registerRadialProvider({
	id: "buff",
	category: {
		id: "class_utility",
		label: "Utility",
		icon: "\uD83D\uDC41",
		tone: "neutral",
		priority: 9,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "unit") return [];
		if (ctx.targetFaction !== "player") return [];
		if (!ctx.targetEntityId) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "buff")) return [];
		if (!stats.staged) return [];

		const world = _worldRef!;
		const targetId = Number(ctx.targetEntityId);

		if (targetId === _selectedUnitId) return [];

		let targetPos = null;
		for (const e of world.query(UnitPos, UnitFaction)) {
			if (e.id() === targetId) {
				targetPos = e.get(UnitPos);
				break;
			}
		}
		if (!targetPos) return [];

		const dist = Math.abs(pos.tileX - targetPos.tileX) + Math.abs(pos.tileZ - targetPos.tileZ);

		return [
			{
				id: "buff",
				label: "Buff",
				icon: "\u2B06",
				tone: "neutral",
				enabled: dist <= 1,
				disabledReason: dist > 1 ? "Not adjacent" : undefined,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- DEPLOY BEACON provider (support) ---

registerRadialProvider({
	id: "deploy_beacon",
	category: {
		id: "class_utility",
		label: "Utility",
		icon: "\uD83D\uDC41",
		tone: "neutral",
		priority: 9,
	},
	getActions: (ctx: RadialOpenContext) => {
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		if (!stats || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "deploy_beacon")) return [];
		if (!stats.staged) return [];

		const world = _worldRef!;

		return [
			{
				id: "deploy_beacon",
				label: "Deploy Beacon",
				icon: "\uD83D\uDCE1",
				tone: "neutral",
				enabled: true,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- SALVAGE provider (worker) ---

registerRadialProvider({
	id: "salvage",
	category: {
		id: "harvest",
		label: "Harvest",
		icon: "\u26cf",
		tone: "harvest",
		priority: 2,
	},
	getActions: (ctx: RadialOpenContext) => {
		if (ctx.selectionType !== "building") return [];
		if (ctx.targetFaction !== "player") return [];
		if (!ctx.targetEntityId) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "salvage")) return [];
		if (!stats.staged) return [];

		const world = _worldRef!;
		const buildingId = Number(ctx.targetEntityId);

		// Find the building and check adjacency
		let buildingEntity = null;
		for (const e of world.query(Building)) {
			if (e.id() === buildingId) {
				buildingEntity = e;
				break;
			}
		}
		if (!buildingEntity) return [];

		const b = buildingEntity.get(Building)!;
		const dist = Math.abs(pos.tileX - b.tileX) + Math.abs(pos.tileZ - b.tileZ);

		return [
			{
				id: "salvage",
				label: "Salvage",
				icon: "\u267B",
				tone: "harvest",
				enabled: dist <= 1,
				disabledReason: dist > 1 ? "Not adjacent" : undefined,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});

// --- PROSPECT provider (worker) ---

registerRadialProvider({
	id: "prospect",
	category: {
		id: "class_utility",
		label: "Utility",
		icon: "\uD83D\uDC41",
		tone: "neutral",
		priority: 9,
	},
	getActions: (ctx: RadialOpenContext) => {
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const stats = unitEntity.get(UnitStats);
		if (!stats || stats.ap < 1) return [];

		const robotClass = stats.robotClass as RobotClass;
		if (!hasClassAction(robotClass, "prospect")) return [];
		if (!stats.staged) return [];

		const world = _worldRef!;

		return [
			{
				id: "prospect",
				label: "Prospect",
				icon: "\uD83D\uDD0D",
				tone: "neutral",
				enabled: true,
				onExecute: () => {
					const cur = unitEntity.get(UnitStats);
					if (cur) {
						unitEntity.set(UnitStats, { ...cur, ap: Math.max(0, cur.ap - 1) });
					}
					playSfx("build_complete");
					clearHighlights(world);
				},
			},
		];
	},
});
