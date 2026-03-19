/**
 * Radial providers: Move, Retreat, Relocate.
 *
 * Movement-related actions for the radial context menu.
 * Each provider self-registers via registerRadialProvider().
 */

import { playSfx } from "../../audio/sfx";
import { createGridApi } from "../../board/grid";
import { hasClassAction } from "../../robots/classActions";
import type { RobotClass } from "../../robots/types";
import { clearHighlights } from "../../systems/highlightSystem";
import { UnitMove, UnitPos, UnitStats } from "../../traits";
import type { RadialOpenContext } from "../radialMenu";
import { registerRadialProvider } from "../radialMenu";
import { getBoardRef, getSelectedPlayerUnit, getWorldRef } from "./providerState";

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

		const world = getWorldRef()!;
		const boardRef = getBoardRef();

		// Check reachability
		const targetX = ctx.targetSector.q;
		const targetZ = ctx.targetSector.r;

		// Same tile = no move needed
		if (targetX === pos.tileX && targetZ === pos.tileZ) return [];

		let reachable = false;
		if (boardRef) {
			const gridApi = createGridApi(boardRef);
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

		const world = getWorldRef()!;
		const boardRef = getBoardRef();
		const targetX = ctx.targetSector.q;
		const targetZ = ctx.targetSector.r;

		if (targetX === pos.tileX && targetZ === pos.tileZ) return [];

		let reachable = false;
		if (boardRef) {
			const gridApi = createGridApi(boardRef);
			const reachableSet = gridApi.reachable(
				pos.tileX,
				pos.tileZ,
				Math.min(2, stats.mp),
			);
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

		const world = getWorldRef()!;

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
