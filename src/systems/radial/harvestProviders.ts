/**
 * Radial providers: Harvest, Salvage, Prospect.
 *
 * Resource-gathering actions for the radial context menu.
 * Each provider self-registers via registerRadialProvider().
 */

import { playSfx } from "../../audio/sfx";
import { hasClassAction } from "../../robots/classActions";
import type { RobotClass } from "../../robots/types";
import { startHarvest } from "../../systems/harvestSystem";
import { clearHighlights } from "../../systems/highlightSystem";
import { Building, ResourceDeposit, UnitPos, UnitStats } from "../../traits";
import type { RadialOpenContext } from "../radialMenu";
import { registerRadialProvider } from "../radialMenu";
import {
	getSelectedPlayerUnit,
	getSelectedUnitId,
	getWorldRef,
} from "./providerState";

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
		const worldRef = getWorldRef();
		const selectedUnitId = getSelectedUnitId();
		if (!worldRef || selectedUnitId == null) return [];
		if (!ctx.targetEntityId) return [];

		// Only workers can harvest
		const unitEntity = getSelectedPlayerUnit();
		if (!unitEntity) return [];
		const unitStats = unitEntity.get(UnitStats);
		if (
			!unitStats ||
			!hasClassAction(unitStats.robotClass as RobotClass, "harvest")
		)
			return [];

		const world = worldRef;
		const unitId = selectedUnitId;
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

		const world = getWorldRef()!;
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

		const world = getWorldRef()!;

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
