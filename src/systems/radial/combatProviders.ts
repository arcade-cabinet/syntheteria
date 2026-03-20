/**
 * Radial providers: Attack, Stage, Fortify, Guard, Charge, Flank, Overwatch.
 *
 * Combat and tactical actions for the radial context menu.
 * Each provider self-registers via registerRadialProvider().
 */

import { playSfx } from "../../audio/sfx";
import { hasClassAction } from "../../robots/classActions";
import type { RobotClass } from "../../robots/types";
import { clearHighlights } from "../../systems/highlightSystem";
import {
	UnitAttack,
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../../traits";
import type { RadialOpenContext } from "../radialMenu";
import { registerRadialProvider } from "../radialMenu";
import { getSelectedPlayerUnit, getWorldRef } from "./providerState";

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
		if (!ctx.targetEntityId) return [];

		const worldRef = getWorldRef();
		if (!worldRef) return [];

		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];

		const stats = unitEntity.get(UnitStats);
		const pos = unitEntity.get(UnitPos);
		if (!stats || !pos || stats.ap < 1) return [];

		const world = worldRef;
		const targetId = Number(ctx.targetEntityId);

		// Determine attack type from class actions
		const robotClass = stats.robotClass as RobotClass;
		const attackAction = ["attack_melee", "attack_ranged", "charge", "flank"]
			.map((id) => ({ id, has: hasClassAction(robotClass, id) }))
			.filter((a) => a.has);
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

		const world = getWorldRef()!;

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

		const world = getWorldRef()!;

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

		const world = getWorldRef()!;

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

		const world = getWorldRef()!;
		const targetId = Number(ctx.targetEntityId);

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
		const inRange = dist >= 2 && dist <= 3;

		return [
			{
				id: "charge",
				label: "Charge",
				icon: "\u26A1",
				tone: "hostile",
				enabled: inRange,
				disabledReason: inRange
					? undefined
					: dist < 2
						? "Too close to charge"
						: "Out of charge range",
				onExecute: () => {
					if (!unitEntity) return;
					playSfx("attack_hit");
					// Charge does +2 bonus damage
					unitEntity.add(
						UnitAttack({
							targetEntityId: targetId,
							damage: (stats.attack || 2) + 2,
						}),
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

		const world = getWorldRef()!;
		const targetId = Number(ctx.targetEntityId);

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
						UnitAttack({
							targetEntityId: targetId,
							damage: (stats.attack || 2) + 3,
						}),
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

		const world = getWorldRef()!;

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
