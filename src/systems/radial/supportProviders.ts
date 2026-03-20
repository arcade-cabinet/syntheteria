/**
 * Radial providers: Reveal, Signal, Repair, Buff, Deploy Beacon.
 *
 * Scout utility and support-class actions for the radial context menu.
 * Each provider self-registers via registerRadialProvider().
 */

import { playSfx } from "../../audio/sfx";
import { hasClassAction } from "../../robots/classActions";
import type { RobotClass } from "../../robots/types";
import { clearHighlights } from "../../systems/highlightSystem";
import { UnitFaction, UnitPos, UnitStats } from "../../traits";
import type { RadialOpenContext } from "../radialMenu";
import { registerRadialProvider } from "../radialMenu";
import {
	getSelectedPlayerUnit,
	getSelectedUnitId,
	getWorldRef,
} from "./providerState";

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

		const world = getWorldRef()!;

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

		const world = getWorldRef()!;
		const selectedUnitId = getSelectedUnitId();
		const targetId = Number(ctx.targetEntityId);

		// Can't repair self
		if (targetId === selectedUnitId) return [];

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
		const dist =
			Math.abs(pos.tileX - targetPos.tileX) +
			Math.abs(pos.tileZ - targetPos.tileZ);

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
						unitEntity.set(UnitStats, {
							...myStats,
							ap: Math.max(0, myStats.ap - 1),
						});
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

		const world = getWorldRef()!;
		const selectedUnitId = getSelectedUnitId();
		const targetId = Number(ctx.targetEntityId);

		if (targetId === selectedUnitId) return [];

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

		const world = getWorldRef()!;

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
